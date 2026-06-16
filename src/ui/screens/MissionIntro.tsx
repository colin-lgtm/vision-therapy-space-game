import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Gamepad2,
  Headphones,
  Rocket,
  Shield,
  Zap,
} from 'lucide-react';
import { playEffect, speakBriefing } from '@/domain/audio';
import { worlds } from '@/domain/worlds';
import type { WorldId } from '@/domain/types';

interface MissionIntroProps {
  worldId: WorldId;
  onBack: () => void;
  onStart: () => void;
}

export function MissionIntro({ worldId, onBack, onStart }: MissionIntroProps) {
  const world = worlds.find((item) => item.id === worldId) ?? worlds[0];
  const steps = introSteps(world.id);

  function hearBriefing() {
    speakBriefing(world.briefing);
  }

  function start() {
    playEffect('launch');
    onStart();
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_28%,rgba(108,240,255,0.18),transparent_24%),radial-gradient(circle_at_24%_70%,rgba(255,107,157,0.14),transparent_22%)]" />
      <section className="glass-panel relative grid w-full max-w-5xl grid-cols-[280px_1fr] gap-6 rounded-lg p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-black/24 p-5 text-center">
          <div className="alien-coach mb-4" aria-hidden="true">
            <div className="alien-eye alien-eye-left" />
            <div className="alien-eye alien-eye-right" />
            <div className="alien-mouth" />
          </div>
          <p className="text-xs font-black uppercase text-plasma">Coach Zib</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">{world.name}</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-white/70">{world.gameGoal}</p>
          <button
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-comet/35 bg-comet/14 px-4 py-2 font-black text-comet hover:bg-comet/22"
            onClick={hearBriefing}
            type="button"
          >
            <Headphones className="h-5 w-5" />
            Hear Coach
          </button>
        </div>

        <div className="flex flex-col justify-between">
          <div className="grid grid-cols-3 gap-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  className="rounded-lg border border-white/10 bg-white/7 p-4 text-center"
                  key={step.label}
                >
                  <div
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/12 bg-black/28 shadow-[0_0_24px_rgba(255,255,255,0.08)]"
                    style={{ color: step.color }}
                  >
                    <Icon className="h-10 w-10" />
                  </div>
                  <div className="mt-4 text-lg font-black">{step.label}</div>
                  <div className="mt-2 text-sm font-bold leading-5 text-white/64">
                    {step.detail}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              className="flex min-h-12 items-center gap-2 rounded-md border border-white/12 bg-white/7 px-5 py-3 font-black text-white hover:bg-white/12"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
            <button
              aria-label={`Start Mission: ${world.name}`}
              className="flex min-h-14 items-center gap-3 rounded-md bg-plasma px-8 py-4 text-xl font-black text-space-950 shadow-glow transition hover:scale-[1.01]"
              onClick={start}
              type="button"
            >
              Start Mission
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function introSteps(worldId: WorldId) {
  if (worldId === 'orbit-tracker') {
    return [
      { label: 'Track', detail: 'Stay on the comet.', icon: Eye, color: '#6cf0ff' },
      { label: 'Lock', detail: 'Keep the beam green.', icon: Zap, color: '#7dff9b' },
      { label: 'Blast', detail: 'Tap to defend.', icon: Shield, color: '#ffd166' },
    ];
  }

  if (worldId === 'star-jumper') {
    return [
      { label: 'Start', detail: 'Ship begins green.', icon: Rocket, color: '#7dff9b' },
      { label: 'Find', detail: 'Look for red.', icon: Eye, color: '#ff6b9d' },
      { label: 'Jump', detail: 'Tap fast.', icon: Gamepad2, color: '#ffd166' },
    ];
  }

  if (worldId === 'focus-portal') {
    return [
      { label: 'Watch', detail: 'Tiny code grows.', icon: Eye, color: '#ffd166' },
      { label: 'Choose', detail: 'Tap the match.', icon: Gamepad2, color: '#7dff9b' },
      { label: 'Save', detail: 'Protect the ship.', icon: Shield, color: '#6cf0ff' },
    ];
  }

  return [
    { label: 'Red', detail: 'Read left code.', icon: Eye, color: '#ff6b9d' },
    { label: 'Cyan', detail: 'Read right code.', icon: Eye, color: '#6cf0ff' },
    { label: 'Match', detail: 'Tap both together.', icon: Shield, color: '#7dff9b' },
  ];
}
