import { encodeFunctionData, type Abi, type Hash } from 'viem'

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
  selectedAddress?: string
  chainId?: string
  isMetaMask?: boolean
  isTokenPocket?: boolean
  isTronLink?: boolean
  isOkxWallet?: boolean
  providers?: Eip1193Provider[]
}

export type WalletProviderIdentity = {
  id: string
  name: string
  rdns?: string
  source: string
  uuid?: string
}

export type WalletProviderPreference = {
  walletProviderId?: string
  walletProviderName?: string
  walletProviderRdns?: string
  walletProviderSource?: string
  walletProviderUuid?: string
}

export type ResolvedWalletProvider = {
  accounts: string[]
  chainId?: string
  identity: WalletProviderIdentity
  isMixedProvider: boolean
  matchesWalletAddress: boolean
  provider: Eip1193Provider
  score: number
}

type Eip6963ProviderDetail = {
  info?: {
    name?: string
    rdns?: string
    uuid?: string
  }
  provider?: Eip1193Provider
}

type ProviderCandidate = {
  identity: WalletProviderIdentity
  provider: Eip1193Provider
}

const BSC_CHAIN_ID_HEX = '0x38'
const EIP6963_COLLECT_DELAY_MS = 200

export const WALLET_PROVIDER_CONFLICT_MESSAGE =
  '检测到多个钱包插件同时注入并可能争用同一笔交易。请通过“连接钱包”重新选择要使用的钱包并完成登录，系统会绑定该钱包后再进行充值或提现。'

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function normalizeAddress(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? ''
}

function normalizeText(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? ''
}

function hasProviderPreference(preference: WalletProviderPreference | undefined) {
  return Boolean(
    preference?.walletProviderId ||
      preference?.walletProviderRdns ||
      preference?.walletProviderUuid ||
      preference?.walletProviderSource,
  )
}

export function toWalletProviderPreference(
  identity: WalletProviderIdentity | undefined,
): WalletProviderPreference | undefined {
  if (!identity) {
    return undefined
  }

  return {
    walletProviderId: identity.id,
    walletProviderName: identity.name,
    walletProviderRdns: identity.rdns,
    walletProviderSource: identity.source,
    walletProviderUuid: identity.uuid,
  }
}

export function describeProvider(provider: Eip1193Provider | undefined) {
  if (!provider) {
    return {
      hasProvider: false,
    }
  }

  return {
    chainId: provider.chainId,
    hasProvider: true,
    isMetaMask: Boolean(provider.isMetaMask),
    isOkxWallet: Boolean(provider.isOkxWallet),
    isTokenPocket: Boolean(provider.isTokenPocket),
    isTronLink: Boolean(provider.isTronLink),
    selectedAddress: provider.selectedAddress,
  }
}

export function describeResolvedProvider(provider: ResolvedWalletProvider | null) {
  if (!provider) {
    return {
      hasProvider: false,
    }
  }

  return {
    ...describeProvider(provider.provider),
    accounts: provider.accounts,
    chainId: provider.chainId,
    identity: provider.identity,
    isMixedProvider: provider.isMixedProvider,
    matchesWalletAddress: provider.matchesWalletAddress,
    score: provider.score,
  }
}

