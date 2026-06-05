import type { MarketSelection } from '../home/order-store'
import { usePolymarketPriceStore } from './polymarket-price-store'

export function getDisplayPrice(
  priceByAssetId: Record<string, number>,
  assetId: string | undefined,
  fallbackPrice: number,
) {
  if (!assetId) {
    return fallbackPrice
  }

  const realtimePrice = priceByAssetId[assetId]
  return typeof realtimePrice === 'number' ? realtimePrice : fallbackPrice
}

function resolveSelectionPriceTarget(selection: MarketSelection) {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes'
      ? {
          assetId: selection.yesAssetId,
          fallbackPrice: selection.yesOrderPrice ?? selection.yesPrice,
        }
      : {
          assetId: selection.noAssetId,
          fallbackPrice: selection.noOrderPrice ?? selection.noPrice,
        }
  }

  if (selection.template === 'spread') {
    const activeVariant =
      selection.variants.find((variant) => variant.id === selection.activeVariantId) ??
      selection.variants[0]

    return selection.activeTeamSide === 'away'
      ? {
          assetId: activeVariant.awayAssetId,
          fallbackPrice: activeVariant.awayOrderPrice ?? activeVariant.awayPrice,
        }
      : {
          assetId: activeVariant.homeAssetId,
          fallbackPrice: activeVariant.homeOrderPrice ?? activeVariant.homePrice,
        }
  }

  const activeLine = selection.lines.find((line) => line.id === selection.activeLineId) ?? selection.lines[0]

  return selection.activeSide === 'over'
    ? {
        assetId: activeLine.overAssetId,
        fallbackPrice: activeLine.overOrderPrice ?? activeLine.overPrice,
      }
    : {
        assetId: activeLine.underAssetId,
        fallbackPrice: activeLine.underOrderPrice ?? activeLine.underPrice,
      }
}

function resolveSelectionDisplayPrice(selection: MarketSelection) {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes' ? selection.yesPrice : selection.noPrice
  }

  if (selection.template === 'spread') {
    const activeVariant =
      selection.variants.find((variant) => variant.id === selection.activeVariantId) ??
      selection.variants[0]

    return selection.activeTeamSide === 'away' ? activeVariant.awayPrice : activeVariant.homePrice
  }

  const activeLine = selection.lines.find((line) => line.id === selection.activeLineId) ?? selection.lines[0]
  return selection.activeSide === 'over' ? activeLine.overPrice : activeLine.underPrice
}

export function useDisplayPrice(assetId: string | undefined, fallbackPrice: number) {
  return usePolymarketPriceStore((state) => getDisplayPrice(state.displayPriceByAssetId, assetId, fallbackPrice))
}

export function useActiveSelectionPrice(selection: MarketSelection | null | undefined) {
  return selection ? resolveSelectionDisplayPrice(selection) : null
}

export function getActiveSelectionPrice(
  selection: MarketSelection,
  priceByAssetId: Record<string, number>,
) {
  const target = resolveSelectionPriceTarget(selection)
  return getDisplayPrice(priceByAssetId, target.assetId, target.fallbackPrice)
}
