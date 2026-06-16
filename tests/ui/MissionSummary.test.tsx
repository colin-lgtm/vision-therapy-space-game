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

  it('shows Focus Portal stops instead of crash count as the reward metric', () => {
    const result: MissionResult = {
      worldId: 'focus-portal',
      level: 2,
      inputKind: 'touch',
      status: 'completed',
      score: 680,
      activeSeconds: 50,
      metrics: {
        accuracy: 84,
        completedCycles: 11,
        crashes: 0,
      },
    };

    render(<MissionSummary result={result} onContinue={vi.fn()} />);

    expect(screen.getByText('Code Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Stops')).toBeInTheDocument();
    expect(screen.queryByText('Crashes')).not.toBeInTheDocument();
  });
});
