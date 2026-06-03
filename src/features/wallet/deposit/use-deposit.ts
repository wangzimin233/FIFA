import type { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@heroui/react'
import { useAppKitProvider } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BaseError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  type Abi,
  type AbiEvent,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient } from 'wagmi'
import { rechargeDepositAbi } from '../../../config/contracts'
import type { WalletUserInfoResponse } from '../../wallet-auth/api'
import {
  clearDepositCallbackState,
  loadDepositCallbackState,
  saveDepositCallbackState,
} from '../../wallet-auth/storage'
import type { WalletContractConfigResponse } from './api'
import { createDepositOrder, notifyDepositCallback } from './api'
import {
  APPROVE_AMOUNT,
  BSC_CHAIN_ID,
  BSC_USDT_DECIMALS,
  isAddressLike,
  usdtErc20Abi,
} from './contracts'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
  selectedAddress?: string
  chainId?: string
  isMetaMask?: boolean
  isTokenPocket?: boolean
  isTronLink?: boolean
  isOkxWallet?: boolean
  providers?: Eip1193Provider[]
}

type Eip6963ProviderDetail = {
  info?: {
    name?: string
    rdns?: string
    uuid?: string
  }
  provider?: Eip1193Provider
}

type ScoredProvider = {
  accounts: string[]
  chainId?: string
  isMixedProvider: boolean
  matchesWalletAddress: boolean
  provider: Eip1193Provider
  score: number
  source: string
}

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
const EIP6963_COLLECT_DELAY_MS = 200
const DUPLICATE_RECOVERY_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000]
const DEPOSIT_LOG_LOOKBACK_BLOCKS = 2_000n
const WALLET_PROVIDER_CONFLICT_MESSAGE =
  '检测到 MetaMask 和 TokenPocket 同时注入并混用了同一个钱包 Provider。为避免重复发起链上交易，请临时停用未使用的钱包插件，或只保留当前要用的钱包后刷新页面。'

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

function normalizeAddress(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? ''
}

function describeProvider(provider: Eip1193Provider | undefined) {
  if (!provider) {
    return {
      hasProvider: false,
    }
  }

  return {
    hasProvider: true,
    isMetaMask: Boolean(provider.isMetaMask),
    isTokenPocket: Boolean(provider.isTokenPocket),
    isTronLink: Boolean(provider.isTronLink),
    isOkxWallet: Boolean(provider.isOkxWallet),
    selectedAddress: provider.selectedAddress,
    chainId: provider.chainId,
  }
}

function describeScoredProvider(provider: ScoredProvider | null) {
  if (!provider) {
    return {
      hasProvider: false,
    }
  }

  return {
    ...describeProvider(provider.provider),
    accounts: provider.accounts,
    chainId: provider.chainId,
    isMixedProvider: provider.isMixedProvider,
    matchesWalletAddress: provider.matchesWalletAddress,
    score: provider.score,
    source: provider.source,
  }
}

function isDuplicateProviderError(error: unknown) {
  const message =
    (error as { details?: string })?.details ??
    (error as { shortMessage?: string })?.shortMessage ??
    (error as { message?: string })?.message ??
    ''

  return /duplicate call detected/i.test(message)
}

function getWindowEthereum() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as unknown as Window & { ethereum?: Eip1193Provider }).ethereum
}

async function requestEip6963Providers() {
  if (typeof window === 'undefined') {
    return []
  }

  const providers: Eip6963ProviderDetail[] = []
  const handleProvider = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
    if (detail?.provider?.request) {
      providers.push(detail)
    }
  }

  window.addEventListener('eip6963:announceProvider', handleProvider)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  await sleep(EIP6963_COLLECT_DELAY_MS)
  window.removeEventListener('eip6963:announceProvider', handleProvider)

  return providers
}

async function listCandidateProviders(fallbackProvider: Eip1193Provider | undefined) {
  const candidates: Array<{ provider: Eip1193Provider; source: string }> = []
  const seenProviders = new Set<Eip1193Provider>()
  const addProvider = (provider: Eip1193Provider | undefined, source: string) => {
    if (!provider?.request || seenProviders.has(provider)) {
      return
    }

    seenProviders.add(provider)
    candidates.push({ provider, source })
  }

  for (const detail of await requestEip6963Providers()) {
    const providerName = detail.info?.name || detail.info?.rdns || detail.info?.uuid || 'unknown'
    addProvider(detail.provider, `eip6963:${providerName}`)
  }

  const ethereum = getWindowEthereum()
  const injectedProviders = ethereum?.providers?.filter((provider) => typeof provider?.request === 'function') ?? []
  injectedProviders.forEach((provider, index) => {
    addProvider(provider, `window.ethereum.providers[${index}]`)
  })
  addProvider(fallbackProvider, 'appkit.walletProvider')
  addProvider(ethereum, 'window.ethereum')

  return candidates
}

function chooseTransactionProvider(scoredProviders: ScoredProvider[]) {
  const byScore = (left: ScoredProvider, right: ScoredProvider) => right.score - left.score
  const safeMatches = scoredProviders
    .filter((provider) => provider.matchesWalletAddress && !provider.isMixedProvider && !provider.provider.isTronLink)
    .sort(byScore)

  if (safeMatches.length > 0) {
    return safeMatches[0]
  }

  const unsafeMatches = scoredProviders
    .filter((provider) => provider.matchesWalletAddress)
    .sort(byScore)

  if (unsafeMatches.length > 0) {
    return unsafeMatches[0]
  }

  return null
}

