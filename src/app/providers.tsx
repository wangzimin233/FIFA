import { ToastProvider } from '@heroui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { queryClient } from '../config/query-client'
import { wagmiConfig } from '../config/web3'
import { router } from './router'

export function AppProviders() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastProvider placement="top" />
        {import.meta.env.DEV ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        ) : null}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
