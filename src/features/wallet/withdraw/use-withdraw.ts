import type { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@heroui/react'
import { useAppKitProvider } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { BaseError, ContractFunctionRevertedError, type AbiEvent, type Address, type Hash } from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient } from 'wagmi'
import { withdrawClaimAbi } from '../../../config/contracts'
import type { WalletUserInfoResponse } from '../../wallet-auth/api'
import { useWalletAuthStore } from '../../wallet-auth/auth-store'
import type { WalletContractConfigResponse } from '../deposit/api'
import { BSC_CHAIN_ID, BSC_USDT_DECIMALS, CONTRACT_TYPE_WITHDRAW, isAddressLike } from '../deposit/contracts'
import {
  ensureWalletProviderBscNetwork,
  isDuplicateProviderError,
  resolveWalletProvider,
  sendContractTransaction,
  WALLET_PROVIDER_CONFLICT_MESSAGE,
  type Eip1193Provider,
  type WalletProviderPreference,
} from '../provider-registry'
import { applyWithdraw, notifyWithdrawCallback, type WithdrawApplyResponse } from './api'

export type WithdrawStatus =
  | 'idle'
  | 'switching_network'
  | 'applying'
  | 'submitting'
  | 'confirming'
  | 'callback_pending'
  | 'success'
  | 'error'

type WithdrawCallbackState = {
  amount: string
  hash: Hash
  withdrawNo?: string
}

const DUPLICATE_RECOVERY_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000]
const WITHDRAW_LOG_LOOKBACK_BLOCKS = 2_000n

const usdtWithdrawClaimedEvent = withdrawClaimAbi.find(
  (entry) => entry.type === 'event' && entry.name === 'USDTWithdrawClaimed',
) as AbiEvent | undefined

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
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

      if (errorName === 'ClaimBizIdUsed') {
        return '当前提现业务单号已使用，请重新申请提现后再试。'
      }

      if (errorName === 'InsufficientBalance') {
        return '提现合约余额不足，请联系后端确认打款池余额。'
      }

      if (errorName === 'InvalidParam') {
        return '提现参数校验失败，请核对业务单号、rewardType、金额和地址。'
      }

      if (errorName === 'OnlyAdmin') {
        return '当前钱包没有提现合约调用权限，请确认是否需要管理员地址执行。'
      }

      if (errorName) {
        return `提现合约回滚：${errorName}`
      }
    }
  }

  if ((error as { shortMessage?: string })?.shortMessage) {
    return (error as { shortMessage: string }).shortMessage
  }

  if ((error as { message?: string })?.message) {
    return (error as { message: string }).message
  }

  return '提现失败，请稍后重试。'
}

function parseBizId(value: string | number) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('提现业务 ID 精度异常，请让后端改为字符串返回后再重试。')
    }

    return BigInt(value)
  }

  return BigInt(value)
}

