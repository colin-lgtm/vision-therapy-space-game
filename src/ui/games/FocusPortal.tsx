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

type PortalPhase = 'scan' | 'far' | 'choose';

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
  farFocusMs: number;
}

const emptyStats: FocusPortalStats = {
  attempts: 0,
  hits: 0,
  misses: 0,
  totalReactionMs: 0,
  completedCycles: 0,
  farFocusMs: 0,
};

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
    farFocusSeconds: Math.round(stats.farFocusMs / 1000),
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

  const [phase, setPhase] = useState<PortalPhase>('scan');
  const [round, setRound] = useState<PortalRound>(() => makeRound(config.options));
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [portalCharge, setPortalCharge] = useState(0);
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
          farFocusSeconds: Math.round(stats.farFocusMs / 1000),
          attempts: stats.attempts,
          misses: stats.misses,
          lives,
          options: config.options,
          farFocusMs: config.farFocusMs,
          scanMs: config.scanMs,
        },
      });
    },
    [config.farFocusMs, config.options, config.scanMs, level, lives, onComplete],
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
    setPhase('scan');
    setRound(makeRound(config.options));
    setRemainingSeconds(config.durationSeconds);
    setPortalCharge(0);
    setCycles(0);
    setHits(0);
    setLives(3);
    setLiveScore(0);
    setIsPaused(false);
    setGameOver(false);
    setRestartNonce((value) => value + 1);
  }, [config.durationSeconds, config.options]);

  const startNextRound = useCallback(
    (now: number) => {
      roundIdRef.current += 1;
      setPhase('scan');
      setPortalCharge(0);
      setRound(makeRound(config.options, roundIdRef.current, now));
    },
    [config.options],
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

  const openFarPortal = useCallback(
    (pointerType: string) => {
      if (phase !== 'scan' || gameOver || isPaused) return;
      inputKindRef.current = inputKindFromPointer(pointerType);
      const now = performance.now();
      setPhase('far');
      setPortalCharge(0);
      setRound((value) => ({ ...value, phaseStartedAt: now }));
      playEffect('launch');
    },
    [gameOver, isPaused, phase],
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

      if (phase === 'far') {
        const farProgress = Math.min(1, (now - round.phaseStartedAt) / config.farFocusMs);
        setPortalCharge(farProgress);
        if (farProgress >= 1) {
          statsRef.current.farFocusMs += config.farFocusMs;
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
    config.farFocusMs,
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
      : phase === 'far'
        ? 'Look at the wall star'
        : 'Pick the match';

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1">
          <p className="text-sm font-bold uppercase text-success">Focus Portal</p>
          <h1 className="text-2xl font-black leading-tight xl:text-3xl">Power the portal runes</h1>
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
                Tiny rune. Far star. Match rune.
              </p>
            </div>

            <div className="game-hud-panel flex flex-1 flex-col items-center justify-center p-5 text-center">
              <p className="text-xs font-black uppercase text-comet">Near Rune</p>
              <div
                className="mt-5 flex aspect-square w-32 items-center justify-center rounded-lg border border-success/35 bg-black/35 text-center font-black text-success shadow-[0_0_28px_rgba(125,255,155,0.24)]"
                style={{ fontSize: `${54 * config.glyphScale}px` }}
              >
                {round.target}
              </div>
              <button
                className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-success px-5 py-3 text-xl font-black text-space-950 shadow-[0_0_24px_rgba(125,255,155,0.28)] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={phase !== 'scan' || isPaused || gameOver}
                onPointerDown={(event) => openFarPortal(event.pointerType)}
                type="button"
              >
                <Zap className="h-6 w-6" />
                Open Portal
              </button>
            </div>
          </section>

          <section
            aria-label="Focus Portal game surface"
            className="relative min-h-0 overflow-hidden rounded-lg border border-success/20 bg-black/20"
            data-far-focus-ms={config.farFocusMs}
            data-options={config.options}
            data-phase={phase}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={clsx(
                  'relative flex aspect-square w-[min(54vh,520px)] items-center justify-center rounded-full border-[10px] transition duration-300',
                  phase === 'far'
                    ? 'border-success shadow-[0_0_80px_rgba(125,255,155,0.45)]'
                    : 'border-plasma/55 shadow-[0_0_52px_rgba(108,240,255,0.2)]',
                )}
              >
                <div className="absolute inset-6 rounded-full border border-white/15" />
                <div
                  className="absolute inset-12 rounded-full border-[12px] border-dashed border-comet/65 transition-transform duration-300"
                  style={{ transform: `rotate(${portalCharge * 260}deg)` }}
                />
                <div className="relative z-10 text-center">
                  <div className="text-7xl font-black text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]">
                    {phase === 'far' ? '★' : phase === 'choose' ? '?' : round.target}
                  </div>
                  <div className="mt-4 h-3 w-56 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${Math.round(portalCharge * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

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
                    Scan the tiny rune, look to the wall star, then pick the matching rune.
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
