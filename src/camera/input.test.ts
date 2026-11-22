// src/camera/input.test.ts
import { inputFromKeys } from './input'

it('maps WASD and QE to movement intent', () => {
  expect(inputFromKeys({ KeyW: true, KeyD: true })).toMatchObject({ forward: true, right: true, back: false })
  expect(inputFromKeys({ KeyQ: true })).toMatchObject({ down: true })
  expect(inputFromKeys({ KeyE: true })).toMatchObject({ up: true })
})

it('ignores unrelated keys', () => {
  expect(inputFromKeys({ KeyZ: true })).toEqual({
    forward: false, back: false, left: false, right: false, up: false, down: false, sprint: false,
  })
})
