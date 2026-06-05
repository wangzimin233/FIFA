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
import { usePublicClient } from 'wagmi'
import { rechargeDepositAbi } from '../../../config/contracts'
import i18n from '../../../config/i18n'
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
        return i18n.t('deposit.errors.invalidSignature')
      }

      if (errorName === 'InvalidParam') {
        return i18n.t('deposit.errors.invalidParam')
      }

      if (errorName === 'OrderIdUsed') {
        return i18n.t('deposit.errors.orderIdUsed')
      }

      if (errorName === 'InsufficientBalance') {
        return i18n.t('deposit.errors.insufficientBalance')
      }

      if (errorName) {
        return i18n.t('deposit.errors.contractReverted', { errorName })
      }
    }
  }

  if ((error as { shortMessage?: string })?.shortMessage) {
    return (error as { shortMessage: string }).shortMessage
  }

  if ((error as { message?: string })?.message) {
    return (error as { message: string }).message
  }

  return i18n.t('deposit.errors.failed')
}

function resolveCallbackErrorMessage(error: unknown) {
  return i18n.t('deposit.errors.callbackPending', { message: resolveErrorMessage(error) })
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
      throw new Error(i18n.t('deposit.errors.orderIdPrecision'))
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
    throw new Error(i18n.t('deposit.errors.receiptReverted'))
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
          setProviderWarning(i18n.t('walletProvider.errors.noMatchingProviderRefresh'))
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
            throw new Error(callbackResult.message || i18n.t('deposit.errors.callbackNoData'))
          }

          if (!callbackResult.data.processed) {
            throw new Error(callbackResult.data.message || i18n.t('deposit.errors.backendNotProcessed'))
          }

          setStatus('success')
          setLastSuccessHash(hash)
          setLastCallbackState(null)
          clearDepositCallbackState()
          await invalidateWalletData()
          await onSuccess?.()
          toast.success(callbackResult.data.message || i18n.t('deposit.success.completed'))
          return callbackResult.data
        } catch (error) {
          lastError = error

          if (isUnauthorizedError(error)) {
            break
          }
        }
      }

      throw lastError ?? new Error(i18n.t('deposit.errors.callbackNoData'))
    },
    [invalidateWalletData, onSuccess],
  )

  const ensureBscNetwork = useCallback(
    async () => {
      if (!walletAddress || !isAddressLike(walletAddress)) {
        throw new Error(i18n.t('walletAuth.errors.connectFirst'))
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
        setError(i18n.t('walletAuth.errors.connectFirst'))
        return
      }

      if (!isSessionReady) {
        setStatus('error')
        setError(i18n.t('deposit.errors.loginFirst'))
        return
      }

      if (!publicClient) {
        setStatus('error')
        setError(i18n.t('deposit.errors.walletClientNotReady'))
        return
      }

      if (!contractConfig) {
        setStatus('error')
        setError(i18n.t('deposit.errors.configLoading'))
        return
      }

      if (!usdtAddress || !isAddressLike(usdtAddress)) {
        setStatus('error')
        setError(i18n.t('deposit.errors.missingUsdtAddress'))
        return
      }

      const normalizedAmount = amountInput.trim()
      const amount = Number(normalizedAmount)
      const minDepositAmount = Number(contractConfig.rechargeMinAmount)

      if (!normalizedAmount || Number.isNaN(amount) || amount <= 0) {
        setStatus('error')
        setError(i18n.t('deposit.errors.invalidAmount'))
        return
      }

      if (Number.isFinite(minDepositAmount) && amount < minDepositAmount) {
        setStatus('error')
        setError(i18n.t('deposit.errors.minAmount', { amount: contractConfig.rechargeMinAmount }))
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
          throw new Error(orderResult.message || i18n.t('deposit.errors.createOrderFailed'))
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
          throw new Error(i18n.t('deposit.errors.invalidContractAddress'))
        }

        if (typeof signature !== 'string' || !signature.startsWith('0x')) {
          throw new Error(i18n.t('deposit.errors.invalidBackendSignature'))
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
            args: [contractAddress, APPROVE_AMOUNT],
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
            args: [contractAddress, APPROVE_AMOUNT],
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
            ? i18n.t('walletProvider.errors.duplicateProviderConflict')
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
