/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Point,
  TreeObstacle,
  VeterancyTier,
  SquadType,
  SquadSpecialization,
  Barricade,
  GameStateStats,
  Unit,
  MetaUpgradeId,
  MetaUpgradeConfig,
  MetaProgressionState,
  WaveConfig,
  EnemyCommanderOrder,
} from './types.ts';

// Strict playable battlefield vertical safe-zone:
// minY: 78px (below top VS scoreboard + action banner)
// maxY: 545px (above compact bottom command dock)
export const UI_SAFE_ZONE = {
  minY: 78,
  maxY: 545,
  minX: 20,
  maxX: 1180,
};

// Minimum X coordinate for drawn formations so units never stack inside the extreme left screen border (x < 80px)
export const MIN_FORMATION_X = 80;

// Left-side Blue Alliance deployment zone bounds
export const BLUE_DEPLOYMENT_ZONE = {
  minX: 80,
  maxX: 430,
  minY: UI_SAFE_ZONE.minY + 4,
  maxY: UI_SAFE_ZONE.maxY - 4,
};

// Flat ground: Open walkable grassy plain with central dirt road (centered at Y=335)
export const CENTRAL_ROAD_BOUNDS = { minX: 0, maxX: 1200, minY: 235, maxY: 435 };
export const TREE_OBSTACLES: TreeObstacle[] = [];

// Tactical Terrain Zones:
// 1. High Ground Hills on the north and south grass flanks (+20% Archer range & damage)
export interface TerrainPatch {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  label: string;
}

export const HIGH_GROUND_HILLS: TerrainPatch[] = [
  { id: 'hill_nw', x: 240, y: 140, rx: 92, ry: 42, label: '▲ HILL (+20% ARCHER)' },
  { id: 'hill_ne', x: 580, y: 138, rx: 96, ry: 42, label: '▲ HILL (+20% ARCHER)' },
  { id: 'hill_sw', x: 240, y: 492, rx: 92, ry: 40, label: '▲ HILL (+20% ARCHER)' },
  { id: 'hill_se', x: 580, y: 492, rx: 96, ry: 40, label: '▲ HILL (+20% ARCHER)' },
];

// 2. Rough Dirt / Mud Patches on the central road (-25% Cavalry charge speed)
export const MUD_PATCHES: TerrainPatch[] = [
  { id: 'mud_west', x: 465, y: 300, rx: 72, ry: 28, label: '≈ MUD (-25% CAV SPD)' },
  { id: 'mud_east', x: 740, y: 370, rx: 78, ry: 30, label: '≈ MUD (-25% CAV SPD)' },
];

/**
 * Checks if a coordinate lies inside any High Ground Hill ellipse on the grass flanks.
 */
