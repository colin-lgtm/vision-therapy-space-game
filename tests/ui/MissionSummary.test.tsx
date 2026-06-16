import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MissionSummary } from '@/ui/screens/MissionSummary';
import type { MissionResult } from '@/domain/types';

describe('MissionSummary', () => {
  it('shows Star Jumper metrics instead of Orbit Tracker beam lock metrics', () => {
    const result: MissionResult = {
      worldId: 'star-jumper',
      level: 1,
      inputKind: 'mouse',
      status: 'completed',
      score: 640,
      activeSeconds: 44,
      metrics: {
        hitRate: 72,
        bestCombo: 5,
        hits: 11,
      },
    };

    render(<MissionSummary result={result} onContinue={vi.fn()} />);

    expect(screen.getByText('Jump Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Best Combo')).toBeInTheDocument();
    expect(screen.queryByText('Beam Lock')).not.toBeInTheDocument();
    expect(screen.queryByText('undefined%')).not.toBeInTheDocument();
  });
});
