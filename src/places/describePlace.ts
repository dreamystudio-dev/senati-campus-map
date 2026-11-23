import { CATEGORY_BY_ID, type CategoryId } from '../categories'

export interface PlacePropsInput {
  id: string
  name?: string
  category?: CategoryId | null
  kind?: string
  geometryType: 'building' | 'area' | 'point'
  levels?: number
  heightM?: number
  labelLng?: number
  labelLat?: number
  [key: string]: unknown
}

export interface PlaceSummary {
  id: string
  title: string
  categoryLabel: string
  meta: string[]
}

export function describePlace(p: PlacePropsInput): PlaceSummary {
  const cat = p.category ? CATEGORY_BY_ID[p.category] : null

  let title = p.name ?? ''
  if (!title) {
    if (cat?.genericLabel) {
      title = cat.genericLabel
    } else if (p.category) {
      title = `Unnamed ${p.category}`
    }
  }

  const categoryLabel = cat?.label ?? ''
  const meta: string[] = categoryLabel ? [categoryLabel] : []

  if (p.levels !== undefined) {
    meta.push(`${p.levels} level${p.levels === 1 ? '' : 's'}`)
  }

  if (p.heightM !== undefined) {
    meta.push(`${p.heightM.toFixed(1).replace(/\.0$/, '')} m`)
  }

  return {
    id: p.id,
    title,
    categoryLabel,
    meta,
  }
}
