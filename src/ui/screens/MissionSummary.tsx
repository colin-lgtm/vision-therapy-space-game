import { useEffect } from 'react';
import { ArrowRight, Headphones, Star, Trophy } from 'lucide-react';
import { playEffect, speakBriefing } from '@/domain/audio';
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
  const coachMessage = coachLine(result, stars);
  const award = awardLabel(result, stars);

  useEffect(() => {
    playEffect(stars >= 3 ? 'award' : stars > 0 ? 'star' : 'complete');
  }, [stars]);

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-6">
      <div className="star-shower" aria-hidden="true">
        {Array.from({ length: Math.max(8, stars * 10) }).map((_, index) => (
          <Star
            className="star-pop h-7 w-7 fill-current"
            key={index}
            style={{
              animationDelay: `${index * 0.11}s`,
              left: `${8 + ((index * 17) % 84)}%`,
              top: `${72 + (index % 5) * 4}%`,
            }}
          />
        ))}
      </div>

      <section className="glass-panel relative grid w-full max-w-5xl grid-cols-[260px_1fr] gap-6 rounded-lg p-8">
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-black/24 p-5 text-center">
          <div className="alien-coach mb-4" aria-hidden="true">
            <div className="alien-eye alien-eye-left" />
            <div className="alien-eye alien-eye-right" />
            <div className="alien-mouth" />
          </div>
          <p className="text-xs font-black uppercase text-success">Coach Zib</p>
          <p className="mt-3 text-xl font-black leading-tight">{coachMessage}</p>
          <button
            className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-md border border-success/35 bg-success/14 px-4 py-2 font-black text-success hover:bg-success/22"
            onClick={() => speakBriefing(coachMessage)}
            type="button"
          >
            <Headphones className="h-5 w-5" />
            Hear It
          </button>
        </div>

        <div className="text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-comet" />
          <p className="text-sm font-bold uppercase text-plasma">Mission Complete</p>
          <h1 className="mt-2 text-5xl font-black">{missionAccuracyLabel(result.score)}</h1>
          <div className="mx-auto mt-4 inline-flex min-h-10 items-center rounded-md border border-comet/35 bg-comet/12 px-4 py-2 text-sm font-black uppercase text-comet">
            {award}
          </div>

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
        </div>
      </section>
    </div>
  );
}

function coachLine(result: MissionResult, stars: number): string {
  if (stars >= 3) return 'Amazing run. Your ship skills are leveling up.';
  if (stars === 2) return 'Strong mission. You kept control under pressure.';
  if (stars === 1) return 'Good work. One more clean run and you level up.';
  if (result.status === 'quit') return 'Mission saved. We can try again when ready.';
  return 'Training run complete. Let us try one more.';
}

function awardLabel(result: MissionResult, stars: number): string {
  if (stars >= 3) return 'Legendary Star Award';
  if (stars === 2) return 'Strong Pilot Award';
  if (stars === 1) return 'Cadet Progress Award';
  if (result.status === 'completed') return 'Practice Badge';
  return 'Mission Logged';
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
        label: 'Code Accuracy',
        value: `${metricNumber(result.metrics.accuracy)}%`,
        color: 'text-success',
      },
      {
        label: 'Stops',
        value: metricNumber(result.metrics.completedCycles),
        color: 'text-plasma',
      },
    ];
  }

  if (result.worldId === 'dual-signal') {
    return [
      { label: 'Score', value: result.score, color: 'text-comet' },
      {
        label: 'Signal Accuracy',
        value: `${metricNumber(result.metrics.accuracy)}%`,
        color: 'text-success',
      },
      {
        label: 'Best Combo',
        value: metricNumber(result.metrics.bestCombo),
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
