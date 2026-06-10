import type { AxiosError } from 'axios'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import i18n from '../../../config/i18n'
import { toast } from '../../../lib/toast'
import type { WalletUserInfoResponse } from '../../wallet-auth/api'
import type { WalletContractConfigResponse } from '../deposit/api'
import { isAddressLike } from '../deposit/contracts'
import { applyWithdraw } from './api'

export type WithdrawStatus = 'idle' | 'applying' | 'success' | 'error'

function resolveErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>
  const serverMessage = axiosError.response?.data?.message?.trim()

  if (serverMessage) {
    return serverMessage
  }

  if ((error as { shortMessage?: string })?.shortMessage) {
    return (error as { shortMessage: string }).shortMessage
  }

  if ((error as { message?: string })?.message) {
    return (error as { message: string }).message
  }

  return i18n.t('withdraw.errors.failed')
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

  const [status, setStatus] = useState<WithdrawStatus>('idle')
  const [error, setError] = useState<string | null>(null)

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

  const submitWithdraw = useCallback(
    async (amountInput: string) => {
      if (!isConnected || !walletAddress || !isAddressLike(walletAddress)) {
        setStatus('error')
        setError(i18n.t('walletAuth.errors.connectFirst'))
        return
      }

      if (!isSessionReady) {
        setStatus('error')
        setError(i18n.t('withdraw.errors.loginFirst'))
        return
      }

      if (!contractConfig) {
        setStatus('error')
        setError(i18n.t('withdraw.errors.configLoading'))
        return
      }

      const normalizedAmount = amountInput.trim()
      const amount = Number(normalizedAmount)
      const minAmount = Number(contractConfig.withdrawMinAmount)
      const maxAmount = Number(contractConfig.withdrawMaxAmount)
      const currentAvailableBalance = Number(availableBalance)

      if (!normalizedAmount || Number.isNaN(amount) || amount <= 0) {
        setStatus('error')
        setError(i18n.t('withdraw.errors.invalidAmount'))
        return
      }

      if (Number.isFinite(minAmount) && minAmount > 0 && amount < minAmount) {
        setStatus('error')
        setError(i18n.t('withdraw.errors.minAmount', { amount: contractConfig.withdrawMinAmount }))
        return
      }

      if (Number.isFinite(maxAmount) && maxAmount > 0 && amount > maxAmount) {
        setStatus('error')
        setError(i18n.t('withdraw.errors.maxAmount', { amount: contractConfig.withdrawMaxAmount }))
        return
      }

      if (Number.isFinite(currentAvailableBalance) && currentAvailableBalance > 0 && amount > currentAvailableBalance) {
        setStatus('error')
        setError(i18n.t('withdraw.errors.exceedsBalance'))
        return
      }

      setError(null)

      try {
        setStatus('applying')
        const applyResult = await applyWithdraw({
          amount,
        })

        if (!applyResult.data) {
          throw new Error(applyResult.message || i18n.t('withdraw.errors.applyFailed'))
        }

        setStatus('success')
        await invalidateWalletData()
        await onSuccess?.()
        toast.success(applyResult.message || i18n.t('withdraw.success.submitted'))
      } catch (error) {
        setStatus('error')
        setError(resolveErrorMessage(error))
      }
    },
    [availableBalance, contractConfig, invalidateWalletData, isConnected, isSessionReady, onSuccess, walletAddress],
  )

  return {
    availableBalance,
    error,
    isBusy: status === 'applying',
    status,
    submitWithdraw,
  }
}
