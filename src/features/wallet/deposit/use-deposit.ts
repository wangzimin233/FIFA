import type { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@heroui/react'
import { useAppKitProvider } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BaseError,
  ContractFunctionRevertedError,
  type AbiEvent,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient } from 'wagmi'
import { rechargeDepositAbi } from '../../../config/contracts'
import type { WalletUserInfoResponse } from '../../wallet-auth/api'
import { useWalletAuthStore } from '../../wallet-auth/auth-store'
import {
  clearDepositCallbackState,
  loadDepositCallbackState,
  saveDepositCallbackState,
} from '../../wallet-auth/storage'
import {
  describeProvider,
  ensureWalletProviderBscNetwork,
  isDuplicateProviderError,
  resolveWalletProvider,
  sendContractTransaction,
  WALLET_PROVIDER_CONFLICT_MESSAGE,
  type Eip1193Provider,
  type WalletProviderPreference,
} from '../provider-registry'
import type { WalletContractConfigResponse } from './api'
import { createDepositOrder, notifyDepositCallback } from './api'
import {
  APPROVE_AMOUNT,
  BSC_CHAIN_ID,
  BSC_USDT_DECIMALS,
  isAddressLike,
  usdtErc20Abi,
} from './contracts'

export type DepositStatus =
  | 'idle'
  | 'switching_network'
  | 'creating_order'
  | 'approving'
  | 'submitting'
  | 'confirming'
  | 'callback_pending'
  | 'success'
  | 'error'

type DepositCallbackState = {
  amount: string
  hash: Hash
  orderNo?: string
}

const CALLBACK_RETRY_DELAYS_MS = [2_000, 4_000, 6_000, 10_000, 15_000, 25_000]
const DUPLICATE_RECOVERY_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000]
const DEPOSIT_LOG_LOOKBACK_BLOCKS = 2_000n

const usdtDepositedEvent = rechargeDepositAbi.find(
  (entry) => entry.type === 'event' && entry.name === 'USDTDeposited',
) as AbiEvent | undefined

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function isUnauthorizedError(error: unknown) {
  const axiosError = error as AxiosError
  return axiosError.response?.status === 401 || axiosError.response?.status === 403
}

function resolveErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>
  const serverMessage = axiosError.response?.data?.message?.trim()

  if (serverMessage) {
    return serverMessage
  }

  if (error instanceof BaseError) {
    const revertError = error.walk((cause) => cause instanceof ContractFunctionRevertedError)

    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName

      if (errorName === 'InvalidSignature') {
        return '充值签名校验失败，请让后端确认签名内容与合约签名规则完全一致。'
      }

      if (errorName === 'InvalidParam') {
        return '充值参数校验失败，请检查订单号、金额和签名是否与合约要求一致。'
      }

      if (errorName === 'OrderIdUsed') {
        return '当前订单号已经使用，请重新创建充值订单后再试。'
      }

      if (errorName === 'InsufficientBalance') {
        return '钱包 USDT 余额不足，无法完成充值。'
      }

      if (errorName) {
        return `充值合约回滚：${errorName}`
      }
    }
  }

  if ((error as { shortMessage?: string })?.shortMessage) {
    return (error as { shortMessage: string }).shortMessage
  }

  if ((error as { message?: string })?.message) {
    return (error as { message: string }).message
  }

  return '充值失败，请稍后重试。'
}

function resolveCallbackErrorMessage(error: unknown) {
  return `链上充值交易已成功，但后端入账确认暂未完成：${resolveErrorMessage(error)}。请稍后点击“重新通知后端入账”，不要重复发起同一笔充值。`
}

function loadInitialDepositCallbackState(): DepositCallbackState | null {
  const persistedState = loadDepositCallbackState()
  if (!persistedState) {
    return null
  }

  return {
    amount: persistedState.amount,
    hash: persistedState.hash as Hash,
    orderNo: persistedState.orderNo,
  }
}

function parseOrderId(value: string | number) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('订单 ID 精度异常，请让后端改为字符串返回后再重试。')
    }

    return BigInt(value)
  }

  return BigInt(value)
}

function resolveOrderId(orderNo: string | undefined, orderId: string | number) {
  const normalizedOrderNo = orderNo?.trim()

  if (normalizedOrderNo) {
    return parseOrderId(normalizedOrderNo)
  }

  return parseOrderId(orderId)
}

