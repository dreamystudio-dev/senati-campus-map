export type CategoryId =
  | 'education'
  | 'food'
  | 'market'
  | 'shop'
  | 'park'
  | 'sport'
  | 'worship'
  | 'finance'
  | 'fuel'
  | 'art'
  | 'parking'
  | 'construction'
  | 'health'
  | 'community'
  | 'transit'
  | 'entertainment'
  | 'facilities'

export type MarkStyle = 'fill' | 'outline'

export interface Category {
  id: CategoryId
  label: string
  color: string
  style: MarkStyle
  genericLabel?: string
  matches: (tags: Record<string, string>) => boolean
}

export const CATEGORIES: Category[] = [
  {
    id: 'education',
    label: 'Education',
    color: '#5aa9e6', // sky
    style: 'outline',
    matches: (tags) =>
      ['college', 'university', 'school', 'kindergarten', 'prep_school'].includes(tags.amenity) ||
      tags.office === 'educational_institution',
  },
  {
    id: 'food',
    label: 'Food & Drink',
    color: '#ef6f6c', // coral
    style: 'fill',
    matches: (tags) =>
      ['cafe', 'restaurant', 'fast_food', 'bar', 'ice_cream', 'food_court'].includes(tags.amenity),
  },
  {
    id: 'market',
    label: 'Market',
    color: '#f2b134', // amber
    style: 'fill',
    matches: (tags) => tags.amenity === 'marketplace',
  },
  {
    id: 'shop',
    label: 'Shop',
    color: '#9b7ede', // violet
    style: 'fill',
    matches: (tags) => Boolean(tags.shop),
  },
  {
    id: 'park',
    label: 'Park & Garden',
    color: '#8bc34a', // lime
    style: 'outline',
    genericLabel: 'Park',
    matches: (tags) => ['park', 'garden'].includes(tags.leisure),
  },
  {
    id: 'sport',
    label: 'Sport',
    color: '#2ec4b6', // teal
    style: 'outline',
    genericLabel: 'Pitch',
    matches: (tags) => ['pitch', 'sports_centre', 'stadium', 'recreation_ground'].includes(tags.leisure),
  },
  {
    id: 'worship',
    label: 'Worship',
    color: '#e56b9f', // pink
    style: 'fill',
    matches: (tags) => tags.amenity === 'place_of_worship',
  },
  {
    id: 'finance',
    label: 'Finance',
    color: '#e8e2d6', // bone
    style: 'outline',
    matches: (tags) => ['bank', 'atm'].includes(tags.amenity),
  },
  {
    id: 'fuel',
    label: 'Fuel',
    color: '#f08a3c', // orange
    style: 'fill',
    matches: (tags) => tags.amenity === 'fuel',
  },
  {
    id: 'art',
    label: 'Art',
    color: '#e8e2d6', // bone
    style: 'fill',
    matches: (tags) => tags.tourism === 'artwork',
  },
  {
    id: 'parking',
    label: 'Parking',
    color: '#6b7a8f', // slate
    style: 'outline',
    genericLabel: 'Parking',
    matches: (tags) => tags.amenity === 'parking',
  },
  {
    id: 'construction',
    label: 'Construction',
    color: '#6b7a8f', // slate
    style: 'outline',
    genericLabel: 'Construction',
    matches: (tags) => ['construction', 'brownfield'].includes(tags.landuse),
  },
  {
    id: 'health',
    label: 'Health',
    color: '#2ec4b6', // teal
    style: 'fill',
    matches: (tags) =>
      ['pharmacy', 'veterinary', 'clinic', 'hospital', 'doctors', 'dentist'].includes(tags.amenity),
  },
  {
    id: 'community',
    label: 'Community',
    color: '#5aa9e6', // sky
    style: 'outline',
    matches: (tags) =>
      ['post_office', 'courthouse', 'library', 'community_centre', 'townhall'].includes(tags.amenity) ||
      tags.tourism === 'information',
  },
  {
    id: 'transit',
    label: 'Transit',
    color: '#6b7a8f', // slate
    style: 'fill',
    matches: (tags) => tags.amenity === 'bus_station' || tags.public_transport === 'station',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    color: '#9b7ede', // violet
    style: 'fill',
    matches: (tags) =>
      ['cinema', 'theatre', 'nightclub', 'casino'].includes(tags.amenity) ||
      tags.tourism === 'theme_park' ||
      tags.leisure === 'dance',
  },
  {
    id: 'facilities',
    label: 'Facilities',
    color: '#f2b134', // amber
    style: 'outline',
    matches: (tags) => ['toilets', 'charging_station', 'fountain', 'drinking_water'].includes(tags.amenity),
  },
]

export const CATEGORY_BY_ID: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat
    return acc
  },
  {} as Record<CategoryId, Category>,
)

export function resolveCategory(tags: Record<string, string>): Category | null {
  for (const category of CATEGORIES) {
    if (category.matches(tags)) {
      return category
    }
  }
  return null
}
