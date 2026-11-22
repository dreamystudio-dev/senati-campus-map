import type { CameraMode } from '../store'

export function controlsFor(mode: CameraMode, locked: boolean): string[] {
  if (mode === 'top') {
    return ['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate']
  }

  // mode === 'free'
  if (locked) {
    return ['WASD to move', 'Mouse to look', 'Q / E for height', 'Esc to release']
  }

  return ['WASD to move', 'Drag to look', 'Q / E for height', 'Click map to lock']
}
