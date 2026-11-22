import type { InputState } from './player'

export interface KeyState {
  [code: string]: boolean
}

export function sprintFromKeys(keys: KeyState): boolean {
  return Boolean(keys['ShiftLeft'] || keys['ShiftRight'])
}

export function inputFromKeys(keys: KeyState): InputState {
  return {
    forward: Boolean(keys['KeyW'] || keys['ArrowUp']),
    back: Boolean(keys['KeyS'] || keys['ArrowDown']),
    left: Boolean(keys['KeyA'] || keys['ArrowLeft']),
    right: Boolean(keys['KeyD'] || keys['ArrowRight']),
    up: Boolean(keys['KeyE'] || keys['Space']),
    down: Boolean(keys['KeyQ'] || keys['ControlLeft'] || keys['ControlRight']),
    sprint: sprintFromKeys(keys),
  }
}
