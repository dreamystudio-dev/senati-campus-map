export interface MapErrorEventLike {
  sourceId?: string
  error?: unknown
}

/**
 * MapLibre reports tile failures with the source id attached (status is 0 for
 * an aborted or offline request). Source-less errors are glyph, sprite or
 * internal messages: they leave a usable map, so they must not replace it with
 * the error overlay.
 */
export function isFatalMapError(event: MapErrorEventLike): boolean {
  return Boolean(event?.sourceId && event?.error)
}
