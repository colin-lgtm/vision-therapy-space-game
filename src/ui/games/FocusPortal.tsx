import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Pause, Play, RotateCcw, X, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { playEffect } from '@/domain/audio';
import {
  buildFocusPortalOptions,
  calculateFocusPortalScore,
  focusPortalConfigForLevel,
  focusPortalGlyphs,
} from '@/domain/focusPortal';
import { useAcademyStore } from '@/state/useAcademyStore';
import type { InputKind, MissionResult } from '@/domain/types';

interface FocusPortalProps {
  onComplete: (result: MissionResult) => void | Promise<void>;
  onExit: () => void;
}

type PortalPhase = 'scan' | 'depth' | 'choose';

interface PortalRound {
  target: string;
  options: string[];
  phaseStartedAt: number;
  chooseStartedAt: number;
}

interface FocusPortalStats {
  attempts: number;
  hits: number;
  misses: number;
  totalReactionMs: number;
  completedCycles: number;
  depthChargeMs: number;
  beaconHits: number;
}

const emptyStats: FocusPortalStats = {
  attempts: 0,
  hits: 0,
  misses: 0,
  totalReactionMs: 0,
  completedCycles: 0,
  depthChargeMs: 0,
  beaconHits: 0,
};

interface DepthBeacon {
  id: number;
  xPercent: number;
  yPercent: number;
  size: number;
  depth: number;
  hit: boolean;
}

function inputKindFromPointer(pointerType: string): InputKind {
  if (pointerType === 'touch' || pointerType === 'pen' || pointerType === 'mouse')
    return pointerType;
  return 'unknown';
}

function focusPortalAccuracy(stats: FocusPortalStats): number {
  return stats.attempts > 0 ? stats.hits / stats.attempts : 0;
}

function focusPortalAverageReaction(stats: FocusPortalStats): number {
  return stats.hits > 0 ? stats.totalReactionMs / stats.hits : 9999;
}

function focusPortalScoreInput(stats: FocusPortalStats) {
  return {
    accuracy: focusPortalAccuracy(stats),
    averageReactionMs: focusPortalAverageReaction(stats),
    completedCycles: stats.completedCycles,
    depthChargeSeconds: Math.round(stats.depthChargeMs / 1000),
    beaconHits: stats.beaconHits,
    misses: stats.misses,
  };
}