async function recoverDepositHashFromLogs({
  amount,
  contractAddress,
  publicClient,
  sender,
  orderId,
}: {
  amount: bigint
  contractAddress: Address
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>
  sender: Address
  orderId: bigint
}) {
  if (!usdtDepositedEvent) {
    return null
  }

  for (let attemptIndex = 0; attemptIndex <= DUPLICATE_RECOVERY_RETRY_DELAYS_MS.length; attemptIndex += 1) {
    if (attemptIndex > 0) {
      await sleep(DUPLICATE_RECOVERY_RETRY_DELAYS_MS[attemptIndex - 1])
    }

    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock =
      latestBlock > DEPOSIT_LOG_LOOKBACK_BLOCKS ? latestBlock - DEPOSIT_LOG_LOOKBACK_BLOCKS : 0n
    const logs = await publicClient.getLogs({
      address: contractAddress,
      args: {
        orderId,
        sender,
      },
      event: usdtDepositedEvent,
      fromBlock,
      toBlock: 'latest',
    })
    const matchingLog = logs
      .filter((log) => (log.args as { amount?: bigint }).amount === amount)
      .sort((left, right) => Number(right.blockNumber - left.blockNumber))[0]

    if (matchingLog?.transactionHash) {
      return matchingLog.transactionHash
    }
  }

  return null
}

function ensureSuccessfulReceiptStatus(status: 'success' | 'reverted' | undefined) {
  if (status === 'reverted') {
    throw new Error('充值交易已上链但执行失败，USDT 未完成入金，请检查链上交易详情。')
  }
}

function pickUsdtAddress(walletUser: WalletUserInfoResponse | undefined, contractConfig: WalletContractConfigResponse | undefined) {
  const assetAddress = walletUser?.assets.find(
    (asset) => asset.chainCode === 'BSC' && asset.coinCode.toUpperCase() === 'USDT' && isAddressLike(asset.contractAddress),
  )?.contractAddress

  if (assetAddress && isAddressLike(assetAddress)) {
    return assetAddress
  }

  const configTokenAddress = (contractConfig as WalletContractConfigResponse & { tokenAddress?: string })?.tokenAddress
  if (isAddressLike(configTokenAddress)) {
    return configTokenAddress
  }

  return null
}

