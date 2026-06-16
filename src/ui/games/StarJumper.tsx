import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Pause, Play, RotateCcw, X, Zap } from 'lucide-react';
import { playEffect } from '@/domain/audio';
import {
  buildStarJumperRound,
  calculateStarJumperScore,
  starJumperConfigForLevel,
  type StarJumperGate,
} from '@/domain/starJumper';
import { distance, type Point } from '@/domain/orbit';
import { useAcademyStore } from '@/state/useAcademyStore';
import type { InputKind, MissionResult } from '@/domain/types';

interface StarJumperProps {
  onComplete: (result: MissionResult) => void | Promise<void>;
  onExit: () => void;
}

interface Spark {
  x: number;
  y: number;
  life: number;
  color: string;
}

interface JumpTrail {
  from: Point;
  to: Point;
  startedAt: number;
  durationMs: number;
}

interface StarJumperStats {
  attempts: number;
  hits: number;
  decoyHits: number;
  timeouts: number;
  totalReactionMs: number;
  bestCombo: number;
}

const emptyStats: StarJumperStats = {
  attempts: 0,
  hits: 0,
  decoyHits: 0,
  timeouts: 0,
  totalReactionMs: 0,
  bestCombo: 0,
};

function inputKindFromPointer(pointerType: string): InputKind {
  if (pointerType === 'touch' || pointerType === 'pen' || pointerType === 'mouse')
    return pointerType;
  return 'unknown';
}

function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function starJumperHitRate(stats: StarJumperStats): number {
  const totalRounds = stats.hits + stats.timeouts + stats.decoyHits;
  return totalRounds > 0 ? stats.hits / totalRounds : 0;
}

function starJumperAverageReaction(stats: StarJumperStats): number {
  return stats.hits > 0 ? stats.totalReactionMs / stats.hits : 9999;
}

function starJumperScoreInput(stats: StarJumperStats) {
  return {
    hitRate: starJumperHitRate(stats),
    averageReactionMs: starJumperAverageReaction(stats),
    bestCombo: stats.bestCombo,
    hits: stats.hits,
    timeouts: stats.timeouts,
    decoyHits: stats.decoyHits,
  };
}

