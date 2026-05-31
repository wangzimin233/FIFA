import { createAppKit } from '@reown/appkit/react'
import { bsc } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { env, hasReownProjectId } from './env'

const projectId = env.reownProjectId || 'demo-project-id'

const metadata = {
  name: env.appName,
  description: 'FIFA Web3 dashboard scaffold',
  url: env.appUrl,
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

export const networks = [bsc] as const

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

declare global {
  var __FIFA_APPKIT_READY__: boolean | undefined
}

if (!globalThis.__FIFA_APPKIT_READY__) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [...networks],
    defaultNetwork: bsc,
    metadata,
    features: {
      analytics: false,
      email: false,
      socials: [],
      swaps: false,
      onramp: false,
      history: true,
    },
    themeMode: 'dark',
  })

  globalThis.__FIFA_APPKIT_READY__ = true
}

export { hasReownProjectId }
