import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Pause, Play, RotateCcw, Satellite, Shield, X } from 'lucide-react';
import { clsx } from 'clsx';
import { playEffect } from '@/domain/audio';
import {
  calculateDualSignalScore,
  dualSignalConfigForLevel,
  makeDualSignalRound,
  type DualSignalRound,
} from '@/domain/dualSignal';
import { useAcademyStore } from '@/state/useAcademyStore';
import type { InputKind, MissionResult } from '@/domain/types';

interface DualSignalDecoderProps {
  onComplete: (result: MissionResult) => void | Promise<void>;
  onExit: () => void;
}

interface DualSignalStats {
  attempts: number;
  hits: number;
  mistakes: number;
  totalReactionMs: number;
  decodedPairs: number;
  bestCombo: number;
  timeouts: number;
}

interface LaserBurst {
  id: number;
  pair: string;
}

const emptyStats: DualSignalStats = {
  attempts: 0,
  hits: 0,
  mistakes: 0,
  totalReactionMs: 0,
  decodedPairs: 0,
  bestCombo: 0,
  timeouts: 0,
};

function inputKindFromPointer(pointerType: string): InputKind {
  if (pointerType === 'touch' || pointerType === 'pen' || pointerType === 'mouse')
    return pointerType;
  return 'unknown';
}

function signalAccuracy(stats: DualSignalStats): number {
  return stats.attempts > 0 ? stats.hits / stats.attempts : 0;
}

function averageReaction(stats: DualSignalStats): number {
  return stats.hits > 0 ? stats.totalReactionMs / stats.hits : 9999;
}

