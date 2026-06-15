import { Lock, Play, Rocket, Sparkles, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { worlds } from '@/domain/worlds';
import { useAcademyStore } from '@/state/useAcademyStore';

interface StarMapProps {
  onLaunchOrbit: () => void;
}

export function StarMap({ onLaunchOrbit }: StarMapProps) {
  const profile = useAcademyStore((state) => state.profile);
  const progress = useAcademyStore((state) => state.progress);

  return (
    <div className="grid h-full grid-cols-[1fr_320px] gap-5 p-5">
      <section className="min-h-0 rounded-lg border border-white/10 bg-space-950/40 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-plasma">Cadet Star Map</p>
            <h1 className="mt-1 text-4xl font-black">Choose today&apos;s mission</h1>
          </div>
          <div className="rounded-lg border border-comet/30 bg-comet/10 px-4 py-3 text-right">
            <div className="text-3xl font-black text-comet">{profile.totalStars}</div>
            <div className="text-xs font-bold uppercase text-white/70">Total Stars</div>
          </div>
        </div>

        <div className="grid h-[calc(100%-104px)] grid-cols-2 gap-4">
          {worlds.map((world) => {
            const isUnlocked = profile.unlockedWorlds.includes(world.id);
            const worldProgress = progress[world.id];
            const isOrbit = world.id === 'orbit-tracker';
            const canLaunch = isUnlocked && isOrbit;
            return (
              <article
                className="glass-panel flex min-h-[236px] flex-col justify-between rounded-lg p-5"
                key={world.id}
                style={{ borderColor: `${world.color}55` }}
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: `${world.color}22`, color: world.color }}
                    >
                      {isUnlocked ? <Rocket className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
                    </div>
                    <div className="flex items-center gap-1 text-comet">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="font-black">{worldProgress.stars}</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black">{world.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/72">{world.gameGoal}</p>
                  <p className="mt-4 text-sm font-bold text-plasma">
                    Level {Math.max(1, worldProgress.level)}
                  </p>
                </div>

                <button
                  className={clsx(
                    'mt-4 flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 font-black transition',
                    canLaunch
                      ? 'bg-plasma text-space-950 shadow-glow hover:scale-[1.01]'
                      : 'cursor-not-allowed border border-white/10 bg-white/10 text-white/40',
                  )}
                  disabled={!canLaunch}
                  onClick={onLaunchOrbit}
                  type="button"
                >
                  {canLaunch ? (
                    <>
                      <Play className="h-5 w-5 fill-current" />
                      Launch Mission
                    </>
                  ) : isUnlocked ? (
                    'Coming Soon'
                  ) : (
                    'Locked'
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="glass-panel rounded-lg p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-comet/20 text-comet">
            <Sparkles className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black">{profile.nickname}</h2>
            <p className="text-sm font-bold text-plasma">{profile.rank}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-white/7 p-4">
            <div className="text-sm font-bold text-white/65">Unlocked Gear</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.unlockedCosmetics.map((item) => (
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-white/7 p-4">
            <div className="text-sm font-bold text-white/65">Today&apos;s Best Start</div>
            <p className="mt-2 text-sm leading-6 text-white/78">
              Orbit Tracker is ready. Keep the beam locked on the comet to earn stars and repair the
              academy ship.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
