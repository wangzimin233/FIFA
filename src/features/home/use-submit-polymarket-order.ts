import { toast } from '@heroui/react'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { queryClient } from '../../config/query-client'
import { createPolymarketOrder, type PolymarketCreateOrderRequest } from './api/polymarket-orders'
import { type MarketSelection, useOrderStore } from './order-store'

type OrderTarget = {
  eventSlug?: string
  marketSlug?: string
  marketId?: string
  conditionId?: string
  tokenId?: string
  negRisk?: boolean
}

export const MIN_POLYMARKET_ORDER_AMOUNT = 2

function resolveOrderTarget(selection: MarketSelection): OrderTarget {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes'
      ? {
          eventSlug: selection.eventSlug,
          marketSlug: selection.marketSlug,
          marketId: selection.marketId,
          conditionId: selection.conditionId,
          tokenId: selection.yesAssetId,
          negRisk: selection.negRisk,
        }
      : {
          eventSlug: selection.eventSlug,
          marketSlug: selection.marketSlug,
          marketId: selection.marketId,
          conditionId: selection.conditionId,
          tokenId: selection.noAssetId,
          negRisk: selection.negRisk,
        }
  }

  if (selection.template === 'spread') {
    const activeVariant =
      selection.variants.find((variant) => variant.id === selection.activeVariantId) ??
      selection.variants[0]

    return selection.activeTeamSide === 'home'
      ? {
          eventSlug: activeVariant?.eventSlug ?? selection.eventSlug,
          marketSlug: activeVariant?.marketSlug,
          marketId: activeVariant?.marketId ?? activeVariant?.id,
          conditionId: activeVariant?.conditionId,
          tokenId: activeVariant?.homeAssetId,
          negRisk: activeVariant?.negRisk,
        }
      : {
          eventSlug: activeVariant?.eventSlug ?? selection.eventSlug,
          marketSlug: activeVariant?.marketSlug,
          marketId: activeVariant?.marketId ?? activeVariant?.id,
          conditionId: activeVariant?.conditionId,
          tokenId: activeVariant?.awayAssetId,
          negRisk: activeVariant?.negRisk,
        }
  }

  const activeLine = selection.lines.find((line) => line.id === selection.activeLineId) ?? selection.lines[0]

  return selection.activeSide === 'over'
    ? {
        eventSlug: activeLine?.eventSlug ?? selection.eventSlug,
        marketSlug: activeLine?.marketSlug,
        marketId: activeLine?.marketId ?? activeLine?.id,
        conditionId: activeLine?.conditionId,
        tokenId: activeLine?.overAssetId,
        negRisk: activeLine?.negRisk,
      }
    : {
        eventSlug: activeLine?.eventSlug ?? selection.eventSlug,
        marketSlug: activeLine?.marketSlug,
        marketId: activeLine?.marketId ?? activeLine?.id,
        conditionId: activeLine?.conditionId,
        tokenId: activeLine?.underAssetId,
        negRisk: activeLine?.negRisk,
      }
}

function isSlippageMessage(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('滑点') || normalized.includes('slippage')
}

function isConditionId(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value)
}

export function buildPolymarketOrderPayload(
  selection: MarketSelection | null,
  amount: number,
): PolymarketCreateOrderRequest {
  if (!selection) {
    throw new Error('请先选择一个盘口。')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('请输入有效的下单金额。')
  }

  if (amount < MIN_POLYMARKET_ORDER_AMOUNT) {
    throw new Error(`最低下单金额为 ${MIN_POLYMARKET_ORDER_AMOUNT}。`)
  }

  const target = resolveOrderTarget(selection)
  if (!target.eventSlug) {
    throw new Error('当前盘口缺少 eventSlug，无法提交订单。')
  }

  if (!target.marketSlug) {
    throw new Error('当前盘口缺少 marketSlug，无法提交订单。')
  }

  if (!target.conditionId) {
    throw new Error('当前盘口缺少 market conditionId，无法提交订单。')
  }

  if (!isConditionId(target.conditionId)) {
    throw new Error('当前盘口 market 不是有效的 conditionId，无法提交订单。')
  }

  if (!target.marketId) {
    throw new Error('当前盘口缺少 Gamma marketId，无法提交订单。')
  }

  if (!target.tokenId) {
    throw new Error('当前盘口缺少 tokenId，无法提交订单。')
  }

  return {
    eventSlug: target.eventSlug,
    marketSlug: target.marketSlug,
    marketId: target.marketId,
    conditionId: target.conditionId,
    market: target.conditionId,
    tokenId: target.tokenId,
    amount,
    negRisk: target.negRisk ?? false,
  }
}

export function useSubmitPolymarketOrder() {
  const [slippageConfirmation, setSlippageConfirmation] = useState({ key: '', confirmed: false })
  const { activeSelection, amount } = useOrderStore()
  const orderKey = useMemo(() => {
    if (!activeSelection) {
      return ''
    }

    const target = resolveOrderTarget(activeSelection)
    return [activeSelection.template, target.conditionId, target.tokenId, amount].join('|')
  }, [activeSelection, amount])
  const slippageConfirmed = slippageConfirmation.key === orderKey && slippageConfirmation.confirmed
  const mutation = useMutation({
    mutationFn: (payload: PolymarketCreateOrderRequest) => createPolymarketOrder(payload),
    onSuccess: (result) => {
      const response = result.data
      const message = response?.errorMsg || result.message || '订单已提交'

      queryClient.invalidateQueries({ queryKey: ['wallet-user-info'] })
      queryClient.invalidateQueries({ queryKey: ['polymarket-orders'] })

      if (response?.success === false) {
        toast(message)
        return
      }

      toast.success(message)
      setSlippageConfirmation({ key: '', confirmed: false })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '提交订单失败。'
      if (isSlippageMessage(message)) {
        setSlippageConfirmation({ key: orderKey, confirmed: true })
        toast('价格滑点超过阈值，请再次点击确认交易。')
        return
      }

      toast(message)
    },
  })

  const payload = useMemo(() => {
    try {
      return buildPolymarketOrderPayload(activeSelection, amount)
    } catch {
      return null
    }
  }, [activeSelection, amount])

  const submitOrder = useCallback(() => {
    const nextPayload = buildPolymarketOrderPayload(activeSelection, amount)
    mutation.mutate(nextPayload)
  }, [activeSelection, amount, mutation])

  return {
    canSubmit: !!payload && !mutation.isPending,
    isSubmitting: mutation.isPending,
    slippageConfirmed,
    submitOrder,
  }
}