export function StarJumper({ onComplete, onExit }: StarJumperProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gatesRef = useRef<StarJumperGate[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const shipRef = useRef<Point | null>(null);
  const jumpTrailRef = useRef<JumpTrail | null>(null);
  const statsRef = useRef<StarJumperStats>({ ...emptyStats });
  const activeSecondsRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const pauseStartedRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const gateBornAtRef = useRef(0);
  const gateIdRef = useRef(0);
  const inputKindRef = useRef<InputKind>('unknown');
  const completedRef = useRef(false);

  const storedLevel = useAcademyStore((state) => state.progress['star-jumper'].level);
  const level = Math.max(1, storedLevel);
  const config = useMemo(() => starJumperConfigForLevel(level), [level]);
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [lives, setLives] = useState(3);
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
      const hitRate = starJumperHitRate(stats);
      const averageReactionMs = starJumperAverageReaction(stats);
      const score =
        status === 'completed' ? calculateStarJumperScore(starJumperScoreInput(stats)) : 0;

      void onComplete({
        worldId: 'star-jumper',
        level,
        inputKind: inputKindRef.current,
        status,
        score,
        activeSeconds: Math.max(1, Math.round(activeSecondsRef.current)),
        metrics: {
          hitRate: Math.round(hitRate * 100),
          averageReactionMs: Math.round(averageReactionMs),
          hits: stats.hits,
          attempts: stats.attempts,
          decoyHits: stats.decoyHits,
          timeouts: stats.timeouts,
          bestCombo: stats.bestCombo,
          lives,
          decoys: config.decoys,
          gateLifetimeMs: config.gateLifetimeMs,
        },
      });
    },
    [config.decoys, config.gateLifetimeMs, level, lives, onComplete],
  );

  const resetRun = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    gatesRef.current = [];
    sparksRef.current = [];
    shipRef.current = null;
    jumpTrailRef.current = null;
    statsRef.current = { ...emptyStats };
    activeSecondsRef.current = 0;
    startRef.current = null;
    pauseStartedRef.current = null;
    pausedMsRef.current = 0;
    gateBornAtRef.current = 0;
    inputKindRef.current = 'unknown';
    completedRef.current = false;
    setRemainingSeconds(config.durationSeconds);
    setHits(0);
    setCombo(0);
    setLiveScore(0);
    setLives(3);
    setIsPaused(false);
    setGameOver(false);
    setRestartNonce((value) => value + 1);
  }, [config.durationSeconds]);

  const spawnRound = useCallback(
    (width: number, height: number, now: number, origin?: Point) => {
      const round = buildStarJumperRound(
        config,
        { width, height },
        origin ?? shipRef.current,
        gateIdRef.current,
      );
      gatesRef.current = round.gates;
      gateIdRef.current = round.nextGateId;
      shipRef.current = round.origin;
      gateBornAtRef.current = now;
    },
    [config],
  );

  const damage = useCallback(() => {
    setCombo(0);
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

  const handleShot = useCallback(
    (point: Point) => {
      if (gameOver || isPaused) return;
      const hitGate = gatesRef.current.find((gate) => distance(point, gate) <= gate.radius);
      if (!hitGate) return;
      if (hitGate.kind === 'origin') return;

      statsRef.current.attempts += 1;
      sparksRef.current.push({
        x: hitGate.x,
        y: hitGate.y,
        life: 1,
        color: hitGate.kind === 'target' ? '#ff6b9d' : '#6cf0ff',
      });

      if (hitGate.kind === 'target') {
        const reactionMs = Math.max(0, performance.now() - gateBornAtRef.current);
        const from = shipRef.current ?? { x: hitGate.x, y: hitGate.y };
        const destination = { x: hitGate.x, y: hitGate.y };
        jumpTrailRef.current = {
          from,
          to: destination,
          startedAt: performance.now(),
          durationMs: 360,
        };
        shipRef.current = destination;
        statsRef.current.hits += 1;
        statsRef.current.totalReactionMs += reactionMs;
        setHits(statsRef.current.hits);
        setCombo((value) => {
          const next = value + 1;
          statsRef.current.bestCombo = Math.max(statsRef.current.bestCombo, next);
          return next;
        });
        setLiveScore(calculateStarJumperScore(starJumperScoreInput(statsRef.current)));
        playEffect('launch');

        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) spawnRound(rect.width, rect.height, performance.now(), destination);
        return;
      }

      statsRef.current.decoyHits += 1;
      setLiveScore(calculateStarJumperScore(starJumperScoreInput(statsRef.current)));
      damage();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect)
        spawnRound(rect.width, rect.height, performance.now(), shipRef.current ?? undefined);
    },
    [damage, gameOver, isPaused, spawnRound],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * pixelRatio);
      canvas.height = Math.floor(rect.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawStars = (width: number, height: number, now: number) => {
      context.save();
      for (let i = 0; i < 90; i += 1) {
        const x = (i * 83 + Math.sin(now / 1100 + i) * 10) % width;
        const y = (i * 47) % height;
        context.globalAlpha = 0.28 + (i % 5) * 0.08;
        context.fillStyle = i % 6 === 0 ? '#ffd166' : '#cdefff';
        context.beginPath();
        context.arc(x, y, (i % 3) + 0.8, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const drawShip = (now: number) => {
      let ship = shipRef.current;
      const jump = jumpTrailRef.current;
      if (jump) {
        const rawProgress = Math.min(1, (now - jump.startedAt) / jump.durationMs);
        const progress = 1 - (1 - rawProgress) ** 3;
        const arc = Math.sin(progress * Math.PI) * 42;
        ship = {
          x: jump.from.x + (jump.to.x - jump.from.x) * progress,
          y: jump.from.y + (jump.to.y - jump.from.y) * progress - arc,
        };

        context.save();
        context.globalAlpha = 1 - rawProgress * 0.55;
        context.strokeStyle = '#ffd166';
        context.lineWidth = 6;
        context.shadowColor = '#ffd166';
        context.shadowBlur = 18;
        context.beginPath();
        context.moveTo(jump.from.x, jump.from.y);
        context.lineTo(ship.x, ship.y);
        context.stroke();
        context.restore();

        if (rawProgress >= 1) jumpTrailRef.current = null;
      }

      if (!ship) return;

      const target = gatesRef.current.find((gate) => gate.kind === 'target');
      const angle = target ? Math.atan2(target.y - ship.y, target.x - ship.x) : 0;
      context.save();
      context.translate(ship.x, ship.y);
      context.rotate(angle);
      context.shadowColor = '#6cf0ff';
      context.shadowBlur = 18;
      context.fillStyle = '#f4fff8';
      context.strokeStyle = '#6cf0ff';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(24, 0);
      context.lineTo(-18, -14);
      context.lineTo(-9, 0);
      context.lineTo(-18, 14);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = '#ffd166';
      context.beginPath();
      context.arc(-18, 0, 5 + Math.sin(now / 80) * 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawGate = (gate: StarJumperGate, now: number, progress: number) => {
      const pulse = Math.sin(now / 160 + gate.phase) * 4;
      const radius = gate.radius + pulse;
      const isOrigin = gate.kind === 'origin';
      const isTarget = gate.kind === 'target';
      context.save();
      context.translate(gate.x, gate.y);
      context.rotate(now / (isTarget ? 620 : -760) + gate.phase);
      context.globalAlpha = isOrigin ? 0.94 : isTarget ? 1 : 0.62;
      context.strokeStyle = isOrigin ? '#7dff9b' : isTarget ? '#ff6b9d' : '#6cf0ff';
      context.lineWidth = isTarget ? 7 : isOrigin ? 6 : 4;
      context.shadowColor = isOrigin ? '#7dff9b' : isTarget ? '#ff6b9d' : '#6cf0ff';
      context.shadowBlur = isTarget || isOrigin ? 24 : 12;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = isOrigin ? '#ffd166' : isTarget ? '#ffffff' : '#ff6b9d';
      context.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6;
        context.beginPath();
        context.moveTo(Math.cos(angle) * (radius - 12), Math.sin(angle) * (radius - 12));
        context.lineTo(Math.cos(angle) * (radius + 12), Math.sin(angle) * (radius + 12));
        context.stroke();
      }
      context.restore();

      if (isTarget) {
        context.save();
        context.strokeStyle = progress > 0.28 ? '#ff6b9d' : '#ffd166';
        context.lineWidth = 5;
        context.beginPath();
        context.arc(
          gate.x,
          gate.y,
          gate.radius + 18,
          -Math.PI / 2,
          -Math.PI / 2 + progress * 2 * Math.PI,
        );
        context.stroke();
        context.restore();
      }
    };

    const draw = (now: number) => {
      if (gameOver) return;
      if (startRef.current === null) startRef.current = now;

      if (isPaused) {
        if (pauseStartedRef.current === null) pauseStartedRef.current = now;
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      if (pauseStartedRef.current !== null) {
        pausedMsRef.current += now - pauseStartedRef.current;
        pauseStartedRef.current = null;
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (gatesRef.current.length === 0) spawnRound(width, height, now);

      const activeSeconds = (now - startRef.current - pausedMsRef.current) / 1000;
      activeSecondsRef.current = activeSeconds;
      const remaining = Math.max(0, config.durationSeconds - activeSeconds);
      setRemainingSeconds(remaining);

      const gateAge = now - gateBornAtRef.current;
      if (gateAge > config.gateLifetimeMs) {
        statsRef.current.timeouts += 1;
        setLiveScore(calculateStarJumperScore(starJumperScoreInput(statsRef.current)));
        damage();
        spawnRound(width, height, now, shipRef.current ?? undefined);
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, width, height);
      drawStars(width, height, now);

      const gateProgress = Math.max(0, 1 - (now - gateBornAtRef.current) / config.gateLifetimeMs);
      gatesRef.current.forEach((gate) => drawGate(gate, now, gateProgress));
      drawShip(now);

      sparksRef.current = sparksRef.current
        .map((spark) => ({ ...spark, life: spark.life - 0.045 }))
        .filter((spark) => spark.life > 0);
      sparksRef.current.forEach((spark) => {
        context.save();
        context.globalAlpha = spark.life;
        context.strokeStyle = spark.color;
        context.lineWidth = 6;
        context.beginPath();
        context.arc(spark.x, spark.y, 90 * (1 - spark.life), 0, Math.PI * 2);
        context.stroke();
        context.restore();
      });

      context.save();
      context.fillStyle = 'rgba(7, 17, 31, 0.76)';
      context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      context.lineWidth = 2;
      context.roundRect(18, 18, 230, 66, 8);
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '900 15px Verdana';
      context.textAlign = 'left';
      context.fillText('TAP THE RED JUMP GATE', 34, 44);
      context.fillStyle = '#ff6b9d';
      context.fillText('START FROM GREEN', 34, 66);
      context.restore();

      if (remaining <= 0) {
        finish('completed');
        return;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    config.durationSeconds,
    config.gateLifetimeMs,
    damage,
    finish,
    gameOver,
    isPaused,
    spawnRound,
    restartNonce,
  ]);

  const roundedTime = Math.ceil(remainingSeconds);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1">
          <p className="text-sm font-bold uppercase text-comet">Star Jumper</p>
          <h1 className="text-2xl font-black leading-tight xl:text-3xl">Jump to the red gate</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-comet">{level}</div>
            <div className="text-xs font-bold uppercase text-white/65">Level</div>
          </div>
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-comet">{liveScore}</div>
            <div className="text-xs font-bold uppercase text-white/65">Score</div>
          </div>
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-success">{hits}</div>
            <div className="text-xs font-bold uppercase text-white/65">Jumps</div>
          </div>
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-plasma">{combo}</div>
            <div className="text-xs font-bold uppercase text-white/65">Combo</div>
          </div>
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-nebula">{lives}</div>
            <div className="text-xs font-bold uppercase text-white/65">Lives</div>
          </div>
          <div className="min-w-[82px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-comet">{roundedTime}s</div>
            <div className="text-xs font-bold uppercase text-white/65">Fuel</div>
          </div>
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

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-comet/30 bg-space-950 shadow-[0_0_40px_rgba(255,209,102,0.16)]">
        <canvas
          aria-label="Star Jumper game surface"
          className="h-full w-full touch-none"
          data-decoys={config.decoys}
          data-rule="green-origin-red-target"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            inputKindRef.current = inputKindFromPointer(event.pointerType);
            handleShot(canvasPoint(event));
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          ref={canvasRef}
        />

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-950/72 backdrop-blur-sm">
            <div className="glass-panel rounded-lg px-8 py-7 text-center">
              <Zap className="mx-auto mb-4 h-12 w-12 text-comet" />
              <h2 className="text-3xl font-black">Mission paused</h2>
              <p className="mt-2 text-white/70">The jump gates are holding position.</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-950/78 backdrop-blur-sm">
            <div className="glass-panel max-w-lg rounded-lg px-8 py-7 text-center">
              <Zap className="mx-auto mb-4 h-14 w-14 text-comet" />
              <p className="text-sm font-black uppercase text-nebula">Ship Lost</p>
              <h2 className="mt-2 text-4xl font-black">Try the jumps again</h2>
              <p className="mt-3 leading-6 text-white/70">
                The ship starts on the green star. Tap the red gate before it closes and avoid blue
                decoys.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  className="flex min-h-12 items-center gap-2 rounded-md bg-comet px-6 py-3 font-black text-space-950 shadow-[0_0_22px_rgba(255,209,102,0.35)]"
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
      </div>
    </div>
  );
}
