import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Pause, Play, RotateCcw, Shield, X, Zap } from 'lucide-react';
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

interface PortalRound {
  id: number;
  target: string;
  options: string[];
  startedAt: number;
  launchX: number;
  launchY: number;
  curveX: number;
  curveY: number;
}

interface FocusPortalStats {
  attempts: number;
  hits: number;
  misses: number;
  totalReactionMs: number;
  completedCycles: number;
  crashes: number;
  decoysSeen: number;
  quickStops: number;
  quickBonusPoints: number;
}

interface Decoy {
  id: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  speed: number;
  size: number;
  spin: number;
}

interface Point {
  x: number;
  y: number;
}

const emptyStats: FocusPortalStats = {
  attempts: 0,
  hits: 0,
  misses: 0,
  totalReactionMs: 0,
  completedCycles: 0,
  crashes: 0,
  decoysSeen: 0,
  quickStops: 0,
  quickBonusPoints: 0,
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
    crashes: stats.crashes,
    decoysSeen: stats.decoysSeen,
    quickStops: stats.quickStops,
    quickBonusPoints: stats.quickBonusPoints,
    misses: stats.misses,
  };
}

export function FocusPortal({ onComplete, onExit }: FocusPortalProps) {
  const storedLevel = useAcademyStore((state) => state.progress['focus-portal'].level);
  const level = Math.max(1, storedLevel);
  const config = useMemo(() => focusPortalConfigForLevel(level), [level]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statsRef = useRef<FocusPortalStats>({ ...emptyStats });
  const inputKindRef = useRef<InputKind>('unknown');
  const activeSecondsRef = useRef(0);
  const completedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const pausedStartedRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const roundIdRef = useRef(0);
  const hullRef = useRef(4);
  const targetDepthRef = useRef(0);
  const targetScaleRef = useRef(0);
  const crashedRoundRef = useRef(-1);

  const [round, setRound] = useState<PortalRound>(() => makeRound(config.options));
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [targetDepth, setTargetDepth] = useState(0);
  const [targetScale, setTargetScale] = useState(0);
  const [hits, setHits] = useState(0);
  const [quickStops, setQuickStops] = useState(0);
  const [hull, setHull] = useState(4);
  const [liveScore, setLiveScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);

  const decoys = useMemo(() => makeDecoys(config.decoyCount), [config.decoyCount]);
  const targetInFocus = targetDepth >= config.focusStart && targetDepth <= config.focusEnd;

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
          crashes: stats.crashes,
          decoysSeen: stats.decoysSeen,
          quickStops: stats.quickStops,
          quickBonusPoints: stats.quickBonusPoints,
          attempts: stats.attempts,
          misses: stats.misses,
          hull,
          options: config.options,
          approachMs: config.approachMs,
          focusStart: config.focusStart,
          focusEnd: config.focusEnd,
          decoyCount: config.decoyCount,
        },
      });
    },
    [
      config.approachMs,
      config.decoyCount,
      config.focusEnd,
      config.focusStart,
      config.options,
      hull,
      level,
      onComplete,
    ],
  );

  const startNextRound = useCallback(
    (now: number) => {
      roundIdRef.current += 1;
      targetDepthRef.current = 0;
      targetScaleRef.current = 0;
      setTargetDepth(0);
      setTargetScale(0);
      setRound(makeRound(config.options, roundIdRef.current, now));
    },
    [config.options],
  );

  const damageShip = useCallback(() => {
    const nextHull = Math.max(0, hullRef.current - 1);
    hullRef.current = nextHull;
    setHull(nextHull);

    if (nextHull <= 0) {
      setGameOver(true);
      playEffect('hit');
      return false;
    }

    playEffect('warning');
    return true;
  }, []);

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
    hullRef.current = 4;
    targetDepthRef.current = 0;
    targetScaleRef.current = 0;
    crashedRoundRef.current = -1;
    setRound(makeRound(config.options));
    setRemainingSeconds(config.durationSeconds);
    setTargetDepth(0);
    setTargetScale(0);
    setHits(0);
    setQuickStops(0);
    setHull(4);
    setLiveScore(0);
    setIsPaused(false);
    setGameOver(false);
    setRestartNonce((value) => value + 1);
  }, [config.durationSeconds, config.options]);

  const crashTarget = useCallback(
    (now: number) => {
      statsRef.current.misses += 1;
      statsRef.current.crashes += 1;
      setLiveScore(calculateFocusPortalScore(focusPortalScoreInput(statsRef.current)));
      if (damageShip()) startNextRound(now);
    },
    [damageShip, startNextRound],
  );

  const chooseCode = useCallback(
    (glyph: string, pointerType: string) => {
      if (gameOver || isPaused) return;
      inputKindRef.current = inputKindFromPointer(pointerType);
      const now = performance.now();
      const isCorrect = glyph === round.target;
      const currentDepth = targetDepthRef.current;
      const isEarlyBonus = currentDepth < config.focusStart;
      const isBeforeImpact = currentDepth <= config.focusEnd;
      statsRef.current.attempts += 1;

      if (isCorrect && isBeforeImpact) {
        const earlyBonusPoints = isEarlyBonus
          ? Math.round((1 - currentDepth / config.focusStart) * 24)
          : 0;
        statsRef.current.hits += 1;
        statsRef.current.completedCycles += 1;
        statsRef.current.decoysSeen += config.decoyCount;
        statsRef.current.quickStops += isEarlyBonus ? 1 : 0;
        statsRef.current.quickBonusPoints += earlyBonusPoints;
        statsRef.current.totalReactionMs += Math.max(0, now - round.startedAt);
        setHits(statsRef.current.hits);
        setQuickStops(statsRef.current.quickStops);
        setLiveScore(calculateFocusPortalScore(focusPortalScoreInput(statsRef.current)));
        playEffect(isEarlyBonus ? 'complete' : 'lock');
        startNextRound(now);
        return;
      }

      statsRef.current.misses += 1;
      setLiveScore(calculateFocusPortalScore(focusPortalScoreInput(statsRef.current)));
      if (damageShip()) startNextRound(now);
    },
    [
      config.decoyCount,
      config.focusEnd,
      config.focusStart,
      damageShip,
      gameOver,
      isPaused,
      round.startedAt,
      round.target,
      startNextRound,
    ],
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

      const depth = Math.min(1, (now - round.startedAt) / config.approachMs);
      const scale = targetScaleFromDepth(depth, config.glyphScale);
      targetDepthRef.current = depth;
      targetScaleRef.current = scale;
      setTargetDepth(depth);
      setTargetScale(scale);

      if (depth >= 1 && crashedRoundRef.current !== round.id) {
        crashedRoundRef.current = round.id;
        crashTarget(now);
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
    config.approachMs,
    config.durationSeconds,
    config.glyphScale,
    crashTarget,
    finish,
    gameOver,
    isPaused,
    restartNonce,
    round.id,
    round.startedAt,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let frame = 0;
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (now: number) => {
      if (disposed) return;
      resize();
      const rect = canvas.getBoundingClientRect();
      renderDepthDive(context, {
        width: rect.width,
        height: rect.height,
        now,
        round,
        decoys,
        focusStart: config.focusStart,
        focusEnd: config.focusEnd,
        targetDepth: targetDepthRef.current,
        targetScale: targetScaleRef.current,
        hull: hullRef.current,
        paused: isPaused,
      });
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, [config.focusEnd, config.focusStart, decoys, isPaused, round, restartNonce]);

  const roundedTime = Math.ceil(remainingSeconds);
  const accuracy = Math.round(focusPortalAccuracy(statsRef.current) * 100);
  const targetDepthPercent = Math.round(targetDepth * 100);
  const focusStatus = targetInFocus ? 'LOCK' : targetDepth < config.focusStart ? 'BONUS' : 'LATE';

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1">
          <p className="text-sm font-bold uppercase text-success">Focus Portal</p>
          <h1 className="text-2xl font-black leading-tight xl:text-3xl">Stop the crash codes</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <HudStat label="Level" tone="text-success" value={level.toString()} />
          <HudStat label="Score" tone="text-comet" value={liveScore.toString()} />
          <HudStat label="Stops" tone="text-plasma" value={hits.toString()} />
          <HudStat label="Quick" tone="text-success" value={quickStops.toString()} />
          <HudStat label="Hull" tone="text-nebula" value={hull.toString()} />
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(125,255,155,0.15),transparent_28%),radial-gradient(circle_at_20%_18%,rgba(108,240,255,0.14),transparent_18%),linear-gradient(180deg,#07111f,#081729)]" />
        <div className="relative grid h-full grid-cols-[minmax(240px,0.58fr)_minmax(520px,1.42fr)] gap-5 p-5">
          <section className="flex min-h-0 flex-col gap-4">
            <div className="game-hud-panel p-4">
              <p className="text-xs font-black uppercase text-success">Ship Task</p>
              <h2 className="mt-1 text-2xl font-black">Tap the matching code</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-white/70">
                Tap early for bonus, or hit the green zone for a solid stop.
              </p>
            </div>

            <div className="game-hud-panel flex flex-1 flex-col justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase text-comet">Incoming Threat</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <PanelStat label="Depth" value={`${targetDepthPercent}%`} />
                  <PanelStat
                    label="Timing"
                    value={focusStatus}
                    tone={targetDepth <= config.focusEnd ? 'text-success' : 'text-white'}
                  />
                  <PanelStat label="Accuracy" value={`${accuracy}%`} />
                  <PanelStat label="Decoys" value={config.decoyCount.toString()} />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/24 p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-xs font-black uppercase text-white/50">Ship Hull</p>
                    <div className="mt-1 flex gap-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <span
                          className={clsx(
                            'h-4 w-10 rounded-full',
                            index < hull
                              ? 'bg-success shadow-[0_0_14px_rgba(125,255,155,0.38)]'
                              : 'bg-white/12',
                          )}
                          key={index}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-label="Focus Portal game surface"
            className="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-success/20 bg-black/20"
            data-approach-ms={config.approachMs}
            data-decoys={config.decoyCount}
            data-focus-end={config.focusEnd}
            data-focus-start={config.focusStart}
            data-hull={hull}
            data-quick-stops={quickStops}
            data-options={config.options}
            data-phase="incoming"
            data-stops={hits}
            data-target-code={round.target}
            data-target-depth={targetDepth.toFixed(3)}
            data-target-in-focus={targetInFocus}
            data-target-scale={targetScale.toFixed(1)}
          >
            <div className="relative min-h-0 overflow-hidden" data-flight-area="true">
              <canvas
                aria-label="Depth Dive flight canvas"
                className="h-full w-full touch-none"
                ref={canvasRef}
              />
              <div className="pointer-events-none absolute left-5 top-5 rounded-lg border border-white/12 bg-space-950/78 px-4 py-3">
                <div className="text-xs font-black uppercase text-white/55">Focus Zone</div>
                <div
                  className={clsx(
                    'text-2xl font-black',
                    targetInFocus ? 'text-success' : 'text-comet',
                  )}
                >
                  {focusStatus}
                </div>
              </div>
            </div>

            <div
              className="answer-deck grid gap-3 border-t border-white/10 bg-space-950/88 p-4"
              data-answer-deck="true"
              style={{ gridTemplateColumns: `repeat(${round.options.length}, minmax(0, 1fr))` }}
            >
              {round.options.map((glyph) => (
                <button
                  aria-label={`Code ${glyph}`}
                  className="min-h-20 rounded-lg border border-white/14 bg-white/10 text-4xl font-black text-white shadow-[0_0_18px_rgba(255,255,255,0.08)] transition hover:scale-[1.02] hover:bg-success/24 active:scale-[0.98]"
                  key={glyph}
                  onPointerDown={(event) => chooseCode(glyph, event.pointerType)}
                  type="button"
                >
                  {glyph}
                </button>
              ))}
            </div>

            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-space-950/72 backdrop-blur-sm">
                <div className="glass-panel rounded-lg px-8 py-7 text-center">
                  <Zap className="mx-auto mb-4 h-12 w-12 text-success" />
                  <h2 className="text-3xl font-black">Mission paused</h2>
                  <p className="mt-2 text-white/70">The threat scanner is holding position.</p>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-space-950/78 backdrop-blur-sm">
                <div className="glass-panel max-w-lg rounded-lg px-8 py-7 text-center">
                  <Shield className="mx-auto mb-4 h-14 w-14 text-nebula" />
                  <p className="text-sm font-black uppercase text-nebula">Ship Disabled</p>
                  <h2 className="mt-2 text-4xl font-black">Stop the crash codes</h2>
                  <p className="mt-3 leading-6 text-white/70">
                    Watch the tiny object grow, wait for the focus zone, then tap its code before
                    impact.
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

function PanelStat({
  label,
  value,
  tone = 'text-success',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/24 p-3 text-center">
      <div className={`text-2xl font-black ${tone}`}>{value}</div>
      <div className="text-[10px] font-black uppercase text-white/52">{label}</div>
    </div>
  );
}

function makeRound(optionCount: number, offset = 0, now = performance.now()): PortalRound {
  const target = focusPortalGlyphs[offset % focusPortalGlyphs.length];
  const side = offset % 2 === 0 ? -1 : 1;

  return {
    id: offset,
    target,
    options: buildFocusPortalOptions(target, optionCount),
    startedAt: now,
    launchX: 0.28 + ((offset * 17) % 44) / 100,
    launchY: 0.16 + ((offset * 11) % 20) / 100,
    curveX: side * (0.05 + ((offset * 7) % 10) / 100),
    curveY: 0.04 + ((offset * 5) % 8) / 100,
  };
}

function makeDecoys(count: number): Decoy[] {
  return Array.from({ length: count }).map((_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    return {
      id: index,
      xStart: 0.16 + ((index * 23) % 66) / 100,
      yStart: 0.06 + ((index * 19) % 28) / 100,
      xEnd: 0.18 + ((index * 31) % 64) / 100 + side * 0.22,
      yEnd: 0.82 + ((index * 13) % 12) / 100,
      speed: 0.62 + (index % 4) * 0.12,
      size: 24 + (index % 4) * 8,
      spin: side * (0.9 + index * 0.13),
    };
  });
}

function renderDepthDive(
  context: CanvasRenderingContext2D,
  state: {
    width: number;
    height: number;
    now: number;
    round: PortalRound;
    decoys: Decoy[];
    focusStart: number;
    focusEnd: number;
    targetDepth: number;
    targetScale: number;
    hull: number;
    paused: boolean;
  },
) {
  const {
    width,
    height,
    now,
    round,
    decoys,
    focusStart,
    focusEnd,
    targetDepth,
    targetScale,
    hull,
  } = state;
  context.clearRect(0, 0, width, height);

  drawSpace(context, width, height, now);
  drawPerspectiveGrid(context, width, height, now);
  drawFocusZone(context, width, height, focusStart, focusEnd, targetDepth);
  drawDecoys(context, width, height, now, decoys, round.id);
  drawTargetThreat(context, width, height, round, targetDepth, targetScale, focusStart, focusEnd);
  drawCockpit(context, width, height, hull);
}

function drawSpace(context: CanvasRenderingContext2D, width: number, height: number, now: number) {
  const gradient = context.createRadialGradient(
    width / 2,
    height * 0.35,
    20,
    width / 2,
    height / 2,
    width,
  );
  gradient.addColorStop(0, '#12334a');
  gradient.addColorStop(0.42, '#071423');
  gradient.addColorStop(1, '#030a14');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 82; index += 1) {
    const x = (index * 47) % width;
    const drift = (now * (0.01 + (index % 5) * 0.004) + index * 29) % height;
    const y = (drift + ((index * 53) % height)) % height;
    const size = 1 + (index % 3) * 0.7;
    context.globalAlpha = 0.22 + (index % 5) * 0.09;
    context.fillStyle = index % 11 === 0 ? '#ffd166' : '#ffffff';
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawPerspectiveGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
) {
  const center: Point = { x: width / 2, y: height * 0.42 };
  context.strokeStyle = 'rgba(125,255,155,0.18)';
  context.lineWidth = 1;

  for (let ray = 0; ray < 18; ray += 1) {
    const angle = (ray / 18) * Math.PI * 2 + now * 0.00008;
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(center.x + Math.cos(angle) * width, center.y + Math.sin(angle) * height);
    context.stroke();
  }

  for (let ring = 0; ring < 8; ring += 1) {
    const depth = ((now * 0.00016 + ring / 8) % 1) ** 1.8;
    const radius = 26 + depth * width * 0.72;
    context.globalAlpha = 0.26 * (1 - depth);
    context.strokeStyle = ring % 2 === 0 ? '#7dff9b' : '#6cf0ff';
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawFocusZone(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  focusStart: number,
  focusEnd: number,
  targetDepth: number,
) {
  const center: Point = { x: width / 2, y: height * 0.58 };
  const inZone = targetDepth >= focusStart && targetDepth <= focusEnd;
  const radius = Math.min(width, height) * 0.19;

  context.save();
  context.shadowBlur = inZone ? 28 : 12;
  context.shadowColor = inZone ? '#7dff9b' : '#6cf0ff';
  context.strokeStyle = inZone ? '#7dff9b' : 'rgba(108,240,255,0.55)';
  context.lineWidth = inZone ? 5 : 3;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  context.strokeStyle = 'rgba(255,255,255,0.2)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(center.x - radius - 14, center.y);
  context.lineTo(center.x - radius + 20, center.y);
  context.moveTo(center.x + radius - 20, center.y);
  context.lineTo(center.x + radius + 14, center.y);
  context.moveTo(center.x, center.y - radius - 14);
  context.lineTo(center.x, center.y - radius + 20);
  context.moveTo(center.x, center.y + radius - 20);
  context.lineTo(center.x, center.y + radius + 14);
  context.stroke();
}

function drawTargetThreat(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  round: PortalRound,
  depth: number,
  scale: number,
  focusStart: number,
  focusEnd: number,
) {
  const position = targetPosition(width, height, round, depth);
  const inZone = depth >= focusStart && depth <= focusEnd;
  const radius = Math.max(5, scale / 2);

  context.save();
  context.shadowBlur = inZone ? 34 : 18;
  context.shadowColor = inZone ? '#7dff9b' : '#ffd166';
  context.fillStyle = inZone ? '#7dff9b' : '#ffd166';
  context.beginPath();
  context.arc(position.x, position.y, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#071423';
  context.beginPath();
  context.arc(position.x, position.y, radius * 0.76, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#ffffff';
  context.font = `900 ${Math.max(8, radius * 1.25)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(round.target, position.x, position.y + radius * 0.04);

  if (depth > 0.78) {
    context.strokeStyle = 'rgba(255,107,157,0.84)';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(position.x, position.y, radius + 10 + Math.sin(depth * 26) * 4, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawDecoys(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  decoys: Decoy[],
  roundId: number,
) {
  decoys.forEach((decoy) => {
    const depth = (now * 0.00034 * decoy.speed + decoy.id * 0.31 + roundId * 0.11) % 1;
    const ease = depth ** 1.45;
    const x = width * lerp(decoy.xStart, decoy.xEnd, ease);
    const y = height * lerp(decoy.yStart, decoy.yEnd, ease);
    const radius = decoy.size * (0.38 + ease * 2.45);

    context.save();
    context.translate(x, y);
    context.rotate(now * 0.001 * decoy.spin);
    context.globalAlpha = 0.48 + ease * 0.46;
    context.shadowBlur = 14 + ease * 20;
    context.shadowColor = '#ff6b9d';
    context.fillStyle = '#8f5467';
    context.beginPath();
    context.moveTo(-radius * 0.72, -radius * 0.18);
    context.lineTo(-radius * 0.28, -radius * 0.7);
    context.lineTo(radius * 0.62, -radius * 0.42);
    context.lineTo(radius * 0.78, radius * 0.24);
    context.lineTo(radius * 0.08, radius * 0.74);
    context.lineTo(-radius * 0.62, radius * 0.36);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(255,209,102,0.46)';
    context.lineWidth = Math.max(2, radius * 0.08);
    context.stroke();
    context.restore();
  });
  context.globalAlpha = 1;
}

function drawCockpit(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hull: number,
) {
  const center: Point = { x: width / 2, y: height * 0.92 };
  const shieldRadius = Math.min(width, height) * 0.27;
  context.save();
  context.strokeStyle = hull > 1 ? 'rgba(125,255,155,0.55)' : 'rgba(255,107,157,0.7)';
  context.lineWidth = 5;
  context.beginPath();
  context.arc(center.x, center.y, shieldRadius, Math.PI * 1.05, Math.PI * 1.95);
  context.stroke();

  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.beginPath();
  context.moveTo(center.x - 72, height);
  context.lineTo(center.x - 34, height - 48);
  context.lineTo(center.x + 34, height - 48);
  context.lineTo(center.x + 72, height);
  context.closePath();
  context.fill();
  context.restore();
}

function targetPosition(width: number, height: number, round: PortalRound, depth: number): Point {
  const ease = depth * depth * (3 - 2 * depth);
  const x =
    width *
    (lerp(round.launchX, 0.5, ease) +
      Math.sin(depth * Math.PI) * round.curveX * (1 - depth * 0.35));
  const y =
    height *
    (lerp(round.launchY, 0.68, ease) +
      Math.sin(depth * Math.PI) * round.curveY * (1 - depth * 0.25));
  return { x, y };
}

function targetScaleFromDepth(depth: number, glyphScale: number) {
  return (8 + depth ** 2.15 * 185) * glyphScale;
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}
