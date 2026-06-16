import { ArrowRight, Star, Trophy } from 'lucide-react';
import { starsForScore } from '@/domain/progression';
import { missionAccuracyLabel } from '@/state/useAcademyStore';
import type { MissionResult } from '@/domain/types';

interface MissionSummaryProps {
  result: MissionResult;
  onContinue: () => void;
}

export function MissionSummary({ result, onContinue }: MissionSummaryProps) {
  const stars = starsForScore(result.score);
  const metrics = summaryMetrics(result);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <section className="glass-panel w-full max-w-3xl rounded-lg p-8 text-center">
        <Trophy className="mx-auto mb-4 h-16 w-16 text-comet" />
        <p className="text-sm font-bold uppercase text-plasma">Mission Complete</p>
        <h1 className="mt-2 text-5xl font-black">{missionAccuracyLabel(result.score)}</h1>

        <div className="mt-6 flex justify-center gap-3">
          {[0, 1, 2].map((index) => (
            <Star
              className={`h-14 w-14 ${index < stars ? 'fill-comet text-comet' : 'text-white/18'}`}
              key={index}
            />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <div className="rounded-lg bg-white/7 p-4" key={metric.label}>
              <div className={`text-3xl font-black ${metric.color}`}>{metric.value}</div>
              <div className="mt-1 text-xs font-bold uppercase text-white/60">{metric.label}</div>
            </div>
          ))}
        </div>

        <button
          className="mx-auto mt-8 flex min-h-14 items-center gap-2 rounded-md bg-plasma px-8 py-4 text-xl font-black text-space-950 shadow-glow transition hover:scale-[1.01]"
          onClick={onContinue}
          type="button"
        >
          Back to Star Map
          <ArrowRight className="h-6 w-6" />
        </button>
      </section>
    </div>
  );
}

function summaryMetrics(result: MissionResult) {
  if (result.worldId === 'star-jumper') {
    return [
      { label: 'Score', value: result.score, color: 'text-comet' },
      {
        label: 'Jump Accuracy',
        value: `${metricNumber(result.metrics.hitRate)}%`,
        color: 'text-success',
      },
      {
        label: 'Best Combo',
        value: metricNumber(result.metrics.bestCombo),
        color: 'text-plasma',
      },
    ];
  }

  if (result.worldId === 'focus-portal') {
    return [
      { label: 'Score', value: result.score, color: 'text-comet' },
      {
        label: 'Rune Accuracy',
        value: `${metricNumber(result.metrics.accuracy)}%`,
        color: 'text-success',
      },
      {
        label: 'Cycles',
        value: metricNumber(result.metrics.completedCycles),
        color: 'text-plasma',
      },
    ];
  }

  return [
    { label: 'Score', value: result.score, color: 'text-comet' },
    {
      label: 'Beam Lock',
      value: `${metricNumber(result.metrics.lockPercent)}%`,
      color: 'text-success',
    },
    { label: 'Level', value: result.level, color: 'text-plasma' },
  ];
}

function metricNumber(value: MissionResult['metrics'][string]): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
