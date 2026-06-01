import { useEffect, useMemo, useRef } from 'react'
import { usePolymarketPriceStore } from './polymarket-price-store'

export function usePolymarketAssetSubscription(assetIds: Array<string | undefined | null>) {
  const subscribeAssets = usePolymarketPriceStore((state) => state.subscribeAssets)
  const unsubscribeAssets = usePolymarketPriceStore((state) => state.unsubscribeAssets)
  const previousAssetIdsRef = useRef<string[]>([])

  const normalizedAssetIds = useMemo(
    () =>
      Array.from(
        new Set(
          assetIds
            .map((assetId) => assetId?.trim())
            .filter((assetId): assetId is string => Boolean(assetId)),
        ),
      ),
    [assetIds],
  )

  const subscriptionKey = normalizedAssetIds.join('|')

  useEffect(() => {
    const previousAssetIds = previousAssetIdsRef.current
    const previousAssetIdSet = new Set(previousAssetIds)
    const nextAssetIdSet = new Set(normalizedAssetIds)
    const addedAssetIds = normalizedAssetIds.filter((assetId) => !previousAssetIdSet.has(assetId))
    const removedAssetIds = previousAssetIds.filter((assetId) => !nextAssetIdSet.has(assetId))

    if (addedAssetIds.length) {
      subscribeAssets(addedAssetIds)
    }

    if (removedAssetIds.length) {
      unsubscribeAssets(removedAssetIds)
    }

    previousAssetIdsRef.current = normalizedAssetIds
  }, [normalizedAssetIds, subscribeAssets, subscriptionKey, unsubscribeAssets])

  useEffect(
    () => () => {
      if (!previousAssetIdsRef.current.length) {
        return
      }

      unsubscribeAssets(previousAssetIdsRef.current)
      previousAssetIdsRef.current = []
    },
    [unsubscribeAssets],
  )
}