export function isPointOnHighGroundHill(x: number, y: number): boolean {
  for (const h of HIGH_GROUND_HILLS) {
    const nx = (x - h.x) / h.rx;
    const ny = (y - h.y) / h.ry;
    if (nx * nx + ny * ny <= 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a coordinate lies inside any rough dirt/mud patch on the road.
 */
export function isPointInMudPatch(x: number, y: number): boolean {
  for (const m of MUD_PATCHES) {
    const nx = (x - m.x) / m.rx;
    const ny = (y - m.y) / m.ry;
    if (nx * nx + ny * ny <= 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Legacy cliff plateau helpers kept false for 100% walkable open battlefield.
 */
export function isPointOnPlateau(_x: number, _y: number): boolean {
  return false;
}

export function isPointInNorthRamp(_x: number, _y: number): boolean {
  return false;
}

export function isPointInCliffFace(_x: number, _y: number): boolean {
  return false;
}

/**
 * Clamp any point strictly inside the UI Safe-Zone Boundaries (Y: 78..545, X: 20..1180).
 */
export function clampToSafeZone(x: number, y: number, radius: number = 0): Point {
  return {
    x: Math.max(UI_SAFE_ZONE.minX + radius, Math.min(UI_SAFE_ZONE.maxX - radius, x)),
    y: Math.max(UI_SAFE_ZONE.minY + radius, Math.min(UI_SAFE_ZONE.maxY - radius, y)),
  };
}

/**
 * Planted Formation Bonus & High Ground Hill Bonus:
 * - Stationary in drawn formation (`isPlanted`): +30% range
 * - Positioned on a High Ground Hill (`isOnHill`): additional +20% range
 */
export function calculateArcherRange(
  baseRange: number,
  isPlanted: boolean,
  isOnHill: boolean = false
): number {
  let mult = isPlanted ? 1.3 : 1.0;
  if (isOnHill) {
    mult *= 1.2;
  }
  return Math.round(baseRange * mult);
}

/**
 * Calculates Archer damage including +20% High Ground Hill bonus.
 */
export function calculateArcherDamage(baseDamage: number, isOnHill: boolean): number {
  return isOnHill ? Math.round(baseDamage * 1.2) : baseDamage;
}

/**
 * Calculates predictive lead aim point for ballistics based on target velocity and projectile speed.
 */
export function calculatePredictiveAimPoint(
  shooter: { x: number; y: number },
  target: { x: number; y: number; vx?: number; vy?: number },
  projectileSpeed: number,
  isPlanted: boolean = false,
  randomJitter: number = 0
): { x: number; y: number; timeToIntercept: number } {
  const vx = target.vx ?? 0;
  const vy = target.vy ?? 0;
  const dx = target.x - shooter.x;
  const dy = target.y - shooter.y;

  // Quadratic coefficients: a*t^2 + b*t + c = 0
  const a = vx * vx + vy * vy - projectileSpeed * projectileSpeed;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;

  let t = 0;
  const discriminant = b * b - 4 * a * c;

  if (Math.abs(a) > 0.0001 && discriminant >= 0) {
    const root1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const root2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    if (root1 > 0 && root2 > 0) {
      t = Math.min(root1, root2);
    } else if (root1 > 0) {
      t = root1;
    } else if (root2 > 0) {
      t = root2;
    }
  }

  if (t <= 0) {
    const dist = Math.hypot(dx, dy);
    t = dist / Math.max(1, projectileSpeed);
  }

  t = Math.min(2.0, Math.max(0, t));

  let aimX = target.x + vx * t;
  let aimY = target.y + vy * t;

  if (!isPlanted && randomJitter !== 0) {
    aimX += (randomJitter - 0.5) * 20;
    aimY += (randomJitter - 0.5) * 20;
  }

  aimX = Math.max(UI_SAFE_ZONE.minX, Math.min(UI_SAFE_ZONE.maxX, aimX));
  aimY = Math.max(UI_SAFE_ZONE.minY, Math.min(UI_SAFE_ZONE.maxY, aimY));

  return { x: aimX, y: aimY, timeToIntercept: t };
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
 * Braced shield arrow resistance (75% default damage reduction; 90% with Tower Pavise specialization).
 */
export function calculateShieldArrowDamage(
  incomingDamage: number,
  isBraced: boolean,
  specialization?: SquadSpecialization | null
): { damage: number; deflected: boolean } {
  if (isBraced) {
    const mult = specialization === 'pavise' ? 0.1 : 0.25;
    const reduced = Math.max(1, Math.round(incomingDamage * mult));
    return { damage: reduced, deflected: true };
  }
  return { damage: incomingDamage, deflected: false };
}

/**
 * Calculates current cavalry speed with momentum multiplier (up to 2.5x default, 3.2x for Outrider Lancers)
 * and rough dirt/mud patch penalty (-25% speed when in mud).
 */
export function calculateCavalrySpeed(
  baseSpeed: number,
  momentum: number,
  inMud: boolean = false,
  specialization?: SquadSpecialization | null
): number {
  const maxMom = specialization === 'lancer' ? 3.2 : 2.5;
  const clampedMomentum = Math.max(1.0, Math.min(maxMom, momentum));
  const mudFactor = inMud ? 0.75 : 1.0;
  return baseSpeed * clampedMomentum * mudFactor;
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
 */
export function getVeterancyTier(xp: number): VeterancyTier {
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function getVeterancyPerks(tier: VeterancyTier): {
  attackSpeedMultiplier: number;
  damageMultiplier: number;
  hpMultiplier: number;
  title: string;
} {
  switch (tier) {
    case 3:
      return {
        attackSpeedMultiplier: 1.36,
        damageMultiplier: 1.3,
        hpMultiplier: 1.3,
        title: 'ELITE',
      };
    case 2:
      return {
        attackSpeedMultiplier: 1.18,
        damageMultiplier: 1.15,
        hpMultiplier: 1.15,
        title: 'VET',
      };
    case 1:
    default:
      return {
        attackSpeedMultiplier: 1.0,
        damageMultiplier: 1.0,
        hpMultiplier: 1.0,
        title: 'REC',
      };
  }
}

/**
 * Checks if an enemy should break formation and panic when Rally Horn is sounded.
 * Frontline enemies within 260px of Blue forces or any enemy at <=65% HP will flee.
 */
export function shouldEnemyPanic(
  currentHp: number,
  maxHp: number,
  distToFrontline?: number
): boolean {
  if (maxHp <= 0) return false;
  if (distToFrontline !== undefined && distToFrontline <= 260) {
    return true;
  }
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
 * Distributes miniature squad units into tight, multi-rank rectangular formations (2 to 3 rows deep)
 * along a player-drawn line, clamped strictly inside the UI Safe-Zone boundaries.
 */
export function distributeMultiRankFormation(
  stroke: Point[],
  count: number,
  ranks: number = 3,
  rankSpacing: number = 15
): Point[] {
  if (stroke.length === 0 || count <= 0) return [];

  const effectiveRanks = count >= 18 ? ranks : count >= 8 ? 2 : 1;
  const unitsPerRank = Math.ceil(count / effectiveRanks);
  const frontRankPoints = distributePointsAlongStroke(stroke, unitsPerRank);

  const result: Point[] = [];
  for (let i = 0; i < count; i++) {
    const rankIdx = Math.floor(i / unitsPerRank);
    const colIdx = i % unitsPerRank;
    const basePt = frontRankPoints[Math.min(colIdx, frontRankPoints.length - 1)];

    const rawX = basePt.x - rankIdx * rankSpacing;
    const rawY = basePt.y;

    result.push({
      x: Math.max(MIN_FORMATION_X, Math.min(UI_SAFE_ZONE.maxX, rawX)),
      y: Math.max(UI_SAFE_ZONE.minY, Math.min(UI_SAFE_ZONE.maxY, rawY)),
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

/**
 * Calculates burn damage over time tick for flaming arrows.
 */
export function calculateBurnTick(
  burnTimer: number,
  dt: number,
  dps: number = 12
): { remainingTimer: number; damageDealt: number } {
  if (burnTimer <= 0 || dt <= 0) {
    return { remainingTimer: 0, damageDealt: 0 };
  }
  const activeDt = Math.min(burnTimer, dt);
  const remainingTimer = Math.max(0, Number((burnTimer - dt).toFixed(4)));
  const damageDealt = Number((activeDt * dps).toFixed(4));
  return { remainingTimer, damageDealt };
}

/**
 * Checks circular unit collision against a rectangular wooden spike barricade.
 */
export function checkBarricadeCollision(
  unit: { x: number; y: number; radius: number },
  barricade: Pick<Barricade, 'x' | 'y' | 'width' | 'height'>
): { collides: boolean; pushX: number; pushY: number } {
  const halfW = barricade.width / 2;
  const halfH = barricade.height / 2;
  const closestX = Math.max(barricade.x - halfW, Math.min(barricade.x + halfW, unit.x));
  const closestY = Math.max(barricade.y - halfH, Math.min(barricade.y + halfH, unit.y));

  const dx = unit.x - closestX;
  const dy = unit.y - closestY;
  const dist = Math.hypot(dx, dy);

  if (dist < unit.radius) {
    if (dist < 0.0001) {
      return { collides: true, pushX: -unit.radius, pushY: 0 };
    }
    const overlap = unit.radius - dist;
    return {
      collides: true,
      pushX: (dx / dist) * overlap,
      pushY: (dy / dist) * overlap,
    };
  }

  return { collides: false, pushX: 0, pushY: 0 };
}

/**
 * Generates honorary battle accolades based on combat statistics.
 */
export function getBattleAccolades(stats: GameStateStats): string[] {
  const medals: string[] = [];
  if (stats.flankingCrits >= 3) {
    medals.push('🐎 Thunderous Flanker');
  }
  if (stats.arrowsDeflected >= 5) {
    medals.push('🛡️ Adamantine Wall');
  }
  if ((stats.flameKills ?? 0) >= 3) {
    medals.push('🔥 Highland Pyromancer');
  }
  if ((stats.barricadesBuilt ?? 0) >= 1) {
    medals.push('🪵 Fortification Engineer');
  }
  if (stats.wave >= stats.maxWaves && stats.blueStrength >= 50) {
    medals.push('👑 Sovereign of the Pass');
  }
  if (medals.length === 0) {
    medals.push('⚔️ Valiant Defender');
  }
  return medals;
}

/**
 * Individual Unit Veterancy Tier based on kills.
 */
export function calculateUnitVeterancyTier(kills: number): VeterancyTier {
  if (kills >= 4) return 3;
  if (kills >= 2) return 2;
  return 1;
}

export function calculateUnitVeterancyBonuses(tier: VeterancyTier): {
  hpMultiplier: number;
  damageMultiplier: number;
  rankIcon: string;
} {
  switch (tier) {
    case 3:
      return { hpMultiplier: 1.4, damageMultiplier: 1.5, rankIcon: '★★' };
    case 2:
      return { hpMultiplier: 1.2, damageMultiplier: 1.25, rankIcon: '★' };
    case 1:
    default:
      return { hpMultiplier: 1.0, damageMultiplier: 1.0, rankIcon: '' };
  }
}

export function applyUnitKillProgress(unit: Unit): {
  rankedUp: boolean;
  newTier: VeterancyTier;
} {
  const prevKills = unit.kills ?? 0;
  const nextKills = prevKills + 1;
  unit.kills = nextKills;

  const prevTier = unit.veterancyTier ?? 1;
  const nextTier = calculateUnitVeterancyTier(nextKills);

  if (nextTier > prevTier) {
    const prevBonus = calculateUnitVeterancyBonuses(prevTier);
    const nextBonus = calculateUnitVeterancyBonuses(nextTier);

    const baseMaxHp = Math.round(unit.maxHp / prevBonus.hpMultiplier);
    const baseDamage = Math.round(unit.damage / prevBonus.damageMultiplier);

    const newMaxHp = Math.round(baseMaxHp * nextBonus.hpMultiplier);
    const hpGain = newMaxHp - unit.maxHp;

    unit.veterancyTier = nextTier;
    unit.maxHp = newMaxHp;
    unit.hp = Math.min(newMaxHp, unit.hp + hpGain);
    unit.damage = Math.round(baseDamage * nextBonus.damageMultiplier);

    return { rankedUp: true, newTier: nextTier };
  }

  return { rankedUp: false, newTier: prevTier };
}

/**
 * Branching Squad Evolution Options at Tier 3 (ELITE).
 */
export interface SpecializationOption {
  id: SquadSpecialization;
  squadType: SquadType;
  title: string;
  shortTag: string;
  icon: string;
  visualGear: string;
  pros: string[];
  cons: string[];
  description: string;
}

export const SQUAD_SPECIALIZATIONS: Record<SquadType, [SpecializationOption, SpecializationOption]> = {
  shield: [
    {
      id: 'halberdier',
      squadType: 'shield',
      title: 'Phalanx Halberdiers',
      shortTag: 'HALBERD',
      icon: '🔱',
      visualGear: 'Golden Crescent Halberd Poleaxe',
      pros: ['+45% Melee Reach & +35% Damage', '2.0x Armor-Cleaving vs Brute & Siege Ram'],
      cons: ['Standard 75% Braced Arrow Block (No Pavise Regen)'],
      description: '+45% melee reach, +35% damage, & 2.0x anti-Brute/Siege Ram bonus.',
    },
    {
      id: 'pavise',
      squadType: 'shield',
      title: 'Tower Pavise Guard',
      shortTag: 'PAVISE',
      icon: '🛡️',
      visualGear: 'Full-Body Gilded Tower Pavise Shield',
      pros: ['90% Braced Arrow Block & +25% Max HP', 'Passive +4 HP/s Self-Repair in Formation'],
      cons: ['Standard Sword Reach & Single-Target Damage'],
      description: '90% Braced arrow block, +25% Max HP, & passive +4 HP/s self-repair.',
    },
  ],
  spearman: [
    {
      id: 'pikeman',
      squadType: 'spearman',
      title: 'Royal Heavy Pikemen',
      shortTag: 'PIKEMAN',
      icon: '🔱',
      visualGear: '18ft Steel-Tipped Sarissa Pike & Targe',
      pros: [
        '+40% Hold-Position First-Contact Speed Impale Damage',
        '+35% Pike Reach & Complete Cavalry Momentum Halt',
      ],
      cons: ['-10% Movement Speed While Repositioning'],
      description: 'PRO: +40% speed-scaled anti-cavalry impale damage & +35% pike reach. CON: -10% move speed.',
    },
    {
      id: 'voulge',
      squadType: 'spearman',
      title: 'Gilded Voulgiers',
      shortTag: 'VOULGE',
      icon: '🪓',
      visualGear: 'Heavy Armor-Splitting Voulge Polearm',
      pros: [
        '+30% Sustained Melee Damage & 2.0x vs Brute/Ram',
        'Retains Full Braced First-Contact Anti-Cavalry Impale',
      ],
      cons: ['Standard 20px Spear Reach'],
      description: 'PRO: +30% melee damage & 2.0x vs Brutes/Rams while keeping Hold-Position Cavalry Impale.',
    },
  ],
  archer: [
    {
      id: 'longbow',
      squadType: 'archer',
      title: 'Longbow Snipers',
      shortTag: 'LONGBOW',
      icon: '🎯',
      visualGear: 'Extended Tall Yew Quiver & 6ft War Longbow',
      pros: [
        'High Penetration: Pierces 3 Units in Line (100%/85%/70%)',
        '+30% Sniper Range, +45% DMG & 2.0x vs Brute/Ram',
      ],
      cons: [
        'Lower Fire Rate: -26% Slower Heavy Draw (1.70s)',
        'Zero AoE Splash (Pure Line-Piercing Sniper)',
      ],
      description: 'PRO: +30% range, pierces 3 foes in line, 2x vs Boss/Ram. CON: -26% fire rate, no AoE splash.',
    },
    {
      id: 'alchemist',
      squadType: 'archer',
      title: 'Alchemist Crossbows',
      shortTag: 'ALCHEMIST',
      icon: '💥',
      visualGear: 'Green-Glowing Alchemical Flasks & Heavy Crossbow',
      pros: [
        'High AoE: Volatile Flask Splash + Acid/Fire DoT',
        'Napalm Synergy w/ Flame Arrows [F] (32px Blast)',
      ],
      cons: [
        'High Cooldowns: 1.95s Bolt Reload & 9.0s Volley CD',
        '-20% Range & -35% Direct DMG vs Brute/Siege Ram',
      ],
      description: 'PRO: Volatile flask AoE splash & burn. CON: High cooldowns (1.95s reload / 9s volley), -20% range.',
    },
  ],
  cavalry: [
    {
      id: 'cataphract',
      squadType: 'cavalry',
      title: 'Royal Cataphracts',
      shortTag: 'CATAPHRACT',
      icon: '👑',
      visualGear: 'Golden Scale Horse Barding & Heavy Lance',
      pros: ['+35% Max HP Heavy Barding', '+40% Shock Trample Impact Damage'],
      cons: ['2.5x Max Momentum Cap'],
      description: '+35% Max HP heavy barding & +40% shock trample damage.',
    },
    {
      id: 'lancer',
      squadType: 'cavalry',
      title: 'Outrider Lancers',
      shortTag: 'LANCER',
      icon: '⚡',
      visualGear: 'Swift Pennon Lance & Light Harness',
      pros: ['3.2x Max Momentum Speed', 'Devastating 6.0x Flanking Critical Strikes'],
      cons: ['Standard Cavalry Base Armor HP'],
      description: '3.2x max momentum speed & devastating 6.0x flanking critical strikes.',
    },
  ],
};

/**
 * Royal Armory Meta-Progression Upgrades (Persistent across runs, up to Lv 10 each).
 */
export const META_UPGRADES: MetaUpgradeConfig[] = [
  {
    id: 'conscription',
    title: 'Royal Conscription',
    icon: '🛡️',
    maxLevel: 10,
    baseCost: 80,
    costMultiplier: 1.45,
    descriptionPerLevel: '+4 Starting Shields & +6% Shield Max HP per level',
  },
  {
    id: 'fletchers',
    title: "Fletcher's Guild",
    icon: '🏹',
    maxLevel: 10,
    baseCost: 90,
    costMultiplier: 1.45,
    descriptionPerLevel: '+3 Starting Archers & +6% Archer Damage per level',
  },
  {
    id: 'stables',
    title: 'Imperial Stables',
    icon: '🐎',
    maxLevel: 10,
    baseCost: 100,
    costMultiplier: 1.5,
    descriptionPerLevel: '+2 Starting Cavalry & +7% Charge Damage per level',
  },
  {
    id: 'forging',
    title: 'Damascus Steel Forging',
    icon: '⚔️',
    maxLevel: 10,
    baseCost: 110,
    costMultiplier: 1.5,
    descriptionPerLevel: '+6% Global Allied Damage & +6% Max HP per level',
  },
  {
    id: 'engineers',
    title: 'Siege Engineers',
    icon: '🪵',
    maxLevel: 10,
    baseCost: 75,
    costMultiplier: 1.4,
    descriptionPerLevel: '+1 Spike Barricade Stock & +20% Barricade HP per level',
  },
  {
    id: 'warhorn',
    title: 'Golden Warhorn',
    icon: '🎺',
    maxLevel: 10,
    baseCost: 85,
    costMultiplier: 1.45,
    descriptionPerLevel: '-0.6s Rally Horn Cooldown & +15% War Gold Earned per level',
  },
];

export function getMetaUpgradeCost(config: MetaUpgradeConfig, currentLevel: number): number {
  return Math.round(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
}

export function getDefaultMetaProgression(): MetaProgressionState {
  return {
    warGold: 0,
    highestWave: 1,
    totalKills: 0,
    victories: 0,
    upgrades: {
      conscription: 0,
      fletchers: 0,
      stables: 0,
      forging: 0,
      engineers: 0,
      warhorn: 0,
    },
    selectedSpecialists: {
      shield: null,
      spearman: null,
      archer: null,
      cavalry: null,
    },
  };
}

const META_STORAGE_KEY = 'tactical_medieval_skirmish_meta_v1';

export function loadMetaProgression(): MetaProgressionState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultMetaProgression();
    }
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return getDefaultMetaProgression();
    const parsed = JSON.parse(raw) as Partial<MetaProgressionState>;
    const def = getDefaultMetaProgression();
    return {
      warGold: typeof parsed.warGold === 'number' ? parsed.warGold : def.warGold,
      highestWave: typeof parsed.highestWave === 'number' ? parsed.highestWave : def.highestWave,
      totalKills: typeof parsed.totalKills === 'number' ? parsed.totalKills : def.totalKills,
      victories: typeof parsed.victories === 'number' ? parsed.victories : def.victories,
      upgrades: {
        ...def.upgrades,
        ...(parsed.upgrades || {}),
      },
      selectedSpecialists: {
        ...def.selectedSpecialists,
        ...(parsed.selectedSpecialists || {}),
      },
    };
  } catch {
    return getDefaultMetaProgression();
  }
}

export function saveMetaProgression(state: MetaProgressionState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Generates endless scaling horde waves (Wave 6, 7, 8... ∞) for Endless Crusade grinding.
 */
export function generateEndlessWaveConfig(waveNumber: number): WaveConfig {
  const depth = Math.max(1, waveNumber - 5);
  const swordsmen = 110 + depth * 12;
  const spearmen = 76 + depth * 9;
  const archers = 58 + depth * 7;
  const warHounds = 45 + depth * 6;
  const raiderCavalry = 14 + depth * 4;
  const brutes = 8 + depth * 2;
  const batteringRams = 3 + Math.floor((depth + 1) / 2);
  const total =
    swordsmen + spearmen + archers + warHounds + raiderCavalry + brutes + batteringRams;

  return {
    waveNumber,
    title: `Endless Crusade · Tier ${depth}`,
    description: `${total} elite barbarians (${raiderCavalry} Raider Cavalry, ${brutes} Brutes, ${batteringRams} Siege Rams) with +${depth * 14}% HP/DMG!`,
    swordsmen,
    spearmen,
    archers,
    brutes,
    warHounds,
    raiderCavalry,
    batteringRams,
    spawnInterval: Math.max(0.28, Number((0.45 - depth * 0.02).toFixed(2))),
  };
}

/**
 * Calculates first-contact counter-impale damage dealt by a Spearman in Hold Position (isBraced)
 * when charged by Cavalry (or high-speed mounted/charging units).
 * Damage scales directly with the charger's impact speed and momentum.
 */
export function calculateBracedSpearImpaleDamage(
  spearBaseDamage: number,
  chargerSpeed: number,
  chargerMomentum: number = 1.0,
  specialization?: SquadSpecialization | null
): { damage: number; speedMultiplier: number; haltsMomentum: boolean } {
  const effectiveSpeed = Math.max(chargerSpeed, 42 * Math.max(1.0, chargerMomentum));
  const speedRatio = Math.max(1.15, effectiveSpeed / 38);
  const momentumScale = Math.max(1.0, chargerMomentum * 0.92);
  const specMult =
    specialization === 'pikeman' ? 1.4 : specialization === 'halberdier' ? 1.25 : 1.0;

  const rawMult = 1.75 * speedRatio * momentumScale * specMult;
  const speedMultiplier = Number(Math.min(8.5, Math.max(2.0, rawMult)).toFixed(2));
  const damage = Math.max(
    Math.round(spearBaseDamage * 2.0),
    Math.round(spearBaseDamage * speedMultiplier)
  );

  return {
    damage,
    speedMultiplier,
    haltsMomentum: true,
  };
}

/**
 * Multi-factor AI Target Scoring with Engagement Load Balancing, Lane Alignment & Sticky Hysteresis.
 * Prevents whole squads from clumping onto a single frontmost enemy while adjacent enemies go unengaged.
 */
export function scoreTargetForUnit(
  seeker: Unit,
  candidate: Unit,
  currentEngagersCount: number = 0,
  isRecklessCharge: boolean = false,
  commanderOrder?: EnemyCommanderOrder,
  commanderPos?: Point | null
): number {
  const dx = candidate.x - seeker.x;
  const dy = candidate.y - seeker.y;
  const dist = Math.hypot(dx, dy);

  // 1. Lateral Y-lane alignment penalty so troops naturally fan out across the battle line
  const lanePenalty = isRecklessCharge ? Math.abs(dy) * 0.12 : Math.abs(dy) * 0.28;

  // 2. Engagement slot crowding penalty (spreads melee units across unengaged foes)
  const isBossTarget =
    Boolean(candidate.isCommander) ||
    candidate.type === 'brute' ||
    candidate.type === 'battering_ram';
  const maxFreeSlots = isBossTarget ? 5 : 1;
  const excessCrowding = Math.max(0, currentEngagersCount - maxFreeSlots);
  const crowdingPenalty = excessCrowding * (isBossTarget ? 12 : 24);

  // 3. Archetype & Commander Tactical Order priority multiplier
  let priorityMult = 1.0;
  if (seeker.isPlayer) {
    if (seeker.type === 'cavalry') {
      if (
        candidate.type === 'archer' ||
        candidate.type === 'battering_ram' ||
        candidate.type === 'war_hound' ||
        candidate.isCommander
      ) {
        priorityMult = 0.62;
      } else if (candidate.type === 'spearman' && candidate.isBraced) {
        // Player autonomous cavalry slightly avoids braced enemy spearmen if unbraced targets are nearby
        priorityMult = 1.35;
      }
    } else if (seeker.type === 'spearman') {
      // Player Spearmen prioritize intercepting Enemy Cavalry, War Hounds, and Brutes
      if (candidate.type === 'cavalry' || candidate.type === 'war_hound') {
        priorityMult = 0.48;
      } else if (seeker.specialization === 'voulge' && isBossTarget) {
        priorityMult = 0.62;
      }
    } else if (seeker.specialization === 'halberdier' && isBossTarget) {
      priorityMult = 0.65;
    }
  } else if (!isRecklessCharge) {
    // Royal Bodyguard Retinue Peel: Spearmen & Brutes near the Commander immediately intercept Blue assassins diving the Commander
    if (
      commanderPos &&
      (seeker.type === 'spearman' || seeker.type === 'brute') &&
      Math.hypot(seeker.x - commanderPos.x, seeker.y - commanderPos.y) <= 210 &&
      Math.hypot(candidate.x - commanderPos.x, candidate.y - commanderPos.y) <= 145
    ) {
      priorityMult *= 0.28;
    }

    if (seeker.type === 'war_hound' && candidate.type === 'archer') {
      priorityMult *= 0.45;
    } else if (
      commanderOrder === 'COORDINATED_ASSAULT' &&
      (seeker.y < 235 || seeker.y > 435) &&
      candidate.type === 'archer'
    ) {
      // North/South wing flankers prioritize collapsing Blue Archers during Coordinated Assault
      priorityMult *= 0.52;
    } else if (commanderOrder === 'TACTICAL_DEFEND' && seeker.type === 'archer') {
      // During Tactical Defend, Red Archers focus-fire exposed Blue Archers or unbraced troops over Braced Shields
      if (candidate.type === 'archer' || !candidate.isBraced) {
        priorityMult *= 0.68;
      } else if (candidate.isBraced) {
        priorityMult *= 1.25;
      }
    }

    if (candidate.type === 'cavalry') {
      if (seeker.type === 'spearman' && dist <= 135) {
        priorityMult *= 0.65; // Spearmen counter nearby Cavalry charges
      } else if (dist > 135) {
        priorityMult *= 1.85; // Don't chase distant kiting Cavalry across the map
      }
    }
  }

  // 4. Sticky target hysteresis so units don't oscillate between two similar targets each frame
  const isCurrentTarget =
    seeker.engagedWithId === candidate.id || seeker.targetUnitId === candidate.id;
  const stickyMult = isCurrentTarget ? 0.76 : 1.0;

  return (dist + lanePenalty + crowdingPenalty) * priorityMult * stickyMult;
}

export interface CommanderBattlefieldTelemetry {
  currentOrder: EnemyCommanderOrder;
  orderTimer: number;
  defendCooldown: number;
  minRedX: number;
  redMeleeCount: number;
  redArcherCount: number;
  redFlankerCount: number;
  blueShieldBraced: boolean;
  blueBarricadesCount: number;
  blueVolleyActive: boolean;
  blueFireArrowsActive: boolean;
  blueArmyAttacking: boolean;
  flankersInPosition: number;
  commanderThreatDist: number;
}

/**
 * Evaluates live battlefield telemetry to determine whether the Enemy Wave Commander
 * should immediately interrupt his current order or what next tactical order to issue.
 */
export function evaluateCommanderTacticalDecision(
  telemetry: CommanderBattlefieldTelemetry
): { shouldSwitch: boolean; nextOrder: EnemyCommanderOrder; reason: string } {
  const {
    currentOrder,
    orderTimer,
    defendCooldown,
    minRedX,
    redArcherCount,
    blueShieldBraced,
    blueBarricadesCount,
    blueVolleyActive,
    blueFireArrowsActive,
    blueArmyAttacking,
    flankersInPosition,
    commanderThreatDist,
  } = telemetry;

  // 1. Immediate Reactive Interrupts (before scheduled timer expires)
  if (
    currentOrder !== 'TACTICAL_DEFEND' &&
    defendCooldown <= 0 &&
    minRedX <= 740 &&
    (blueVolleyActive ||
      (minRedX >= 490 &&
        minRedX <= 655 &&
        ((blueShieldBraced && blueBarricadesCount > 0) ||
          (blueFireArrowsActive && redArcherCount >= 4))))
  ) {
    return {
      shouldSwitch: true,
      nextOrder: 'TACTICAL_DEFEND',
      reason: blueVolleyActive ? 'COUNTER_VOLLEY_BRACE' : 'FORTIFIED_CHOKE_SKIRMISH',
    };
  }

  if (
    currentOrder === 'MARCH_IN_FORMATION' &&
    (minRedX <= 495 || (blueArmyAttacking && minRedX <= 630) || commanderThreatDist <= 140)
  ) {
    return {
      shouldSwitch: true,
      nextOrder: 'COORDINATED_ASSAULT',
      reason: 'COUNTER_CHARGE_INTERCEPT',
    };
  }

  if (
    currentOrder === 'TACTICAL_DEFEND' &&
    orderTimer <= 2.4 &&
    ((flankersInPosition >= 4 && !blueVolleyActive) || (!blueShieldBraced && minRedX <= 540))
  ) {
    return {
      shouldSwitch: true,
      nextOrder: 'COORDINATED_ASSAULT',
      reason: 'FLANK_TRAP_SPRUNG',
    };
  }

  // 2. Scheduled Order Transition when orderTimer reaches 0
  if (orderTimer <= 0) {
    if (minRedX > 690 && !blueArmyAttacking && commanderThreatDist > 160) {
      return {
        shouldSwitch: true,
        nextOrder: 'MARCH_IN_FORMATION',
        reason: 'SYNCHRONIZED_ADVANCE',
      };
    }

    if (
      currentOrder !== 'TACTICAL_DEFEND' &&
      defendCooldown <= 0 &&
      minRedX >= 475 &&
      minRedX <= 675 &&
      (blueShieldBraced || redArcherCount >= 6)
    ) {
      return {
        shouldSwitch: true,
        nextOrder: 'TACTICAL_DEFEND',
        reason: 'TACTICAL_SKIRMISH_PHASE',
      };
    }

    return {
      shouldSwitch: true,
      nextOrder: 'COORDINATED_ASSAULT',
      reason: 'ALL_WING_ASSAULT',
    };
  }

  return {
    shouldSwitch: false,
    nextOrder: currentOrder,
    reason: 'HOLD_CURRENT_ORDER',
  };
}

/**
 * Context-Aware 2D Tactical Steering Vector:
 * - Seeks (goalX, goalY)
 * - Slides laterally around stationary/engaged friendly units ahead (preventing rear-rank conga-line traffic jams)
 * - Steers around wooden Spike Barricades (except Siege Battering Rams which deliberately ram them)
 * - Steers Cavalry & fast flankers around Mud Patches (-25% speed hazard) when transiting
 */
export function calculateTacticalSteeringVector(
  unit: Unit,
  goalX: number,
  goalY: number,
  allUnits: Unit[],
  barricades: Barricade[] = []
): Point {
  const dx = goalX - unit.x;
  const dy = goalY - unit.y;
  const distToGoal = Math.hypot(dx, dy);
  if (distToGoal < 0.001) {
    return { x: 0, y: 0 };
  }

  let steerX = dx / distToGoal;
  let steerY = dy / distToGoal;

  // 1. Friendly Congestion Lateral Wrap-Around (Flanking Flow around engaged/braced teammates)
  if (distToGoal > 14) {
    let avoidX = 0;
    let avoidY = 0;
    const lookAhead = unit.type === 'cavalry' ? 30 : 22;

    for (let i = 0; i < allUnits.length; i++) {
      const other = allUnits[i];
      if (other.id === unit.id || other.isDying || other.isPlayer !== unit.isPlayer) continue;

      const relX = other.x - unit.x;
      const relY = other.y - unit.y;
      const dSq = relX * relX + relY * relY;
      if (dSq > lookAhead * lookAhead || dSq < 0.001) continue;

      const d = Math.sqrt(dSq);
      const forwardDot = (relX * steerX + relY * steerY) / d;
      // Only steer around allies ahead of us in our movement cone
      if (forwardDot > 0.35) {
        const isBlocking =
          Boolean(other.isBraced) ||
          Boolean(other.isPlanted) ||
          Boolean(other.engagedWithId) ||
          Math.hypot(other.vx, other.vy) < 5;
        const weight = isBlocking ? 0.95 : 0.35;
        const falloff = (lookAhead - d) / lookAhead;

        // Lateral tangent perpendicular to goal vector, pushing toward the clearer vertical side
        const cross = steerX * relY - steerY * relX;
        const sideSign = cross >= 0 ? -1 : 1;
        const tangX = -steerY * sideSign;
        const tangY = steerX * sideSign;

        avoidX += (tangX * 0.8 - (relX / d) * 0.25) * weight * falloff;
        avoidY += (tangY * 0.8 - (relY / d) * 0.25) * weight * falloff;
      }
    }

    steerX += avoidX;
    steerY += avoidY;
  }

  // 2. Barricade Obstacle Avoidance (all units except Siege Battering Ram steer around barricade edges)
  if (unit.type !== 'battering_ram' && barricades.length > 0) {
    for (let i = 0; i < barricades.length; i++) {
      const b = barricades[i];
      const relX = b.x - unit.x;
      const relY = b.y - unit.y;
      const distB = Math.hypot(relX, relY);
      const detectR = Math.max(b.width, b.height) * 0.75 + unit.radius + 18;

      if (distB < detectR && distB > 0.001) {
        const forwardDot = (relX * steerX + relY * steerY) / distB;
        if (forwardDot > 0.15) {
          const strength = ((detectR - distB) / detectR) * 1.45;
          // Steer cleanly above or below the barricade
          const goNorth = unit.y <= b.y;
          steerY += (goNorth ? -1 : 1) * strength;
          steerX -= (relX / distB) * strength * 0.35;
        }
      }
    }
  }

  // 3. Mud Patch Hazard Avoidance for Cavalry & War Hounds (unless goal itself is inside the mud patch)
  if (unit.type === 'cavalry' || unit.type === 'war_hound') {
    for (let i = 0; i < MUD_PATCHES.length; i++) {
      const mud = MUD_PATCHES[i];
      const goalInMud =
        (goalX - mud.x) ** 2 / (mud.rx * mud.rx) + (goalY - mud.y) ** 2 / (mud.ry * mud.ry) <= 1.05;
      if (goalInMud) continue;

      const lookX = unit.x + steerX * 26;
      const lookY = unit.y + steerY * 26;
      const normDist =
        (lookX - mud.x) ** 2 / ((mud.rx + 14) * (mud.rx + 14)) +
        (lookY - mud.y) ** 2 / ((mud.ry + 14) * (mud.ry + 14));

      if (normDist <= 1.0) {
        const pushNorth = unit.y <= mud.y;
        steerY += (pushNorth ? -1 : 1) * 0.95;
      }
    }
  }

  // 4. Soft Boundary Cushion near top/bottom UI safe zones
  if (unit.y < UI_SAFE_ZONE.minY + 14 && steerY < 0) {
    steerY += 0.45;
  } else if (unit.y > UI_SAFE_ZONE.maxY - 14 && steerY > 0) {
    steerY -= 0.45;
  }

  const finalLen = Math.hypot(steerX, steerY);
  if (finalLen < 0.001) {
    return { x: dx / distToGoal, y: dy / distToGoal };
  }
  return {
    x: steerX / finalLen,
    y: steerY / finalLen,
  };
}