async function getProviderAccounts(provider: Eip1193Provider) {
  try {
    const accounts = await provider.request({ method: 'eth_accounts' })
    return Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === 'string') : []
  } catch {
    return []
  }
}

async function getProviderChainId(provider: Eip1193Provider) {
  try {
    const chainId = await provider.request({ method: 'eth_chainId' })
    return typeof chainId === 'string' ? chainId : undefined
  } catch {
    return undefined
  }
}

async function resolveTransactionProvider(walletAddress: string, fallbackProvider: Eip1193Provider | undefined) {
  const normalizedWalletAddress = normalizeAddress(walletAddress)
  const candidates = await listCandidateProviders(fallbackProvider)
  const scoredProviders: ScoredProvider[] = []
  const hasLikelyMetaMaskProvider = candidates.some(
    ({ provider, source }) => /metamask/i.test(source) || Boolean(provider.isMetaMask && !provider.isTokenPocket),
  )
  const hasLikelyTokenPocketProvider = candidates.some(
    ({ provider, source }) => /tokenpocket/i.test(source) || Boolean(provider.isTokenPocket),
  )

  for (const { provider, source } of candidates) {
    const accounts = await getProviderAccounts(provider)
    const chainId = await getProviderChainId(provider)
    const normalizedAccounts = accounts.map(normalizeAddress)
    const isMixedProvider = Boolean(provider.isMetaMask && provider.isTokenPocket && hasLikelyMetaMaskProvider && hasLikelyTokenPocketProvider)
    const matchesWalletAddress =
      normalizedAccounts.includes(normalizedWalletAddress) ||
      normalizeAddress(provider.selectedAddress) === normalizedWalletAddress
    let score = 0

    if (matchesWalletAddress) {
      score += 100
    }

    if (normalizeAddress(provider.selectedAddress) === normalizedWalletAddress) {
      score += 40
    }

    if (chainId?.toLowerCase() === '0x38') {
      score += 10
    }

    if (/eip6963/i.test(source)) {
      score += 8
    }

    if (/metamask/i.test(source)) {
      score += 6
    }

    if (/tokenpocket/i.test(source)) {
      score += 3
    }

    if (provider.isTronLink) {
      score -= 50
    }

    if (isMixedProvider) {
      score -= 100
    }

    scoredProviders.push({
      accounts,
      chainId,
      isMixedProvider,
      matchesWalletAddress,
      provider,
      score,
      source,
    })
  }

  const selectedProvider = chooseTransactionProvider(scoredProviders)
  console.info('[deposit] transaction provider candidates', scoredProviders.map(describeScoredProvider))
  console.info('[deposit] selected transaction provider', describeScoredProvider(selectedProvider))

  return selectedProvider
}

async function sendContractTransaction({
  abi,
  address,
  args,
  fallbackProvider,
  from,
  functionName,
}: {
  abi: typeof rechargeDepositAbi | typeof usdtErc20Abi
  address: string
  args: readonly unknown[]
  fallbackProvider?: Eip1193Provider
  from: string
  functionName: string
}) {
  const selectedProvider = await resolveTransactionProvider(from, fallbackProvider)
  if (!selectedProvider) {
    throw new Error('未找到与当前登录地址匹配的钱包 Provider，请刷新页面并用当前钱包重新连接。')
  }

  if (selectedProvider.isMixedProvider) {
    throw new Error(WALLET_PROVIDER_CONFLICT_MESSAGE)
  }

  const hashResult = await selectedProvider.provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        data: encodeFunctionData({
          abi: abi as Abi,
          functionName,
          args: args as readonly never[],
        }),
        from,
        to: address,
        value: '0x0',
      },
    ],
  })

  if (typeof hashResult !== 'string' || !hashResult.startsWith('0x')) {
    throw new Error('钱包未返回有效的交易哈希。')
  }

  return hashResult as Hash
}

async function ensureTransactionProviderReady(walletAddress: string, fallbackProvider: Eip1193Provider | undefined) {
  const selectedProvider = await resolveTransactionProvider(walletAddress, fallbackProvider)
  if (!selectedProvider) {
    throw new Error('未找到与当前登录地址匹配的钱包 Provider，请刷新页面并用当前钱包重新连接。')
  }

  if (selectedProvider.isMixedProvider) {
    throw new Error(WALLET_PROVIDER_CONFLICT_MESSAGE)
  }
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
        const selectedProvider = await resolveTransactionProvider(walletAddress, walletProvider)
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
  }, [isConnected, walletAddress, walletProvider])

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

  const ensureBscNetwork = useCallback(async () => {
    if (!walletProvider?.request) {
      throw new Error('当前未获取到钱包 Provider，请重新连接钱包后重试。')
    }

    const currentChainId = await walletProvider.request({ method: 'eth_chainId' })
    const normalizedChainId =
      typeof currentChainId === 'string' && currentChainId.startsWith('0x')
        ? Number.parseInt(currentChainId, 16)
        : Number(currentChainId)

    if (normalizedChainId === BSC_CHAIN_ID) {
      return
    }

    setStatus('switching_network')
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x38' }],
    })
  }, [walletProvider])

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
        await ensureTransactionProviderReady(walletAddress, walletProvider)

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
