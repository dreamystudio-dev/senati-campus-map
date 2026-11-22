import type { StyleSpecification, LayerSpecification } from 'maplibre-gl'

export function sanitizeStyle(style: StyleSpecification): StyleSpecification {
  const filteredLayers = style.layers.filter((layer: LayerSpecification) => {
    const id = layer.id
    if (id.startsWith('building') || id.startsWith('poi')) {
      return false
    }
    return true
  })

  return {
    ...style,
    layers: filteredLayers,
  }
}
