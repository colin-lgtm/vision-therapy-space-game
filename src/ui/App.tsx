import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Rocket, Settings } from 'lucide-react';
import { DualSignalDecoder } from './games/DualSignalDecoder';
import { FocusPortal } from './games/FocusPortal';
import { OrbitTracker } from './games/OrbitTracker';
import { StarJumper } from './games/StarJumper';
import { GrownupDashboard } from './screens/GrownupDashboard';
import { MissionSummary } from './screens/MissionSummary';
import { StarMap } from './screens/StarMap';
import { useAcademyStore } from '@/state/useAcademyStore';
import type { MissionResult, WorldId } from '@/domain/types';

type Screen =
  | { name: 'map' }
  | { name: 'mission'; worldId: WorldId }
  | { name: 'summary'; result: MissionResult }
  | { name: 'dashboard' };

export function App() {
  const hydrate = useAcademyStore((state) => state.hydrate);
  const hasHydrated = useAcademyStore((state) => state.hasHydrated);
  const recordMissionResult = useAcademyStore((state) => state.recordMissionResult);
  const [screen, setScreen] = useState<Screen>({ name: 'map' });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const nav = useMemo(
    () => [
      { label: 'Star Map', icon: Rocket, action: () => setScreen({ name: 'map' }) },
      { label: 'Dashboard', icon: BarChart3, action: () => setScreen({ name: 'dashboard' }) },
    ],
    [],
  );

  async function completeMission(result: MissionResult) {
    await recordMissionResult(result);
    setScreen({ name: 'summary', result });
  }

  if (!hasHydrated) {
    return (
      <main className="space-grid flex h-full w-full items-center justify-center text-white">
        <div className="glass-panel rounded-lg px-8 py-6 text-center">
          <Activity className="mx-auto mb-4 h-10 w-10 text-plasma" />
          <p className="text-xl font-bold">Powering up Space Academy...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-grid flex h-full w-full flex-col text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <button
          className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/10"
          onClick={() => setScreen({ name: 'map' })}
          type="button"
        >
          <Rocket className="h-7 w-7 text-comet" />
          <div>
            <div className="text-lg font-bold leading-5">Nate-O-Vision</div>
            <div className="text-xs text-plasma">Space Academy</div>
          </div>
        </button>

        <nav className="flex items-center gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/12"
                onClick={item.action}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <button
            className="flex min-h-11 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 transition hover:bg-white/12"
            onClick={() => setScreen({ name: 'dashboard' })}
            title="Grown-up settings"
            type="button"
          >
            <Settings className="h-5 w-5" />
          </button>
        </nav>
      </header>

      <section className="min-h-0 flex-1">
        {screen.name === 'map' && (
          <StarMap onLaunchWorld={(worldId) => setScreen({ name: 'mission', worldId })} />
        )}
        {screen.name === 'mission' && screen.worldId === 'orbit-tracker' && (
          <OrbitTracker onComplete={completeMission} onExit={() => setScreen({ name: 'map' })} />
        )}
        {screen.name === 'mission' && screen.worldId === 'star-jumper' && (
          <StarJumper onComplete={completeMission} onExit={() => setScreen({ name: 'map' })} />
        )}
        {screen.name === 'mission' && screen.worldId === 'focus-portal' && (
          <FocusPortal onComplete={completeMission} onExit={() => setScreen({ name: 'map' })} />
        )}
        {screen.name === 'mission' && screen.worldId === 'dual-signal' && (
          <DualSignalDecoder
            onComplete={completeMission}
            onExit={() => setScreen({ name: 'map' })}
          />
        )}
        {screen.name === 'summary' && (
          <MissionSummary result={screen.result} onContinue={() => setScreen({ name: 'map' })} />
        )}
        {screen.name === 'dashboard' && <GrownupDashboard />}
      </section>
    </main>
  );
}
