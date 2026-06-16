import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, Pause, Play, Shield, X } from 'lucide-react';
import { playEffect } from '@/domain/audio';
import { calculateOrbitScore } from '@/domain/progression';
import {
  distance,
  orbitConfigForLevel,
  orbitWobbleForLevel,
  targetPosition,
  type Point,
} from '@/domain/orbit';
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
  aliensDestroyed: number;
  shotsFired: number;
  shieldHits: number;
}

const emptyStats: OrbitStats = {
  samples: 0,
  lockedSamples: 0,
  totalDistance: 0,
  misses: 0,
  meteorsDestroyed: 0,
  aliensDestroyed: 0,
  shotsFired: 0,
  shieldHits: 0,
};

type ThreatKind = 'meteor' | 'alien';

interface Threat {
  id: number;
  kind: ThreatKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spin: number;
  nextFireAt: number;
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
  color: string;
}

interface EnemyBolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  const motionSeedRef = useRef(Math.random() * 1000);
  const pauseStartedRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const threatsRef = useRef<Threat[]>([]);
  const boltsRef = useRef<EnemyBolt[]>([]);
  const blastsRef = useRef<Blast[]>([]);
  const shotsRef = useRef<Shot[]>([]);
  const lastMeteorSpawnRef = useRef(0);
  const lastShotRef = useRef(0);
  const pendingShotRef = useRef(false);
  const shieldEnergyRef = useRef(45);
  const hullHealthRef = useRef(100);
  const threatIdRef = useRef(0);
  const wasLockedRef = useRef(false);
  const currentTargetRef = useRef<Point | null>(null);
  const currentLockedRef = useRef(false);

  const level = useAcademyStore((state) => state.progress['orbit-tracker'].level);
  const config = useMemo(() => orbitConfigForLevel(level), [level]);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds);
  const [lockPercent, setLockPercent] = useState(0);
  const [shieldEnergy, setShieldEnergy] = useState(45);
  const [hullHealth, setHullHealth] = useState(100);
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
          aliensDestroyed: stats.aliensDestroyed,
          shotsFired: stats.shotsFired,
          shieldHits: stats.shieldHits,
          hullHealth: Math.round(hullHealthRef.current),
          path: config.path,
          targetRadius: config.targetRadius,
          speed: config.speed,
        },
      });
    },
    [config, level, onComplete],
  );

  const resetRun = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    pointerRef.current = null;
    inputKindRef.current = 'unknown';
    statsRef.current = { ...emptyStats };
    completedRef.current = false;
    startRef.current = null;
    motionSeedRef.current = Math.random() * 1000;
    pauseStartedRef.current = null;
    pausedMsRef.current = 0;
    activeSecondsRef.current = 0;
    threatsRef.current = [];
    boltsRef.current = [];
    blastsRef.current = [];
    shotsRef.current = [];
    lastMeteorSpawnRef.current = 0;
    lastShotRef.current = 0;
    pendingShotRef.current = false;
    shieldEnergyRef.current = 45;
    hullHealthRef.current = 100;
    wasLockedRef.current = false;
    currentTargetRef.current = null;
    currentLockedRef.current = false;
    setShieldEnergy(45);
    setHullHealth(100);
    setLockPercent(0);
    setRemainingSeconds(config.durationSeconds);
    setGameOver(false);
    setIsPaused(false);
    setRestartNonce((value) => value + 1);
  }, [config.durationSeconds]);

  const fireManualShot = useCallback(() => {
    const target = currentTargetRef.current;
    const pointer = pointerRef.current;
    if (!target || !pointer || !currentLockedRef.current || gameOver || isPaused) {
      playEffect('warning');
      return;
    }

    if (shieldEnergyRef.current < 8 || performance.now() - lastShotRef.current < 180) {
      playEffect('warning');
      return;
    }

    statsRef.current.shotsFired += 1;
    const targetThreat = threatsRef.current
      .map((threat) => ({ threat, range: distance(threat, target) }))
      .sort((a, b) => a.range - b.range)[0]?.threat;

    if (!targetThreat) {
      playEffect('laser');
      shotsRef.current.push({
        from: { ...target },
        to: {
          x: target.x + Math.cos(performance.now() / 250) * 180,
          y: target.y + Math.sin(performance.now() / 250) * 120,
        },
        life: 1,
        color: '#6cf0ff',
      });
      lastShotRef.current = performance.now();
      return;
    }

    threatsRef.current = threatsRef.current.filter((threat) => threat.id !== targetThreat.id);
    if (targetThreat.kind === 'alien') statsRef.current.aliensDestroyed += 1;
    else statsRef.current.meteorsDestroyed += 1;
    shieldEnergyRef.current = Math.max(0, shieldEnergyRef.current - 4);
    setShieldEnergy(shieldEnergyRef.current);
    shotsRef.current.push({
      from: { ...target },
      to: { x: targetThreat.x, y: targetThreat.y },
      life: 1,
      color: targetThreat.kind === 'alien' ? '#ff6b9d' : '#ffd166',
    });
    blastsRef.current.push({
      x: targetThreat.x,
      y: targetThreat.y,
      radius: targetThreat.kind === 'alien' ? 78 : 62,
      life: 1,
      color: targetThreat.kind === 'alien' ? '#ff6b9d' : '#ffd166',
    });
    playEffect('laser');
    window.setTimeout(() => playEffect('hit'), 70);
    lastShotRef.current = performance.now();
  }, [gameOver, isPaused]);

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

    const damageHull = (amount: number, x: number, y: number, color = '#ff6b9d') => {
      statsRef.current.shieldHits += 1;
      shieldEnergyRef.current = Math.max(0, shieldEnergyRef.current - amount * 0.45);
      hullHealthRef.current = Math.max(0, hullHealthRef.current - amount);
      setShieldEnergy(shieldEnergyRef.current);
      setHullHealth(hullHealthRef.current);
      blastsRef.current.push({
        x,
        y,
        radius: 52,
        life: 1,
        color,
      });
      playEffect('warning');
      if (hullHealthRef.current <= 0) {
        setGameOver(true);
        playEffect('hit');
      }
    };

    const spawnThreat = (width: number, height: number, target: Point, now: number) => {
      const kind: ThreatKind =
        Math.random() < Math.min(0.36, 0.08 + level * 0.018) ? 'alien' : 'meteor';
      const fromTop = Math.random() > 0.5;
      const x = kind === 'alien' ? width + 54 : fromTop ? Math.random() * width : width + 34;
      const y =
        kind === 'alien'
          ? Math.max(80, Math.random() * (height - 160))
          : fromTop
            ? -34
            : Math.random() * height;
      const angle = Math.atan2(target.y - y, target.x - x);
      const speed =
        kind === 'alien' ? 0.42 + level * 0.01 : 0.75 + Math.random() * 0.55 + level * 0.018;
      threatsRef.current.push({
        id: threatIdRef.current,
        kind,
        x,
        y,
        vx: kind === 'alien' ? -speed : Math.cos(angle) * speed,
        vy: kind === 'alien' ? Math.sin(now / 900) * 0.35 : Math.sin(angle) * speed,
        radius: kind === 'alien' ? 22 : 13 + Math.random() * 11,
        spin: Math.random() * Math.PI,
        nextFireAt: now + 900 + Math.random() * 1100,
      });
      threatIdRef.current += 1;
    };

    const drawThreat = (threat: Threat) => {
      context.save();
      context.translate(threat.x, threat.y);
      context.rotate(threat.spin);
      if (threat.kind === 'alien') {
        context.fillStyle = '#6cf0ff';
        context.strokeStyle = '#ff6b9d';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-threat.radius * 1.35, 0);
        context.lineTo(-threat.radius * 0.18, -threat.radius * 0.9);
        context.lineTo(threat.radius * 1.45, 0);
        context.lineTo(-threat.radius * 0.18, threat.radius * 0.9);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = '#07111f';
        context.beginPath();
        context.arc(threat.radius * 0.25, 0, threat.radius * 0.25, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = '#a15d36';
        context.strokeStyle = '#ffd166';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-threat.radius, -threat.radius * 0.2);
        context.lineTo(-threat.radius * 0.2, -threat.radius);
        context.lineTo(threat.radius, -threat.radius * 0.4);
        context.lineTo(threat.radius * 0.75, threat.radius * 0.7);
        context.lineTo(-threat.radius * 0.45, threat.radius);
        context.closePath();
        context.fill();
        context.stroke();
      }
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
      context.strokeStyle = shot.color;
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    };

    const drawBolt = (bolt: EnemyBolt) => {
      context.save();
      context.globalAlpha = Math.max(0, bolt.life);
      context.fillStyle = '#ff6b9d';
      context.shadowColor = '#ff6b9d';
      context.shadowBlur = 16;
      context.beginPath();
      context.arc(bolt.x, bolt.y, 6, 0, Math.PI * 2);
      context.fill();
      context.restore();
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
      const elapsedSeconds = ((now - startRef.current - pausedMsRef.current) / 1000) * config.speed;
      const activeSeconds = (now - startRef.current - pausedMsRef.current) / 1000;
      activeSecondsRef.current = activeSeconds;
      const remaining = Math.max(0, config.durationSeconds - activeSeconds);
      setRemainingSeconds(remaining);

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, width, height);
      drawStars(width, height);

      const motionOptions = {
        seed: motionSeedRef.current,
        wobble: orbitWobbleForLevel(level),
      };
      const target = targetPosition(
        config.path,
        elapsedSeconds,
        {
          width,
          height,
          padding: Math.max(90, config.targetRadius + 28),
        },
        motionOptions,
      );

      const pointer = pointerRef.current;
      const pointerDistance = pointer ? distance(pointer, target) : config.targetRadius + 200;
      const isLocked = pointerDistance <= config.targetRadius;
      currentTargetRef.current = target;
      currentLockedRef.current = isLocked;
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

      if (pendingShotRef.current) {
        pendingShotRef.current = false;
        fireManualShot();
      }

      shieldEnergyRef.current = Math.max(
        0,
        Math.min(100, shieldEnergyRef.current + (isLocked ? 0.48 : -0.2)),
      );
      setShieldEnergy(shieldEnergyRef.current);

      const spawnInterval = Math.max(760, 1650 - level * 36);
      if (now - lastMeteorSpawnRef.current > spawnInterval) {
        spawnThreat(width, height, target, now);
        lastMeteorSpawnRef.current = now;
      }

      threatsRef.current = threatsRef.current
        .map((threat) => {
          const nextThreat = {
            ...threat,
            x: threat.x + threat.vx,
            y:
              threat.y +
              threat.vy +
              (threat.kind === 'alien' ? Math.sin(now / 350 + threat.id) * 0.38 : 0),
            spin: threat.spin + (threat.kind === 'alien' ? 0.01 : 0.035),
          };
          if (nextThreat.kind === 'alien' && now > nextThreat.nextFireAt) {
            const angle = Math.atan2(target.y - nextThreat.y, target.x - nextThreat.x);
            boltsRef.current.push({
              x: nextThreat.x,
              y: nextThreat.y,
              vx: Math.cos(angle) * 4.2,
              vy: Math.sin(angle) * 4.2,
              life: 1,
            });
            nextThreat.nextFireAt = now + Math.max(780, 1800 - level * 35);
          }
          return nextThreat;
        })
        .filter((threat) => {
          if (distance(threat, target) < threat.radius + config.targetRadius * 0.72) {
            damageHull(threat.kind === 'alien' ? 18 : 12, threat.x, threat.y);
            return false;
          }
          return (
            threat.x > -90 && threat.x < width + 100 && threat.y > -100 && threat.y < height + 100
          );
        });

      boltsRef.current = boltsRef.current
        .map((bolt) => ({
          ...bolt,
          x: bolt.x + bolt.vx,
          y: bolt.y + bolt.vy,
          life: bolt.life - 0.003,
        }))
        .filter((bolt) => {
          if (distance(bolt, target) < config.targetRadius + 10) {
            damageHull(8, bolt.x, bolt.y, '#ff6b9d');
            return false;
          }
          return (
            bolt.life > 0 &&
            bolt.x > -30 &&
            bolt.x < width + 30 &&
            bolt.y > -30 &&
            bolt.y < height + 30
          );
        });

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
        const point = targetPosition(
          config.path,
          elapsedSeconds - i * 0.015,
          {
            width,
            height,
            padding: Math.max(90, config.targetRadius + 28),
          },
          motionOptions,
        );
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

      threatsRef.current.forEach(drawThreat);
      boltsRef.current.forEach(drawBolt);
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

      context.save();
      context.fillStyle = 'rgba(7, 17, 31, 0.74)';
      context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      context.lineWidth = 2;
      context.roundRect(18, 18, 250, 64, 8);
      context.fill();
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '900 14px Verdana';
      context.textAlign = 'left';
      context.fillText('LOCK + CLICK TO FIRE', 34, 42);
      context.fillStyle = '#ff6b9d';
      context.fillRect(34, 54, 196, 10);
      context.fillStyle = '#7dff9b';
      context.fillRect(34, 54, 196 * (hullHealthRef.current / 100), 10);
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
  }, [config, finish, fireManualShot, gameOver, isPaused, level, restartNonce]);

  const roundedLock = Math.round(lockPercent * 100);
  const roundedTime = Math.ceil(remainingSeconds);
  const roundedShield = Math.round(shieldEnergy);
  const roundedHull = Math.round(hullHealth);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px] flex-1">
          <p className="text-sm font-bold uppercase text-plasma">Orbit Tracker</p>
          <h1 className="text-2xl font-black leading-tight xl:text-3xl">Keep the beam locked</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-comet">{level}</div>
            <div className="text-xs font-bold uppercase text-white/65">Level</div>
          </div>
          <div className="min-w-[78px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-success">{roundedLock}%</div>
            <div className="text-xs font-bold uppercase text-white/65">Lock</div>
          </div>
          <div className="min-w-[86px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-comet">{roundedShield}%</div>
            <div className="text-xs font-bold uppercase text-white/65">Shield</div>
          </div>
          <div className="min-w-[82px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-success">{roundedHull}%</div>
            <div className="text-xs font-bold uppercase text-white/65">Hull</div>
          </div>
          <div className="min-w-[82px] rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-center">
            <div className="text-2xl font-black text-plasma">{roundedTime}s</div>
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

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-plasma/25 bg-space-950 shadow-glow">
        <canvas
          aria-label="Orbit Tracker game surface"
          className="h-full w-full touch-none"
          data-hud-copy="LOCK + CLICK TO FIRE"
          onPointerCancel={() => {
            pointerRef.current = null;
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerRef.current = canvasPoint(event);
            inputKindRef.current = inputKindFromPointer(event.pointerType);
            pendingShotRef.current = true;
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

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-space-950/78 backdrop-blur-sm">
            <div className="glass-panel max-w-lg rounded-lg px-8 py-7 text-center">
              <Shield className="mx-auto mb-4 h-14 w-14 text-nebula" />
              <p className="text-sm font-black uppercase text-nebula">Orbit Destroyed</p>
              <h2 className="mt-2 text-4xl font-black">Try the mission again</h2>
              <p className="mt-3 leading-6 text-white/70">
                Keep the beam locked, then tap or click to fire before the meteors and alien ships
                break the shield.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  className="min-h-12 rounded-md bg-plasma px-6 py-3 font-black text-space-950 shadow-glow"
                  onClick={resetRun}
                  type="button"
                >
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
