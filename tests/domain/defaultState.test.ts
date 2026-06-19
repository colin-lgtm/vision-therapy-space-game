import { describe, expect, it } from 'vitest';
import { createDefaultState, enabledWorlds } from '@/state/defaultState';

describe('default academy state', () => {
  it('starts with every game unlocked and ready at level one', () => {
    const state = createDefaultState();

    expect(state.profile.unlockedWorlds).toEqual(enabledWorlds);
    for (const worldId of enabledWorlds) {
      expect(state.progress[worldId].level).toBe(1);
    }
  });
});
