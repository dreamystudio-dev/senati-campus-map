import type { CameraMode } from '../store'

export function controlsFor(mode: CameraMode, locked: boolean, lockRefused = false): string[] {
  if (mode === 'top') {
    return ['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate']
  }

  // mode === 'free': the camera loop only runs while pointer lock is held.
  if (locked) {
    return ['WASD to move', 'Mouse to look', 'Q / E for height', 'Esc to release']
  }

  // After Esc the camera is frozen; drag-look exists only for the refused-lock fallback.
  return lockRefused ? ['Drag to look'] : ['Click map to lock']
}