export function useDeposit({
  contractConfig,
  isConnected,
  isSessionReady,
  onSuccess,
  walletAddress,
  walletUser,
}: {
  contractConfig?: WalletContractConfigResponse
  isConnected: boolean
  isSessionReady: boolean
  onSuccess?: () => void | Promise<void>
  walletAddress?: string
  walletUser?: WalletUserInfoResponse
}) {
  const queryClient = useQueryClient()
  const publicClient = usePublicClient({ chainId: BSC_CHAIN_ID })
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155')
  const session = useWalletAuthStore((state) => state.session)

  const [lastCallbackState, setLastCallbackState] = useState<DepositCallbackState | null>(loadInitialDepositCallbackState)
  const [status, setStatus] = useState<DepositStatus>(() => (lastCallbackState ? 'callback_pending' : 'idle'))
  const [error, setError] = useState<string | null>(null)
  const [lastSuccessHash, setLastSuccessHash] = useState<Hash | null>(null)
  const [providerWarning, setProviderWarning] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const usdtAddress = useMemo(
    () => pickUsdtAddress(walletUser, contractConfig),
    [contractConfig, walletUser],
  )
  const preferredIdentity = useMemo<WalletProviderPreference | undefined>(
    () =>
      session
        ? {
            walletProviderId: session.walletProviderId,
            walletProviderName: session.walletProviderName,
            walletProviderRdns: session.walletProviderRdns,
            walletProviderSource: session.walletProviderSource,
            walletProviderUuid: session.walletProviderUuid,
          }
        : undefined,
    [session],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setLastSuccessHash(null)
    submitLockRef.current = false
  }, [])

  useEffect(() => {
    let isCancelled = false

    if (!isConnected || !walletAddress || !isAddressLike(walletAddress)) {
      const timeoutId = window.setTimeout(() => {
        setProviderWarning(null)
      }, 0)

      return () => {
        isCancelled = true
        window.clearTimeout(timeoutId)
      }
    }

    const checkProvider = async () => {
      try {
        const selectedProvider = await resolveWalletProvider({
          fallbackProvider: walletProvider,
          preferredIdentity,
          walletAddress,
        })
        if (isCancelled) {
          return
        }

        if (!selectedProvider) {
          setProviderWarning('未找到与当前登录地址匹配的钱包 Provider，请刷新页面并用当前钱包重新连接。')
          return
        }

        setProviderWarning(selectedProvider.isMixedProvider ? WALLET_PROVIDER_CONFLICT_MESSAGE : null)
      } catch (error) {
        if (!isCancelled) {
          setProviderWarning(resolveErrorMessage(error))
        }
      }
    }

    void checkProvider()

    return () => {
      isCancelled = true
    }
  }, [isConnected, preferredIdentity, walletAddress, walletProvider])

  const invalidateWalletData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet-user-info'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet-contract-config', 'BSC'] }),
    ])
  }, [queryClient])

  const runCallback = useCallback(
    async (hash: Hash, amount: string, orderNo?: string) => {
      setStatus('callback_pending')
      setError(null)
      const callbackState = { amount, hash, orderNo }
      setLastCallbackState(callbackState)
      saveDepositCallbackState(callbackState)

      let lastError: unknown = null

      for (let attemptIndex = 0; attemptIndex <= CALLBACK_RETRY_DELAYS_MS.length; attemptIndex += 1) {
        if (attemptIndex > 0) {
          await sleep(CALLBACK_RETRY_DELAYS_MS[attemptIndex - 1])
        }

        try {
          const callbackResult = await notifyDepositCallback({
            chainType: 'BSC',
            hash,
          })

          if (!callbackResult.data) {
            throw new Error(callbackResult.message || '入金回调未返回有效数据。')
          }

          if (!callbackResult.data.processed) {
            throw new Error(callbackResult.data.message || '后端尚未完成入账处理。')
          }

          setStatus('success')
          setLastSuccessHash(hash)
          setLastCallbackState(null)
          clearDepositCallbackState()
          await invalidateWalletData()
          await onSuccess?.()
          toast.success(callbackResult.data.message || '充值成功')
          return callbackResult.data
        } catch (error) {
          lastError = error

          if (isUnauthorizedError(error)) {
            break
          }
        }
      }

      throw lastError ?? new Error('入金回调未返回有效数据。')
    },
    [invalidateWalletData, onSuccess],
  )

  const ensureBscNetwork = useCallback(
    async () => {
      if (!walletAddress || !isAddressLike(walletAddress)) {
        throw new Error('请先连接钱包。')
      }

      await ensureWalletProviderBscNetwork({
        fallbackProvider: walletProvider,
        onSwitching: () => setStatus('switching_network'),
        preferredIdentity,
        walletAddress,
      })
    },
    [preferredIdentity, walletAddress, walletProvider],
  )

  const submitDeposit = useCallback(
    async (amountInput: string) => {
      if (submitLockRef.current) {
        return
      }

      if (!isConnected || !walletAddress || !isAddressLike(walletAddress)) {
        setStatus('error')
        setError('请先连接钱包。')
        return
      }

      if (!isSessionReady) {
        setStatus('error')
        setError('请先完成钱包登录，再进行充值。')
        return
      }

      if (!publicClient) {
        setStatus('error')
        setError('当前钱包客户端未就绪，请稍后重试。')
        return
      }

      if (!contractConfig) {
        setStatus('error')
        setError('充值配置加载中，请稍后再试。')
        return
      }

      if (!usdtAddress || !isAddressLike(usdtAddress)) {
        setStatus('error')
        setError('未获取到 BSC USDT 合约地址，请刷新后重试。')
        return
      }

      const normalizedAmount = amountInput.trim()
      const amount = Number(normalizedAmount)
      const minDepositAmount = Number(contractConfig.rechargeMinAmount)

      if (!normalizedAmount || Number.isNaN(amount) || amount <= 0) {
        setStatus('error')
        setError('请输入正确的充值金额。')
        return
      }

      if (Number.isFinite(minDepositAmount) && amount < minDepositAmount) {
        setStatus('error')
        setError(`当前最小充值金额为 ${contractConfig.rechargeMinAmount} USDT。`)
        return
      }

      setError(null)
      setLastSuccessHash(null)
      submitLockRef.current = true

      try {
        await ensureBscNetwork()

        setStatus('creating_order')
        const orderResult = await createDepositOrder({
          chainType: 'BSC',
          amount,
        })

        if (!orderResult.data) {
          throw new Error(orderResult.message || '创建入金订单失败。')
        }

        const {
          amount: orderAmount,
          amountWei,
          contractAddress,
          orderId,
          orderNo,
          signature,
        } = orderResult.data

        if (!isAddressLike(contractAddress)) {
          throw new Error('后端未返回有效的入金合约地址。')
        }

        if (typeof signature !== 'string' || !signature.startsWith('0x')) {
          throw new Error('后端未返回有效的充值签名。')
        }

        const requiredAmount = BigInt(amountWei)
        const allowance = await publicClient.readContract({
          address: usdtAddress,
          abi: usdtErc20Abi,
          functionName: 'allowance',
          args: [walletAddress, contractAddress],
          authorizationList: undefined,
        })

        if (allowance < requiredAmount) {
          setStatus('approving')
          console.info('[deposit] approve provider', describeProvider(walletProvider))
          const approveSimulation = await publicClient.simulateContract({
            address: usdtAddress,
            abi: usdtErc20Abi,
            functionName: 'approve',
            args: [contractAddress, parseUnits(APPROVE_AMOUNT, BSC_USDT_DECIMALS)],
            account: walletAddress,
          })
          console.info('[deposit] approve transaction start', {
            walletAddress,
            contractAddress,
            usdtAddress,
            gas: approveSimulation.request.gas?.toString(),
          })
          const approveHash = await sendContractTransaction({
            abi: usdtErc20Abi,
            address: usdtAddress,
            args: [contractAddress, parseUnits(APPROVE_AMOUNT, BSC_USDT_DECIMALS)],
            fallbackProvider: walletProvider,
            from: walletAddress,
            functionName: 'approve',
            preferredIdentity,
          })
          console.info('[deposit] approve transaction success', {
            hash: approveHash,
          })

          setStatus('confirming')
          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveHash,
          })
          ensureSuccessfulReceiptStatus(approveReceipt.status)
        }

        setStatus('submitting')
        const resolvedOrderId = resolveOrderId(orderNo, orderId)

        console.info('[depositUSDT] contract call params', {
          contractAddress,
          walletAddress,
          orderId,
          orderNo,
          resolvedOrderId: resolvedOrderId.toString(),
          amount: orderAmount,
          amountWei,
          signature,
        })
        console.info('[deposit] deposit provider', describeProvider(walletProvider))

        const depositSimulation = await publicClient.simulateContract({
          address: contractAddress,
          abi: rechargeDepositAbi,
          functionName: 'depositUSDT',
          args: [resolvedOrderId, requiredAmount, signature as Hex],
          account: walletAddress,
        })
        console.info('[deposit] deposit transaction start', {
          walletAddress,
          contractAddress,
          resolvedOrderId: resolvedOrderId.toString(),
          gas: depositSimulation.request.gas?.toString(),
        })
        let depositHash: Hash
        try {
          depositHash = await sendContractTransaction({
            abi: rechargeDepositAbi,
            address: contractAddress,
            args: [resolvedOrderId, requiredAmount, signature as Hex],
            fallbackProvider: walletProvider,
            from: walletAddress,
            functionName: 'depositUSDT',
            preferredIdentity,
          })
        } catch (sendError) {
          if (!isDuplicateProviderError(sendError)) {
            throw sendError
          }

          console.warn('[deposit] duplicate send detected, trying to recover transaction hash from chain logs', {
            contractAddress,
            walletAddress,
            resolvedOrderId: resolvedOrderId.toString(),
            amountWei,
          })
          const recoveredHash = await recoverDepositHashFromLogs({
            amount: requiredAmount,
            contractAddress,
            orderId: resolvedOrderId,
            publicClient,
            sender: walletAddress,
          })

          if (!recoveredHash) {
            throw sendError
          }

          depositHash = recoveredHash
          console.info('[deposit] recovered deposit transaction hash', {
            hash: depositHash,
          })
        }
        console.info('[deposit] deposit transaction success', {
          hash: depositHash,
        })

        setStatus('confirming')
        const depositReceipt = await publicClient.waitForTransactionReceipt({
          hash: depositHash,
        })
        ensureSuccessfulReceiptStatus(depositReceipt.status)

        try {
          await runCallback(depositHash, orderAmount, orderNo)
        } catch (callbackError) {
          console.error('[deposit] callback failed after confirmed deposit', callbackError)
          setStatus('callback_pending')
          setError(resolveCallbackErrorMessage(callbackError))
        }
      } catch (error) {
        console.error('[deposit] submitDeposit failed', error)
        setStatus('error')
        setError(
          isDuplicateProviderError(error)
            ? '检测到浏览器多钱包 Provider 冲突，请临时停用未使用的钱包插件，或只保留 MetaMask / TokenPocket 其中一个后刷新重试。'
            : resolveErrorMessage(error),
        )
      } finally {
        submitLockRef.current = false
      }
    },
    [
      contractConfig,
      ensureBscNetwork,
      isConnected,
      isSessionReady,
      publicClient,
      preferredIdentity,
      runCallback,
      usdtAddress,
      walletAddress,
      walletProvider,
    ],
  )

  const retryCallback = useCallback(async () => {
    if (!lastCallbackState) {
      return
    }

    try {
      setError(null)
      await runCallback(lastCallbackState.hash, lastCallbackState.amount, lastCallbackState.orderNo)
    } catch (error) {
      setStatus('callback_pending')
      setError(resolveCallbackErrorMessage(error))
    }
  }, [lastCallbackState, runCallback])

  return {
    error,
    hasPendingCallback: Boolean(lastCallbackState),
    isBusy: status !== 'idle' && status !== 'success' && status !== 'error',
    providerWarning,
    lastSuccessHash,
    reset,
    retryCallback,
    status,
    submitDeposit,
    usdtAddress,
  }
}
