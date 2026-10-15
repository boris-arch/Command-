/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Point, TreeObstacle, VeterancyTier } from './types.ts';

// Topography Constants
export const PLATEAU_BOUNDS = { minX: 25, maxX: 390, minY: 25, maxY: 255 };
export const CLIFF_FACE_BOUNDS = { minX: 0, maxX: 430, minY: 260, maxY: 340 };
export const NORTH_RAMP_BOUNDS = { minX: 315, maxX: 470, minY: 15, maxY: 180 };
export const CENTRAL_ROAD_BOUNDS = { minX: 400, maxX: 1200, minY: 340, maxY: 520 };

export const TREE_OBSTACLES: TreeObstacle[] = [
  { x: 680, y: 560, radius: 26, type: 'oak' },
  { x: 630, y: 610, radius: 24, type: 'pine' },
  { x: 740, y: 640, radius: 28, type: 'oak' },
  { x: 520, y: 580, radius: 22, type: 'pine' },
  { x: 860, y: 590, radius: 25, type: 'oak' },
];

/**
 * Determine if a point is on the elevated plateau.
 */
export function isPointOnPlateau(x: number, y: number): boolean {
  return (
    x >= PLATEAU_BOUNDS.minX &&
    x <= PLATEAU_BOUNDS.maxX &&
    y >= PLATEAU_BOUNDS.minY &&
    y <= PLATEAU_BOUNDS.maxY
  );
}

/**
 * Determine if a point is within the North Ramp corridor.
 */
export function isPointInNorthRamp(x: number, y: number): boolean {
  return (
    x >= NORTH_RAMP_BOUNDS.minX &&
    x <= NORTH_RAMP_BOUNDS.maxX &&
    y >= NORTH_RAMP_BOUNDS.minY &&
    y <= NORTH_RAMP_BOUNDS.maxY
  );
}

/**
 * Checks if a point falls within the impassable cliff face.
 */
export function isPointInCliffFace(x: number, y: number): boolean {
  return (
    x >= CLIFF_FACE_BOUNDS.minX &&
    x <= CLIFF_FACE_BOUNDS.maxX &&
    y >= CLIFF_FACE_BOUNDS.minY &&
    y <= CLIFF_FACE_BOUNDS.maxY
  );
}

/**
 * Elevation-based archer range boost (+30% on High Cliff Plateau).
 */
export function calculateArcherRange(baseRange: number, isHighland: boolean): number {
  return isHighland ? Math.round(baseRange * 1.3) : baseRange;
}

/**
 * Authentic parabolic arc trajectory formula for ballistic arrows.
 * height = 4 * peakHeight * progress * (1 - progress)
 */
export function calculateParabolicHeight(progress: number, peakHeight: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return 4 * peakHeight * p * (1 - p);
}

/**
 * Braced shield arrow resistance (75% damage reduction).
 */
export function calculateShieldArrowDamage(
  incomingDamage: number,
  isBraced: boolean
): { damage: number; deflected: boolean } {
  if (isBraced) {
    const reduced = Math.max(1, Math.round(incomingDamage * 0.25));
    return { damage: reduced, deflected: true };
  }
  return { damage: incomingDamage, deflected: false };
}

/**
 * Calculates current cavalry speed with momentum multiplier (up to 2.5x).
 */
export function calculateCavalrySpeed(baseSpeed: number, momentum: number): number {
  const clampedMomentum = Math.max(1.0, Math.min(2.5, momentum));
  return baseSpeed * clampedMomentum;
}

/**
 * Cavalry Shock Charge & Flanking Critical damage.
 * - 2.5x base damage at maximum momentum charge.
 * - Flanking Critical: 2x bonus if enemy is locked in combat with Blue Shields (2.5 * 2 = 5.0x total).
 */
export function calculateCavalryChargeDamage(
  baseDamage: number,
  momentum: number,
  isTargetLockedWithShields: boolean
): { damage: number; isFlankCrit: boolean; multiplier: number } {
  const chargeMult = Math.max(1.0, Math.min(2.5, momentum));
  if (chargeMult >= 2.0 && isTargetLockedWithShields) {
    const totalMult = chargeMult * 2.0; // up to 5.0x
    return {
      damage: Math.round(baseDamage * totalMult),
      isFlankCrit: true,
      multiplier: totalMult,
    };
  }
  return {
    damage: Math.round(baseDamage * chargeMult),
    isFlankCrit: false,
    multiplier: chargeMult,
  };
}