export function isDuplicateProviderError(error: unknown) {
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

function inferProviderName(provider: Eip1193Provider | undefined, source: string) {
  if (provider?.isTokenPocket) {
    return 'TokenPocket'
  }

  if (provider?.isOkxWallet) {
    return 'OKX Wallet'
  }

  if (provider?.isMetaMask) {
    return 'MetaMask'
  }

  if (provider?.isTronLink) {
    return 'TronLink'
  }

  return source
}

function inferProviderId(provider: Eip1193Provider | undefined, source: string) {
  if (provider?.isTokenPocket) {
    return 'wallet:tokenpocket'
  }

  if (provider?.isOkxWallet) {
    return 'wallet:okx'
  }

  if (provider?.isMetaMask) {
    return 'wallet:metamask'
  }

  if (provider?.isTronLink) {
    return 'wallet:tronlink'
  }

  return `wallet:${source}`
}

async function listCandidateProviders(fallbackProvider: Eip1193Provider | undefined) {
  const candidates: ProviderCandidate[] = []
  const seenProviders = new Set<Eip1193Provider>()
  const addProvider = (provider: Eip1193Provider | undefined, identity: WalletProviderIdentity) => {
    if (!provider?.request || seenProviders.has(provider)) {
      return
    }

    seenProviders.add(provider)
    candidates.push({ identity, provider })
  }

  for (const detail of await requestEip6963Providers()) {
    const providerName = detail.info?.name || detail.info?.rdns || detail.info?.uuid || 'unknown'
    const source = `eip6963:${providerName}`
    addProvider(detail.provider, {
      id: `eip6963:${detail.info?.rdns || detail.info?.uuid || providerName}`,
      name: detail.info?.name || providerName,
      rdns: detail.info?.rdns,
      source,
      uuid: detail.info?.uuid,
    })
  }

  const ethereum = getWindowEthereum()
  const injectedProviders = ethereum?.providers?.filter((provider) => typeof provider?.request === 'function') ?? []
  injectedProviders.forEach((provider, index) => {
    const source = `window.ethereum.providers[${index}]`
    addProvider(provider, {
      id: inferProviderId(provider, source),
      name: inferProviderName(provider, source),
      source,
    })
  })

  addProvider(fallbackProvider, {
    id: inferProviderId(fallbackProvider, 'appkit.walletProvider'),
    name: fallbackProvider ? inferProviderName(fallbackProvider, 'appkit.walletProvider') : 'AppKit Wallet',
    source: 'appkit.walletProvider',
  })
  addProvider(ethereum, {
    id: inferProviderId(ethereum, 'window.ethereum'),
    name: ethereum ? inferProviderName(ethereum, 'window.ethereum') : 'Injected Wallet',
    source: 'window.ethereum',
  })

  return candidates
}

async function getProviderAccounts(provider: Eip1193Provider) {
  try {
    const accounts = await provider.request({ method: 'eth_accounts' })
    return Array.isArray(accounts) ? accounts.filter((account): account is string => typeof account === 'string') : []
  } catch {
    return []
  }
}

export async function getProviderChainId(provider: Eip1193Provider) {
  try {
    const chainId = await provider.request({ method: 'eth_chainId' })
    return typeof chainId === 'string' ? chainId : undefined
  } catch {
    return undefined
  }
}

function isLikelySameIdentity(identity: WalletProviderIdentity, preference: WalletProviderPreference | undefined) {
  if (!hasProviderPreference(preference)) {
    return false
  }

  return (
    normalizeText(identity.id) === normalizeText(preference?.walletProviderId) ||
    Boolean(identity.rdns && normalizeText(identity.rdns) === normalizeText(preference?.walletProviderRdns)) ||
    Boolean(identity.uuid && normalizeText(identity.uuid) === normalizeText(preference?.walletProviderUuid)) ||
    normalizeText(identity.source) === normalizeText(preference?.walletProviderSource)
  )
}

async function scoreProviderCandidates(
  candidates: ProviderCandidate[],
  walletAddress: string,
  preferredIdentity: WalletProviderPreference | undefined,
) {
  const normalizedWalletAddress = normalizeAddress(walletAddress)
  const hasLikelyMetaMaskProvider = candidates.some(
    ({ identity, provider }) =>
      /metamask/i.test(identity.id) ||
      /metamask/i.test(identity.name) ||
      /metamask/i.test(identity.source) ||
      Boolean(provider.isMetaMask && !provider.isTokenPocket),
  )
  const hasLikelyTokenPocketProvider = candidates.some(
    ({ identity, provider }) =>
      /tokenpocket/i.test(identity.id) ||
      /tokenpocket/i.test(identity.name) ||
      /tokenpocket/i.test(identity.source) ||
      Boolean(provider.isTokenPocket),
  )

  const scoredProviders: ResolvedWalletProvider[] = []

  for (const { identity, provider } of candidates) {
    const accounts = await getProviderAccounts(provider)
    const chainId = await getProviderChainId(provider)
    const normalizedAccounts = accounts.map(normalizeAddress)
    const matchesWalletAddress =
      normalizedAccounts.includes(normalizedWalletAddress) ||
      normalizeAddress(provider.selectedAddress) === normalizedWalletAddress
    const isAggregateProvider =
      identity.source === 'window.ethereum' ||
      (Array.isArray(provider.providers) && provider.providers.length > 1)
    const isMixedProvider = Boolean(
      isAggregateProvider &&
        provider.isMetaMask &&
        provider.isTokenPocket &&
        hasLikelyMetaMaskProvider &&
        hasLikelyTokenPocketProvider,
    )
    let score = 0

    if (isLikelySameIdentity(identity, preferredIdentity)) {
      score += 1_000
    }

    if (matchesWalletAddress) {
      score += 100
    }

    if (normalizeAddress(provider.selectedAddress) === normalizedWalletAddress) {
      score += 40
    }

    if (chainId?.toLowerCase() === BSC_CHAIN_ID_HEX) {
      score += 10
    }

    if (identity.source === 'appkit.walletProvider') {
      score += 80
    }

    if (/eip6963/i.test(identity.source)) {
      score += 30
    }

    if (/window\.ethereum$/.test(identity.source)) {
      score -= 20
    }

    if (provider.isTronLink) {
      score -= 100
    }

    if (isMixedProvider) {
      score -= 100
    }

    scoredProviders.push({
      accounts,
      chainId,
      identity,
      isMixedProvider,
      matchesWalletAddress,
      provider,
      score,
    })
  }

  return scoredProviders
}

function assertProviderUsable(provider: ResolvedWalletProvider) {
  if (provider.isMixedProvider) {
    throw new Error(WALLET_PROVIDER_CONFLICT_MESSAGE)
  }

  if (provider.provider.isTronLink) {
    throw new Error('当前选择的钱包不是 EVM 钱包 Provider，请重新连接 BSC 钱包后再试。')
  }
}

function sortByScore(left: ResolvedWalletProvider, right: ResolvedWalletProvider) {
  return right.score - left.score
}

export async function resolveWalletProvider({
  fallbackProvider,
  preferredIdentity,
  walletAddress,
}: {
  fallbackProvider?: Eip1193Provider
  preferredIdentity?: WalletProviderPreference
  walletAddress: string
}) {
  const scoredProviders = await scoreProviderCandidates(
    await listCandidateProviders(fallbackProvider),
    walletAddress,
    preferredIdentity,
  )
  const usableMatches = scoredProviders
    .filter((provider) => provider.matchesWalletAddress && !provider.provider.isTronLink)
    .sort(sortByScore)

  console.info('[wallet-provider] candidates', scoredProviders.map(describeResolvedProvider))

  if (hasProviderPreference(preferredIdentity)) {
    const preferredMatches = usableMatches.filter((provider) => isLikelySameIdentity(provider.identity, preferredIdentity))
    const selectedPreferredProvider = preferredMatches[0] ?? null

    if (!selectedPreferredProvider) {
      throw new Error(
        `当前登录态绑定的钱包是 ${preferredIdentity?.walletProviderName || preferredIdentity?.walletProviderId || '上次登录的钱包'}，但浏览器当前没有找到同一个 Provider。请断开钱包并重新连接该钱包后再试。`,
      )
    }

    assertProviderUsable(selectedPreferredProvider)
    console.info('[wallet-provider] selected bound provider', describeResolvedProvider(selectedPreferredProvider))
    return selectedPreferredProvider
  }

  const safeMatches = usableMatches.filter((provider) => !provider.isMixedProvider)
  const selectedProvider = safeMatches[0] ?? null

  if (!selectedProvider) {
    if (usableMatches.some((provider) => provider.isMixedProvider)) {
      throw new Error(WALLET_PROVIDER_CONFLICT_MESSAGE)
    }

    return null
  }

  const secondProvider = safeMatches[1]
  if (secondProvider && secondProvider.score === selectedProvider.score) {
    throw new Error(WALLET_PROVIDER_CONFLICT_MESSAGE)
  }

  console.info('[wallet-provider] selected provider', describeResolvedProvider(selectedProvider))
  return selectedProvider
}

export async function ensureWalletProviderBscNetwork({
  fallbackProvider,
  onSwitching,
  preferredIdentity,
  walletAddress,
}: {
  fallbackProvider?: Eip1193Provider
  onSwitching?: () => void
  preferredIdentity?: WalletProviderPreference
  walletAddress: string
}) {
  const selectedProvider = await resolveWalletProvider({
    fallbackProvider,
    preferredIdentity,
    walletAddress,
  })

  if (!selectedProvider) {
    throw new Error('未找到与当前登录地址匹配的钱包 Provider，请刷新页面并用当前钱包重新连接。')
  }

  const currentChainId = selectedProvider.chainId ?? (await getProviderChainId(selectedProvider.provider))
  if (currentChainId?.toLowerCase() === BSC_CHAIN_ID_HEX) {
    return selectedProvider
  }

  onSwitching?.()
  await selectedProvider.provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: BSC_CHAIN_ID_HEX }],
  })

  return selectedProvider
}

export async function sendContractTransaction({
  abi,
  address,
  args,
  fallbackProvider,
  from,
  functionName,
  preferredIdentity,
}: {
  abi: Abi
  address: string
  args: readonly unknown[]
  fallbackProvider?: Eip1193Provider
  from: string
  functionName: string
  preferredIdentity?: WalletProviderPreference
}) {
  const selectedProvider = await resolveWalletProvider({
    fallbackProvider,
    preferredIdentity,
    walletAddress: from,
  })

  if (!selectedProvider) {
    throw new Error('未找到与当前登录地址匹配的钱包 Provider，请刷新页面并用当前钱包重新连接。')
  }

  assertProviderUsable(selectedProvider)

  const hashResult = await selectedProvider.provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        data: encodeFunctionData({
          abi,
          args: args as readonly never[],
          functionName,
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
