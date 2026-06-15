import { Download, RotateCcw, Star, TestTube2 } from 'lucide-react';
import { playEffect } from '@/domain/audio';
import { clearPersistedState } from '@/domain/storage';
import { worlds } from '@/domain/worlds';
import { summarizeRecentInput, useAcademyStore } from '@/state/useAcademyStore';

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function GrownupDashboard() {
  const profile = useAcademyStore((state) => state.profile);
  const progress = useAcademyStore((state) => state.progress);
  const missionRuns = useAcademyStore((state) => state.missionRuns);
  const sessions = useAcademyStore((state) => state.sessions);
  const unlockAllForTesting = useAcademyStore((state) => state.unlockAllForTesting);

  function exportJson() {
    downloadText(
      `nate-o-vision-export-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ profile, progress, sessions, missionRuns }, null, 2),
      'application/json',
    );
  }

  async function resetLocalData() {
    await clearPersistedState();
    window.location.reload();
  }

  async function unlockAll() {
    playEffect('launch');
    await unlockAllForTesting();
  }

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-5 overflow-auto p-5">
      <section className="glass-panel rounded-lg p-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-plasma">Grown-up Dashboard</p>
            <h1 className="text-3xl font-black">Progress and exports</h1>
          </div>
          <button
            className="flex min-h-12 items-center gap-2 rounded-md bg-plasma px-4 py-2 font-black text-space-950 shadow-glow"
            onClick={exportJson}
            type="button"
          >
            <Download className="h-5 w-5" />
            Export JSON
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <Stat label="Total Stars" value={profile.totalStars.toString()} />
          <Stat label="Rank" value={profile.rank} />
          <Stat label="Sessions" value={sessions.length.toString()} />
          <Stat label="Latest Input" value={summarizeRecentInput(missionRuns)} />
        </div>

        <h2 className="mb-3 mt-8 text-xl font-black">World Progress</h2>
        <div className="grid grid-cols-2 gap-3">
          {worlds.map((world) => {
            const item = progress[world.id];
            return (
              <div className="rounded-lg border border-white/10 bg-white/7 p-4" key={world.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-black">{world.name}</h3>
                  <span className="flex items-center gap-1 text-comet">
                    <Star className="h-4 w-4 fill-current" />
                    {item.stars}
                  </span>
                </div>
                <p className="text-sm text-white/64">{world.diagnosisTarget}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Level" value={Math.max(1, item.level).toString()} />
                  <MiniStat label="Best" value={item.bestScore.toString()} />
                  <MiniStat label="Plays" value={item.plays.toString()} />
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mb-3 mt-8 text-xl font-black">Recent Missions</h2>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/10 text-xs uppercase text-white/60">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">World</th>
                <th className="p-3">Level</th>
                <th className="p-3">Score</th>
                <th className="p-3">Input</th>
              </tr>
            </thead>
            <tbody>
              {missionRuns.slice(0, 10).map((run) => (
                <tr className="border-t border-white/10" key={run.id}>
                  <td className="p-3">{new Date(run.endedAt).toLocaleString()}</td>
                  <td className="p-3">{run.worldId}</td>
                  <td className="p-3">{run.level}</td>
                  <td className="p-3">{run.score}</td>
                  <td className="p-3">{run.inputKind}</td>
                </tr>
              ))}
              {missionRuns.length === 0 && (
                <tr>
                  <td className="p-5 text-center text-white/55" colSpan={5}>
                    No missions completed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="glass-panel rounded-lg p-5">
        <h2 className="text-xl font-black">Support Notes</h2>
        <p className="mt-3 text-sm leading-6 text-white/70">
          This dashboard keeps the grown-up details out of the game. Exports include levels, scores,
          input type, and raw mission metrics so progress can be reviewed later.
        </p>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/7 p-4">
          <div className="text-sm font-bold uppercase text-white/55">Fuel Setting</div>
          <div className="mt-1 text-2xl font-black">15 min</div>
          <p className="mt-2 text-xs leading-5 text-white/55">
            The current build keeps the fuel setting fixed. Settings editing is planned after the
            first playable world is stable.
          </p>
        </div>

        <button
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-comet/45 bg-comet/14 px-4 py-2 font-black text-comet hover:bg-comet/20"
          onClick={unlockAll}
          type="button"
        >
          <TestTube2 className="h-5 w-5" />
          Unlock Cards For Testing
        </button>

        <button
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-nebula/45 bg-nebula/12 px-4 py-2 font-black text-nebula hover:bg-nebula/18"
          onClick={resetLocalData}
          type="button"
        >
          <RotateCcw className="h-5 w-5" />
          Reset Local Data
        </button>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/7 p-4">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase text-white/55">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-space-950/60 p-2">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] font-bold uppercase text-white/50">{label}</div>
    </div>
  );
}
