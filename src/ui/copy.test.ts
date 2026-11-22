// src/ui/copy.test.ts
import { controlsFor } from './copy'

it('describes the only camera mode', () => {
  expect(controlsFor()).toEqual(['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate and tilt'])
})
