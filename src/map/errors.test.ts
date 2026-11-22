import { isFatalMapError } from './errors'

it('treats a tile source failure as fatal even without an HTTP status', () => {
  // A blocked or offline tile request reports status 0 in MapLibre.
  expect(isFatalMapError({ sourceId: 'openmaptiles', error: { status: 0 } })).toBe(true)
  expect(isFatalMapError({ sourceId: 'openmaptiles', error: { status: 500 } })).toBe(true)
})

it('ignores source-less glyph, sprite and internal errors', () => {
  expect(isFatalMapError({ error: { status: 404, message: 'glyph not found' } })).toBe(false)
  expect(isFatalMapError({ error: new Error('sprite failed') })).toBe(false)
  expect(isFatalMapError({})).toBe(false)
})
