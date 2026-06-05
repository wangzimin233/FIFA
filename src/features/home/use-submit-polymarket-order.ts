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
  eventTitle?: string
  eventTitleZh?: string
  marketTitle?: string
  marketTitleZh?: string
  outcomeTitle?: string
  outcomeTitleZh?: string
  acceptingOrders?: boolean
  tokenId?: string
  negRisk?: boolean
}

export const MIN_POLYMARKET_ORDER_AMOUNT = 2

function getFallbackText(value: string | undefined, fallback: string) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

function getBinaryOutcomeText(
  metadata: {
    yesOutcomeTitle?: string
    noOutcomeTitle?: string
    yesOutcomeTitleZh?: string
    noOutcomeTitleZh?: string
  },
  side: 'yes' | 'no',
) {
  return side === 'yes'
    ? {
        outcomeTitle: getFallbackText(metadata.yesOutcomeTitle, 'Yes'),
        outcomeTitleZh: getFallbackText(metadata.yesOutcomeTitleZh, '是'),
      }
    : {
        outcomeTitle: getFallbackText(metadata.noOutcomeTitle, 'No'),
        outcomeTitleZh: getFallbackText(metadata.noOutcomeTitleZh, '否'),
      }
}

function getWinnerOrderText(selection: Extract<MarketSelection, { template: 'winner' }>) {
  return {
    eventTitle: getFallbackText(selection.eventTitle, selection.title),
    eventTitleZh: getFallbackText(selection.eventTitleZh, selection.title),
    marketTitle: getFallbackText(selection.marketTitle, selection.subject),
    marketTitleZh: getFallbackText(selection.marketTitleZh, selection.subject),
    ...getBinaryOutcomeText(selection, selection.activeSide),
  }
}

function getSpreadFavoredSide(variant: Extract<MarketSelection, { template: 'spread' }>['variants'][number]) {
  if (variant.favoredSide) {
    return variant.favoredSide
  }

  return variant.homeHandicap.startsWith('-') ? 'home' : 'away'
}

function getSpreadOrderText(
  selection: Extract<MarketSelection, { template: 'spread' }>,
  variant: (typeof selection.variants)[number] | undefined,
) {
  const activeSide = variant && selection.activeTeamSide === getSpreadFavoredSide(variant) ? 'yes' : 'no'
  const selectedTeam = selection.activeTeamSide === 'home' ? selection.homeTeam : selection.awayTeam

  return {
    eventTitle: getFallbackText(variant?.eventTitle ?? selection.eventTitle, selection.title),
    eventTitleZh: getFallbackText(variant?.eventTitleZh ?? selection.eventTitleZh, selection.title),
    marketTitle: getFallbackText(variant?.marketTitle ?? selection.marketTitle, selectedTeam),
    marketTitleZh: getFallbackText(variant?.marketTitleZh ?? selection.marketTitleZh, selectedTeam),
    ...getBinaryOutcomeText(variant ?? selection, activeSide),
  }
}

function getTotalOrderText(
  selection: Extract<MarketSelection, { template: 'total' }>,
  line: (typeof selection.lines)[number] | undefined,
) {
  const lineLabel = selection.activeSide === 'over' ? `Over ${line?.line ?? ''}` : `Under ${line?.line ?? ''}`

  return {
    eventTitle: getFallbackText(line?.eventTitle ?? selection.eventTitle, selection.title),
    eventTitleZh: getFallbackText(line?.eventTitleZh ?? selection.eventTitleZh, selection.title),
    marketTitle: getFallbackText(line?.marketTitle ?? selection.marketTitle, lineLabel),
    marketTitleZh: getFallbackText(line?.marketTitleZh ?? selection.marketTitleZh, lineLabel),
    ...getBinaryOutcomeText(line ?? selection, selection.activeSide === 'over' ? 'yes' : 'no'),
  }
}

function resolveOrderTarget(selection: MarketSelection): OrderTarget {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes'
      ? {
          eventSlug: selection.eventSlug,
          marketSlug: selection.marketSlug,
          marketId: selection.marketId,
          conditionId: selection.conditionId,
          ...getWinnerOrderText(selection),
          acceptingOrders: selection.acceptingOrders,
          tokenId: selection.yesAssetId,
          negRisk: selection.negRisk,
        }
      : {
          eventSlug: selection.eventSlug,
          marketSlug: selection.marketSlug,
          marketId: selection.marketId,
          conditionId: selection.conditionId,
          ...getWinnerOrderText(selection),
          acceptingOrders: selection.acceptingOrders,
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
          ...getSpreadOrderText(selection, activeVariant),
          acceptingOrders: activeVariant?.acceptingOrders,
          tokenId: activeVariant?.homeAssetId,
          negRisk: activeVariant?.negRisk,
        }
      : {
          eventSlug: activeVariant?.eventSlug ?? selection.eventSlug,
          marketSlug: activeVariant?.marketSlug,
          marketId: activeVariant?.marketId ?? activeVariant?.id,
          conditionId: activeVariant?.conditionId,
          ...getSpreadOrderText(selection, activeVariant),
          acceptingOrders: activeVariant?.acceptingOrders,
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
        ...getTotalOrderText(selection, activeLine),
        acceptingOrders: activeLine?.acceptingOrders,
        tokenId: activeLine?.overAssetId,
        negRisk: activeLine?.negRisk,
      }
    : {
        eventSlug: activeLine?.eventSlug ?? selection.eventSlug,
        marketSlug: activeLine?.marketSlug,
        marketId: activeLine?.marketId ?? activeLine?.id,
        conditionId: activeLine?.conditionId,
        ...getTotalOrderText(selection, activeLine),
        acceptingOrders: activeLine?.acceptingOrders,
        tokenId: activeLine?.underAssetId,
        negRisk: activeLine?.negRisk,
      }
}

export function isSelectionAcceptingOrders(selection: MarketSelection | null) {
  if (!selection) {
    return false
  }

  return resolveOrderTarget(selection).acceptingOrders === true
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

  const target = resolveOrderTarget(selection)
  if (target.acceptingOrders !== true) {
    throw new Error('当前盘口暂不支持挂单。')
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('请输入有效的下单金额。')
  }

  if (amount < MIN_POLYMARKET_ORDER_AMOUNT) {
    throw new Error(`最低下单金额为 ${MIN_POLYMARKET_ORDER_AMOUNT}。`)
  }

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
    eventTitle: target.eventTitle ?? '',
    eventTitleZh: target.eventTitleZh ?? '',
    marketTitle: target.marketTitle ?? '',
    marketTitleZh: target.marketTitleZh ?? '',
    outcomeTitle: target.outcomeTitle ?? '',
    outcomeTitleZh: target.outcomeTitleZh ?? '',
    tokenId: target.tokenId,
    amount,
    negRisk: target.negRisk ?? false,
  }
}

export function useSubmitPolymarketOrder() {
  const [slippageConfirmation, setSlippageConfirmation] = useState({ key: '', confirmed: false })
  const { activeSelection, amount } = useOrderStore()
  const isAcceptingOrders = isSelectionAcceptingOrders(activeSelection)
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

      toast('提交订单失败，请稍后重试。')
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
    canSubmit: isAcceptingOrders && !!payload && !mutation.isPending,
    isAcceptingOrders,
    isSubmitting: mutation.isPending,
    slippageConfirmed,
    submitOrder,
  }
}
