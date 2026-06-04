import { toast } from '@heroui/react'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { queryClient } from '../../config/query-client'
import { usePolymarketPriceStore } from '../market-realtime/polymarket-price-store'
import { getActiveSelectionPrice } from '../market-realtime/price-utils'
import { createPolymarketOrder, type PolymarketCreateOrderRequest } from './api/polymarket-orders'
import { type MarketSelection, useOrderStore } from './order-store'

type OrderTarget = {
  market?: string
  tokenId?: string
  negRisk?: boolean
}

export const MIN_POLYMARKET_ORDER_AMOUNT = 2

function toOrderPrice(cents: number) {
  return Math.round((cents / 100) * 1_000_000) / 1_000_000
}

function resolveOrderTarget(selection: MarketSelection): OrderTarget {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes'
      ? {
          market: selection.marketId,
          tokenId: selection.yesAssetId,
          negRisk: selection.negRisk,
        }
      : {
          market: selection.marketId,
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
          market: activeVariant?.marketId ?? activeVariant?.id,
          tokenId: activeVariant?.homeAssetId,
          negRisk: activeVariant?.negRisk,
        }
      : {
          market: activeVariant?.marketId ?? activeVariant?.id,
          tokenId: activeVariant?.awayAssetId,
          negRisk: activeVariant?.negRisk,
        }
  }

  const activeLine = selection.lines.find((line) => line.id === selection.activeLineId) ?? selection.lines[0]

  return selection.activeSide === 'over'
    ? {
        market: activeLine?.marketId ?? activeLine?.id,
        tokenId: activeLine?.overAssetId,
        negRisk: activeLine?.negRisk,
      }
    : {
        market: activeLine?.marketId ?? activeLine?.id,
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
  priceByAssetId: Record<string, number>,
  slippageConfirmed: boolean,
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
  if (!target.market) {
    throw new Error('当前盘口缺少 market conditionId，无法提交订单。')
  }

  if (!isConditionId(target.market)) {
    throw new Error('当前盘口 market 不是有效的 conditionId，无法提交订单。')
  }

  if (!target.tokenId) {
    throw new Error('当前盘口缺少 tokenId，无法提交订单。')
  }

  const activePrice = getActiveSelectionPrice(selection, priceByAssetId)
  if (!Number.isFinite(activePrice) || activePrice <= 0 || activePrice >= 100) {
    throw new Error('当前盘口价格无效，无法提交订单。')
  }

  const price = toOrderPrice(activePrice)

  return {
    market: target.market,
    tokenId: target.tokenId,
    price,
    currentPrice: price,
    amount,
    negRisk: target.negRisk ?? false,
    slippageConfirmed,
  }
}

export function useSubmitPolymarketOrder() {
  const [slippageConfirmation, setSlippageConfirmation] = useState({ key: '', confirmed: false })
  const { activeSelection, amount } = useOrderStore()
  const priceByAssetId = usePolymarketPriceStore((state) => state.priceByAssetId)
  const orderKey = useMemo(() => {
    if (!activeSelection) {
      return ''
    }

    const target = resolveOrderTarget(activeSelection)
    return [activeSelection.template, target.market, target.tokenId, amount].join('|')
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
      return buildPolymarketOrderPayload(activeSelection, amount, priceByAssetId, slippageConfirmed)
    } catch {
      return null
    }
  }, [activeSelection, amount, priceByAssetId, slippageConfirmed])

  const submitOrder = useCallback(() => {
    const nextPayload = buildPolymarketOrderPayload(activeSelection, amount, priceByAssetId, slippageConfirmed)
    mutation.mutate(nextPayload)
  }, [activeSelection, amount, mutation, priceByAssetId, slippageConfirmed])

  return {
    canSubmit: !!payload && !mutation.isPending,
    isSubmitting: mutation.isPending,
    slippageConfirmed,
    submitOrder,
  }
}
