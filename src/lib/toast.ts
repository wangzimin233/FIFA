import { toast as heroToast } from '@heroui/react'
import type { ReactNode } from 'react'

const DEFAULT_TOAST_TIMEOUT = 2000

type ToastOptions = Parameters<typeof heroToast>[1]
type ToastVariantOptions = Parameters<typeof heroToast.success>[1]
type ToastPromiseOptions<T> = Parameters<typeof heroToast.promise<T>>[1]

function withDefaultTimeout<T extends ToastOptions | ToastVariantOptions>(options: T) {
  return {
    ...options,
    timeout: options?.timeout ?? DEFAULT_TOAST_TIMEOUT,
  }
}

function toast(message: ReactNode, options?: ToastOptions) {
  return heroToast(message, withDefaultTimeout(options))
}

toast.success = (message: ReactNode, options?: ToastVariantOptions) =>
  heroToast.success(message, withDefaultTimeout(options))

toast.danger = (message: ReactNode, options?: ToastVariantOptions) =>
  heroToast.danger(message, withDefaultTimeout(options))

toast.info = (message: ReactNode, options?: ToastVariantOptions) =>
  heroToast.info(message, withDefaultTimeout(options))

toast.warning = (message: ReactNode, options?: ToastVariantOptions) =>
  heroToast.warning(message, withDefaultTimeout(options))

toast.promise = <T>(promise: Promise<T> | (() => Promise<T>), options: ToastPromiseOptions<T>) => {
  const promiseValue = typeof promise === 'function' ? promise() : promise
  const loadingId = heroToast(options.loading, { isLoading: true, timeout: 0 })

  promiseValue
    .then((data) => {
      heroToast.close(loadingId)
      const message = typeof options.success === 'function' ? options.success(data) : options.success
      toast.success(message)
    })
    .catch((error: Error) => {
      heroToast.close(loadingId)
      const message = typeof options.error === 'function' ? options.error(error) : options.error
      toast.danger(message)
    })

  return loadingId
}

toast.getQueue = () => heroToast.getQueue()
toast.close = (key: string) => heroToast.close(key)
toast.pauseAll = () => heroToast.pauseAll()
toast.resumeAll = () => heroToast.resumeAll()
toast.clear = () => heroToast.clear()

export { DEFAULT_TOAST_TIMEOUT, toast }
