/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SquadType = 'shield' | 'archer' | 'cavalry';

export type EnemyType = 'swordsman' | 'spearman' | 'archer' | 'brute';

export type VeterancyTier = 1 | 2 | 3; // 1: Recruit, 2: Veteran, 3: Elite

export type ShieldStance = 'braced' | 'offensive';

export interface Point {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: SquadType | EnemyType;
  isPlayer: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  speed: number;
  damage: number;
  range: number;
  attackCooldown: number;
  attackTimer: number;
  targetUnitId: string | null;
  elevation: 'plateau' | 'lowland';
  facing: number; // angle in radians
  
  // Cavalry specific
  momentum: number; // 1.0 to 2.5
  pathWaypoints: Point[];
  currentWaypointIdx: number;
  
  // Status effects
  isBraced?: boolean;
  stunTimer?: number;
  panicTimer?: number;
  frenzyTimer?: number;
  cleaveWindupTimer?: number; // Red Brute telegraphed cleave (0.65s)
  isCleaving?: boolean;
  cleaveTargetX?: number;
  cleaveTargetY?: number;
  
  // Melee locking
  engagedWithId?: string | null;
  
  // Visuals / death
  isDying?: boolean;
  deathTimer?: number;
  hitFlashTimer?: number;
  veterancyTier?: VeterancyTier;
}

export interface SquadData {
  type: SquadType;
  name: string;
  count: number;
  maxCount: number;
  tier: VeterancyTier;
  xp: number;
  xpToNextTier: number;
  stance?: ShieldStance;
  cooldownTimer: number;
  cooldownMax: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
  peakHeight: number;
  currentHeight: number;
  damage: number;
  isPlayer: boolean;
  fromElevation: 'plateau' | 'lowland';
  isVolley?: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  vy: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'spark' | 'blood' | 'star' | 'sweat' | 'heal' | 'gold_ring';
}

export interface TreeObstacle {
  x: number;
  y: number;
  radius: number;
  type: 'oak' | 'pine';
}

export interface WaveConfig {
  waveNumber: number;
  title: string;
  description: string;
  swordsmen: number;
  spearmen: number;
  archers: number;
  brutes: number;
  spawnInterval: number; // seconds between sub-batches
}

export interface ReinforcementPerk {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface GameStateStats {
  score: number;
  wave: number;
  maxWaves: number;
  enemiesDefeated: number;
  flankingCrits: number;
  arrowsDeflected: number;
  rallyHornsUsed: number;
  elapsedTime: number;
  blueStrength: number; // 0-100
  redStrength: number; // 0-100
}
