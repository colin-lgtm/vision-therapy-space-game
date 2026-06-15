import {
  Gamepad2,
  Headphones,
  Lock,
  Play,
  Rocket,
  Sparkles,
  Star,
  TestTube2,
  Volume2,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { playEffect, speakBriefing } from '@/domain/audio';
import { worlds, type WorldDefinition } from '@/domain/worlds';
import { useAcademyStore } from '@/state/useAcademyStore';

interface StarMapProps {
  onLaunchOrbit: () => void;
}

export function StarMap({ onLaunchOrbit }: StarMapProps) {
  const profile = useAcademyStore((state) => state.profile);
  const progress = useAcademyStore((state) => state.progress);
  const unlockAllForTesting = useAcademyStore((state) => state.unlockAllForTesting);

  async function unlockTesting() {
    playEffect('launch');
    await unlockAllForTesting();
  }

  return (
    <div className="relative h-full overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="star-orbit star-orbit-a" />
        <div className="star-orbit star-orbit-b" />
        <div className="star-orbit star-orbit-c" />
      </div>

      <div className="relative grid h-full grid-cols-[1fr_310px] gap-4">
        <section className="min-h-0 overflow-hidden rounded-lg border border-plasma/20 bg-space-950/45 p-4 shadow-[0_0_60px_rgba(108,240,255,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-plasma">
                <Gamepad2 className="h-5 w-5" />
                Cadet Star Map
              </p>
              <h1 className="mt-1 text-3xl font-black leading-tight">
                Choose today&apos;s mission
              </h1>
            </div>
            <div className="rounded-lg border border-comet/35 bg-comet/12 px-4 py-3 text-right shadow-[0_0_22px_rgba(255,209,102,0.16)]">
              <div className="text-3xl font-black text-comet">{profile.totalStars}</div>
              <div className="text-xs font-black uppercase text-white/70">Stars</div>
            </div>
          </div>

          <div className="grid h-[calc(100%-78px)] grid-cols-2 gap-4">
            {worlds.map((world) => {
              const isUnlocked = profile.unlockedWorlds.includes(world.id);
              const worldProgress = progress[world.id];
              const canLaunch = isUnlocked && world.enabledInMvp;
              const starsNeeded = Math.max(0, world.unlockStars - profile.totalStars);

              return (
                <MissionTile
                  canLaunch={canLaunch}
                  isUnlocked={isUnlocked}
                  key={world.id}
                  onLaunch={onLaunchOrbit}
                  starsNeeded={starsNeeded}
                  totalStars={profile.totalStars}
                  world={world}
                  worldLevel={Math.max(1, worldProgress.level)}
                  worldStars={worldProgress.stars}
                />
              );
            })}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <section className="game-hud-panel p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="avatar-orb">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black">{profile.nickname}</h2>
                <p className="text-sm font-black text-plasma">{profile.rank}</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/7 p-3">
              <div className="mb-2 text-xs font-black uppercase text-white/55">Ship Upgrades</div>
              <div className="flex flex-wrap gap-2">
                {profile.unlockedCosmetics.map((item) => (
                  <span
                    className="rounded-md border border-comet/25 bg-comet/12 px-2 py-1 text-xs font-black text-comet"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="game-hud-panel p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase text-comet">
              <Headphones className="h-4 w-4" />
              Audio Briefings
            </p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Tap the speaker on a mission tile to hear what to do. The pictures show the job even
              before reading the words.
            </p>
          </section>

          <section className="game-hud-panel p-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase text-nebula">
              <TestTube2 className="h-4 w-4" />
              Test Lab
            </p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Unlock every mission card for inspection. Only finished worlds show a launch button.
            </p>
            <button
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-nebula/35 bg-nebula/18 px-3 py-2 font-black text-white hover:bg-nebula/26"
              onClick={unlockTesting}
              type="button"
            >
              <Rocket className="h-5 w-5" />
              Unlock Cards
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

interface MissionTileProps {
  world: WorldDefinition;
  isUnlocked: boolean;
  canLaunch: boolean;
  worldLevel: number;
  worldStars: number;
  totalStars: number;
  starsNeeded: number;
  onLaunch: () => void;
}

function MissionTile({
  world,
  isUnlocked,
  canLaunch,
  worldLevel,
  worldStars,
  totalStars,
  starsNeeded,
  onLaunch,
}: MissionTileProps) {
  function hearBriefing() {
    speakBriefing(world.briefing);
  }

  function launch() {
    playEffect('launch');
    onLaunch();
  }

  return (
    <article
      className={clsx(
        'mission-tile relative overflow-hidden rounded-lg p-4',
        canLaunch && 'mission-tile-live',
        !isUnlocked && 'mission-tile-locked',
      )}
      style={{ '--mission-color': world.color } as CSSProperties}
    >
      <div className="absolute inset-0 opacity-80">
        <MissionIllustration world={world} locked={!isUnlocked} />
      </div>

      <div className="relative flex h-full flex-col justify-between gap-2">
        <div>
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase text-white/70">
                {isUnlocked ? (
                  <Rocket className="h-4 w-4" style={{ color: world.color }} />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {isUnlocked ? 'Mission Ready' : `Unlock at ${world.unlockStars} stars`}
              </div>
              <h2 className="max-w-[260px] text-xl font-black leading-tight">{world.name}</h2>
            </div>
            <button
              aria-label={`Hear ${world.name} briefing`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white shadow-[0_0_18px_rgba(255,255,255,0.08)] hover:bg-white/15"
              onClick={hearBriefing}
              title="Hear briefing"
              type="button"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>

          <p className="mission-card-copy max-w-[320px] text-sm font-bold leading-5 text-white/82">
            {world.gameGoal}
          </p>
          <p className="mission-card-action mt-1 max-w-[320px] text-xs leading-4 text-white/62">
            {world.playerAction}
          </p>
        </div>

        <div className="relative">
          <div className="mb-1 flex items-center justify-between text-sm font-black">
            <span className="text-plasma">Level {worldLevel}</span>
            <span className="flex items-center gap-1 text-comet">
              <Star className="h-4 w-4 fill-current" />
              {worldStars}
            </span>
          </div>
          <ProgressRail current={totalStars} needed={world.unlockStars} />
          <button
            className={clsx(
              'mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 py-2 font-black transition',
              canLaunch
                ? 'bg-white text-space-950 shadow-[0_0_22px_var(--mission-color)] hover:scale-[1.01]'
                : 'border border-white/12 bg-black/34 text-white/66',
            )}
            disabled={!canLaunch}
            onClick={launch}
            type="button"
          >
            {canLaunch ? (
              <>
                <Play className="h-5 w-5 fill-current" />
                Launch Mission
              </>
            ) : world.enabledInMvp ? (
              <>
                <Lock className="h-5 w-5" />
                Earn {starsNeeded} more
              </>
            ) : isUnlocked ? (
              <>
                <X className="h-5 w-5" />
                World Coming Soon
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                Earn {starsNeeded} more
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProgressRail({ current, needed }: { current: number; needed: number }) {
  if (needed === 0) {
    return (
      <div className="h-2 overflow-hidden rounded-full bg-white/12">
        <div className="h-full w-full rounded-full bg-success" />
      </div>
    );
  }

  const percent = Math.min(100, Math.round((current / needed) * 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/12">
      <div
        className="h-full rounded-full bg-comet transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function MissionIllustration({ world, locked }: { world: WorldDefinition; locked: boolean }) {
  return (
    <div className={clsx('mission-art', locked && 'mission-art-dim')}>
      {world.visualKind === 'comet' && (
        <>
          <div className="art-planet art-planet-blue" />
          <div className="art-comet" />
          <div className="art-beam" />
          <div className="art-meteor art-meteor-one" />
          <div className="art-meteor art-meteor-two" />
        </>
      )}
      {world.visualKind === 'gate' && (
        <>
          <div className="art-gate art-gate-one" />
          <div className="art-gate art-gate-two" />
          <div className="art-ship" />
          <div className="art-spark art-spark-one" />
        </>
      )}
      {world.visualKind === 'portal' && (
        <>
          <div className="art-portal" />
          <div className="art-rune art-rune-one">Z</div>
          <div className="art-rune art-rune-two">7</div>
          <div className="art-wall-target" />
        </>
      )}
      {world.visualKind === 'decoder' && (
        <>
          <div className="art-decoder art-decoder-red">A</div>
          <div className="art-decoder art-decoder-cyan">5</div>
          <div className="art-shield" />
        </>
      )}
    </div>
  );
}
