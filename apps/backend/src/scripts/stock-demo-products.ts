/**
 * Demo data only — gives every demo-* product variant stock at the store's
 * stock location, so the demo catalog can be added to a cart. The demo seed
 * creates inventory items but no stock levels, which leaves them at 0.
 *
 *   npx medusa exec ./src/scripts/stock-demo-products.ts
 *
 * Re-running it is a no-op: variants that already have a level at the
 * location are skipped.
 */
import { createInventoryLevelsWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import type { ExecArgs } from '@medusajs/framework/types'

const HANDLE_PREFIX = 'demo-'
const STOCKED_QUANTITY = 100

export default async function stockDemoProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: locations } = await query.graph({
    entity: 'stock_location',
    fields: ['id', 'name'],
  })
  if (locations.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected exactly one stock location, found ${locations.length}`
    )
  }
  const location = locations[0]

  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      'handle',
      'variants.inventory_items.inventory_item_id',
      'variants.inventory_items.inventory.location_levels.location_id',
    ],
  })

  const itemIds = new Set<string>()
  for (const product of products) {
    if (!product.handle?.startsWith(HANDLE_PREFIX)) continue
    for (const variant of product.variants ?? []) {
      for (const link of variant?.inventory_items ?? []) {
        const levels = link?.inventory?.location_levels ?? []
        if (link?.inventory_item_id && !levels.some((l) => l?.location_id === location.id)) {
          itemIds.add(link.inventory_item_id)
        }
      }
    }
  }

  if (itemIds.size === 0) {
    logger.info('Every demo variant already has stock at the location. Nothing to do.')
    return
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: [...itemIds].map((inventory_item_id) => ({
        inventory_item_id,
        location_id: location.id,
        stocked_quantity: STOCKED_QUANTITY,
      })),
    },
  })

  logger.info(
    `Stocked ${itemIds.size} demo inventory items with ${STOCKED_QUANTITY} units at "${location.name}".`
  )
}
