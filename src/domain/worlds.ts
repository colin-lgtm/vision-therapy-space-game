import type { WorldId } from './types';

export interface WorldDefinition {
  id: WorldId;
  name: string;
  shortName: string;
  diagnosisTarget: string;
  gameGoal: string;
  playerAction: string;
  briefing: string;
  color: string;
  unlockStars: number;
  enabledInMvp: boolean;
  visualKind: 'comet' | 'gate' | 'portal' | 'decoder';
}

export const worlds: WorldDefinition[] = [
  {
    id: 'orbit-tracker',
    name: 'Orbit Tracker',
    shortName: 'Orbit',
    diagnosisTarget: 'Smooth pursuits and visually directed fine motor control',
    gameGoal: 'Lock on, defend the orbit, and blast meteors and alien ships.',
    playerAction: 'Track the comet, then tap or click while locked to fire.',
    briefing:
      'Orbit Tracker. Keep your finger, pen, or mouse locked on the comet. When the lock is strong, tap or click to fire at meteors and alien ships before they break the orbit.',
    color: '#6cf0ff',
    unlockStars: 0,
    enabledInMvp: true,
    visualKind: 'comet',
  },
  {
    id: 'star-jumper',
    name: 'Star Jumper',
    shortName: 'Jumper',
    diagnosisTarget: 'Saccades, localization, and visual-motor response',
    gameGoal: 'Jump the ship from the green star to the red gate.',
    playerAction: 'Tap the red destination before it closes, and avoid blue decoys.',
    briefing:
      'Star Jumper. The ship starts on the green star. Tap the red destination gate fast and ignore blue space decoys.',
    color: '#ffd166',
    unlockStars: 6,
    enabledInMvp: true,
    visualKind: 'gate',
  },
  {
    id: 'focus-portal',
    name: 'Focus Portal',
    shortName: 'Portal',
    diagnosisTarget: 'Near-far accommodative flexibility',
    gameGoal: 'Decode glyphs near and far to stabilize the portal.',
    playerAction: 'Read a near code, look to the wall target, then match the symbol.',
    briefing:
      'Focus Portal. Decode a close-up space symbol, then look far away to recharge the portal before matching the code.',
    color: '#7dff9b',
    unlockStars: 12,
    enabledInMvp: true,
    visualKind: 'portal',
  },
  {
    id: 'dual-signal',
    name: 'Dual-Signal Decoder',
    shortName: 'Decoder',
    diagnosisTarget: 'Binocular awareness and eye teaming',
    gameGoal: 'Read both alien signals and unlock the shield.',
    playerAction: 'Use the color glasses setup and report both signals.',
    briefing:
      'Dual Signal Decoder. Two alien signals appear at once. Decode both signals to calibrate the academy shield.',
    color: '#ff6b9d',
    unlockStars: 18,
    enabledInMvp: false,
    visualKind: 'decoder',
  },
];