function parseUintValue(value: string | number, fieldName: string) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${fieldName} 精度异常，请让后端改为字符串返回后再重试。`)
    }

    return BigInt(value)
  }

  return BigInt(value)
}

function resolveWithdrawContractAddress(contractConfig: WalletContractConfigResponse | undefined) {
  const contractAddress = contractConfig?.contracts.find(
    (item) => item.contractType === CONTRACT_TYPE_WITHDRAW && isAddressLike(item.contractAddress),
  )?.contractAddress

  return contractAddress && isAddressLike(contractAddress) ? contractAddress : null
}

function resolveClaimAmount(response: WithdrawApplyResponse) {
  const weiValue = response.actualAmountWei?.trim() || response.amountWei?.trim()
  if (weiValue) {
    return BigInt(weiValue)
  }

  const normalizedAmount = response.actualAmount?.trim() || response.applyAmount?.trim()
  if (!normalizedAmount) {
    throw new Error('提现申请响应缺少可用于合约调用的金额字段。')
  }

  return parseUnits(normalizedAmount, BSC_USDT_DECIMALS)
}

function resolveClaimArgs(response: WithdrawApplyResponse) {
  const bizSource = response.bizId ?? response.withdrawNo ?? response.withdrawId
  const rewardType = response.rewardType

  if (bizSource === undefined || bizSource === null || `${bizSource}`.trim() === '') {
    throw new Error('提现申请响应缺少业务单号，无法调用 claimUSDT。')
  }

  if (rewardType === undefined || rewardType === null || `${rewardType}`.trim() === '') {
    throw new Error('提现申请响应缺少 rewardType，无法调用 claimUSDT，请让后端按真实合约规则返回该字段。')
  }

  if (!isAddressLike(response.toAddress)) {
    throw new Error('提现申请响应缺少有效提现地址，无法调用 claimUSDT。')
  }

  return {
    bizId: parseBizId(bizSource),
    rewardType: parseUintValue(rewardType, 'rewardType'),
    amount: resolveClaimAmount(response),
    to: response.toAddress,
  }
}

async function recoverWithdrawHashFromLogs({
  amount,
  bizId,
  contractAddress,
  operator,
  publicClient,
  rewardType,
  receiver,
}: {
  amount: bigint
  bizId: bigint
  contractAddress: Address
  operator: Address
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>
  receiver: Address
  rewardType: bigint
}) {
  if (!usdtWithdrawClaimedEvent) {
    return null
  }

  for (let attemptIndex = 0; attemptIndex <= DUPLICATE_RECOVERY_RETRY_DELAYS_MS.length; attemptIndex += 1) {
    if (attemptIndex > 0) {
      await sleep(DUPLICATE_RECOVERY_RETRY_DELAYS_MS[attemptIndex - 1])
    }

    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock =
      latestBlock > WITHDRAW_LOG_LOOKBACK_BLOCKS ? latestBlock - WITHDRAW_LOG_LOOKBACK_BLOCKS : 0n
    const logs = await publicClient.getLogs({
      address: contractAddress,
      args: {
        bizId,
        operator,
        receiver,
      },
      event: usdtWithdrawClaimedEvent,
      fromBlock,
      toBlock: 'latest',
    })
    const matchingLog = logs
      .filter((log) => {
        const args = log.args as { amount?: bigint; rewardType?: bigint }
        return args.amount === amount && args.rewardType === rewardType
      })
      .sort((left, right) => Number(right.blockNumber - left.blockNumber))[0]

    if (matchingLog?.transactionHash) {
      return matchingLog.transactionHash
    }
  }

  return null
}

function ensureSuccessfulReceiptStatus(status: 'success' | 'reverted' | undefined) {
  if (status === 'reverted') {
    throw new Error('提现交易已上链但执行失败，请检查链上交易详情。')
  }
}

export function useWithdraw({
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

  const [status, setStatus] = useState<WithdrawStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastCallbackState, setLastCallbackState] = useState<WithdrawCallbackState | null>(null)
  const [lastSuccessHash, setLastSuccessHash] = useState<Hash | null>(null)
  const [providerWarning, setProviderWarning] = useState<string | null>(null)

  const withdrawContractAddress = useMemo(
    () => resolveWithdrawContractAddress(contractConfig),
    [contractConfig],
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

  const availableBalance = useMemo(() => {
    const asset =
      walletUser?.assets.find((item) => item.chainCode === 'BSC' && item.coinCode.toUpperCase() === 'USDT') ??
      walletUser?.assets[0]

    return asset?.availableBalance ?? ''
  }, [walletUser])

  const invalidateWalletData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet-user-info'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet-contract-config', 'BSC'] }),
    ])
  }, [queryClient])

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

  const runCallback = useCallback(
    async (hash: Hash, amount: string, withdrawNo?: string) => {
      setStatus('callback_pending')
      setError(null)
      setLastCallbackState({ amount, hash, withdrawNo })

      const callbackResult = await notifyWithdrawCallback({
        chainType: 'BSC',
        hash,
      })

      if (!callbackResult.data) {
        throw new Error(callbackResult.message || '提现回调未返回有效数据。')
      }

      setStatus('success')
      setLastSuccessHash(hash)
      setLastCallbackState(null)
      await invalidateWalletData()
      await onSuccess?.()
      toast.success(callbackResult.data.message || '提现成功')
      return callbackResult.data
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

  const submitWithdraw = useCallback(
    async (amountInput: string, toAddressInput: string) => {
      if (!isConnected || !walletAddress || !isAddressLike(walletAddress)) {
        setStatus('error')
        setError('请先连接钱包。')
        return
      }

      if (!isSessionReady) {
        setStatus('error')
        setError('请先完成钱包登录，再进行提现。')
        return
      }

      if (!publicClient) {
        setStatus('error')
        setError('当前钱包客户端未就绪，请稍后重试。')
        return
      }

      if (!contractConfig) {
        setStatus('error')
        setError('提现配置加载中，请稍后再试。')
        return
      }

      if (!withdrawContractAddress) {
        setStatus('error')
        setError('未获取到提现合约地址，请检查 contract/config 返回。')
        return
      }

      const normalizedAmount = amountInput.trim()
      const normalizedToAddress = toAddressInput.trim()
      const amount = Number(normalizedAmount)
      const minAmount = Number(contractConfig.withdrawMinAmount)
      const maxAmount = Number(contractConfig.withdrawMaxAmount)
      const currentAvailableBalance = Number(availableBalance)

      if (!normalizedAmount || Number.isNaN(amount) || amount <= 0) {
        setStatus('error')
        setError('请输入正确的提现金额。')
        return
      }

      if (Number.isFinite(minAmount) && minAmount > 0 && amount < minAmount) {
        setStatus('error')
        setError(`当前最小提现金额为 ${contractConfig.withdrawMinAmount} USDT。`)
        return
      }

      if (Number.isFinite(maxAmount) && maxAmount > 0 && amount > maxAmount) {
        setStatus('error')
        setError(`当前最大提现金额为 ${contractConfig.withdrawMaxAmount} USDT。`)
        return
      }

      if (Number.isFinite(currentAvailableBalance) && currentAvailableBalance > 0 && amount > currentAvailableBalance) {
        setStatus('error')
        setError('提现金额不能大于当前可用余额。')
        return
      }

      if (!isAddressLike(normalizedToAddress)) {
        setStatus('error')
        setError('请输入有效的 BSC 提现地址。')
        return
      }

      setError(null)
      setLastSuccessHash(null)

      try {
        await ensureBscNetwork()

        setStatus('applying')
        const applyResult = await applyWithdraw({
          chainType: 'BSC',
          amount,
          toAddress: normalizedToAddress,
        })

        if (!applyResult.data) {
          throw new Error(applyResult.message || '申请提现失败。')
        }

        const claimArgs = resolveClaimArgs(applyResult.data)

        console.info('[claimUSDT] contract call params', {
          contractAddress: withdrawContractAddress,
          walletAddress,
          response: applyResult.data,
          bizId: claimArgs.bizId.toString(),
          rewardType: claimArgs.rewardType.toString(),
          amount: claimArgs.amount.toString(),
          to: claimArgs.to,
        })

        setStatus('submitting')
        const claimSimulation = await publicClient.simulateContract({
          address: withdrawContractAddress,
          abi: withdrawClaimAbi,
          functionName: 'claimUSDT',
          args: [claimArgs.bizId, claimArgs.rewardType, claimArgs.amount, claimArgs.to],
          account: walletAddress,
        })
        console.info('[withdraw] claim transaction start', {
          walletAddress,
          withdrawContractAddress,
          gas: claimSimulation.request.gas?.toString(),
        })

        let claimHash: Hash
        try {
          claimHash = await sendContractTransaction({
            abi: withdrawClaimAbi,
            address: withdrawContractAddress,
            args: [claimArgs.bizId, claimArgs.rewardType, claimArgs.amount, claimArgs.to],
            fallbackProvider: walletProvider,
            from: walletAddress,
            functionName: 'claimUSDT',
            preferredIdentity,
          })
        } catch (sendError) {
          if (!isDuplicateProviderError(sendError)) {
            throw sendError
          }

          console.warn('[withdraw] duplicate send detected, trying to recover transaction hash from chain logs', {
            amount: claimArgs.amount.toString(),
            bizId: claimArgs.bizId.toString(),
            rewardType: claimArgs.rewardType.toString(),
            to: claimArgs.to,
            walletAddress,
            withdrawContractAddress,
          })
          const recoveredHash = await recoverWithdrawHashFromLogs({
            amount: claimArgs.amount,
            bizId: claimArgs.bizId,
            contractAddress: withdrawContractAddress,
            operator: walletAddress,
            publicClient,
            receiver: claimArgs.to,
            rewardType: claimArgs.rewardType,
          })

          if (!recoveredHash) {
            throw sendError
          }

          claimHash = recoveredHash
          console.info('[withdraw] recovered claim transaction hash', {
            hash: claimHash,
          })
        }

        setStatus('confirming')
        const claimReceipt = await publicClient.waitForTransactionReceipt({
          hash: claimHash,
        })
        ensureSuccessfulReceiptStatus(claimReceipt.status)

        await runCallback(claimHash, applyResult.data.actualAmount || applyResult.data.applyAmount, applyResult.data.withdrawNo)
      } catch (error) {
        setStatus('error')
        setError(resolveErrorMessage(error))
      }
    },
    [
      availableBalance,
      contractConfig,
      ensureBscNetwork,
      isConnected,
      isSessionReady,
      preferredIdentity,
      publicClient,
      runCallback,
      walletAddress,
      walletProvider,
      withdrawContractAddress,
    ],
  )

  const retryCallback = useCallback(async () => {
    if (!lastCallbackState) {
      return
    }

    try {
      setError(null)
      await runCallback(lastCallbackState.hash, lastCallbackState.amount, lastCallbackState.withdrawNo)
    } catch (error) {
      setStatus('error')
      setError(resolveErrorMessage(error))
    }
  }, [lastCallbackState, runCallback])

  return {
    availableBalance,
    error,
    hasPendingCallback: Boolean(lastCallbackState),
    isBusy: status !== 'idle' && status !== 'success' && status !== 'error',
    lastSuccessHash,
    providerWarning,
    retryCallback,
    status,
    submitWithdraw,
    withdrawContractAddress,
  }
}
