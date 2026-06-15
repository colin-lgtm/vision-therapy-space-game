import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Pause, Play, Shield, X } from 'lucide-react';
import { playEffect } from '@/domain/audio';
import { calculateOrbitScore } from '@/domain/progression';
import { distance, orbitConfigForLevel, targetPosition, type Point } from '@/domain/orbit';
import { useAcademyStore } from '@/state/useAcademyStore';
import type { InputKind, MissionResult } from '@/domain/types';

interface OrbitTrackerProps {
  onComplete: (result: MissionResult) => void | Promise<void>;
  onExit: () => void;
}

interface OrbitStats {
  samples: number;
  lockedSamples: number;
  totalDistance: number;
  misses: number;
  meteorsDestroyed: number;
  shieldHits: number;
}

const emptyStats: OrbitStats = {
  samples: 0,
  lockedSamples: 0,
  totalDistance: 0,
  misses: 0,
  meteorsDestroyed: 0,
  shieldHits: 0,
};

interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spin: number;
}

interface Blast {
  x: number;
  y: number;
  radius: number;
  life: number;
  color: string;
}

interface Shot {
  from: Point;
  to: Point;
  life: number;
}

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

export function OrbitTracker({ onComplete, onExit }: OrbitTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<Point | null>(null);
  const inputKindRef = useRef<InputKind>('unknown');
  const statsRef = useRef<OrbitStats>({ ...emptyStats });
  const completedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const pauseStartedRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const meteorsRef = useRef<Meteor[]>([]);
  const blastsRef = useRef<Blast[]>([]);
  const shotsRef = useRef<Shot[]>([]);
  const lastMeteorSpawnRef = useRef(0);
  const lastShotRef = useRef(0);
  const shieldEnergyRef = useRef(45);
  const meteorIdRef = useRef(0);
  const wasLockedRef = useRef(false);

  const level = useAcademyStore((state) => state.progress['orbit-tracker'].level);
  const config = useMemo(() => orbitConfigForLevel(level), [level]);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [lockPercent, setLockPercent] = useState(0);
  const [shieldEnergy, setShieldEnergy] = useState(45);

  const finish = useCallback(
    (status: MissionResult['status']) => {
      if (completedRef.current) return;
      completedRef.current = true;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const stats = statsRef.current;
      const averageDistance = stats.samples > 0 ? stats.totalDistance / stats.samples : 999;
      const finalLockPercent = stats.samples > 0 ? stats.lockedSamples / stats.samples : 0;
      const score =
        status === 'completed' ? calculateOrbitScore(finalLockPercent, averageDistance) : 0;

      void onComplete({
        worldId: 'orbit-tracker',
        level,
        inputKind: inputKindRef.current,
        status,
        score,
        activeSeconds: Math.max(1, Math.round(activeSecondsRef.current)),
        metrics: {
          lockPercent: Math.round(finalLockPercent * 100),
          averageDistance: Math.round(averageDistance),
          misses: stats.misses,
          meteorsDestroyed: stats.meteorsDestroyed,
          shieldHits: stats.shieldHits,
          path: config.path,
          targetRadius: config.targetRadius,
          speed: config.speed,
        },
      });
    },
    [config, level, onComplete],
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

    const drawStars = (width: number, height: number) => {
      context.save();
      context.globalAlpha = 0.5;
      for (let i = 0; i < 80; i += 1) {
        const x = (i * 97) % width;
        const y = (i * 53) % height;
        const radius = (i % 3) + 0.8;
        context.fillStyle = i % 5 === 0 ? '#ffd166' : '#cdefff';
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    };

    const spawnMeteor = (width: number, height: number, target: Point) => {
      const fromTop = Math.random() > 0.5;
      const x = fromTop ? Math.random() * width : width + 34;
      const y = fromTop ? -34 : Math.random() * height;
      const angle = Math.atan2(target.y - y, target.x - x);
      const speed = 0.75 + Math.random() * 0.55 + level * 0.018;
      meteorsRef.current.push({
        id: meteorIdRef.current,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 13 + Math.random() * 11,
        spin: Math.random() * Math.PI,
      });
      meteorIdRef.current += 1;
    };

    const drawMeteor = (meteor: Meteor) => {
      context.save();
      context.translate(meteor.x, meteor.y);
      context.rotate(meteor.spin);
      context.fillStyle = '#a15d36';
      context.strokeStyle = '#ffd166';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-meteor.radius, -meteor.radius * 0.2);
      context.lineTo(-meteor.radius * 0.2, -meteor.radius);
      context.lineTo(meteor.radius, -meteor.radius * 0.4);
      context.lineTo(meteor.radius * 0.75, meteor.radius * 0.7);
      context.lineTo(-meteor.radius * 0.45, meteor.radius);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    };

    const drawBlast = (blast: Blast) => {
      context.save();
      context.globalAlpha = Math.max(0, blast.life);
      context.strokeStyle = blast.color;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(blast.x, blast.y, blast.radius * (1.3 - blast.life), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    };

    const drawShot = (shot: Shot) => {
      context.save();
      context.globalAlpha = Math.max(0, shot.life);
      context.strokeStyle = '#ffffff';
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(shot.from.x, shot.from.y);
      context.lineTo(shot.to.x, shot.to.y);
      context.stroke();
      context.strokeStyle = '#6cf0ff';
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    };

    const draw = (now: number) => {
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
      const elapsedSeconds = ((now - startRef.current - pausedMsRef.current) / 1000) * config.speed;
      const activeSeconds = (now - startRef.current - pausedMsRef.current) / 1000;
      activeSecondsRef.current = activeSeconds;
      const remaining = Math.max(0, config.durationSeconds - activeSeconds);
      setRemainingSeconds(remaining);

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, width, height);
      drawStars(width, height);

      const target = targetPosition(config.path, elapsedSeconds, {
        width,
        height,
        padding: Math.max(90, config.targetRadius + 28),
      });

      const pointer = pointerRef.current;
      const pointerDistance = pointer ? distance(pointer, target) : config.targetRadius + 200;
      const isLocked = pointerDistance <= config.targetRadius;
      const stats = statsRef.current;
      stats.samples += 1;
      stats.totalDistance += pointerDistance;
      if (isLocked) stats.lockedSamples += 1;
      if (!isLocked && stats.samples % 20 === 0) stats.misses += 1;
      setLockPercent(stats.lockedSamples / stats.samples);

      if (isLocked && !wasLockedRef.current) {
        playEffect('lock');
      }
      wasLockedRef.current = isLocked;
      shieldEnergyRef.current = Math.max(
        0,
        Math.min(100, shieldEnergyRef.current + (isLocked ? 0.48 : -0.2)),
      );
      setShieldEnergy(shieldEnergyRef.current);

      const spawnInterval = Math.max(760, 1650 - level * 36);
      if (now - lastMeteorSpawnRef.current > spawnInterval) {
        spawnMeteor(width, height, target);
        lastMeteorSpawnRef.current = now;
      }

      meteorsRef.current = meteorsRef.current
        .map((meteor) => ({
          ...meteor,
          x: meteor.x + meteor.vx,
          y: meteor.y + meteor.vy,
          spin: meteor.spin + 0.035,
        }))
        .filter((meteor) => {
          if (distance(meteor, target) < meteor.radius + config.targetRadius * 0.72) {
            stats.shieldHits += 1;
            shieldEnergyRef.current = Math.max(0, shieldEnergyRef.current - 10);
            blastsRef.current.push({
              x: meteor.x,
              y: meteor.y,
              radius: 48,
              life: 1,
              color: '#ff6b9d',
            });
            playEffect('warning');
            return false;
          }
          return (
            meteor.x > -80 && meteor.x < width + 90 && meteor.y > -90 && meteor.y < height + 90
          );
        });

      if (isLocked && shieldEnergyRef.current > 20 && now - lastShotRef.current > 520) {
        const targetMeteor = meteorsRef.current
          .map((meteor) => ({ meteor, range: distance(meteor, target) }))
          .sort((a, b) => a.range - b.range)[0]?.meteor;
        if (targetMeteor) {
          meteorsRef.current = meteorsRef.current.filter((meteor) => meteor.id !== targetMeteor.id);
          stats.meteorsDestroyed += 1;
          shotsRef.current.push({
            from: { ...target },
            to: { x: targetMeteor.x, y: targetMeteor.y },
            life: 1,
          });
          blastsRef.current.push({
            x: targetMeteor.x,
            y: targetMeteor.y,
            radius: 62,
            life: 1,
            color: '#ffd166',
          });
          playEffect('laser');
          window.setTimeout(() => playEffect('hit'), 70);
          lastShotRef.current = now;
        }
      }

      shotsRef.current = shotsRef.current
        .map((shot) => ({ ...shot, life: shot.life - 0.08 }))
        .filter((shot) => shot.life > 0);
      blastsRef.current = blastsRef.current
        .map((blast) => ({ ...blast, life: blast.life - 0.045 }))
        .filter((blast) => blast.life > 0);

      context.save();
      context.strokeStyle = 'rgba(108, 240, 255, 0.20)';
      context.lineWidth = 2;
      context.beginPath();
      for (let i = 0; i < 240; i += 1) {
        const point = targetPosition(config.path, elapsedSeconds - i * 0.015, {
          width,
          height,
          padding: Math.max(90, config.targetRadius + 28),
        });
        if (i === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      }
      context.stroke();
      context.restore();

      if (pointer) {
        context.save();
        context.strokeStyle = isLocked ? 'rgba(125, 255, 155, 0.72)' : 'rgba(255, 107, 157, 0.62)';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(pointer.x, pointer.y);
        context.lineTo(target.x, target.y);
        context.stroke();
        context.restore();
      }

      meteorsRef.current.forEach(drawMeteor);
      shotsRef.current.forEach(drawShot);
      blastsRef.current.forEach(drawBlast);

      const gradient = context.createRadialGradient(
        target.x,
        target.y,
        5,
        target.x,
        target.y,
        config.targetRadius,
      );
      gradient.addColorStop(0, isLocked ? '#f4fff8' : '#fff2f6');
      gradient.addColorStop(0.45, isLocked ? '#7dff9b' : '#ff6b9d');
      gradient.addColorStop(
        1,
        isLocked ? 'rgba(108, 240, 255, 0.08)' : 'rgba(255, 107, 157, 0.08)',
      );
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(target.x, target.y, config.targetRadius, 0, Math.PI * 2);
      context.fill();

      context.lineWidth = 4;
      context.strokeStyle = isLocked ? '#6cf0ff' : '#ff6b9d';
      context.beginPath();
      context.arc(target.x, target.y, config.targetRadius + 4, 0, Math.PI * 2);
      context.stroke();

      context.save();
      context.globalAlpha = 0.18 + shieldEnergyRef.current / 180;
      context.strokeStyle = isLocked ? '#7dff9b' : '#ff6b9d';
      context.lineWidth = 8;
      context.beginPath();
      context.arc(target.x, target.y, config.targetRadius + 24, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      context.fillStyle = '#07111f';
      context.font = '900 18px Verdana';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('LOCK', target.x, target.y);

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
  }, [config, finish, isPaused, level]);

  const roundedLock = Math.round(lockPercent * 100);
  const roundedTime = Math.ceil(remainingSeconds);
  const roundedShield = Math.round(shieldEnergy);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-plasma">Orbit Tracker</p>
          <h1 className="text-3xl font-black">Keep the beam locked</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-white/7 px-4 py-2 text-center">
            <div className="text-2xl font-black text-comet">{level}</div>
            <div className="text-xs font-bold uppercase text-white/65">Level</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/7 px-4 py-2 text-center">
            <div className="text-2xl font-black text-success">{roundedLock}%</div>
            <div className="text-xs font-bold uppercase text-white/65">Lock</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/7 px-4 py-2 text-center">
            <div className="text-2xl font-black text-comet">{roundedShield}%</div>
            <div className="text-xs font-bold uppercase text-white/65">Shield</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/7 px-4 py-2 text-center">
            <div className="text-2xl font-black text-plasma">{roundedTime}s</div>
            <div className="text-xs font-bold uppercase text-white/65">Fuel</div>
          </div>
          <button
            className="flex min-h-12 items-center gap-2 rounded-md border border-white/10 bg-white/7 px-4 py-2 font-bold hover:bg-white/12"
            onClick={() => setIsPaused((value) => !value)}
            type="button"
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="flex min-h-12 items-center gap-2 rounded-md border border-white/10 bg-white/7 px-4 py-2 font-bold hover:bg-white/12"
            onClick={onExit}
            type="button"
          >
            <Home className="h-5 w-5" />
            Map
          </button>
          <button
            className="flex min-h-12 items-center gap-2 rounded-md bg-nebula px-4 py-2 font-black text-white hover:brightness-110"
            onClick={() => finish('quit')}
            type="button"
          >
            <X className="h-5 w-5" />
            End
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-plasma/25 bg-space-950 shadow-glow">
        <canvas
          aria-label="Orbit Tracker game surface"
          className="h-full w-full touch-none"
          onPointerCancel={() => {
            pointerRef.current = null;
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerRef.current = canvasPoint(event);
            inputKindRef.current = inputKindFromPointer(event.pointerType);
          }}
          onPointerLeave={() => {
            pointerRef.current = null;
          }}
          onPointerMove={(event) => {
            pointerRef.current = canvasPoint(event);
            inputKindRef.current = inputKindFromPointer(event.pointerType);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            pointerRef.current = null;
          }}
          ref={canvasRef}
        />

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-950/72 backdrop-blur-sm">
            <div className="glass-panel rounded-lg px-8 py-7 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-plasma" />
              <h2 className="text-3xl font-black">Mission paused</h2>
              <p className="mt-2 text-white/70">The comet is holding position.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
