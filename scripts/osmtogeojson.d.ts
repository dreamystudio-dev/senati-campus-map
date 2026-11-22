declare module 'osmtogeojson' {
  import type { FeatureCollection } from 'geojson'
  function osmtogeojson(osm: unknown): FeatureCollection
  export default osmtogeojson
}
