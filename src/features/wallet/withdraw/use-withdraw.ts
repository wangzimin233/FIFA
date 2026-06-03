import type { AxiosError } from 'axios'
import { useCallback, useMemo, useState } from 'react'
import { toast } from '@heroui/react'
import { useAppKitProvider } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { BaseError, ContractFunctionRevertedError, type Hash } from 'viem'
import { parseUnits } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { withdrawClaimAbi } from '../../../config/contracts'
import type { WalletUserInfoResponse } from '../../wallet-auth/api'
import type { WalletContractConfigResponse } from '../deposit/api'
import { BSC_CHAIN_ID, BSC_USDT_DECIMALS, CONTRACT_TYPE_WITHDRAW, isAddressLike } from '../deposit/contracts'
import { applyWithdraw, notifyWithdrawCallback, type WithdrawApplyResponse } from './api'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>
}

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
  const { data: walletClient } = useWalletClient()
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155')

  const [status, setStatus] = useState<WithdrawStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastCallbackState, setLastCallbackState] = useState<WithdrawCallbackState | null>(null)
  const [lastSuccessHash, setLastSuccessHash] = useState<Hash | null>(null)

  const withdrawContractAddress = useMemo(
    () => resolveWithdrawContractAddress(contractConfig),
    [contractConfig],
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

      if (!publicClient || !walletClient) {
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
        const claimRequest = await publicClient.simulateContract({
          address: withdrawContractAddress,
          abi: withdrawClaimAbi,
          functionName: 'claimUSDT',
          args: [claimArgs.bizId, claimArgs.rewardType, claimArgs.amount, claimArgs.to],
          account: walletAddress,
        })
        const claimHash = await walletClient.writeContract(claimRequest.request)

        setStatus('confirming')
        await publicClient.waitForTransactionReceipt({
          hash: claimHash,
        })

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
      publicClient,
      runCallback,
      walletAddress,
      walletClient,
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
    retryCallback,
    status,
    submitWithdraw,
    withdrawContractAddress,
  }
}