export function DualSignalDecoder({ onComplete, onExit }: DualSignalDecoderProps) {
  const storedLevel = useAcademyStore((state) => state.progress['dual-signal'].level);
  const level = Math.max(1, storedLevel);
  const config = useMemo(() => dualSignalConfigForLevel(level), [level]);

  const statsRef = useRef<DualSignalStats>({ ...emptyStats });
  const inputKindRef = useRef<InputKind>('unknown');
  const completedRef = useRef(false);
  const startRef = useRef<number | null>(null);
  const pausedStartedRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const roundIdRef = useRef(0);
  const shieldRef = useRef(100);
  const comboRef = useRef(0);
  const timedOutRoundRef = useRef(-1);
  const resolvingRoundRef = useRef(false);
  const laserTimeoutRef = useRef<number | null>(null);
  const signalProgressRef = useRef(1);

  const [round, setRound] = useState<DualSignalRound>(() => makeDualSignalRound(config.options));
  const [roundStartedAt, setRoundStartedAt] = useState(() => performance.now());
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [signalProgress, setSignalProgress] = useState(1);
  const [shield, setShield] = useState(100);
  const [decoded, setDecoded] = useState(0);
  const [combo, setCombo] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const [laserBurst, setLaserBurst] = useState<LaserBurst | null>(null);

  const scoreFromStats = useCallback(
    (stats: DualSignalStats) =>
      calculateDualSignalScore({
        accuracy: signalAccuracy(stats),
        averageReactionMs: averageReaction(stats),
        decodedPairs: stats.decodedPairs,
        bestCombo: stats.bestCombo,
        shieldRemaining: shieldRef.current,
        mistakes: stats.mistakes,
      }),
    [],
  );

  const finish = useCallback(
    (status: MissionResult['status']) => {
      if (completedRef.current) return;
      completedRef.current = true;

      const stats = statsRef.current;
      const score = status === 'completed' ? scoreFromStats(stats) : 0;

      void onComplete({
        worldId: 'dual-signal',
        level,
        inputKind: inputKindRef.current,
        status,
        score,
        activeSeconds: Math.max(1, Math.round(activeSecondsRef.current)),
        metrics: {
          accuracy: Math.round(signalAccuracy(stats) * 100),
          averageReactionMs: Math.round(averageReaction(stats)),
          decodedPairs: stats.decodedPairs,
          bestCombo: stats.bestCombo,
          mistakes: stats.mistakes,
          timeouts: stats.timeouts,
          shieldRemaining: Math.round(shieldRef.current),
          options: config.options,
          signalMs: config.signalMs,
          decoyPairs: config.decoyPairs,
        },
      });
    },
    [config.decoyPairs, config.options, config.signalMs, level, onComplete, scoreFromStats],
  );

  const startNextRound = useCallback(() => {
    const now = performance.now();
    roundIdRef.current += 1;
    resolvingRoundRef.current = false;
    signalProgressRef.current = 1;
    setLaserBurst(null);
    setRound(makeDualSignalRound(config.options, roundIdRef.current));
    setRoundStartedAt(now);
    setSignalProgress(1);
  }, [config.options]);

  const scheduleNextRoundAfterLaser = useCallback(() => {
    if (laserTimeoutRef.current !== null) window.clearTimeout(laserTimeoutRef.current);
    laserTimeoutRef.current = window.setTimeout(() => {
      laserTimeoutRef.current = null;
      startNextRound();
    }, 620);
  }, [startNextRound]);

  const damageShield = useCallback((amount: number) => {
    const next = Math.max(0, shieldRef.current - amount);
    shieldRef.current = next;
    setShield(next);
    comboRef.current = 0;
    setCombo(0);

    if (next <= 0) {
      setGameOver(true);
      playEffect('hit');
      return false;
    }

    playEffect('warning');
    return true;
  }, []);

  const resetRun = useCallback(() => {
    statsRef.current = { ...emptyStats };
    inputKindRef.current = 'unknown';
    completedRef.current = false;
    startRef.current = null;
    pausedStartedRef.current = null;
    pausedMsRef.current = 0;
    activeSecondsRef.current = 0;
    roundIdRef.current = 0;
    shieldRef.current = 100;
    comboRef.current = 0;
    timedOutRoundRef.current = -1;
    resolvingRoundRef.current = false;
    signalProgressRef.current = 1;
    if (laserTimeoutRef.current !== null) {
      window.clearTimeout(laserTimeoutRef.current);
      laserTimeoutRef.current = null;
    }
    setRound(makeDualSignalRound(config.options));
    setRoundStartedAt(performance.now());
    setRemainingSeconds(config.durationSeconds);
    setSignalProgress(1);
    setShield(100);
    setDecoded(0);
    setCombo(0);
    setLiveScore(0);
    setIsPaused(false);
    setGameOver(false);
    setLaserBurst(null);
    setRestartNonce((value) => value + 1);
  }, [config.durationSeconds, config.options]);

  const choosePair = useCallback(
    (pair: string, pointerType: string) => {
      if (gameOver || isPaused || resolvingRoundRef.current) return;
      inputKindRef.current = inputKindFromPointer(pointerType);
      const stats = statsRef.current;
      const now = performance.now();
      stats.attempts += 1;

      if (pair === round.targetPair) {
        stats.hits += 1;
        stats.decodedPairs += 1;
        stats.totalReactionMs += Math.max(0, now - roundStartedAt);
        comboRef.current += 1;
        stats.bestCombo = Math.max(stats.bestCombo, comboRef.current);
        shieldRef.current = Math.min(100, shieldRef.current + 4);
        setShield(shieldRef.current);
        setDecoded(stats.decodedPairs);
        setCombo(comboRef.current);
        setLiveScore(scoreFromStats(stats));
        resolvingRoundRef.current = true;
        setLaserBurst({ id: roundIdRef.current, pair });
        playEffect('laser');
        window.setTimeout(() => playEffect(comboRef.current >= 3 ? 'complete' : 'hit'), 240);
        scheduleNextRoundAfterLaser();
        return;
      }

      stats.mistakes += 1;
      setLiveScore(scoreFromStats(stats));
      if (damageShield(15)) startNextRound();
    },
    [
      damageShield,
      gameOver,
      isPaused,
      round.targetPair,
      roundStartedAt,
      scheduleNextRoundAfterLaser,
      scoreFromStats,
      startNextRound,
    ],
  );

  useEffect(() => {
    let frame = 0;

    const tick = (now: number) => {
      if (gameOver) return;
      if (startRef.current === null) startRef.current = now;

      if (isPaused) {
        if (pausedStartedRef.current === null) pausedStartedRef.current = now;
        frame = requestAnimationFrame(tick);
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

      const progress = resolvingRoundRef.current
        ? signalProgressRef.current
        : Math.max(0, 1 - (now - roundStartedAt) / config.signalMs);
      signalProgressRef.current = progress;
      setSignalProgress(progress);

      if (
        progress <= 0 &&
        !resolvingRoundRef.current &&
        timedOutRoundRef.current !== roundIdRef.current
      ) {
        timedOutRoundRef.current = roundIdRef.current;
        statsRef.current.mistakes += 1;
        statsRef.current.timeouts += 1;
        setLiveScore(scoreFromStats(statsRef.current));
        if (damageShield(12)) startNextRound();
      }

      if (remaining <= 0) {
        finish('completed');
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    config.durationSeconds,
    config.signalMs,
    damageShield,
    finish,
    gameOver,
    isPaused,
    restartNonce,
    roundStartedAt,
    scoreFromStats,
    startNextRound,
  ]);

  useEffect(
    () => () => {
      if (laserTimeoutRef.current !== null) window.clearTimeout(laserTimeoutRef.current);
    },
    [],
  );

  const roundedTime = Math.ceil(remainingSeconds);
  const accuracy = Math.round(signalAccuracy(statsRef.current) * 100);
  const signalPercent = Math.round(signalProgress * 100);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1">
          <p className="text-sm font-bold uppercase text-nebula">Dual-Signal Decoder</p>
          <h1 className="text-2xl font-black leading-tight xl:text-3xl">Match both signals</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <HudStat label="Level" tone="text-nebula" value={level.toString()} />
          <HudStat label="Score" tone="text-comet" value={liveScore.toString()} />
          <HudStat label="Decoded" tone="text-success" value={decoded.toString()} />
          <HudStat label="Combo" tone="text-plasma" value={combo.toString()} />
          <HudStat label="Shield" tone="text-success" value={`${Math.round(shield)}%`} />
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

      <section
        aria-label="Dual-Signal Decoder game surface"
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-nebula/30 bg-space-950 shadow-[0_0_44px_rgba(255,107,157,0.14)]"
        data-combo={combo}
        data-decoded={decoded}
        data-options={config.options}
        data-laser-state={laserBurst ? 'firing' : 'idle'}
        data-shield={Math.round(shield)}
        data-signal-ms={config.signalMs}
        data-signal-progress={signalProgress.toFixed(2)}
        data-target-pair={round.targetPair}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(108,240,255,0.17),transparent_26%),radial-gradient(circle_at_20%_20%,rgba(255,107,157,0.16),transparent_20%),linear-gradient(180deg,#07111f,#081729)]" />
        <div className="pointer-events-none absolute inset-0 opacity-55">
          {Array.from({ length: 86 }).map((_, index) => (
            <span
              className="absolute h-1 w-1 rounded-full bg-white"
              key={index}
              style={{
                left: `${(index * 43) % 100}%`,
                opacity: 0.18 + (index % 5) * 0.11,
                top: `${(index * 67) % 100}%`,
              }}
            />
          ))}
        </div>

        <div className="relative grid h-full grid-rows-[minmax(0,1fr)_auto]">
          <div className="grid min-h-0 grid-cols-[minmax(170px,0.42fr)_minmax(360px,1fr)_minmax(170px,0.42fr)] gap-5 p-5">
            <SignalTower label="Red Signal" signal={round.left} tone="red" />

            <div className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/22 p-5">
              <div className="absolute left-0 top-1/2 h-3 w-[42%] -translate-y-1/2 rounded-r-full bg-nebula/70 shadow-[0_0_28px_rgba(255,107,157,0.42)]" />
              <div className="absolute right-0 top-1/2 h-3 w-[42%] -translate-y-1/2 rounded-l-full bg-plasma/70 shadow-[0_0_28px_rgba(108,240,255,0.42)]" />

              <div className="relative flex aspect-square w-[min(48vh,360px)] items-center justify-center rounded-full border-[10px] border-white/12 bg-space-950/76 shadow-[0_0_48px_rgba(255,255,255,0.1)]">
                <div
                  className="absolute inset-8 rounded-full border-[12px] border-success/45 transition-all"
                  style={{
                    opacity: 0.28 + shield / 140,
                    transform: `scale(${0.88 + signalProgress * 0.12})`,
                  }}
                />
                <Shield className="h-24 w-24 text-success drop-shadow-[0_0_22px_rgba(125,255,155,0.42)]" />
                <EnemyShip laserBurst={laserBurst} pair={round.targetPair} />
                <div className="absolute bottom-10 text-center">
                  <div className="text-xs font-black uppercase text-white/50">Signal Time</div>
                  <div className="text-3xl font-black text-comet">{signalPercent}%</div>
                </div>
              </div>

              <div className="absolute left-5 top-5 rounded-lg border border-white/12 bg-space-950/78 px-4 py-3">
                <div className="text-xs font-black uppercase text-white/55">Accuracy</div>
                <div className="text-2xl font-black text-success">{accuracy}%</div>
              </div>
            </div>

            <SignalTower label="Cyan Signal" signal={round.right} tone="cyan" />
          </div>

          <div
            className="grid gap-3 border-t border-white/10 bg-space-950/88 p-4"
            data-answer-deck="true"
            style={{ gridTemplateColumns: `repeat(${round.options.length}, minmax(0, 1fr))` }}
          >
            {round.options.map((pair) => (
              <button
                aria-label={`Signal pair ${pair}`}
                className="min-h-20 rounded-lg border border-white/14 bg-white/10 text-4xl font-black text-white shadow-[0_0_18px_rgba(255,255,255,0.08)] transition hover:scale-[1.02] hover:bg-plasma/24 active:scale-[0.98]"
                key={pair}
                onPointerDown={(event) => choosePair(pair, event.pointerType)}
                type="button"
              >
                {pair}
              </button>
            ))}
          </div>
        </div>

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-950/72 backdrop-blur-sm">
            <div className="glass-panel rounded-lg px-8 py-7 text-center">
              <Satellite className="mx-auto mb-4 h-12 w-12 text-plasma" />
              <h2 className="text-3xl font-black">Mission paused</h2>
              <p className="mt-2 text-white/70">The signal beams are holding.</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-950/78 backdrop-blur-sm">
            <div className="glass-panel max-w-lg rounded-lg px-8 py-7 text-center">
              <Shield className="mx-auto mb-4 h-14 w-14 text-nebula" />
              <p className="text-sm font-black uppercase text-nebula">Shield Offline</p>
              <h2 className="mt-2 text-4xl font-black">Decode both signals</h2>
              <p className="mt-3 leading-6 text-white/70">
                Match the red and cyan codes together before the beams collapse.
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

function SignalTower({
  label,
  signal,
  tone,
}: {
  label: string;
  signal: string;
  tone: 'red' | 'cyan';
}) {
  const isRed = tone === 'red';
  return (
    <div
      className={clsx(
        'relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-lg border bg-black/24 p-4',
        isRed ? 'border-nebula/30' : 'border-plasma/30',
      )}
    >
      <div
        className={clsx(
          'absolute inset-y-10 w-3 rounded-full blur-sm',
          isRed ? 'right-0 bg-nebula' : 'left-0 bg-plasma',
        )}
      />
      <p className={clsx('text-xs font-black uppercase', isRed ? 'text-nebula' : 'text-plasma')}>
        {label}
      </p>
      <div
        className={clsx(
          'mt-5 flex aspect-square w-32 items-center justify-center rounded-lg border text-6xl font-black shadow-[0_0_32px_rgba(255,255,255,0.12)]',
          isRed
            ? 'border-nebula/40 bg-nebula/16 text-nebula'
            : 'border-plasma/40 bg-plasma/16 text-plasma',
        )}
      >
        {signal}
      </div>
    </div>
  );
}

function EnemyShip({ laserBurst, pair }: { laserBurst: LaserBurst | null; pair: string }) {
  return (
    <div
      className={clsx(
        'dual-signal-enemy absolute left-1/2 top-9 flex -translate-x-1/2 flex-col items-center',
        laserBurst && 'dual-signal-enemy-hit',
      )}
      data-enemy-pair={pair}
    >
      <div className="relative flex h-20 w-24 items-center justify-center">
        <div className="absolute top-2 h-10 w-16 rounded-[50%] border border-nebula/60 bg-nebula/20 shadow-[0_0_22px_rgba(255,107,157,0.28)]" />
        <div className="absolute bottom-1 h-8 w-24 rounded-[50%] border border-plasma/55 bg-plasma/18 shadow-[0_0_22px_rgba(108,240,255,0.22)]" />
        <div className="absolute bottom-5 h-5 w-5 rounded-full bg-comet shadow-[0_0_18px_rgba(255,210,87,0.55)]" />
        <div className="absolute -left-2 bottom-3 h-3 w-5 rounded-full bg-nebula/70" />
        <div className="absolute -right-2 bottom-3 h-3 w-5 rounded-full bg-plasma/70" />
      </div>
      <div className="rounded-md border border-white/14 bg-space-950/82 px-3 py-1 text-lg font-black text-white">
        {pair}
      </div>

      {laserBurst && (
        <>
          <div className="dual-signal-laser absolute left-1/2 top-20 h-44 w-3 -translate-x-1/2 rounded-full bg-plasma shadow-[0_0_28px_rgba(108,240,255,0.9)]" />
          <div className="dual-signal-explosion absolute left-1/2 top-2 h-28 w-28 -translate-x-1/2 rounded-full" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-md border border-comet/40 bg-comet/18 px-3 py-1 text-sm font-black uppercase text-comet">
            Direct hit
          </div>
        </>
      )}
    </div>
  );
}
