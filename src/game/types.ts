/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SquadType = 'shield' | 'spearman' | 'archer' | 'cavalry';

export type EnemyType =
  | 'swordsman'
  | 'spearman'
  | 'archer'
  | 'cavalry'
  | 'brute'
  | 'war_hound'
  | 'battering_ram';

export type VeterancyTier = 1 | 2 | 3; // 1: Recruit, 2: Veteran, 3: Elite

export type SquadSpecialization =
  | 'halberdier'
  | 'pavise'
  | 'pikeman'
  | 'voulge'
  | 'longbow'
  | 'alchemist'
  | 'cataphract'
  | 'lancer';

export type ShieldStance = 'braced' | 'offensive';

export type EnemyCommanderOrder =
  | 'MARCH_IN_FORMATION'
  | 'TACTICAL_DEFEND'
  | 'COORDINATED_ASSAULT'
  | 'RECKLESS_CHARGE';

export interface Point {
  x: number;
  y: number;
}

export interface Barricade {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

export interface Unit {
  id: string;
  type: SquadType | EnemyType;
  isPlayer: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  homeX?: number;
  homeY?: number;
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
  isPlanted?: boolean; // Stationary in formation: +30% range & pinpoint accuracy
  stunTimer?: number;
  panicTimer?: number;
  frenzyTimer?: number;
  burnTimer?: number;
  cleaveWindupTimer?: number; // Red Brute telegraphed cleave (0.65s)
  isCleaving?: boolean;
  cleaveTargetX?: number;
  cleaveTargetY?: number;
  
  // Melee locking
  engagedWithId?: string | null;
  
  // Visuals / death / veterancy
  isDying?: boolean;
  deathTimer?: number;
  hitFlashTimer?: number;
  kills?: number;
  veterancyTier?: VeterancyTier;
  specialization?: SquadSpecialization | null;
  flavorTextCooldown?: number;

  // Enemy Wave Commander AI fields
  isCommander?: boolean;
  commanderName?: string;
  commanderOrder?: EnemyCommanderOrder;
  commanderAuraRadius?: number;
  commanderSignalTimer?: number;

  // Spearman Hold-Position Anti-Cavalry First-Contact Impale tracking
  spearImpaleCooldown?: number;
  impaledByIds?: string[];
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
  kills?: number;
  specialization?: SquadSpecialization | null;
  pendingEvolution?: boolean;
}

export interface Projectile {
  id: string;
  shooterId?: string;
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
  isFlaming?: boolean;
  isExplosive?: boolean;
  isPiercing?: boolean;
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
  type: 'dust' | 'spark' | 'blood' | 'star' | 'sweat' | 'heal' | 'gold_ring' | 'ember' | 'smoke';
}

export interface GroundDecal {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  type: 'scorch' | 'crater' | 'fallen_gear';
  isBlue?: boolean;
  alpha: number;
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
  warHounds?: number;
  batteringRams?: number;
  raiderCavalry?: number;
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
  activeEnemiesCount?: number;
  flameKills?: number;
  barricadesBuilt?: number;
  shieldKills?: number;
  spearmanKills?: number;
  archerKills?: number;
  cavalryKills?: number;
  goldEarned?: number;
  isEndless?: boolean;
}

export type MetaUpgradeId =
  | 'conscription'
  | 'fletchers'
  | 'stables'
  | 'forging'
  | 'engineers'
  | 'warhorn';

export interface MetaUpgradeConfig {
  id: MetaUpgradeId;
  title: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  descriptionPerLevel: string;
}

export interface MetaProgressionState {
  warGold: number;
  highestWave: number;
  totalKills: number;
  victories: number;
  upgrades: Record<MetaUpgradeId, number>;
  selectedSpecialists?: Partial<Record<SquadType, SquadSpecialization | null>>;
}