export function FocusPortal({ onComplete, onExit }: FocusPortalProps) {
  const storedLevel = useAcademyStore((state) => state.progress['focus-portal'].level);
  const level = Math.max(1, storedLevel);
  const config = useMemo(() => focusPortalConfigForLevel(level), [level]);

  const statsRef = useRef<FocusPortalStats>({ ...emptyStats });
  const inputKindRef = useRef<InputKind>('unknown');
  const activeSecondsRef = useRef(0);
  const completedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const pausedStartedRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const roundIdRef = useRef(0);
  const depthBoostMsRef = useRef(0);

  const [phase, setPhase] = useState<PortalPhase>('scan');
  const [round, setRound] = useState<PortalRound>(() => makeRound(config.options));
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [portalCharge, setPortalCharge] = useState(0);
  const [depthBeacons, setDepthBeacons] = useState<DepthBeacon[]>(() =>
    makeDepthBeacons(config.depthBeacons),
  );
  const [cycles, setCycles] = useState(0);
  const [hits, setHits] = useState(0);
  const [lives, setLives] = useState(3);
  const [liveScore, setLiveScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);

  const finish = useCallback(
    (status: MissionResult['status']) => {
      if (completedRef.current) return;
      completedRef.current = true;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const stats = statsRef.current;
      const score =
        status === 'completed' ? calculateFocusPortalScore(focusPortalScoreInput(stats)) : 0;

      void onComplete({
        worldId: 'focus-portal',
        level,
        inputKind: inputKindRef.current,
        status,
        score,
        activeSeconds: Math.max(1, Math.round(activeSecondsRef.current)),
        metrics: {
          accuracy: Math.round(focusPortalAccuracy(stats) * 100),
          averageReactionMs: Math.round(focusPortalAverageReaction(stats)),
          completedCycles: stats.completedCycles,
          depthChargeSeconds: Math.round(stats.depthChargeMs / 1000),
          beaconHits: stats.beaconHits,
          attempts: stats.attempts,
          misses: stats.misses,
          lives,
          options: config.options,
          depthChargeMs: config.depthChargeMs,
          depthBeacons: config.depthBeacons,
          scanMs: config.scanMs,
        },
      });
    },
    [
      config.depthBeacons,
      config.depthChargeMs,
      config.options,
      config.scanMs,
      level,
      lives,
      onComplete,
    ],
  );

  const resetRun = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    statsRef.current = { ...emptyStats };
    inputKindRef.current = 'unknown';
    activeSecondsRef.current = 0;
    completedRef.current = false;
    startRef.current = null;
    pausedStartedRef.current = null;
    pausedMsRef.current = 0;
    roundIdRef.current = 0;
    depthBoostMsRef.current = 0;
    setPhase('scan');
    setRound(makeRound(config.options));
    setDepthBeacons(makeDepthBeacons(config.depthBeacons));
    setRemainingSeconds(config.durationSeconds);
    setPortalCharge(0);
    setCycles(0);
    setHits(0);
    setLives(3);
    setLiveScore(0);
    setIsPaused(false);
    setGameOver(false);
    setRestartNonce((value) => value + 1);
  }, [config.depthBeacons, config.durationSeconds, config.options]);

  const startNextRound = useCallback(
    (now: number) => {
      roundIdRef.current += 1;
      depthBoostMsRef.current = 0;
      setPhase('scan');
      setPortalCharge(0);
      setRound(makeRound(config.options, roundIdRef.current, now));
      setDepthBeacons(makeDepthBeacons(config.depthBeacons, roundIdRef.current));
    },
    [config.depthBeacons, config.options],
  );

  const damagePortal = useCallback(() => {
    statsRef.current.misses += 1;
    setLives((value) => {
      const next = Math.max(0, value - 1);
      if (next <= 0) {
        setGameOver(true);
        playEffect('hit');
      } else {
        playEffect('warning');
      }
      return next;
    });
  }, []);

  const divePortal = useCallback(
    (pointerType: string) => {
      if (phase !== 'scan' || gameOver || isPaused) return;
      inputKindRef.current = inputKindFromPointer(pointerType);
      const now = performance.now();
      depthBoostMsRef.current = 0;
      setPhase('depth');
      setPortalCharge(0);
      setRound((value) => ({ ...value, phaseStartedAt: now }));
      setDepthBeacons(makeDepthBeacons(config.depthBeacons, roundIdRef.current));
      playEffect('launch');
    },
    [config.depthBeacons, gameOver, isPaused, phase],
  );

  const hitDepthBeacon = useCallback(
    (id: number, pointerType: string) => {
      if (phase !== 'depth' || gameOver || isPaused) return;
      inputKindRef.current = inputKindFromPointer(pointerType);
      setDepthBeacons((beacons) =>
        beacons.map((beacon) => {
          if (beacon.id !== id || beacon.hit) return beacon;
          depthBoostMsRef.current += config.beaconBonusMs;
          statsRef.current.beaconHits += 1;
          playEffect('lock');
          return { ...beacon, hit: true };
        }),
      );
    },
    [config.beaconBonusMs, gameOver, isPaused, phase],
  );

  const chooseGlyph = useCallback(
    (glyph: string, pointerType: string) => {
      if (phase !== 'choose' || gameOver || isPaused) return;
      inputKindRef.current = inputKindFromPointer(pointerType);
      const now = performance.now();
      statsRef.current.attempts += 1;

      if (glyph === round.target) {
        statsRef.current.hits += 1;
        statsRef.current.completedCycles += 1;
        statsRef.current.totalReactionMs += Math.max(0, now - round.chooseStartedAt);
        setHits(statsRef.current.hits);
        setCycles(statsRef.current.completedCycles);
        setLiveScore(calculateFocusPortalScore(focusPortalScoreInput(statsRef.current)));
        playEffect('lock');
        startNextRound(now);
        return;
      }

      damagePortal();
      setLiveScore(calculateFocusPortalScore(focusPortalScoreInput(statsRef.current)));
      startNextRound(now);
    },
    [damagePortal, gameOver, isPaused, phase, round.chooseStartedAt, round.target, startNextRound],
  );

  useEffect(() => {
    const tick = (now: number) => {
      if (gameOver) return;
      if (startRef.current === null) startRef.current = now;

      if (isPaused) {
        if (pausedStartedRef.current === null) pausedStartedRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (pausedStartedRef.current !== null) {
        pausedMsRef.current += now - pausedStartedRef.current;
        pausedStartedRef.current = null;
      }

      const activeSeconds = (now - startRef.current - pausedMsRef.current) / 1000;
      activeSecondsRef.current = activeSeconds;
      const remaining = Math.max(0, config.durationSeconds - activeSeconds);
      setRemainingSeconds(remaining);

      if (phase === 'scan') {
        const scanProgress = Math.min(1, (now - round.phaseStartedAt) / config.scanMs);
        setPortalCharge(scanProgress);
      }

      if (phase === 'depth') {
        const depthProgress = Math.min(
          1,
          (now - round.phaseStartedAt + depthBoostMsRef.current) / config.depthChargeMs,
        );
        setPortalCharge(depthProgress);
        if (depthProgress >= 1) {
          statsRef.current.depthChargeMs += config.depthChargeMs;
          setPhase('choose');
          setRound((value) => ({ ...value, chooseStartedAt: now, phaseStartedAt: now }));
          playEffect('lock');
        }
      }

      if (remaining <= 0) {
        finish('completed');
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    config.durationSeconds,
    config.depthChargeMs,
    config.scanMs,
    finish,
    gameOver,
    isPaused,
    phase,
    restartNonce,
    round.phaseStartedAt,
  ]);

  const roundedTime = Math.ceil(remainingSeconds);
  const accuracy = Math.round(focusPortalAccuracy(statsRef.current) * 100);
  const portalMessage =
    phase === 'scan'
      ? 'Scan the tiny rune'
      : phase === 'depth'
        ? 'Tap depth beacons'
        : 'Pick the match';
  const scanRuneSize = Math.round(28 * config.glyphScale);
  const isCodeVisible = phase === 'scan';
  const tunnelRings = [0.18, 0.3, 0.43, 0.57, 0.72, 0.88, 1.05];
  const portalSymbol = phase === 'depth' ? '*' : phase === 'choose' ? '?' : '+';

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1">
          <p className="text-sm font-bold uppercase text-success">Focus Portal</p>
          <h1 className="text-2xl font-black leading-tight xl:text-3xl">Dive the depth portal</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <HudStat label="Level" tone="text-success" value={level.toString()} />
          <HudStat label="Score" tone="text-comet" value={liveScore.toString()} />
          <HudStat label="Runes" tone="text-plasma" value={cycles.toString()} />
          <HudStat label="Hits" tone="text-success" value={hits.toString()} />
          <HudStat label="Lives" tone="text-nebula" value={lives.toString()} />
          <HudStat label="Fuel" tone="text-comet" value={`${roundedTime}s`} />
          <button
            className="flex min-h-12 min-w-[104px] items-center justify-center gap-2 rounded-md border border-white/10 bg-white/7 px-4 py-2 font-bold hover:bg-white/12"
            onClick={() => setIsPaused((value) => !value)}
            type="button"
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="flex min-h-12 min-w-[86px] items-center justify-center gap-2 rounded-md border border-white/10 bg-white/7 px-4 py-2 font-bold hover:bg-white/12"
            onClick={onExit}
            type="button"
          >
            <Home className="h-5 w-5" />
            Map
          </button>
          <button
            className="flex min-h-12 min-w-[88px] items-center justify-center gap-2 rounded-md bg-nebula px-4 py-2 font-black text-white hover:brightness-110"
            onClick={() => finish('quit')}
            type="button"
          >
            <X className="h-5 w-5" />
            End
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-success/30 bg-space-950 shadow-[0_0_44px_rgba(125,255,155,0.16)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(125,255,155,0.18),transparent_28%),radial-gradient(circle_at_15%_22%,rgba(108,240,255,0.16),transparent_18%),linear-gradient(180deg,#07111f,#081729)]" />
        <div className="pointer-events-none absolute inset-0 opacity-55">
          {Array.from({ length: 72 }).map((_, index) => (
            <span
              className="absolute h-1 w-1 rounded-full bg-white"
              key={index}
              style={{
                left: `${(index * 37) % 100}%`,
                top: `${(index * 61) % 100}%`,
                opacity: 0.2 + (index % 5) * 0.12,
              }}
            />
          ))}
        </div>

        <div className="relative grid h-full grid-cols-[minmax(250px,0.8fr)_minmax(420px,1.25fr)] gap-6 p-6">
          <section className="flex min-h-0 flex-col gap-4">
            <div className="game-hud-panel p-4">
              <p className="text-xs font-black uppercase text-success">Portal Task</p>
              <h2 className="mt-1 text-2xl font-black">{portalMessage}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                Tiny code. Depth tunnel. Match rune.
              </p>
            </div>

            <div className="game-hud-panel flex flex-1 flex-col items-center justify-center p-5 text-center">
              <p className="text-xs font-black uppercase text-comet">
                {isCodeVisible ? 'Tiny Code' : 'Code Locked'}
              </p>
              <div
                className={clsx(
                  'mt-5 flex aspect-square w-20 items-center justify-center rounded-lg border text-center font-black shadow-[0_0_28px_rgba(125,255,155,0.24)]',
                  isCodeVisible
                    ? 'border-success/35 bg-black/45 text-success'
                    : 'border-white/14 bg-black/25 text-white/45',
                )}
                data-scan-rune-size={scanRuneSize}
                style={{ fontSize: `${scanRuneSize}px` }}
              >
                {isCodeVisible ? round.target : '••'}
              </div>
              <button
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-success px-5 py-3 text-xl font-black text-space-950 shadow-[0_0_24px_rgba(125,255,155,0.28)] disabled:cursor-not-allowed disabled:opacity-35"
                disabled={phase !== 'scan' || isPaused || gameOver}
                onPointerDown={(event) => divePortal(event.pointerType)}
                type="button"
              >
                <Zap className="h-6 w-6" />
                Dive Portal
              </button>
            </div>
          </section>

          <section
            aria-label="Focus Portal game surface"
            className="relative min-h-0 overflow-hidden rounded-lg border border-success/20 bg-black/20"
            data-depth-beacons={config.depthBeacons}
            data-depth-charge-ms={config.depthChargeMs}
            data-options={config.options}
            data-phase={phase}
            data-scan-rune-size={scanRuneSize}
          >
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2">
                {tunnelRings.map((scale, index) => {
                  const depthOffset = phase === 'depth' ? portalCharge * (index + 1) * 8 : 0;
                  return (
                    <div
                      aria-hidden="true"
                      className={clsx(
                        'absolute left-1/2 top-1/2 aspect-square rounded-full border transition-all duration-300',
                        index % 2 === 0 ? 'border-success/55' : 'border-comet/45',
                      )}
                      key={scale}
                      style={{
                        opacity: 0.2 + index * 0.08,
                        transform: `translate(-50%, -50%) rotateX(62deg) rotate(${portalCharge * 80 + index * 8}deg) scale(${scale + depthOffset / 100})`,
                        width: '76%',
                      }}
                    />
                  );
                })}
              </div>

              <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-white/5 shadow-[0_0_36px_rgba(108,240,255,0.22)]" />
              <div className="absolute bottom-16 left-1/2 h-3 w-56 -translate-x-1/2 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${Math.round(portalCharge * 100)}%` }}
                />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[54%] text-center">
                <div className="text-7xl font-black text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]">
                  {portalSymbol}
                </div>
              </div>
            </div>

            {phase === 'depth' &&
              depthBeacons.map((beacon) => (
                <button
                  aria-label={`Charge depth beacon ${beacon.id + 1}`}
                  className={clsx(
                    'absolute rounded-full border-4 border-white/70 bg-success text-space-950 shadow-[0_0_26px_rgba(125,255,155,0.62)] transition',
                    beacon.hit ? 'scale-50 opacity-20' : 'hover:scale-110 active:scale-95',
                  )}
                  disabled={beacon.hit}
                  key={beacon.id}
                  data-depth={beacon.depth.toFixed(2)}
                  onPointerDown={(event) => hitDepthBeacon(beacon.id, event.pointerType)}
                  style={{
                    height: beacon.size,
                    left: `${beacon.xPercent}%`,
                    opacity: beacon.hit ? 0.2 : 0.62 + beacon.depth * 0.36,
                    top: `${beacon.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: beacon.size,
                    zIndex: Math.round(beacon.depth * 10),
                  }}
                  type="button"
                />
              ))}

            {phase === 'choose' && (
              <div className="absolute inset-x-6 bottom-6 grid grid-cols-3 gap-3">
                {round.options.map((glyph) => (
                  <button
                    aria-label={`Choose rune ${glyph}`}
                    className="min-h-20 rounded-lg border border-white/14 bg-white/10 text-4xl font-black text-white shadow-[0_0_18px_rgba(255,255,255,0.08)] transition hover:scale-[1.02] hover:bg-success/24"
                    key={glyph}
                    onPointerDown={(event) => chooseGlyph(glyph, event.pointerType)}
                    type="button"
                  >
                    {glyph}
                  </button>
                ))}
              </div>
            )}

            <div className="absolute left-5 top-5 rounded-lg border border-white/12 bg-space-950/78 px-4 py-3">
              <div className="text-xs font-black uppercase text-white/55">Accuracy</div>
              <div className="text-2xl font-black text-success">{accuracy}%</div>
            </div>

            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-space-950/72 backdrop-blur-sm">
                <div className="glass-panel rounded-lg px-8 py-7 text-center">
                  <Zap className="mx-auto mb-4 h-12 w-12 text-success" />
                  <h2 className="text-3xl font-black">Mission paused</h2>
                  <p className="mt-2 text-white/70">The portal is holding power.</p>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-space-950/78 backdrop-blur-sm">
                <div className="glass-panel max-w-lg rounded-lg px-8 py-7 text-center">
                  <Zap className="mx-auto mb-4 h-14 w-14 text-nebula" />
                  <p className="text-sm font-black uppercase text-nebula">Portal Collapsed</p>
                  <h2 className="mt-2 text-4xl font-black">Try the runes again</h2>
                  <p className="mt-3 leading-6 text-white/70">
                    Scan the tiny rune, dive through the depth beacons, then pick the matching rune.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      className="flex min-h-12 items-center gap-2 rounded-md bg-success px-6 py-3 font-black text-space-950 shadow-[0_0_22px_rgba(125,255,155,0.35)]"
                      onClick={resetRun}
                      type="button"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Restart Mission
                    </button>
                    <button
                      className="min-h-12 rounded-md border border-white/15 bg-white/8 px-6 py-3 font-black text-white"
                      onClick={onExit}
                      type="button"
                    >
                      Back to Map
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function HudStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
      <div className={`text-2xl font-black ${tone}`}>{value}</div>
      <div className="text-xs font-bold uppercase text-white/65">{label}</div>
    </div>
  );
}

function makeRound(optionCount: number, offset = 0, now = performance.now()): PortalRound {
  const target = focusPortalGlyphs[offset % focusPortalGlyphs.length];
  return {
    target,
    options: buildFocusPortalOptions(target, optionCount),
    phaseStartedAt: now,
    chooseStartedAt: now,
  };
}

function makeDepthBeacons(count: number, offset = 0): DepthBeacon[] {
  return Array.from({ length: count }).map((_, index) => {
    const depth = 0.28 + (index / Math.max(1, count - 1)) * 0.58;
    const angle = offset * 0.52 + index * 2.18 + 0.4;
    const radiusX = 12 + depth * 31;
    const radiusY = 7 + depth * 23;

    return {
      id: index,
      xPercent: 50 + Math.cos(angle) * radiusX,
      yPercent: 50 + Math.sin(angle) * radiusY,
      size: Math.round(24 + depth * 42),
      depth,
      hit: false,
    };
  });
}
