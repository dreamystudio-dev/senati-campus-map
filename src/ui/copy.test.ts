// src/ui/copy.test.ts
import { controlsFor } from './copy'

it('describes top view controls', () => {
  expect(controlsFor('top', false)).toEqual(['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate'])
})

it('describes the locked free-view controls', () => {
  expect(controlsFor('free', true)).toEqual(['WASD to move', 'Mouse to look', 'Q / E for height', 'Esc to release'])
})

it('advertises only click-to-lock after Escape freezes the camera', () => {
  expect(controlsFor('free', false, false)).toEqual(['Click map to lock'])
})

it('advertises only drag-look when pointer lock was refused', () => {
  expect(controlsFor('free', false, true)).toEqual(['Drag to look'])
})
