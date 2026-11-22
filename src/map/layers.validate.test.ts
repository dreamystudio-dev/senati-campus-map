import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import type { StyleSpecification } from 'maplibre-gl'
import { PLACES_SOURCE_ID, HOVER_SOURCE_ID, placesLayers } from './layers'

it('produces a layer set that passes the MapLibre style spec', () => {
  const style = {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      [PLACES_SOURCE_ID]: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      [HOVER_SOURCE_ID]: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
    },
    layers: placesLayers(),
  } as unknown as StyleSpecification

  const errors = validateStyleMin(style as never)
  expect(errors.map((e) => `${e.message} (${e.identifier ?? 'style'})`)).toEqual([])
})
