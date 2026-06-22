import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Download,
  RefreshCw,
  Rocket,
  Settings,
} from 'lucide-react';
import { DualSignalDecoder } from './games/DualSignalDecoder';
import { FocusPortal } from './games/FocusPortal';
import { OrbitTracker } from './games/OrbitTracker';
import { StarJumper } from './games/StarJumper';
import { GrownupDashboard } from './screens/GrownupDashboard';
import { MissionIntro } from './screens/MissionIntro';
import { MissionSummary } from './screens/MissionSummary';
import { StarMap } from './screens/StarMap';
import { useAcademyStore } from '@/state/useAcademyStore';
import type { UpdateStatus } from '@/vite-env';
import type { MissionResult, WorldId } from '@/domain/types';

type Screen =
  | { name: 'map' }
  | { name: 'intro'; worldId: WorldId }
  | { name: 'mission'; worldId: WorldId }
  | { name: 'summary'; result: MissionResult }
  | { name: 'dashboard' };

export function App() {
  const hydrate = useAcademyStore((state) => state.hydrate);
  const hasHydrated = useAcademyStore((state) => state.hasHydrated);
  const recordMissionResult = useAcademyStore((state) => state.recordMissionResult);
  const [screen, setScreen] = useState<Screen>({ name: 'map' });
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: 'idle',
    message: 'Updates ready',
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const updates = window.nateAcademy?.updates;
    if (!updates) {
      setUpdateStatus({
        state: 'unavailable',
        message: 'Desktop updates',
      });
      return undefined;
    }

    void updates.info().then(setUpdateStatus);
    return updates.onStatus(setUpdateStatus);
  }, []);

  const nav = useMemo(
    () => [
      { label: 'Star Map', icon: Rocket, action: () => setScreen({ name: 'map' }) },
      { label: 'Dashboard', icon: BarChart3, action: () => setScreen({ name: 'dashboard' }) },
    ],
    [],
  );

  function completeMission(result: MissionResult) {
    void recordMissionResult(result).catch((error) => {
      console.warn('Mission result could not be saved:', error);
    });
    setScreen({ name: 'summary', result });
  }

  async function checkUpdates() {
    const updates = window.nateAcademy?.updates;
    if (!updates) {
      setUpdateStatus({
        state: 'unavailable',
        message: 'Updates work in the installed app.',
      });
      return;
    }

    const status = await updates.check();
    setUpdateStatus(status);
  }

  async function installUpdate() {
    await window.nateAcademy?.updates?.install();
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
          <UpdateControl
            onCheck={() => void checkUpdates()}
            onInstall={() => void installUpdate()}
            status={updateStatus}
          />
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
          <StarMap onLaunchWorld={(worldId) => setScreen({ name: 'intro', worldId })} />
        )}
        {screen.name === 'intro' && (
          <MissionIntro
            onBack={() => setScreen({ name: 'map' })}
            onStart={() => setScreen({ name: 'mission', worldId: screen.worldId })}
            worldId={screen.worldId}
          />
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

function UpdateControl({
  onCheck,
  onInstall,
  status,
}: {
  onCheck: () => void;
  onInstall: () => void;
  status: UpdateStatus;
}) {
  const isBusy = status.state === 'checking' || status.state === 'downloading';
  const isReady = status.state === 'ready';
  const Icon = isReady ? Download : status.state === 'current' ? CheckCircle2 : RefreshCw;
  const label = isReady ? 'Restart Update' : isBusy ? status.message : 'Check Updates';
  const title = status.version
    ? `${status.message} Current version ${status.version}.`
    : status.message;

  return (
    <div className="flex items-center gap-2 rounded-md border border-plasma/20 bg-white/5 px-2 py-1">
      <button
        aria-label={label}
        className="flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-black text-white transition hover:bg-white/12 disabled:cursor-wait disabled:opacity-70"
        disabled={isBusy}
        onClick={isReady ? onInstall : onCheck}
        title={title}
        type="button"
      >
        <Icon className={isBusy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        {label}
      </button>
      <div className="hidden min-w-[84px] text-right text-[10px] font-black uppercase leading-4 text-white/62 xl:block">
        <div className="text-plasma">v{status.version ?? 'dev'}</div>
        <div>{status.state === 'idle' ? 'Updates' : status.state}</div>
      </div>
    </div>
  );
}
