import type { WorldId } from './types';

export interface WorldDefinition {
  id: WorldId;
  name: string;
  shortName: string;
  diagnosisTarget: string;
  gameGoal: string;
  color: string;
  enabledInMvp: boolean;
}

export const worlds: WorldDefinition[] = [
  {
    id: 'orbit-tracker',
    name: 'Orbit Tracker',
    shortName: 'Orbit',
    diagnosisTarget: 'Smooth pursuits and visually directed fine motor control',
    gameGoal: 'Keep the tractor beam locked onto the comet.',
    color: '#6cf0ff',
    enabledInMvp: true,
  },
  {
    id: 'star-jumper',
    name: 'Star Jumper',
    shortName: 'Jumper',
    diagnosisTarget: 'Saccades, localization, and visual-motor response',
    gameGoal: 'Tap jump gates before they disappear.',
    color: '#ffd166',
    enabledInMvp: false,
  },
  {
    id: 'focus-portal',
    name: 'Focus Portal',
    shortName: 'Portal',
    diagnosisTarget: 'Near-far accommodative flexibility',
    gameGoal: 'Decode glyphs near and far to stabilize the portal.',
    color: '#7dff9b',
    enabledInMvp: false,
  },
  {
    id: 'dual-signal',
    name: 'Dual-Signal Decoder',
    shortName: 'Decoder',
    diagnosisTarget: 'Binocular awareness and eye teaming',
    gameGoal: 'Read both alien signals and unlock the shield.',
    color: '#ff6b9d',
    enabledInMvp: false,
  },
];