/**
 * Veterancy calculation and stat multipliers.
 * Tier 1: Recruit (<100 XP)
 * Tier 2: Veteran (100-249 XP): +18% Attack Speed, +15% Damage
 * Tier 3: Elite (>=250 XP): +36% Attack Speed, +30% Damage
 */
export function getVeterancyTier(xp: number): VeterancyTier {
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function getVeterancyPerks(tier: VeterancyTier): {
  attackSpeedMultiplier: number;
  damageMultiplier: number;
  title: string;
} {
  switch (tier) {
    case 3:
      return { attackSpeedMultiplier: 1.36, damageMultiplier: 1.3, title: 'ELITE' };
    case 2:
      return { attackSpeedMultiplier: 1.18, damageMultiplier: 1.15, title: 'VET' };
    case 1:
    default:
      return { attackSpeedMultiplier: 1.0, damageMultiplier: 1.0, title: 'REC' };
  }
}

/**
 * Checks if an enemy should break formation and panic when Rally Horn is sounded.
 * Targets flee if current HP <= 65% of max HP.
 */
export function shouldEnemyPanic(currentHp: number, maxHp: number): boolean {
  if (maxHp <= 0) return false;
  return currentHp / maxHp <= 0.65;
}

/**
 * Calculates Tug of War army strength split (percentage for blue and red).
 */
export function calculateTugOfWar(
  blueHp: number,
  blueMaxHp: number,
  redHp: number,
  redMaxHp: number
): { bluePercent: number; redPercent: number } {
  const safeBlueMax = Math.max(1, blueMaxHp);
  const safeRedMax = Math.max(1, redMaxHp);
  
  const blueRatio = Math.max(0, blueHp) / safeBlueMax;
  const redRatio = Math.max(0, redHp) / safeRedMax;
  
  const totalRatio = blueRatio + redRatio;
  if (totalRatio <= 0.001) {
    return { bluePercent: 50, redPercent: 50 };
  }
  
  const bluePercent = Math.round((blueRatio / totalRatio) * 100);
  return {
    bluePercent,
    redPercent: 100 - bluePercent,
  };
}

/**
 * Helper to interpolate evenly spaced positions along a drawn line.
 */
export function distributePointsAlongStroke(
  stroke: Point[],
  count: number
): Point[] {
  if (stroke.length === 0 || count <= 0) return [];
  if (stroke.length === 1 || count === 1) {
    return Array.from({ length: count }, () => ({ ...stroke[0] }));
  }

  // Calculate cumulative distances
  const distances: number[] = [0];
  let totalLength = 0;
  for (let i = 1; i < stroke.length; i++) {
    const dx = stroke[i].x - stroke[i - 1].x;
    const dy = stroke[i].y - stroke[i - 1].y;
    totalLength += Math.hypot(dx, dy);
    distances.push(totalLength);
  }

  if (totalLength === 0) {
    return Array.from({ length: count }, () => ({ ...stroke[0] }));
  }

  const result: Point[] = [];
  const step = totalLength / (count > 1 ? count - 1 : 1);

  for (let i = 0; i < count; i++) {
    const targetDist = i * step;
    // Find segment
    let segIdx = 0;
    while (segIdx < distances.length - 1 && distances[segIdx + 1] < targetDist) {
      segIdx++;
    }
    const segStartDist = distances[segIdx];
    const segEndDist = distances[segIdx + 1] ?? segStartDist;
    const segLen = segEndDist - segStartDist;
    const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;

    const p1 = stroke[segIdx];
    const p2 = stroke[segIdx + 1] ?? p1;

    result.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    });
  }

  return result;
}

/**
 * Check circular collision with tree obstacles.
 */
export function checkTreeCollision(
  x: number,
  y: number,
  radius: number,
  obstacles: TreeObstacle[] = TREE_OBSTACLES
): { collides: boolean; pushX: number; pushY: number } {
  for (const tree of obstacles) {
    const dx = x - tree.x;
    const dy = y - tree.y;
    const dist = Math.hypot(dx, dy);
    const minDist = radius + tree.radius;

    if (dist < minDist && dist > 0.0001) {
      const overlap = minDist - dist;
      return {
        collides: true,
        pushX: (dx / dist) * overlap,
        pushY: (dy / dist) * overlap,
      };
    }
  }

  return { collides: false, pushX: 0, pushY: 0 };
}
