// src/ui/copy.test.ts
import { controlsFor } from './copy'

it('describes top view controls', () => {
  expect(controlsFor('top', false)).toEqual(['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate'])
})

it('describes free view controls, and the drag fallback when unlocked', () => {
  expect(controlsFor('free', true)).toEqual(['WASD to move', 'Mouse to look', 'Q / E for height', 'Esc to release'])
  expect(controlsFor('free', false)).toContain('Drag to look')
})
