/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Unit,
  Projectile,
  FloatingText,
  Particle,
  Point,
  SquadType,
  SquadData,
  SquadSpecialization,
  WaveConfig,
  ReinforcementPerk,
  GameStateStats,
  EnemyType,
  Barricade,
  GroundDecal,
  MetaProgressionState,
  MetaUpgradeId,
  EnemyCommanderOrder,
} from './types.ts';
import {
  UI_SAFE_ZONE,
  MIN_FORMATION_X,
  clampToSafeZone,
  isPointOnHighGroundHill,
  isPointInMudPatch,
  calculateArcherRange,
  calculateArcherDamage,
  calculatePredictiveAimPoint,
  calculateParabolicHeight,
  calculateShieldArrowDamage,
  calculateCavalrySpeed,
  calculateCavalryChargeDamage,
  getVeterancyTier,
  getVeterancyPerks,
  shouldEnemyPanic,
  calculateTugOfWar,
  distributeMultiRankFormation,
  calculateBurnTick,
  checkBarricadeCollision,
  applyUnitKillProgress,
  calculateUnitVeterancyBonuses,
  SQUAD_SPECIALIZATIONS,
  META_UPGRADES,
  getMetaUpgradeCost,
  loadMetaProgression,
  saveMetaProgression,
  generateEndlessWaveConfig,
  calculateTacticalSteeringVector,
  scoreTargetForUnit,
  evaluateCommanderTacticalDecision,
  calculateBracedSpearImpaleDamage,
} from './rules.ts';
import { soundEngine } from './audio.ts';

export const WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    title: 'Barbarian Raiding Horde',
    description: '193 raiders, swift War Hounds, and 8 Raider Cavalry advance across the plain.',
    swordsmen: 95,
    spearmen: 50,
    archers: 25,
    brutes: 0,
    warHounds: 15,
    raiderCavalry: 8,
    batteringRams: 0,
    spawnInterval: 0.65,
  },
  {
    waveNumber: 2,
    title: 'Massed Archery & Outrider Packs',
    description: '227 barbarians with wide archer screens, War Hounds, and 12 Raider Cavalry.',
    swordsmen: 98,
    spearmen: 57,
    archers: 36,
    brutes: 0,
    warHounds: 24,
    raiderCavalry: 12,
    batteringRams: 0,
    spawnInterval: 0.6,
  },
  {
    waveNumber: 3,
    title: 'The Siege & Juggernaut Clash',
    description: '260 barbarians spearheaded by 15 Raider Cavalry, 4 Red Brutes, and a Siege Ram!',
    swordsmen: 102,
    spearmen: 65,
    archers: 45,
    brutes: 4,
    warHounds: 28,
    raiderCavalry: 15,
    batteringRams: 1,
    spawnInterval: 0.55,
  },
  {
    waveNumber: 4,
    title: 'Iron Phalanx & Ram Assault',
    description: '288 shock troops, 18 Raider Cavalry, War Hounds, and 2 Siege Battering Rams!',
    swordsmen: 105,
    spearmen: 70,
    archers: 52,
    brutes: 6,
    warHounds: 35,
    raiderCavalry: 18,
    batteringRams: 2,
    spawnInterval: 0.5,
  },
  {
    waveNumber: 5,
    title: 'Warlord Chieftain Onslaught',
    description: 'The supreme horde of 317 warriors with 22 Raider Cavalry, 8 Brutes, and 3 Rams!',
    swordsmen: 108,
    spearmen: 75,
    archers: 57,
    brutes: 8,
    warHounds: 44,
    raiderCavalry: 22,
    batteringRams: 3,
    spawnInterval: 0.45,
  },
];

export interface WaveCommanderProfile {
  waveNumber: number;
  name: string;
  hp: number;
  damage: number;
}

export const WAVE_COMMANDER_PROFILES: WaveCommanderProfile[] = [
  { waveNumber: 1, name: 'Chieftain Varg', hp: 450, damage: 32 },
  { waveNumber: 2, name: 'Marksman-Lord Kael', hp: 610, damage: 38 },
  { waveNumber: 3, name: 'Siegebreaker Grom', hp: 775, damage: 44 },
  { waveNumber: 4, name: 'Iron-Marshal Draven', hp: 940, damage: 50 },
  { waveNumber: 5, name: 'High Warlord Malakor', hp: 1100, damage: 58 },
];

export const AVAILABLE_PERKS: ReinforcementPerk[] = [
  {
    id: 'shields_15',
    title: '+25 Shield Soldiers',
    icon: '🛡️',
    description: 'Reinforces frontline phalanx with 25 fresh heavy armored recruits.',
  },
  {
    id: 'archer_fire_rate',
    title: '+25% Archer Fire Rate',
    icon: '🏹',
    description: 'Bowstrings strung taut for rapid ballistic saturation across the plain.',
  },
  {
    id: 'cavalry_shockwave',
    title: 'Cavalry Shockwave Charge',
    icon: '🐎',
    description: 'Expands knight impact knockback radius and adds +20% charge damage.',
  },
  {
    id: 'iron_wall_armor',
    title: 'Gilded Iron Armor',
    icon: '⚔️',
    description: 'Increases all allied squad Max HP by +25% and grants instant field repair.',
  },
];

export class GameEngine {
  public units: Unit[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public goldRings: { x: number; y: number; radius: number; alpha: number }[] = [];
  public barricades: Barricade[] = [];
  public groundDecals: GroundDecal[] = [];

  // Screen shake juice
  public shakeTimer: number = 0;
  public shakeIntensity: number = 0;

  // Tactical consumables & modes
  public fireArrowsActive: boolean = false;
  public barricadeStock: number = 4;
  public isTacticalFocus: boolean = false;
  public armyOrder: 'defend' | 'attack' = 'defend';

  // Squad State: Massive starting player army (133 total units: 45 Shields, 28 Spearmen, 35 Archers, 25 Cavalry)
  public squads: Record<SquadType, SquadData> = {
    shield: {
      type: 'shield',
      name: 'Shield Wall Phalanx',
      count: 45,
      maxCount: 75,
      tier: 1,
      xp: 0,
      xpToNextTier: 100,
      stance: 'braced',
      cooldownTimer: 0,
      cooldownMax: 1,
    },
    spearman: {
      type: 'spearman',
      name: 'Spearmen Phalanx',
      count: 28,
      maxCount: 55,
      tier: 1,
      xp: 0,
      xpToNextTier: 100,
      stance: 'braced', // Hold Position by default: deals huge speed-scaled damage on first contact with charging cavalry
      cooldownTimer: 0,
      cooldownMax: 1,
    },
    archer: {
      type: 'archer',
      name: 'Planted Archers',
      count: 35,
      maxCount: 55,
      tier: 1,
      xp: 0,
      xpToNextTier: 100,
      cooldownTimer: 0,
      cooldownMax: 6, // 6s Cooldown for Targeted Volley
    },
    cavalry: {
      type: 'cavalry',
      name: 'Knight Cavalry',
      count: 25,
      maxCount: 40,
      tier: 1,
      xp: 0,
      xpToNextTier: 100,
      cooldownTimer: 0,
      cooldownMax: 3,
    },
  };

  // Rally Horn Ultimate
  public rallyHornTimer: number = 0;
  public rallyHornCooldown: number = 12; // 12s cooldown

  // Stats & Progress
  public currentWaveIdx: number = 0;
  public isEndlessMode: boolean = false;
  public meta: MetaProgressionState = loadMetaProgression();
  public isWaveActive: boolean = false;
  public waveSpawnQueue: EnemyType[] = [];
  public waveSpawnTimer: number = 0;
  public enemiesRemainingInWave: number = 0;
  public initialWaveEnemyCount: number = 185;
  public timeSinceLastCombatDamage: number = 0;
  public isMopUpMode: boolean = false;

  // Enemy Wave Commander AI State
  public commanderAlive: boolean = false;
  public commanderOrder: EnemyCommanderOrder = 'MARCH_IN_FORMATION';
  public commanderOrderTimer: number = 6.0;
  public commanderDefendBraceTimer: number = 0;
  public commanderDefendCooldown: number = 0;
  public commanderRallyTimer: number = 8.5;
  public commanderStrikeCount: number = 0;
  public commanderRecentVolleyTrigger: number = 0;
  public commanderHasUsedTacticalDefend: boolean = false;

  public stats: GameStateStats = {
    score: 0,
    wave: 1,
    maxWaves: 5,
    enemiesDefeated: 0,
    flankingCrits: 0,
    arrowsDeflected: 0,
    rallyHornsUsed: 0,
    elapsedTime: 0,
    blueStrength: 50,
    redStrength: 50,
    activeEnemiesCount: 0,
    flameKills: 0,
    barricadesBuilt: 0,
    shieldKills: 0,
    spearmanKills: 0,
    archerKills: 0,
    cavalryKills: 0,
  };

  // Upgrades active
  public archerFireRateBonus: number = 1.0;
  public cavalryKnockbackBonus: number = 1.0;

  // Banner announcement
  public actionBanner: string = '';
  public bannerTimer: number = 5;

  // Callbacks
  public onStateChange?: () => void;
  public onWaveComplete?: () => void;
  public onGameOver?: (won: boolean) => void;

  constructor() {
    this.resetGame();
  }

  public resetGame() {
    this.meta = loadMetaProgression();
    this.isEndlessMode = false;
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.goldRings = [];
    this.barricades = [];
    this.groundDecals = [];
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    const upg = this.meta.upgrades;

    this.fireArrowsActive = false;
    this.barricadeStock = 4 + (upg.engineers ?? 0);
    this.isTacticalFocus = false;
    this.armyOrder = 'defend';

    this.currentWaveIdx = 0;
    this.rallyHornTimer = 0;
    this.rallyHornCooldown = Math.max(5.5, Number((12 - (upg.warhorn ?? 0) * 0.6).toFixed(1)));
    this.archerFireRateBonus = 1.0;
    this.cavalryKnockbackBonus = 1.0 + (upg.stables ?? 0) * 0.07;

    this.stats = {
      score: 0,
      wave: 1,
      maxWaves: 5,
      enemiesDefeated: 0,
      flankingCrits: 0,
      arrowsDeflected: 0,
      rallyHornsUsed: 0,
      elapsedTime: 0,
      blueStrength: 50,
      redStrength: 50,
      activeEnemiesCount: 185,
      flameKills: 0,
      barricadesBuilt: 0,
      shieldKills: 0,
      spearmanKills: 0,
      archerKills: 0,
      cavalryKills: 0,
      goldEarned: 0,
      isEndless: false,
    };

    // Reset Squad Data with Royal Armory Meta-Upgrades applied
    const startShields = 45 + (upg.conscription ?? 0) * 4;
    const startSpearmen = 28 + (upg.conscription ?? 0) * 3;
    const startArchers = 35 + (upg.fletchers ?? 0) * 3;
    const startCavalry = 25 + (upg.stables ?? 0) * 2;

    const savedSpecs = this.meta.selectedSpecialists ?? {};

    this.squads.shield.count = startShields;
    this.squads.shield.maxCount = Math.max(75, startShields + 30);
    this.squads.shield.tier = 1;
    this.squads.shield.xp = 0;
    this.squads.shield.stance = 'braced';
    this.squads.shield.specialization = null;
    this.squads.shield.pendingEvolution = false;

    this.squads.spearman.count = startSpearmen;
    this.squads.spearman.maxCount = Math.max(55, startSpearmen + 25);
    this.squads.spearman.tier = 1;
    this.squads.spearman.xp = 0;
    this.squads.spearman.stance = 'braced';
    this.squads.spearman.specialization = null;
    this.squads.spearman.pendingEvolution = false;

    this.squads.archer.count = startArchers;
    this.squads.archer.maxCount = Math.max(55, startArchers + 20);
    this.squads.archer.tier = 1;
    this.squads.archer.xp = 0;
    this.squads.archer.cooldownTimer = 0;
    this.squads.archer.cooldownMax = 6;
    this.squads.archer.specialization = null;
    this.squads.archer.pendingEvolution = false;

    this.squads.cavalry.count = startCavalry;
    this.squads.cavalry.maxCount = Math.max(40, startCavalry + 15);
    this.squads.cavalry.tier = 1;
    this.squads.cavalry.xp = 0;
    this.squads.cavalry.specialization = null;
    this.squads.cavalry.pendingEvolution = false;

    this.spawnAlliedSquads();

    // Apply any Squad Specialists pre-selected in the Royal Armory
    if (savedSpecs.shield) this.selectSquadSpecialization('shield', savedSpecs.shield, true);
    if (savedSpecs.spearman) this.selectSquadSpecialization('spearman', savedSpecs.spearman, true);
    if (savedSpecs.archer) this.selectSquadSpecialization('archer', savedSpecs.archer, true);
    if (savedSpecs.cavalry) this.selectSquadSpecialization('cavalry', savedSpecs.cavalry, true);

    this.prepareWave(0);
    this.setBanner('');
  }

  public purchaseMetaUpgrade(id: MetaUpgradeId): boolean {
    const cfg = META_UPGRADES.find((u) => u.id === id);
    if (!cfg) return false;
    const currentLv = this.meta.upgrades[id] ?? 0;
    if (currentLv >= cfg.maxLevel) return false;

    const cost = getMetaUpgradeCost(cfg, currentLv);
    if (this.meta.warGold < cost) return false;

    this.meta.warGold -= cost;
    this.meta.upgrades[id] = currentLv + 1;
    saveMetaProgression(this.meta);
    soundEngine.playVictoryFanfare();
    return true;
  }

  public startEndlessCrusade() {
    this.isEndlessMode = true;
    this.stats.isEndless = true;
    if (this.onWaveComplete) {
      this.onWaveComplete();
    } else {
      this.prepareWave(this.currentWaveIdx + 1);
    }
  }

  public spawnAlliedSquads() {
    const upg = this.meta.upgrades;
    const globalHpMult = 1 + (upg.forging ?? 0) * 0.06;
    const globalDmgMult = 1 + (upg.forging ?? 0) * 0.06;
    const shieldHp = Math.round(120 * globalHpMult * (1 + (upg.conscription ?? 0) * 0.06));
    const shieldDmg = Math.round(16 * globalDmgMult);
    const spearHp = Math.round(110 * globalHpMult * (1 + (upg.conscription ?? 0) * 0.06));
    const spearDmg = Math.round(20 * globalDmgMult);
    const archerHp = Math.round(75 * globalHpMult);
    const archerDmg = Math.round(22 * globalDmgMult * (1 + (upg.fletchers ?? 0) * 0.06));
    const cavHp = Math.round(180 * globalHpMult);
    const cavDmg = Math.round(28 * globalDmgMult);

    // 1. Shields: Centered properly on the main dirt road (Y=255..415, road center Y=335)
    for (let i = 0; i < this.squads.shield.count; i++) {
      const col = Math.floor(i / 15);
      const row = i % 15;
      const x = Math.max(MIN_FORMATION_X, 340 - col * 13);
      const y = 256 + row * 11.2;
      this.units.push({
        id: `shield_${i}_${Date.now()}`,
        type: 'shield',
        isPlayer: true,
        x,
        y,
        targetX: x,
        targetY: y,
        homeX: x,
        homeY: y,
        vx: 0,
        vy: 0,
        radius: 6,
        hp: shieldHp,
        maxHp: shieldHp,
        baseSpeed: 40,
        speed: 40,
        damage: shieldDmg,
        range: 14,
        attackCooldown: 1.0,
        attackTimer: Math.random() * 0.5,
        targetUnitId: null,
        elevation: 'lowland',
        facing: 0,
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
        isBraced: true,
        kills: 0,
        veterancyTier: 1,
      });
    }

    // 1b. Spearmen Phalanx: Positioned on the North & South shoulders of the Shield line in Hold Position (isBraced: true)
    // Ready to impale charging enemy Raider Cavalry & War Hounds on first contact!
    const northSpearCount = Math.ceil(this.squads.spearman.count / 2);
    for (let i = 0; i < this.squads.spearman.count; i++) {
      const isNorth = i < northSpearCount;
      const localIdx = isNorth ? i : i - northSpearCount;
      const col = Math.floor(localIdx / 7);
      const row = localIdx % 7;
      const x = Math.max(MIN_FORMATION_X, 328 - col * 13);
      const y = isNorth ? 174 + row * 10.5 : 426 + row * 10.5;
      this.units.push({
        id: `spearman_${i}_${Date.now()}`,
        type: 'spearman',
        isPlayer: true,
        x,
        y,
        targetX: x,
        targetY: y,
        homeX: x,
        homeY: y,
        vx: 0,
        vy: 0,
        radius: 6,
        hp: spearHp,
        maxHp: spearHp,
        baseSpeed: 39,
        speed: 39,
        damage: spearDmg,
        range: 21, // Longer pike reach than swords/shields
        attackCooldown: 1.05,
        attackTimer: Math.random() * 0.5,
        targetUnitId: null,
        elevation: 'lowland',
        facing: 0,
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
        isBraced: true,
        impaledByIds: [],
        kills: 0,
        veterancyTier: 1,
      });
    }

    // 2. Planted Archers: Neat ranks directly behind Shields on the main road
    for (let i = 0; i < this.squads.archer.count; i++) {
      const col = Math.floor(i / 12);
      const row = i % 12;
      const x = Math.max(MIN_FORMATION_X, 237 - col * 14);
      const y = 266 + row * 12.5;
      this.units.push({
        id: `archer_${i}_${Date.now()}`,
        type: 'archer',
        isPlayer: true,
        x,
        y,
        targetX: x,
        targetY: y,
        homeX: x,
        homeY: y,
        vx: 0,
        vy: 0,
        radius: 5,
        hp: archerHp,
        maxHp: archerHp,
        baseSpeed: 38,
        speed: 38,
        damage: archerDmg,
        range: 320,
        attackCooldown: 1.35,
        attackTimer: Math.random() * 0.8,
        targetUnitId: null,
        elevation: 'lowland',
        facing: 0,
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
        isPlanted: true,
        kills: 0,
        veterancyTier: 1,
      });
    }

    // 3. Knight Cavalry: Split onto top and bottom grass flanks ready to sweep enemy rear/archers
    const northWingCount = Math.ceil(this.squads.cavalry.count / 2);
    for (let i = 0; i < this.squads.cavalry.count; i++) {
      const isNorthWing = i < northWingCount;
      const localIdx = isNorthWing ? i : i - northWingCount;
      const col = Math.floor(localIdx / 5);
      const row = localIdx % 5;
      const x = Math.max(MIN_FORMATION_X, 168 - col * 15);
      const y = isNorthWing ? 118 + row * 15 : 458 + row * 15;
      this.units.push({
        id: `cavalry_${i}_${Date.now()}`,
        type: 'cavalry',
        isPlayer: true,
        x,
        y,
        targetX: x,
        targetY: y,
        homeX: x,
        homeY: y,
        vx: 0,
        vy: 0,
        radius: 7.5,
        hp: cavHp,
        maxHp: cavHp,
        baseSpeed: 68,
        speed: 68,
        damage: cavDmg,
        range: 15,
        attackCooldown: 1.2,
        attackTimer: 0,
        targetUnitId: null,
        elevation: 'lowland',
        facing: 0,
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
        kills: 0,
        veterancyTier: 1,
      });
    }
  }

  /**
   * Assigns default North & South flank sweep routes to Cavalry at the start of a wave
   * so Cavalry never sits clumped/idle in the top-left hill corner.
   */
  private assignDefaultCavalryFlankPaths() {
    const cavalryUnits = this.units.filter((u) => u.isPlayer && u.type === 'cavalry' && !u.isDying);
    cavalryUnits.forEach((u, idx) => {
      const isNorth = (u.homeY ?? u.y) < 335;
      const fileOffset = ((idx % 3) - 1) * 14;
      const rankOffset = Math.floor(idx / 3) * 12;
      const flankY = isNorth ? 132 + fileOffset : 485 + fileOffset;
      const convergeY = isNorth ? 245 + fileOffset : 385 + fileOffset;

      u.pathWaypoints = [
        clampToSafeZone(420 - rankOffset, flankY, u.radius),
        clampToSafeZone(740 - rankOffset, flankY, u.radius),
        clampToSafeZone(940 - rankOffset, convergeY, u.radius),
      ];
      u.currentWaypointIdx = 0;
      u.momentum = 1.15;
    });
  }

  public prepareWave(waveIndex: number) {
    if (waveIndex >= WAVES.length && !this.isEndlessMode) {
      if (this.onGameOver) this.onGameOver(true);
      return;
    }

    this.currentWaveIdx = waveIndex;
    const wave =
      waveIndex < WAVES.length
        ? WAVES[waveIndex]
        : generateEndlessWaveConfig(waveIndex + 1);
    this.stats.wave = wave.waveNumber;
    this.stats.isEndless = this.isEndlessMode;
    if (wave.waveNumber > this.meta.highestWave) {
      this.meta.highestWave = wave.waveNumber;
      saveMetaProgression(this.meta);
    }

    // Reform surviving Blue units at their home formation coordinates before the new wave clashes
    this.isMopUpMode = false;
    this.armyOrder = 'defend';
    this.squads.shield.stance = 'braced';
    this.squads.spearman.stance = 'braced';
    this.timeSinceLastCombatDamage = 0;
    this.units
      .filter((u) => u.isPlayer && !u.isDying)
      .forEach((u) => {
        if (u.homeX !== undefined && u.homeY !== undefined) {
          u.targetX = Math.max(MIN_FORMATION_X, u.homeX);
          u.targetY = u.homeY;
        }
        u.engagedWithId = null;
        u.impaledByIds = [];
        if (u.type === 'shield' || u.type === 'spearman') {
          u.isBraced = true;
        }
      });

    // Launch automatic North & South flank sweep for Cavalry
    this.assignDefaultCavalryFlankPaths();

    const queue: EnemyType[] = [];
    for (let i = 0; i < wave.swordsmen; i++) queue.push('swordsman');
    for (let i = 0; i < wave.spearmen; i++) queue.push('spearman');
    for (let i = 0; i < wave.archers; i++) queue.push('archer');
    for (let i = 0; i < wave.brutes; i++) queue.push('brute');
    for (let i = 0; i < (wave.warHounds ?? 0); i++) queue.push('war_hound');
    for (let i = 0; i < (wave.raiderCavalry ?? 0); i++) queue.push('cavalry');
    for (let i = 0; i < (wave.batteringRams ?? 0); i++) queue.push('battering_ram');

    // Shuffle queue so mixed unit groups spawn across the battle line
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    this.initialWaveEnemyCount = queue.length + 1; // +1 for Wave Enemy Commander
    this.waveSpawnQueue = queue;
    this.enemiesRemainingInWave = queue.length + 1;
    this.waveSpawnTimer = 0.2;
    this.isWaveActive = true;

    // Immediately spawn a massive unified vanguard horde (up to 75 units) in one cohesive battle formation
    const initialCount = Math.min(75, this.waveSpawnQueue.length);
    const initialBatch: EnemyType[] = [];
    for (let i = 0; i < initialCount; i++) {
      initialBatch.push(this.waveSpawnQueue.shift()!);
    }
    this.spawnEnemyCohort(initialBatch);

    // Spawn the living Wave Enemy Commander in the tactical rear-center of the Red formation (x: ~920, y: 335)
    const cmdProfile = this.spawnWaveCommander(wave.waveNumber);

    this.setBanner(
      `Wave ${wave.waveNumber}: ${wave.title} — Led by 👑 ${cmdProfile.name} (${cmdProfile.hp} HP)!`
    );
  }

  private spawnWaveCommander(waveNumber: number): WaveCommanderProfile {
    const baseProfile =
      WAVE_COMMANDER_PROFILES[Math.min(waveNumber - 1, WAVE_COMMANDER_PROFILES.length - 1)] ??
      WAVE_COMMANDER_PROFILES[0];
    const endlessScale =
      this.currentWaveIdx >= WAVES.length
        ? 1 + (this.currentWaveIdx - WAVES.length + 1) * 0.16
        : 1.0;
    const scaledHp = Math.round(baseProfile.hp * endlessScale);
    const scaledDmg = Math.round(baseProfile.damage * endlessScale);

    this.commanderAlive = true;
    this.commanderOrder = 'MARCH_IN_FORMATION';
    this.commanderOrderTimer = 5.5;
    this.commanderDefendBraceTimer = 0;
    this.commanderDefendCooldown = 0;
    this.commanderRallyTimer = 8.0;
    this.commanderStrikeCount = 0;
    this.commanderRecentVolleyTrigger = 0;
    this.commanderHasUsedTacticalDefend = false;

    const safePos = clampToSafeZone(920, 335, 11);
    this.units.push({
      id: `enemy_commander_w${waveNumber}_${Date.now()}`,
      type: 'brute',
      isPlayer: false,
      x: safePos.x,
      y: safePos.y,
      targetX: 620,
      targetY: 335,
      vx: 0,
      vy: 0,
      radius: 10.5,
      hp: scaledHp,
      maxHp: scaledHp,
      baseSpeed: 36,
      speed: 36,
      damage: scaledDmg,
      range: 20,
      attackCooldown: 1.4,
      attackTimer: 0.4,
      targetUnitId: null,
      elevation: 'lowland',
      facing: Math.PI,
      momentum: 1.0,
      pathWaypoints: [],
      currentWaypointIdx: 0,
      isCommander: true,
      commanderName: baseProfile.name,
      commanderOrder: 'MARCH_IN_FORMATION',
      commanderAuraRadius: 180,
      commanderSignalTimer: 1.6,
    });

    return {
      waveNumber,
      name: baseProfile.name,
      hp: scaledHp,
      damage: scaledDmg,
    };
  }

  public setBanner(msg: string) {
    this.actionBanner = msg;
    this.bannerTimer = 4.5;
  }

  public triggerShake(intensity: number, duration: number = 0.22) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private addGroundDecal(decal: GroundDecal) {
    if (this.groundDecals.length >= 85) {
      this.groundDecals.shift();
    }
    this.groundDecals.push(decal);
  }

  // ================= PLAYER CONTROLS & COMMANDS ================= //

  /**
   * Line Drawing: Player drags stroke across canvas for chosen squad.
   * Clamps all coordinates to UI_SAFE_ZONE and enforces X >= MIN_FORMATION_X (80px).
   */
  public applyDrawnLineToSquad(squadType: SquadType, stroke: Point[]) {
    if (stroke.length < 2) return;

    const squadUnits = this.units.filter((u) => u.isPlayer && u.type === squadType && !u.isDying);
    if (squadUnits.length === 0) return;

    const clampedStroke = stroke.map((pt) => {
      const safe = clampToSafeZone(pt.x, pt.y, 8);
      return { x: Math.max(MIN_FORMATION_X, safe.x), y: safe.y };
    });

    if (squadType === 'cavalry') {
      // Cavalry receives the full waypoint path to gallop along in multi-file column!
      soundEngine.playClick();
      this.setBanner('🐎 Knight Cavalry galloping along drawn flanking route!');

      squadUnits.forEach((u, idx) => {
        const rank = Math.floor(idx / 3);
        const file = (idx % 3) - 1; // -1, 0, +1
        const stepOffset = Math.min(rank, Math.max(0, clampedStroke.length - 2));
        const baseWaypoints = clampedStroke.slice(stepOffset);
        const pathToFollow = baseWaypoints.length >= 2 ? baseWaypoints : clampedStroke;

        u.pathWaypoints = pathToFollow.map((wp) => {
          const safeWp = clampToSafeZone(wp.x - rank * 6, wp.y + file * 13, u.radius);
          return { x: Math.max(MIN_FORMATION_X, safeWp.x), y: safeWp.y };
        });
        u.currentWaypointIdx = 0;
        u.momentum = 1.0;
        u.targetX = u.pathWaypoints[0].x;
        u.targetY = u.pathWaypoints[0].y;
      });
    } else {
      // Shield or Archer: Distribute soldiers into tight 2-to-3 row deep rectangular formations along drawn stroke
      const rankSpacing = squadType === 'shield' ? 14 : 16;
      const positions = distributeMultiRankFormation(clampedStroke, squadUnits.length, 3, rankSpacing);

      squadUnits.forEach((u, idx) => {
        const p = positions[idx];
        if (p) {
          const safePt = clampToSafeZone(Math.max(MIN_FORMATION_X, p.x), p.y, u.radius);
          const finalX = Math.max(MIN_FORMATION_X, safePt.x);
          u.targetX = finalX;
          u.targetY = safePt.y;
          u.homeX = finalX;
          u.homeY = safePt.y;
          u.pathWaypoints = [];
          u.currentWaypointIdx = 0;

          if (squadType === 'shield') {
            u.facing = 0;
            u.isBraced = this.squads.shield.stance === 'braced';
          } else if (squadType === 'spearman') {
            u.facing = 0;
            u.isBraced = this.squads.spearman.stance === 'braced';
            u.impaledByIds = [];
          } else if (squadType === 'archer') {
            u.facing = 0;
          }
        }
      });

      if (squadType === 'shield') {
        soundEngine.playClick();
        this.setBanner('🛡️ Shield Wall formed in tight multi-rank phalanx!');
      } else if (squadType === 'spearman') {
        soundEngine.playClick();
        this.setBanner(
          '🔱 Spearmen Phalanx formed in HOLD POSITION! First contact with charging Cavalry deals massive speed-scaled impale damage!'
        );
      } else {
        soundEngine.playClick();
        this.setBanner('🏹 Archers forming ranks! Stationary formation grants +30% Planted Range!');
      }
    }
  }

  /**
   * Toggle Shield stance between Braced Defense and Offensive Advance.
   */
  public toggleShieldStance() {
    const nextStance = this.squads.shield.stance === 'braced' ? 'offensive' : 'braced';
    this.squads.shield.stance = nextStance;

    this.units
      .filter((u) => u.isPlayer && u.type === 'shield')
      .forEach((u) => {
        u.isBraced = nextStance === 'braced';
        if (nextStance === 'offensive') {
          u.speed = u.baseSpeed * 1.25;
          u.targetX = Math.min(UI_SAFE_ZONE.maxX - u.radius, u.x + 80);
        } else {
          u.speed = u.baseSpeed;
          u.targetX = u.x;
        }
      });

    soundEngine.playShieldBlock();
    if (nextStance === 'braced') {
      this.setBanner('🛡️ Shield Wall in BRACED STANCE (75% Arrow Resistance)!');
    } else {
      this.setBanner('⚔️ Shield Wall in OFFENSIVE ADVANCE!');
    }
  }

  /**
   * Toggle Spearman stance between Hold Position (Braced Anti-Cavalry Impale) and Offensive Advance.
   */
  public toggleSpearmanStance() {
    const nextStance = this.squads.spearman.stance === 'braced' ? 'offensive' : 'braced';
    this.squads.spearman.stance = nextStance;

    this.units
      .filter((u) => u.isPlayer && u.type === 'spearman')
      .forEach((u) => {
        u.isBraced = nextStance === 'braced';
        u.impaledByIds = [];
        if (nextStance === 'offensive') {
          u.speed = u.baseSpeed * 1.22;
          u.targetX = Math.min(UI_SAFE_ZONE.maxX - u.radius, u.x + 80);
        } else {
          u.speed = u.baseSpeed;
          u.targetX = u.x;
          u.targetY = u.y;
        }
      });

    soundEngine.playShieldBlock();
    if (nextStance === 'braced') {
      this.setBanner(
        '🔱 Spearmen in HOLD POSITION! Braced pikes deal massive speed-scaled damage on first contact with charging Cavalry!'
      );
    } else {
      this.setBanner('⚔️ Spearmen Phalanx in OFFENSIVE ADVANCE!');
    }
  }

  /**
   * Whole-Army Order: DEFEND [D]
   * Recalls and braces the entire Blue army into defensive formations:
   * - Shields: Braced stance (75%-90% arrow resistance) holding formation line
   * - Spearmen: Hold Position stance (speed-scaled first-contact anti-cavalry impale)
   * - Archers: Planted formation (+30% range) behind the shields
   * - Cavalry: Holds defensive flank wings and intercepts nearby threats
   */
  public commandArmyDefend() {
    this.armyOrder = 'defend';
    this.isMopUpMode = false;
    this.squads.shield.stance = 'braced';
    this.squads.spearman.stance = 'braced';

    this.units
      .filter((u) => u.isPlayer && !u.isDying)
      .forEach((u) => {
        const holdX = Math.max(MIN_FORMATION_X, u.homeX ?? u.x);
        const holdY = u.homeY ?? u.y;
        u.targetX = holdX;
        u.targetY = holdY;

        if (u.type === 'shield' || u.type === 'spearman') {
          u.isBraced = true;
          u.impaledByIds = [];
          u.speed = u.baseSpeed;
        } else if (u.type === 'archer') {
          u.speed = u.baseSpeed;
        } else if (u.type === 'cavalry') {
          u.pathWaypoints = [];
          u.currentWaypointIdx = 0;
        }
      });

    soundEngine.playShieldBlock();
    this.setBanner(
      '🛡️ ARMY DEFEND! Shields Braced, Spearmen on Hold Position (Anti-Cavalry Impale), & Archers Planted!'
    );
  }

  /**
   * Whole-Army Order: ATTACK [A]
   * Orders every Blue squad (Shields, Spearmen, Archers, and Cavalry) to charge forward and attack the enemy horde!
   */
  public commandArmyAttack() {
    this.armyOrder = 'attack';
    this.squads.shield.stance = 'offensive';
    this.squads.spearman.stance = 'offensive';

    this.units
      .filter((u) => u.isPlayer && !u.isDying)
      .forEach((u) => {
        if (u.type === 'shield' || u.type === 'spearman') {
          u.isBraced = false;
          u.speed = u.baseSpeed * 1.25;
        } else if (u.type === 'cavalry') {
          u.pathWaypoints = [];
          u.currentWaypointIdx = 0;
          u.momentum = Math.max(u.momentum, 1.45);
        }
      });

    soundEngine.playShockCharge();
    this.setBanner('⚔️ ARMY ATTACK! Whole army charging forward to crush the enemy horde!');
  }

  /**
   * Toggle Flaming Pitch Arrows for Archers [F].
   */
  public toggleFireArrows() {
    this.fireArrowsActive = !this.fireArrowsActive;
    if (this.fireArrowsActive) {
      soundEngine.playFireArrow();
      this.setBanner('🔥 FLAME ARROWS IGNITED! Archers inflict burning damage-over-time!');
    } else {
      soundEngine.playClick();
      this.setBanner('🏹 Standard Bodkin Arrows equipped.');
    }
  }

  /**
   * Deploy miniature Wooden Spike Barricade (50% scale) in front of the defensive line [B].
   */
  public deployBarricade() {
    if (this.barricadeStock <= 0) return;

    this.barricadeStock--;
    this.stats.barricadesBuilt = (this.stats.barricadesBuilt ?? 0) + 1;
    soundEngine.playBarricadePlace();

    // Place barricade slightly ahead of shield wall or central road within UI safe zone
    const shields = this.units.filter((u) => u.isPlayer && u.type === 'shield' && !u.isDying);
    let deployX = 420;
    let deployY = 260 + (this.stats.barricadesBuilt % 3) * 70;

    if (shields.length > 0) {
      const avgX = shields.reduce((acc, s) => acc + s.x, 0) / shields.length;
      const avgY = shields.reduce((acc, s) => acc + s.y, 0) / shields.length;
      const offsetY = ((this.stats.barricadesBuilt % 3) - 1) * 55;
      deployX = avgX + 38;
      deployY = avgY + offsetY;
    }

    const clamped = clampToSafeZone(deployX, deployY, 16);
    const barHp = Math.round(220 * (1 + (this.meta.upgrades.engineers ?? 0) * 0.2));
    this.barricades.push({
      id: `barricade_${Date.now()}_${Math.random()}`,
      x: clamped.x,
      y: clamped.y,
      width: 24, // 50% micro-scale (halved from 48)
      height: 14, // 50% micro-scale (halved from 28)
      hp: barHp,
      maxHp: barHp,
    });

    this.setBanner(`🪵 Miniature Spike Barricade deployed! (${this.barricadeStock} remaining)`);
  }

  /**
   * Toggle 0.25x Tactical Focus Slow-Mo [Space].
   */
  public toggleTacticalFocus() {
    this.isTacticalFocus = !this.isTacticalFocus;
    if (this.isTacticalFocus) {
      soundEngine.playSlowMo();
      this.setBanner('⏱️ TACTICAL FOCUS (0.25x): Draw multi-rank formations with precision!');
    } else {
      soundEngine.playClick();
      this.setBanner('⚔️ Real-time battle speed resumed!');
    }
  }

  /**
   * Command Ability: Targeted Volley (Planted Archers, 6s cooldown).
   * Launches a 12-arrow saturated bombardment over clustered enemies.
   */
  public triggerTargetedVolley() {
    if (this.squads.archer.cooldownTimer > 0) return;

    const archers = this.units.filter((u) => u.isPlayer && u.type === 'archer' && !u.isDying);
    if (archers.length === 0) return;

    const enemies = this.units.filter((u) => !u.isPlayer && !u.isDying);
    if (enemies.length === 0) return;

    const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    soundEngine.playBowShot();

    const volleySpeed = 500;
    const isPlanted = archers.some((a) => a.isPlanted);
    const baseAim = calculatePredictiveAimPoint(
      archers[0],
      targetEnemy,
      volleySpeed,
      isPlanted,
      0
    );

    const archerVetMult = getVeterancyPerks(this.squads.archer.tier).damageMultiplier;
    const isAlchemistSquad = this.squads.archer.specialization === 'alchemist';
    const volleyCount = isAlchemistSquad
      ? Math.min(12, Math.max(8, Math.floor(archers.length * 0.32)))
      : Math.min(24, Math.max(14, Math.floor(archers.length * 0.65)));
    const volleyDmgMult = isAlchemistSquad ? 0.95 : 1.25;

    for (let i = 0; i < volleyCount; i++) {
      const shooter = archers[i % archers.length];
      const sampleEnemy = enemies[(i * 3) % enemies.length];
      const aimCenter =
        i % 2 === 0
          ? baseAim
          : calculatePredictiveAimPoint(shooter, sampleEnemy, volleySpeed, isPlanted, 0);
      const offsetX = (Math.random() - 0.5) * 64;
      const offsetY = (Math.random() - 0.5) * 64;
      const safeTarget = clampToSafeZone(aimCenter.x + offsetX, aimCenter.y + offsetY, 4);

      this.projectiles.push({
        id: `volley_${Date.now()}_${i}`,
        shooterId: shooter.id,
        x: shooter.x,
        y: shooter.y,
        startX: shooter.x,
        startY: shooter.y,
        targetX: safeTarget.x,
        targetY: safeTarget.y,
        speed: volleySpeed + (Math.random() - 0.5) * 30,
        progress: 0,
        peakHeight: 85,
        currentHeight: 0,
        damage: Math.round(shooter.damage * volleyDmgMult * archerVetMult),
        isPlayer: true,
        fromElevation: 'lowland',
        isVolley: true,
        isFlaming: this.fireArrowsActive,
        isExplosive: shooter.specialization === 'alchemist',
        isPiercing: shooter.specialization === 'longbow',
      });
    }

    this.squads.archer.cooldownTimer = this.squads.archer.cooldownMax;
    this.commanderRecentVolleyTrigger = 3.5;
    this.setBanner(`🏹 TARGETED VOLLEY! ${volleyCount}-shot bombardment launched!`);
  }

  /**
   * Tactical Ultimate: Morale "Rally Horn" (12s cooldown).
   */
  public triggerRallyHorn() {
    if (this.rallyHornTimer > 0) return;

    soundEngine.playRallyHorn();
    this.triggerShake(3.2, 0.25);
    this.rallyHornTimer = this.rallyHornCooldown;
    this.stats.rallyHornsUsed++;

    const allies = this.units.filter((u) => u.isPlayer && !u.isDying);
    const meleeAllies = allies.filter((u) => u.type === 'shield' || u.type === 'cavalry');
    const centerGroup = meleeAllies.length > 0 ? meleeAllies : allies;
    const frontX =
      centerGroup.length > 0
        ? centerGroup.reduce((sum, u) => sum + u.x, 0) / centerGroup.length
        : 420;
    const frontY =
      centerGroup.length > 0
        ? centerGroup.reduce((sum, u) => sum + u.y, 0) / centerGroup.length
        : 335;

    this.goldRings.push({
      x: frontX,
      y: frontY,
      radius: 20,
      alpha: 1.0,
    });

    allies.forEach((u, idx) => {
      const healAmt = Math.round(u.maxHp * 0.25);
      u.hp = Math.min(u.maxHp, u.hp + healAmt);
      u.frenzyTimer = 4.0;

      // Throttle heal text slightly in 100+ unit swarms so screen stays clean
      if (idx % 3 === 0) {
        this.floatingTexts.push({
          id: `heal_${Date.now()}_${u.id}`,
          x: u.x,
          y: u.y - 8,
          text: `+${healAmt} HP`,
          color: '#4ade80',
          size: 12,
          vy: -24,
          opacity: 1,
          life: 0,
          maxLife: 1.0,
        });
      }
    });

    let panickedCount = 0;
    const enemies = this.units.filter((u) => !u.isPlayer && !u.isDying);
    enemies.forEach((u, idx) => {
      if (u.type === 'brute' || u.type === 'battering_ram') return; // Boss brutes and Siege Rams are immune to panic

      let minDistToAlly = 99999;
      for (const a of allies) {
        const d = Math.hypot(a.x - u.x, a.y - u.y);
        if (d < minDistToAlly) minDistToAlly = d;
      }

      if (u.engagedWithId || shouldEnemyPanic(u.hp, u.maxHp, minDistToAlly)) {
        u.panicTimer = 3.2;
        u.engagedWithId = null;
        panickedCount++;
        if (idx % 3 === 0) {
          this.floatingTexts.push({
            id: `flee_${Date.now()}_${u.id}`,
            x: u.x,
            y: u.y - 10,
            text: 'FLEE!',
            color: '#38bdf8',
            size: 11,
            vy: -20,
            opacity: 1,
            life: 0,
            maxLife: 0.9,
          });
        }
      }
    });

    this.setBanner(`🎺 RALLY HORN! Allies healed + Frenzy active! ${panickedCount} barbarians flee!`);
  }

  /**
   * Apply selected reinforcement perk after wave victory.
   */
  public applyReinforcement(perkId: string) {
    if (perkId === 'shields_15') {
      const currentShields = this.units.filter((u) => u.isPlayer && u.type === 'shield' && !u.isDying).length;
      const toAdd = 25; // Always spawn the full +25 Shield Soldiers with no artificial cap
      const shieldTier = this.squads.shield.tier;
      const shieldSpec = this.squads.shield.specialization ?? null;
      const baseHp = shieldSpec === 'pavise' ? 150 : 120;
      const shieldVetHp = Math.round(baseHp * getVeterancyPerks(shieldTier).hpMultiplier);
      const isBraced = this.squads.shield.stance === 'braced';

      for (let i = 0; i < toAdd; i++) {
        const col = Math.floor(i / 9); // 3 neat ranks of 8-9 soldiers on the center road
        const row = i % 9;
        const rawX = 290 - col * 14;
        const rawY = 282 + row * 13;
        const safe = clampToSafeZone(Math.max(MIN_FORMATION_X, rawX), rawY, 6);
        this.units.push({
          id: `shield_reinf_${Date.now()}_${i}`,
          type: 'shield',
          isPlayer: true,
          x: safe.x,
          y: safe.y,
          targetX: safe.x,
          targetY: safe.y,
          homeX: safe.x,
          homeY: safe.y,
          vx: 0,
          vy: 0,
          radius: 6, // 50% micro-unit scale
          hp: shieldVetHp,
          maxHp: shieldVetHp,
          baseSpeed: 40,
          speed: isBraced ? 40 : 50,
          damage: shieldSpec === 'halberdier' ? 22 : 16,
          range: shieldSpec === 'halberdier' ? 20 : 14,
          attackCooldown: 1.0,
          attackTimer: 0,
          targetUnitId: null,
          elevation: 'lowland',
          facing: 0,
          momentum: 1.0,
          pathWaypoints: [],
          currentWaypointIdx: 0,
          isBraced,
          kills: 0,
          veterancyTier: shieldTier,
          specialization: shieldSpec,
        });
      }
      this.squads.shield.count = currentShields + toAdd;
      this.squads.shield.maxCount = Math.max(this.squads.shield.maxCount, this.squads.shield.count);
      this.setBanner(`🛡️ Reinforcements arrived: +${toAdd} heavy shields deployed on the center road!`);
    } else if (perkId === 'archer_fire_rate') {
      this.archerFireRateBonus *= 1.25;
      this.setBanner('🏹 Planted Archer fire rate increased by +25%!');
    } else if (perkId === 'cavalry_shockwave') {
      this.cavalryKnockbackBonus *= 1.4;
      this.setBanner('🐎 Cavalry Shockwave expanded! Greater knockback and stun!');
    } else if (perkId === 'iron_wall_armor') {
      this.units.filter((u) => u.isPlayer).forEach((u) => {
        u.maxHp = Math.round(u.maxHp * 1.25);
        u.hp = u.maxHp;
      });
      this.setBanner('⚔️ Gilded Iron Armor equipped! +25% Max HP restored!');
    }

    this.addSquadXp('shield', 35);
    this.addSquadXp('spearman', 35);
    this.addSquadXp('archer', 35);
    this.addSquadXp('cavalry', 35);

    this.prepareWave(this.currentWaveIdx + 1);
  }

  public addSquadXp(squadType: SquadType, amount: number) {
    const sq = this.squads[squadType];
    const prevTier = sq.tier;
    sq.xp += amount;
    const newTier = getVeterancyTier(sq.xp);
    if (newTier > prevTier) {
      sq.tier = newTier;
      const prevPerk = getVeterancyPerks(prevTier);
      const nextPerk = getVeterancyPerks(newTier);
      const hpScale = nextPerk.hpMultiplier / prevPerk.hpMultiplier;

      this.units
        .filter((u) => u.isPlayer && u.type === squadType && !u.isDying)
        .forEach((u) => {
          const newMaxHp = Math.round(u.maxHp * hpScale);
          const hpGain = Math.max(0, newMaxHp - u.maxHp);
          u.maxHp = newMaxHp;
          u.hp = Math.min(newMaxHp, u.hp + hpGain);
          if ((u.veterancyTier ?? 1) < newTier) {
            u.veterancyTier = newTier;
          }
        });

      if (newTier === 3 && !sq.specialization) {
        sq.pendingEvolution = true;
        this.setBanner(
          `👑 ${sq.name} REACHED ELITE TIER 3! Choose a permanent Class Evolution below!`
        );
      } else {
        this.setBanner(
          `⭐ ${sq.name} PROMOTED TO ${nextPerk.title}! (+${Math.round((nextPerk.damageMultiplier - 1) * 100)}% DMG & HP)`
        );
      }
      soundEngine.playVictoryFanfare();
    }
  }

  /**
   * Dynamic Squad Specialist System (selectable in the Royal Armory or at Tier 3 Evolution):
   * Cleanly recalculates squad cooldowns and unit stats from base values so switching between
   * 'alchemist', 'longbow', or null in the Armory never compounds multipliers.
   */
  public selectSquadSpecialization(
    squadType: SquadType,
    spec: SquadSpecialization | null,
    silent: boolean = false
  ) {
    const sq = this.squads[squadType];
    sq.specialization = spec;
    sq.pendingEvolution = false;

    this.meta.selectedSpecialists = {
      ...(this.meta.selectedSpecialists ?? {}),
      [squadType]: spec,
    };
    saveMetaProgression(this.meta);

    if (!silent) {
      soundEngine.playVictoryFanfare();
    }

    const upg = this.meta.upgrades;
    const globalHpMult = 1 + (upg.forging ?? 0) * 0.06;
    const globalDmgMult = 1 + (upg.forging ?? 0) * 0.06;
    const squadVet = getVeterancyPerks(sq.tier);

    if (squadType === 'archer') {
      // Alchemist PRO: High AoE / CON: High Cooldowns (9.0s Volley CD vs 6.0s Standard/Longbow)
      sq.cooldownMax = spec === 'alchemist' ? 9 : 6;
    }

    this.units
      .filter((u) => u.isPlayer && u.type === squadType && !u.isDying)
      .forEach((u) => {
        u.specialization = spec;
        const unitVet = calculateUnitVeterancyBonuses(u.veterancyTier ?? 1);
        const hpRatio = u.maxHp > 0 ? u.hp / u.maxHp : 1;

        if (squadType === 'shield') {
          const baseShieldHp = Math.round(120 * globalHpMult * (1 + (upg.conscription ?? 0) * 0.06));
          const baseShieldDmg = Math.round(16 * globalDmgMult);
          const specHpMult = spec === 'pavise' ? 1.25 : 1.0;
          const specDmgMult = spec === 'halberdier' ? 1.35 : 1.0;
          const specRange = spec === 'halberdier' ? 20 : 14;

          u.maxHp = Math.round(baseShieldHp * specHpMult * squadVet.hpMultiplier * unitVet.hpMultiplier);
          u.hp = Math.max(1, Math.min(u.maxHp, Math.round(u.maxHp * hpRatio)));
          u.damage = Math.round(baseShieldDmg * specDmgMult * unitVet.damageMultiplier);
          u.range = specRange;
        } else if (squadType === 'spearman') {
          const baseSpearHp = Math.round(110 * globalHpMult * (1 + (upg.conscription ?? 0) * 0.06));
          const baseSpearDmg = Math.round(20 * globalDmgMult);
          const specDmgMult = spec === 'voulge' ? 1.3 : 1.0;
          const specRange = spec === 'pikeman' ? 27 : 21;
          const specSpeed = spec === 'pikeman' ? 35 : 39;

          u.maxHp = Math.round(baseSpearHp * squadVet.hpMultiplier * unitVet.hpMultiplier);
          u.hp = Math.max(1, Math.min(u.maxHp, Math.round(u.maxHp * hpRatio)));
          u.damage = Math.round(baseSpearDmg * specDmgMult * unitVet.damageMultiplier);
          u.range = specRange;
          u.baseSpeed = specSpeed;
          u.speed = specSpeed;
        } else if (squadType === 'archer') {
          const baseArcherHp = Math.round(75 * globalHpMult);
          const baseArcherDmg = Math.round(22 * globalDmgMult * (1 + (upg.fletchers ?? 0) * 0.06));

          if (spec === 'longbow') {
            // LONGBOW PRO: +30% range (416px), +45% single-target damage, pierces 3 in line, 2.0x vs Brute/Ram
            // LONGBOW CON: Lower fire rate (1.70s heavy draw vs 1.35s standard), 0 AoE splash
            u.range = Math.round(320 * 1.3);
            u.damage = Math.round(baseArcherDmg * 1.45 * unitVet.damageMultiplier);
            u.attackCooldown = 1.7;
          } else if (spec === 'alchemist') {
            // ALCHEMIST PRO: High AoE volatile flask splash + acid/fire burn DoT
            // ALCHEMIST CON: High cooldowns (1.95s bolt reload + 9.0s Volley), -20% range (256px), -35% vs Brute/Ram
            u.range = Math.round(320 * 0.8);
            u.damage = Math.round(baseArcherDmg * 1.15 * unitVet.damageMultiplier);
            u.attackCooldown = 1.95;
          } else {
            u.range = 320;
            u.damage = Math.round(baseArcherDmg * unitVet.damageMultiplier);
            u.attackCooldown = 1.35;
          }
          u.maxHp = Math.round(baseArcherHp * squadVet.hpMultiplier * unitVet.hpMultiplier);
          u.hp = Math.max(1, Math.min(u.maxHp, Math.round(u.maxHp * hpRatio)));
        } else if (squadType === 'cavalry') {
          const baseCavHp = Math.round(180 * globalHpMult);
          const baseCavDmg = Math.round(28 * globalDmgMult);
          const specHpMult = spec === 'cataphract' ? 1.35 : 1.0;
          const specDmgMult = spec === 'cataphract' ? 1.4 : 1.0;
          const specSpeed = spec === 'lancer' ? Math.round(68 * 1.15) : 68;

          u.maxHp = Math.round(baseCavHp * specHpMult * squadVet.hpMultiplier * unitVet.hpMultiplier);
          u.hp = Math.max(1, Math.min(u.maxHp, Math.round(u.maxHp * hpRatio)));
          u.damage = Math.round(baseCavDmg * specDmgMult * unitVet.damageMultiplier);
          u.baseSpeed = specSpeed;
          u.speed = specSpeed;
        }
      });

    if (!silent) {
      if (spec) {
        const options = SQUAD_SPECIALIZATIONS[squadType];
        const chosen = options.find((o) => o.id === spec);
        if (chosen) {
          this.setBanner(`${chosen.icon} ${sq.name} equipped Specialist Doctrine: ${chosen.title.toUpperCase()}!`);
        }
      } else {
        this.setBanner(`⚔️ ${sq.name} reset to Standard Royal Doctrine.`);
      }
    }
  }

  // ================= MAIN SIMULATION UPDATE LOOP ================= //

  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    this.stats.elapsedTime += clampedDt;

    if (this.rallyHornTimer > 0) {
      this.rallyHornTimer = Math.max(0, this.rallyHornTimer - clampedDt);
    }
    if (this.squads.archer.cooldownTimer > 0) {
      this.squads.archer.cooldownTimer = Math.max(0, this.squads.archer.cooldownTimer - clampedDt);
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= clampedDt;
      if (this.bannerTimer <= 0) {
        this.actionBanner = '';
      }
    }
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
      }
    }

    // Spawn wave enemies in wide multi-group battle lines
    this.updateWaveSpawning(clampedDt);

    // Update Living Enemy Commander Tactical State Machine
    if (this.isWaveActive) {
      this.updateCommanderAI(clampedDt);
    }

    // Check Mop-Up / Charge condition (fewer than 15% or <20 enemies remaining OR >=4s without combat damage)
    // Prevent False Mop-Up Trigger while Enemy Commander is alive and executing TACTICAL_DEFEND or MARCH_IN_FORMATION
    if (this.isWaveActive) {
      const suppressMopUpTimer =
        this.commanderAlive &&
        (this.commanderOrder === 'TACTICAL_DEFEND' || this.commanderOrder === 'MARCH_IN_FORMATION');

      if (!suppressMopUpTimer) {
        this.timeSinceLastCombatDamage += clampedDt;
      } else {
        this.timeSinceLastCombatDamage = Math.min(this.timeSinceLastCombatDamage, 1.5);
      }

      const aliveEnemiesCount = this.units.filter((u) => !u.isPlayer && !u.isDying).length;
      const totalRemaining = aliveEnemiesCount + this.waveSpawnQueue.length;
      const waveThreshold = Math.max(20, Math.ceil(this.initialWaveEnemyCount * 0.15));

      if (
        totalRemaining > 0 &&
        !this.isMopUpMode &&
        (totalRemaining <= waveThreshold ||
          (this.waveSpawnQueue.length === 0 &&
            !suppressMopUpTimer &&
            this.timeSinceLastCombatDamage >= 4.0))
      ) {
        this.isMopUpMode = true;
        this.setBanner('⚔️ MOP-UP CHARGE! Blue squads advancing to hunt down remaining stragglers!');
      }
    }

    // Update units
    this.updateUnits(clampedDt);

    // Update projectiles
    this.updateProjectiles(clampedDt);

    // Update particles & FX
    this.updateParticles(clampedDt);

    // Update Tug of War strength
    this.updateTugOfWar();

    // Check wave status
    this.checkWaveProgress();
  }

  private updateWaveSpawning(dt: number) {
    if (!this.isWaveActive || this.waveSpawnQueue.length === 0) return;

    this.waveSpawnTimer -= dt;
    if (this.waveSpawnTimer <= 0) {
      // Spawn reinforcements as one massive unified horde block (40 units per wave) instead of tiny trickles
      const batchSize = Math.min(40, this.waveSpawnQueue.length);
      const typesToSpawn: EnemyType[] = [];
      for (let i = 0; i < batchSize; i++) {
        typesToSpawn.push(this.waveSpawnQueue.shift()!);
      }
      this.spawnEnemyCohort(typesToSpawn);
      const wave = WAVES[this.currentWaveIdx];
      const baseInterval = wave ? wave.spawnInterval : 0.5;
      this.waveSpawnTimer = baseInterval * 2.4 * (0.9 + Math.random() * 0.2);
    }
  }

  private spawnEnemyCohort(types: EnemyType[]) {
    const n = types.length;
    if (n === 0) return;

    // Unified Massive Horde Formation: one dense, continuous multi-rank army block centered on the main road (Y=335)
    // instead of splitting into 4 separate groups.
    const centerY = 335;
    const unitsPerColumn = Math.min(16, Math.max(10, Math.ceil(Math.sqrt(n * 2.2))));
    const rowSpacing = 13.5;
    const colSpacing = 14.5;
    const formationHeight = (unitsPerColumn - 1) * rowSpacing;
    const startY = centerY - formationHeight / 2;

    types.forEach((type, idx) => {
      const rowInCol = idx % unitsPerColumn;
      const colRank = Math.floor(idx / unitsPerColumn);
      const jitterX = (Math.random() - 0.5) * 7;
      const jitterY = (Math.random() - 0.5) * 7;

      let rawY = startY + rowInCol * rowSpacing + jitterY;
      const rawX = 1095 + colRank * colSpacing + jitterX;

      let hp = 85;
      let speed = 42;
      let damage = 14;
      let range = 14;
      let radius = 6; // 50% micro-unit scale (halved from 12)
      let atkCooldown = 1.2;

      if (type === 'spearman') {
        hp = 95;
        speed = 38;
        damage = 18;
        range = 16;
        radius = 6;
      } else if (type === 'archer') {
        hp = 65;
        speed = 36;
        damage = 16;
        range = 300;
        radius = 5;
      } else if (type === 'war_hound') {
        hp = 55;
        speed = 74; // Fast pack runner Charging with the main horde
        damage = 19;
        range = 13;
        radius = 5.2;
        atkCooldown = 0.75;
        // Keep War Hounds attached to the outer shoulders of the main unified horde
        rawY = centerY + (idx % 2 === 0 ? -1 : 1) * (formationHeight * 0.45 + (idx % 3) * 10);
      } else if (type === 'battering_ram') {
        hp = 460;
        speed = 25;
        damage = 45;
        range = 22;
        radius = 13;
        atkCooldown = 1.8;
        rawY = centerY + ((idx % 3) - 1) * 24; // Rolls down the center of the main horde
        soundEngine.playShockCharge();
        this.setBanner('🪵 SIEGE BATTERING RAM ROLLING WITH THE MAIN HORDE! (Crushes Barricades & Braced Shields)');
      } else if (type === 'brute') {
        hp = 680;
        speed = 28;
        damage = 60;
        range = 20;
        radius = 12;
        atkCooldown = 2.0;
        rawY = centerY + ((idx % 5) - 2) * 22;
        soundEngine.playBruteRoar();
        this.setBanner('💀 RED BRUTE BOSS LEADING THE MASSIVE HORDE! (680 HP)');
      }

      const safePos = clampToSafeZone(rawX, rawY, radius);
      const endlessScale =
        this.currentWaveIdx >= WAVES.length
          ? 1 + (this.currentWaveIdx - WAVES.length + 1) * 0.14
          : 1.0;
      const scaledHp = Math.round(hp * endlessScale);
      const scaledDmg = Math.round(damage * endlessScale);

      const isReckless = !this.commanderAlive;
      const initOrder: EnemyCommanderOrder = isReckless ? 'RECKLESS_CHARGE' : this.commanderOrder;
      const initSpeed = isReckless ? Math.round(speed * 1.2) : speed;

      this.units.push({
        id: `enemy_${type}_${Date.now()}_${Math.random()}`,
        type,
        isPlayer: false,
        x: safePos.x,
        y: safePos.y,
        targetX: 330,
        targetY: safePos.y,
        vx: 0,
        vy: 0,
        radius,
        hp: scaledHp,
        maxHp: scaledHp,
        baseSpeed: speed,
        speed: initSpeed,
        damage: scaledDmg,
        range,
        attackCooldown: atkCooldown,
        attackTimer: Math.random() * 0.5,
        targetUnitId: null,
        elevation: 'lowland',
        facing: Math.PI, // Facing West towards player
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
        commanderOrder: initOrder,
      });
    });
  }

  private updateCommanderAI(dt: number) {
    const commander = this.units.find((u) => !u.isPlayer && u.isCommander && !u.isDying);
    if (!commander) {
      this.commanderAlive = false;
      this.commanderOrder = 'RECKLESS_CHARGE';
      this.commanderDefendBraceTimer = 0;
      return;
    }

    this.commanderAlive = true;
    if (this.commanderDefendBraceTimer > 0) {
      this.commanderDefendBraceTimer = Math.max(0, this.commanderDefendBraceTimer - dt);
    }
    if (this.commanderDefendCooldown > 0) {
      this.commanderDefendCooldown = Math.max(0, this.commanderDefendCooldown - dt);
    }
    if (this.commanderRecentVolleyTrigger > 0) {
      this.commanderRecentVolleyTrigger = Math.max(0, this.commanderRecentVolleyTrigger - dt);
    }
    if (commander.commanderSignalTimer && commander.commanderSignalTimer > 0) {
      commander.commanderSignalTimer = Math.max(0, commander.commanderSignalTimer - dt);
    }

    // Periodic Warlord Rally Horn Pulse: heals wounded Red units within 180px Command Aura & cleanses stuns
    this.commanderRallyTimer -= dt;
    if (this.commanderRallyTimer <= 0) {
      const auraR = commander.commanderAuraRadius ?? 180;
      const woundedInAura = this.units.filter(
        (u) =>
          !u.isPlayer &&
          !u.isDying &&
          u.hp < u.maxHp * 0.88 &&
          Math.hypot(u.x - commander.x, u.y - commander.y) <= auraR
      );
      if (woundedInAura.length >= 2) {
        this.triggerCommanderRallyPulse(commander, woundedInAura);
        this.commanderRallyTimer = 9.5;
      } else {
        this.commanderRallyTimer = 2.0;
      }
    }

    this.commanderOrderTimer -= dt;

    const redTroops = this.units.filter((u) => !u.isPlayer && !u.isDying && !u.isCommander);
    const blueTroops = this.units.filter((u) => u.isPlayer && !u.isDying);
    const minRedX = redTroops.length > 0 ? Math.min(...redTroops.map((u) => u.x)) : commander.x;

    let redMeleeCount = 0;
    let redArcherCount = 0;
    let redFlankerCount = 0;
    let flankersInPosition = 0;
    for (const r of redTroops) {
      if (r.type === 'archer') {
        redArcherCount++;
      } else {
        redMeleeCount++;
      }
      const isFlanker = r.type === 'war_hound' || r.y < 235 || r.y > 435;
      if (isFlanker) {
        redFlankerCount++;
        if (r.x <= 540) {
          flankersInPosition++;
        }
      }
    }

    let commanderThreatDist = 9999;
    for (const b of blueTroops) {
      const d = Math.hypot(b.x - commander.x, b.y - commander.y);
      if (d < commanderThreatDist) commanderThreatDist = d;
    }

    const decision = evaluateCommanderTacticalDecision({
      currentOrder: this.commanderOrder,
      orderTimer: this.commanderOrderTimer,
      defendCooldown: this.commanderDefendCooldown,
      minRedX,
      redMeleeCount,
      redArcherCount,
      redFlankerCount,
      blueShieldBraced: this.squads.shield.stance === 'braced',
      blueBarricadesCount: this.barricades.length,
      blueVolleyActive: this.commanderRecentVolleyTrigger > 0,
      blueFireArrowsActive: this.fireArrowsActive,
      blueArmyAttacking: this.armyOrder === 'attack',
      flankersInPosition,
      commanderThreatDist,
    });

    if (decision.shouldSwitch) {
      if (decision.nextOrder === 'TACTICAL_DEFEND') {
        this.commanderHasUsedTacticalDefend = true;
        this.commanderRecentVolleyTrigger = 0;
        this.commanderDefendCooldown = 9.0;
      }
      this.issueCommanderOrder(commander, decision.nextOrder, decision.reason);
    }
  }

  private triggerCommanderRallyPulse(commander: Unit, woundedInAura: Unit[]) {
    soundEngine.playRallyHorn();
    commander.commanderSignalTimer = 1.4;
    this.goldRings.push({
      x: commander.x,
      y: commander.y,
      radius: 16,
      alpha: 0.9,
    });

    for (const u of woundedInAura) {
      const heal = Math.max(8, Math.round(u.maxHp * 0.15));
      u.hp = Math.min(u.maxHp, u.hp + heal);
      u.stunTimer = 0;
      u.burnTimer = 0;
    }

    this.floatingTexts.push({
      id: `cmd_rally_${Date.now()}_${commander.id}`,
      x: commander.x,
      y: commander.y - commander.radius - 26,
      text: `🎺 WARLORD RALLY! (+15% AURA HEAL)`,
      color: '#fde047',
      size: 12,
      vy: -18,
      opacity: 1,
      life: 0,
      maxLife: 1.35,
    });
  }

  private issueCommanderOrder(
    commander: Unit,
    order: EnemyCommanderOrder,
    reason: string = ''
  ) {
    this.commanderOrder = order;
    commander.commanderOrder = order;
    commander.commanderSignalTimer = 1.65;
    this.commanderOrderTimer = order === 'TACTICAL_DEFEND' ? 5.2 : 5.8 + Math.random() * 1.4;

    const cmdName = (commander.commanderName ?? 'Enemy Commander').toUpperCase();
    let orderFloatingText = '🚩 MARCH IN FORMATION!';
    let orderColor = '#facc15';

    if (order === 'TACTICAL_DEFEND') {
      this.commanderDefendBraceTimer = 4.0;
      orderFloatingText =
        reason === 'COUNTER_VOLLEY_BRACE'
          ? '🛡️ COUNTER-VOLLEY BRACE (+35% ARMOR)!'
          : '🛡️ TACTICAL DEFEND (+35% ARMOR)!';
      orderColor = '#38bdf8';
      this.setBanner(
        `🛡️ ${cmdName}: "HOLD & SKIRMISH!" Red melee bracing (+35% Armor) while archers & flanks maneuver!`
      );
    } else if (order === 'COORDINATED_ASSAULT') {
      this.commanderDefendBraceTimer = 0;
      orderFloatingText =
        reason === 'FLANK_TRAP_SPRUNG'
          ? '⚔️ PINCER TRAP SPRUNG (+15% ATK SPD)!'
          : '⚔️ COORDINATED ASSAULT (+15% ATK SPD)!';
      orderColor = '#f87171';
      this.setBanner(
        `⚔️ ${cmdName}: "COORDINATED ASSAULT!" Center & flank wings striking together (+15% Attack Speed)!`
      );
    } else {
      this.commanderDefendBraceTimer = 0;
      this.setBanner(`🚩 ${cmdName}: "MARCH IN FORMATION!" Red horde advancing in synchronized ranks!`);
    }

    this.floatingTexts.push({
      id: `cmd_order_${Date.now()}_${commander.id}`,
      x: commander.x,
      y: commander.y - commander.radius - 20,
      text: orderFloatingText,
      color: orderColor,
      size: 12,
      vy: -16,
      opacity: 1,
      life: 0,
      maxLife: 1.4,
    });

    for (const u of this.units) {
      if (!u.isPlayer && !u.isDying) {
        u.commanderOrder = order;
        if (order !== 'TACTICAL_DEFEND') {
          u.isBraced = false;
        }
      }
    }
  }

  public isUnitInCommanderAura(unit: Unit): boolean {
    if (unit.isPlayer || !this.commanderAlive) return false;
    const commander = this.units.find((u) => !u.isPlayer && u.isCommander && !u.isDying);
    if (!commander) return false;
    const auraR = commander.commanderAuraRadius ?? 180;
    return Math.hypot(unit.x - commander.x, unit.y - commander.y) <= auraR;
  }

  private getRedUnitDamageTakenMultiplier(unit: Unit): number {
    if (unit.isPlayer || !this.commanderAlive) return 1.0;
    let mult = 1.0;
    // +35% damage resistance for 4 seconds on Red melee infantry during TACTICAL_DEFEND
    if (
      this.commanderOrder === 'TACTICAL_DEFEND' &&
      this.commanderDefendBraceTimer > 0 &&
      unit.type !== 'archer'
    ) {
      mult *= 0.65;
    }
    // Red subordinates within the Commander's 180px Command Aura receive an additional 15% damage reduction
    if (!unit.isCommander && this.isUnitInCommanderAura(unit)) {
      mult *= 0.85;
    }
    return mult;
  }

  private updateUnits(dt: number) {
    // Clean up dead units and destroyed barricades
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.isDying) {
        u.deathTimer = (u.deathTimer ?? 0.4) - dt;
        if (u.deathTimer <= 0) {
          this.units.splice(i, 1);
        }
      }
    }

    for (let i = this.barricades.length - 1; i >= 0; i--) {
      if (this.barricades[i].hp <= 0) {
        this.barricades.splice(i, 1);
      }
    }

    // Build O(N) per-frame engagement load map so units distribute across unengaged targets
    this.engagerCounts.clear();
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.isDying) continue;
      const tid = u.engagedWithId ?? u.targetUnitId;
      if (tid) {
        this.engagerCounts.set(tid, (this.engagerCounts.get(tid) ?? 0) + 1);
      }
    }

    for (const u of this.units) {
      if (u.isDying) continue;

      if (u.hitFlashTimer && u.hitFlashTimer > 0) u.hitFlashTimer -= dt;
      if (u.flavorTextCooldown && u.flavorTextCooldown > 0) u.flavorTextCooldown -= dt;

      // Burn status tick from flaming arrows
      if (u.burnTimer && u.burnTimer > 0) {
        const burnRes = calculateBurnTick(u.burnTimer, dt, 14);
        u.burnTimer = burnRes.remainingTimer;
        if (burnRes.damageDealt > 0) {
          this.timeSinceLastCombatDamage = 0;
        }
        u.hp -= burnRes.damageDealt;

        if (Math.random() < 0.25) {
          this.particles.push({
            x: u.x + (Math.random() - 0.5) * 6,
            y: u.y - 3,
            vx: (Math.random() - 0.5) * 12,
            vy: -15 - Math.random() * 15,
            radius: 1.8,
            color: '#f97316',
            alpha: 0.9,
            life: 0,
            maxLife: 0.35,
            type: 'ember',
          });
        }

        if (u.hp <= 0) {
          this.stats.flameKills = (this.stats.flameKills ?? 0) + 1;
          this.killUnit(u, null);
          continue;
        }
      }

      if (u.engagedWithId) {
        const foe = this.units.find((e) => e.id === u.engagedWithId && !e.isDying);
        if (!foe) u.engagedWithId = null;
      }
      if (u.stunTimer && u.stunTimer > 0) {
        u.stunTimer -= dt;
        this.resolveTerrainCollisions(u);
        continue;
      }
      if (u.frenzyTimer && u.frenzyTimer > 0) u.frenzyTimer -= dt;
      if (u.panicTimer && u.panicTimer > 0) {
        u.panicTimer -= dt;
        u.x += u.baseSpeed * 1.3 * dt;
        u.facing = 0;
        this.resolveTerrainCollisions(u);
        continue;
      }

      // Attack timer
      if (u.attackTimer > 0) {
        const frenzyMult = u.frenzyTimer && u.frenzyTimer > 0 ? 1.4 : 1.0;
        const vetPerk = u.isPlayer ? getVeterancyPerks(this.squads[u.type as SquadType].tier) : { attackSpeedMultiplier: 1.0 };
        const cmdAssaultMult =
          !u.isPlayer && this.commanderAlive && this.commanderOrder === 'COORDINATED_ASSAULT'
            ? 1.15
            : 1.0;
        const totalAtkSpeed =
          frenzyMult *
          vetPerk.attackSpeedMultiplier *
          cmdAssaultMult *
          (u.isPlayer && u.type === 'archer' ? this.archerFireRateBonus : 1.0);
        u.attackTimer -= dt * totalAtkSpeed;
      }

      // Tower Pavise Guard passive self-repair (+4 HP/s)
      if (u.isPlayer && u.specialization === 'pavise' && u.hp < u.maxHp) {
        u.hp = Math.min(u.maxHp, u.hp + 4.0 * dt);
      }

      // Archetype specific AI & Movement
      if (u.isPlayer) {
        this.updateAlliedUnit(u, dt);
      } else {
        this.updateEnemyUnit(u, dt);
      }

      // Barricade collision for enemies (Siege Battering Rams crush barricades rapidly!)
      if (!u.isPlayer) {
        for (const b of this.barricades) {
          const col = checkBarricadeCollision(u, b);
          if (col.collides) {
            u.x += col.pushX;
            u.y += col.pushY;
            this.timeSinceLastCombatDamage = 0;
            if (u.type === 'battering_ram') {
              b.hp -= 140 * dt; // Siege Ram demolishes wooden barricades
              u.hp -= 3 * dt;
            } else {
              b.hp -= 24 * dt;
              u.hp -= 14 * dt; // Impaled on spikes
            }
            if (u.hp <= 0) {
              this.killUnit(u, null);
              break;
            }
          }
        }
      }

      // UI Safe-Zone Boundary Clamping
      this.resolveTerrainCollisions(u);
    }

    // Dynamic soft-body separation between units so miniature troops form tight multi-rank blocks
    this.resolveUnitSeparation(dt);
  }

  private engagerCounts: Map<string, number> = new Map();

  /**
   * Moves a unit toward (goalX, goalY) using context-aware 2D steering
   * (sliding laterally around engaged/braced allies, avoiding spike barricades and mud hazards)
   * with smooth velocity interpolation so units turn and flow naturally.
   */
  private steerUnitToward(u: Unit, goalX: number, goalY: number, speed: number, dt: number) {
    const dir = calculateTacticalSteeringVector(u, goalX, goalY, this.units, this.barricades);
    const desiredVx = dir.x * speed;
    const desiredVy = dir.y * speed;
    const blend = Math.min(1, dt * 14);

    u.vx = u.vx + (desiredVx - u.vx) * blend;
    u.vy = u.vy + (desiredVy - u.vy) * blend;
    u.x += u.vx * dt;
    u.y += u.vy * dt;

    if (Math.hypot(u.vx, u.vy) > 3) {
      u.facing = Math.atan2(u.vy, u.vx);
    } else {
      u.facing = Math.atan2(goalY - u.y, goalX - u.x);
    }
  }

  private updateAlliedUnit(u: Unit, dt: number) {
    const enemies = this.units.filter((e) => !e.isPlayer && !e.isDying);

    // 1. Cavalry Path Following, Autonomous Flank Hunting, Momentum & Mud Patch Avoidance
    if (u.type === 'cavalry') {
      const maxMom = u.specialization === 'lancer' ? 3.2 : 2.5;
      if (u.pathWaypoints.length > 0 && !this.isMopUpMode) {
        const targetWp = u.pathWaypoints[u.currentWaypointIdx];
        if (targetWp) {
          const dx = targetWp.x - u.x;
          const dy = targetWp.y - u.y;
          const dist = Math.hypot(dx, dy);

          const inMud = isPointInMudPatch(u.x, u.y);
          u.momentum = Math.min(maxMom, u.momentum + dt * (inMud ? 0.45 : 0.9));
          const currSpeed = calculateCavalrySpeed(u.baseSpeed, u.momentum, inMud, u.specialization);

          if (dist < 18) {
            u.currentWaypointIdx++;
            if (u.currentWaypointIdx >= u.pathWaypoints.length) {
              u.pathWaypoints = [];
            }
          } else {
            this.steerUnitToward(u, targetWp.x, targetWp.y, currSpeed, dt);
          }

          if (Math.random() < 0.3) {
            this.particles.push({
              x: u.x - Math.cos(u.facing) * 6,
              y: u.y - Math.sin(u.facing) * 6,
              vx: -u.vx * 0.15 + (Math.random() - 0.5) * 10,
              vy: -u.vy * 0.15 + (Math.random() - 0.5) * 10,
              radius: 2 + Math.random() * 2,
              color: inMud ? '#785532' : '#d4b996',
              alpha: 0.55,
              life: 0,
              maxLife: 0.35,
              type: 'dust',
            });
          }

          this.checkCavalryCollisions(u);
          return;
        }
      }

      // Whole-Army Defend Order: Cavalry guards home flank position unless enemies come within 220px
      if (this.armyOrder === 'defend' && !this.isMopUpMode && u.pathWaypoints.length === 0) {
        let closestThreatDist = 999999;
        for (const e of enemies) {
          const d = Math.hypot(e.x - u.x, e.y - u.y);
          if (d < closestThreatDist) closestThreatDist = d;
        }
        if (closestThreatDist > 220) {
          const holdX = u.homeX ?? u.targetX;
          const holdY = u.homeY ?? u.targetY;
          const distHome = Math.hypot(holdX - u.x, holdY - u.y);
          if (distHome > 6) {
            this.steerUnitToward(u, holdX, holdY, u.baseSpeed, dt);
          } else {
            u.vx = 0;
            u.vy = 0;
            u.facing = 0;
            u.momentum = 1.0;
          }
          return;
        }
      }

      // Autonomous Cavalry Hunting with load-balanced target scoring & mud/congestion steering
      if (enemies.length > 0) {
        let bestEnemy: Unit | null = null;
        let bestScore = 999999;
        for (const e of enemies) {
          const engagers = this.engagerCounts.get(e.id) ?? 0;
          const score = scoreTargetForUnit(u, e, engagers, false);
          if (score < bestScore) {
            bestScore = score;
            bestEnemy = e;
          }
        }

        if (bestEnemy) {
          u.targetUnitId = bestEnemy.id;
          const dist = Math.hypot(bestEnemy.x - u.x, bestEnemy.y - u.y);
          const inMud = isPointInMudPatch(u.x, u.y);

          if (dist <= u.range + bestEnemy.radius) {
            u.engagedWithId = bestEnemy.id;
            bestEnemy.engagedWithId = u.id;
            u.facing = Math.atan2(bestEnemy.y - u.y, bestEnemy.x - u.x);
            if (u.attackTimer <= 0) {
              this.performMeleeAttack(u, bestEnemy);
              u.attackTimer = u.attackCooldown;
            }
          } else {
            u.momentum = Math.min(maxMom, u.momentum + dt * (inMud ? 0.45 : 0.9));
            const currSpeed = calculateCavalrySpeed(u.baseSpeed, u.momentum, inMud, u.specialization);
            this.steerUnitToward(u, bestEnemy.x, bestEnemy.y, currSpeed, dt);
            this.checkCavalryCollisions(u);
          }
          return;
        }
      }
    }

    // 2. Planted Archers Movement & Firing AI (+30% Planted Range & +20% High Ground Hill Range/Damage)
    if (u.type === 'archer') {
      const onHill = isPointOnHighGroundHill(u.x, u.y);
      u.elevation = onHill ? 'plateau' : 'lowland';

      let nearestEnemy: Unit | undefined;
      let nearestEnemyDist = 999999;
      for (const e of enemies) {
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < nearestEnemyDist) {
          nearestEnemyDist = d;
          nearestEnemy = e;
        }
      }

      const maxRange = calculateArcherRange(u.range, u.isPlanted ?? false, onHill);

      // During Whole-Army Attack or Mop-Up mode, if no enemy is within 85% of firing range, Archers advance into range
      if ((this.armyOrder === 'attack' || this.isMopUpMode) && nearestEnemy && nearestEnemyDist > maxRange * 0.85) {
        u.isPlanted = false;
        this.steerUnitToward(u, nearestEnemy.x, nearestEnemy.y, u.speed * 1.15, dt);
        return;
      }

      const distToSlot = Math.hypot(u.targetX - u.x, u.targetY - u.y);

      if (!this.isMopUpMode && distToSlot > 4) {
        u.isPlanted = false;
        this.steerUnitToward(u, u.targetX, u.targetY, u.speed, dt);
      } else {
        u.vx = 0;
        u.vy = 0;
        u.isPlanted = true;
      }

      if (enemies.length > 0 && u.attackTimer <= 0) {
        const effRange = calculateArcherRange(u.range, u.isPlanted ?? false, onHill);
        const inRangeEnemies: { unit: Unit; dist: number }[] = [];

        for (const e of enemies) {
          const d = Math.hypot(e.x - u.x, e.y - u.y);
          if (d <= effRange) {
            const priorityDist =
              e.isCommander || e.type === 'brute' || e.type === 'battering_ram' ? d * 0.7 : d;
            inRangeEnemies.push({ unit: e, dist: priorityDist });
          }
        }

        if (inRangeEnemies.length > 0) {
          inRangeEnemies.sort((a, b) => a.dist - b.dist);

          const isAlchemist = u.specialization === 'alchemist';
          const isLongbow = u.specialization === 'longbow';
          const salvoCount = isAlchemist
            ? 1
            : isLongbow
            ? (u.isPlanted && ((u.veterancyTier ?? 1) >= 3 || this.squads.archer.tier >= 3) ? 2 : 1)
            : (u.isPlanted || (u.veterancyTier ?? 1) >= 3 || this.squads.archer.tier >= 3)
            ? 3
            : 2;

          const poolSize = Math.min(inRangeEnemies.length, 10);
          const startOffset = Math.floor(Math.abs(u.x + u.y * 3)) % Math.max(1, Math.min(4, poolSize));
          const primaryTarget = inRangeEnemies[startOffset]?.unit ?? inRangeEnemies[0].unit;

          if (!u.engagedWithId) {
            u.engagedWithId = primaryTarget.id;
            this.triggerEngagementFlavorText(u);
          }
          u.facing = Math.atan2(primaryTarget.y - u.y, primaryTarget.x - u.x);

          for (let s = 0; s < salvoCount; s++) {
            const targetIdx = (startOffset + s * 2) % inRangeEnemies.length;
            const chosenTarget = inRangeEnemies[targetIdx].unit;
            const spreadOffset =
              inRangeEnemies.length === 1 && s > 0 ? (s === 1 ? -10 : 10) : 0;
            this.shootArrow(u, chosenTarget, u.isPlanted ?? false, spreadOffset);
          }

          u.attackTimer = u.attackCooldown;
        }
      }
      return;
    }

    // 3. Melee (Shields): Load-balanced target selection & lateral wrap-around steering
    let nearestDist = 99999;
    let bestScore = 99999;
    let targetEnemy: Unit | null = null;

    for (const e of enemies) {
      const dist = Math.hypot(e.x - u.x, e.y - u.y);
      const engagers = this.engagerCounts.get(e.id) ?? 0;
      const score = scoreTargetForUnit(u, e, engagers, false);
      if (score < bestScore) {
        bestScore = score;
        nearestDist = dist;
        targetEnemy = e;
      }
    }

    if (targetEnemy) {
      u.targetUnitId = targetEnemy.id;
    }

    if (targetEnemy && nearestDist <= u.range + targetEnemy.radius) {
      if (!u.engagedWithId) {
        this.triggerEngagementFlavorText(u);
      }
      u.engagedWithId = targetEnemy.id;
      targetEnemy.engagedWithId = u.id;
      u.vx = 0;
      u.vy = 0;
      u.facing = Math.atan2(targetEnemy.y - u.y, targetEnemy.x - u.x);

      if (u.attackTimer <= 0) {
        this.performMeleeAttack(u, targetEnemy);
        u.attackTimer = u.attackCooldown;
      }

      if (u.type === 'shield' && u.isBraced && (targetEnemy.type === 'swordsman' || targetEnemy.type === 'spearman')) {
        targetEnemy.x = Math.min(UI_SAFE_ZONE.maxX - targetEnemy.radius, targetEnemy.x + 14 * dt);
      }
      return;
    }

    // Engage enemies during Whole-Army Attack, Mop-Up mode, offensive stance, or close proximity
    const isIdleOnHillFlank = (u.y < 225 || u.y > 440) && targetEnemy !== null && targetEnemy.x <= 850;
    const shouldPursueEnemy =
      targetEnemy !== null &&
      (this.armyOrder === 'attack' ||
        this.isMopUpMode ||
        !u.isBraced ||
        nearestDist <= (this.armyOrder === 'defend' ? 75 : 135) ||
        isIdleOnHillFlank);

    if (shouldPursueEnemy && targetEnemy) {
      const chaseSpeed = this.armyOrder === 'attack' || this.isMopUpMode ? u.baseSpeed * 1.3 : u.speed;
      this.steerUnitToward(u, targetEnemy.x, targetEnemy.y, chaseSpeed, dt);
    } else {
      const dist = Math.hypot(u.targetX - u.x, u.targetY - u.y);
      if (dist > 3.5) {
        this.steerUnitToward(u, u.targetX, u.targetY, u.speed, dt);
      } else {
        u.vx = 0;
        u.vy = 0;
        if (u.type === 'shield') u.facing = 0;
      }
    }
  }

  private updateEnemyUnit(u: Unit, dt: number) {
    const allies = this.units.filter((a) => a.isPlayer && !a.isDying);
    if (allies.length === 0) return;

    const activeOrder: EnemyCommanderOrder = this.commanderAlive
      ? this.commanderOrder
      : 'RECKLESS_CHARGE';
    u.commanderOrder = activeOrder;
    const isReckless = activeOrder === 'RECKLESS_CHARGE';

    const livingCommander = this.commanderAlive
      ? this.units.find((c) => !c.isPlayer && c.isCommander && !c.isDying) ?? null
      : null;
    const commanderPos = livingCommander ? { x: livingCommander.x, y: livingCommander.y } : null;

    // Red Brute (non-commander) telegraphed cleave smash
    if (u.type === 'brute' && !u.isCommander) {
      if (u.isCleaving && u.cleaveWindupTimer !== undefined) {
        u.cleaveWindupTimer -= dt;
        if (u.cleaveWindupTimer <= 0) {
          this.executeBruteCleave(u);
          u.isCleaving = false;
          u.attackTimer = u.attackCooldown;
        }
        return;
      }
    }

    // Find target Blue unit with multi-factor load balancing, lane matching & Royal Bodyguard peel
    let nearestDist = 99999;
    let bestScore = 99999;
    let target: Unit | null = null;
    for (const a of allies) {
      const dist = Math.hypot(a.x - u.x, a.y - u.y);
      const engagers = this.engagerCounts.get(a.id) ?? 0;
      const score = scoreTargetForUnit(u, a, engagers, isReckless, activeOrder, commanderPos);
      if (score < bestScore) {
        bestScore = score;
        nearestDist = dist;
        target = a;
      }
    }

    if (!target) return;
    u.targetUnitId = target.id;

    // 1. Living Enemy Wave Commander positioning, aura tracking & Royal Warblade combat
    if (u.isCommander) {
      const distToThreat = Math.hypot(target.x - u.x, target.y - u.y);
      const redSubordinates = this.units.filter(
        (e) => !e.isPlayer && !e.isDying && !e.isCommander
      );

      if (distToThreat <= u.range + target.radius) {
        u.engagedWithId = target.id;
        u.vx = 0;
        u.vy = 0;
        u.facing = Math.atan2(target.y - u.y, target.x - u.x);
        if (u.attackTimer <= 0) {
          this.commanderStrikeCount++;
          const nearbyBlues = allies.filter((a) => Math.hypot(a.x - u.x, a.y - u.y) <= 46);
          if (this.commanderStrikeCount % 3 === 0 || nearbyBlues.length >= 2) {
            this.executeCommanderRoyalCleave(u);
          } else {
            this.performMeleeAttack(u, target);
          }
          u.attackTimer = u.attackCooldown;
        }
        return;
      }

      // If wounded (<40% HP) while subordinates still stand, kite slightly back behind Royal Bodyguards
      const isLowHpWithGuards = u.hp < u.maxHp * 0.4 && redSubordinates.length >= 4;
      if (distToThreat <= 110 && !isLowHpWithGuards) {
        this.steerUnitToward(u, target.x, target.y, u.baseSpeed, dt);
        return;
      }

      // Dynamically position Command Post behind the active center-of-mass of the Red army so the 180px aura covers key troops
      const minRedX =
        redSubordinates.length > 0 ? Math.min(...redSubordinates.map((e) => e.x)) : 780;
      const avgRedY =
        redSubordinates.length > 0
          ? redSubordinates.reduce((sum, e) => sum + e.y, 0) / redSubordinates.length
          : 335;
      const rearOffset = isLowHpWithGuards
        ? 135
        : activeOrder === 'TACTICAL_DEFEND'
        ? 105
        : activeOrder === 'COORDINATED_ASSAULT'
        ? 72
        : 92;
      const desiredX =
        redSubordinates.length > 0
          ? Math.min(925, Math.max(475, minRedX + rearOffset))
          : target.x + 35;
      const desiredY = Math.min(445, Math.max(225, avgRedY * 0.65 + 335 * 0.35));
      const distToPost = Math.hypot(desiredX - u.x, desiredY - u.y);
      if (distToPost > 5) {
        this.steerUnitToward(u, desiredX, desiredY, u.baseSpeed * 0.9, dt);
      } else {
        u.vx = 0;
        u.vy = 0;
      }
      u.facing = Math.PI;
      return;
    }

    // 2. Determine speed and tactical movement under current Commander Order
    const inAura =
      livingCommander !== null &&
      Math.hypot(u.x - livingCommander.x, u.y - livingCommander.y) <=
        (livingCommander.commanderAuraRadius ?? 180);
    const auraSpeedMult = inAura ? 1.06 : 1.0;

    if (activeOrder === 'RECKLESS_CHARGE') {
      // Commander slain: +20% sprint speed reckless all-out charge!
      u.isBraced = false;
      u.speed = Math.round(u.baseSpeed * 1.2);
    } else if (activeOrder === 'MARCH_IN_FORMATION') {
      // Synchronized formation pace so fast units do not outrun the main line
      u.isBraced = false;
      const redInfantry = this.units.filter(
        (e) => !e.isPlayer && !e.isDying && (e.type === 'swordsman' || e.type === 'spearman')
      );
      const frontLineX =
        redInfantry.length > 0 ? Math.min(...redInfantry.map((e) => e.x)) : u.x;
      if (u.x < frontLineX + 18 && u.baseSpeed > 42 && nearestDist > 165) {
        u.speed = 36;
      } else {
        u.speed = Math.min(u.baseSpeed, Math.round(39 * auraSpeedMult));
      }
    } else if (activeOrder === 'COORDINATED_ASSAULT') {
      u.isBraced = false;
      u.speed = Math.round(u.baseSpeed * 1.08 * auraSpeedMult);
    } else if (activeOrder === 'TACTICAL_DEFEND') {
      if (u.type === 'archer') {
        u.isBraced = false;
        u.speed = Math.round(u.baseSpeed * 1.12 * auraSpeedMult);
      } else {
        const isFlanker = u.type === 'war_hound' || u.y < 255 || u.y > 415;
        if (isFlanker && nearestDist > 105) {
          u.isBraced = false;
          u.speed = Math.round(u.baseSpeed * auraSpeedMult);
          const hillFlankY = u.y < 335 ? 132 : 500;
          const hillFlankX = Math.max(420, u.x - 85);
          this.steerUnitToward(u, hillFlankX, hillFlankY, u.speed, dt);
          return;
        } else if (nearestDist > 82 && u.x <= 685) {
          // Center melee infantry halts and braces in defensive wall
          u.isBraced = true;
          u.vx = 0;
          u.vy = 0;
          u.facing = Math.PI;
          return;
        } else {
          u.isBraced = false;
          u.speed = u.baseSpeed * 0.92;
        }
      }
    }

    // 3. Enemy Archer AI (steps toward High Ground hills during TACTICAL_DEFEND if nearby)
    if (u.type === 'archer') {
      const onHill = isPointOnHighGroundHill(u.x, u.y);
      const baseEffRange = calculateArcherRange(u.range, false, onHill);
      const effRange = activeOrder === 'RECKLESS_CHARGE' ? baseEffRange * 0.78 : baseEffRange;
      if (nearestDist <= effRange) {
        u.vx = 0;
        u.vy = 0;
        u.facing = Math.atan2(target.y - u.y, target.x - u.x);
        if (u.attackTimer <= 0) {
          this.shootArrow(u, target, false);
          u.attackTimer =
            activeOrder === 'TACTICAL_DEFEND' ? u.attackCooldown * 0.88 : u.attackCooldown;
        }
      } else if (activeOrder === 'TACTICAL_DEFEND' && !onHill && u.x >= 520 && u.x <= 720) {
        // Step toward nearest North/South High Ground vantage point to gain +20% range
        const hillY = u.y < 335 ? 175 : 495;
        const hillX = Math.min(target.x + effRange * 0.92, 575);
        this.steerUnitToward(u, hillX, hillY, u.speed, dt);
      } else {
        this.steerUnitToward(u, target.x, target.y, u.speed, dt);
      }
      return;
    }

    // 4. Melee enemies steer toward target Blue unit (wrapping around engaged front ranks)
    const dist = Math.hypot(target.x - u.x, target.y - u.y);
    if (dist <= u.range + target.radius) {
      u.engagedWithId = target.id;
      u.vx = 0;
      u.vy = 0;
      u.facing = Math.atan2(target.y - u.y, target.x - u.x);

      if (u.type === 'brute' && !u.isCommander) {
        if (u.attackTimer <= 0 && !u.isCleaving) {
          u.isCleaving = true;
          u.cleaveWindupTimer = 0.65;
          soundEngine.playBruteRoar();
        }
      } else if (u.attackTimer <= 0) {
        this.performMeleeAttack(u, target);
        u.attackTimer = u.attackCooldown;
      }
    } else {
      this.steerUnitToward(u, target.x, target.y, u.speed, dt);
    }
  }

  private executeCommanderRoyalCleave(commander: Unit) {
    soundEngine.playShockCharge();
    this.triggerShake(4.8, 0.25);
    this.timeSinceLastCombatDamage = 0;
    this.goldRings.push({
      x: commander.x,
      y: commander.y,
      radius: 14,
      alpha: 0.95,
    });

    const cleaveDmg = Math.round(commander.damage * 1.25);
    const allies = this.units.filter((u) => u.isPlayer && !u.isDying);
    for (const ally of allies) {
      const dist = Math.hypot(ally.x - commander.x, ally.y - commander.y);
      if (dist <= 48) {
        ally.hp -= cleaveDmg;
        ally.hitFlashTimer = 0.16;
        ally.x = Math.max(MIN_FORMATION_X, ally.x - 20);
        ally.vx = -34;

        this.floatingTexts.push({
          id: `cmd_cleave_${Date.now()}_${ally.id}`,
          x: ally.x,
          y: ally.y - 12,
          text: `👑 -${cleaveDmg} WARLORD CLEAVE!`,
          color: '#facc15',
          size: 12,
          vy: -24,
          opacity: 1,
          life: 0,
          maxLife: 0.95,
        });

        if (ally.hp <= 0) {
          this.killUnit(ally, commander);
        }
      }
    }
  }

  private executeBruteCleave(brute: Unit) {
    soundEngine.playShockCharge();
    this.triggerShake(5.5, 0.3);
    this.addGroundDecal({
      x: brute.x - 10,
      y: brute.y + 3,
      radius: 14,
      rotation: Math.random() * Math.PI,
      type: 'crater',
      alpha: 0.55,
    });
    this.timeSinceLastCombatDamage = 0;
    this.setBanner('💥 RED BRUTE CLEAVE SMASH! Frontline knocked backward!');

    const allies = this.units.filter((u) => u.isPlayer && !u.isDying);
    for (const ally of allies) {
      const dist = Math.hypot(ally.x - brute.x, ally.y - brute.y);
      if (dist < 48) {
        ally.hp -= brute.damage;
        ally.hitFlashTimer = 0.15;
        ally.x = Math.max(MIN_FORMATION_X, ally.x - 25);
        ally.vx = -40;

        this.floatingTexts.push({
          id: `cleave_${Date.now()}_${ally.id}`,
          x: ally.x,
          y: ally.y - 10,
          text: `-${brute.damage} CLEAVE!`,
          color: '#ef4444',
          size: 13,
          vy: -28,
          opacity: 1,
          life: 0,
          maxLife: 1.0,
        });

        if (ally.hp <= 0) {
          this.killUnit(ally, brute);
        }
      }
    }
  }

  private performMeleeAttack(attacker: Unit, target: Unit) {
    soundEngine.playSwordClash();
    this.timeSinceLastCombatDamage = 0;
    let dmg = attacker.damage;

    if (attacker.isPlayer) {
      const sq = this.squads[attacker.type as SquadType];
      dmg = Math.round(dmg * getVeterancyPerks(sq.tier).damageMultiplier);

      // Phalanx Halberdiers deal 2.0x bonus damage against Red Brutes and Siege Battering Rams
      if (
        attacker.specialization === 'halberdier' &&
        (target.type === 'brute' || target.type === 'battering_ram')
      ) {
        dmg = Math.round(dmg * 2.0);
      }
    } else if (attacker.type === 'battering_ram') {
      // Siege Battering Ram shatters Braced shield stances and stuns frontline defenders!
      if (target.isBraced) {
        target.isBraced = false;
        target.stunTimer = 0.9;
        target.x = Math.max(MIN_FORMATION_X, target.x - 18);
        soundEngine.playWoodCrunch();
        this.triggerShake(4.2, 0.24);
        this.floatingTexts.push({
          id: `ram_shatter_${Date.now()}_${target.id}`,
          x: target.x,
          y: target.y - 12,
          text: `GUARD SHATTERED!`,
          color: '#fb923c',
          size: 11,
          vy: -22,
          opacity: 1,
          life: 0,
          maxLife: 0.9,
        });
      }
    }

    // Red units inside the living Commander's 180px Command Aura deal +15% melee damage
    if (!attacker.isPlayer && !attacker.isCommander && this.isUnitInCommanderAura(attacker)) {
      dmg = Math.round(dmg * 1.15);
    }

    if (!target.isPlayer) {
      dmg = Math.max(1, Math.round(dmg * this.getRedUnitDamageTakenMultiplier(target)));
    }

    target.hp -= dmg;
    target.hitFlashTimer = 0.12;

    if (Math.random() < 0.45) {
      this.floatingTexts.push({
        id: `melee_${Date.now()}_${target.id}_${Math.random()}`,
        x: target.x,
        y: target.y - 8,
        text: `-${dmg}`,
        color: target.isPlayer ? '#f87171' : '#fde047',
        size: 11,
        vy: -18,
        opacity: 1,
        life: 0,
        maxLife: 0.7,
      });
    }

    if (target.hp <= 0) {
      this.killUnit(target, attacker);
    }
  }

  public triggerEngagementFlavorText(unit: Unit) {
    if (!unit.isPlayer || (unit.flavorTextCooldown ?? 0) > 0) return;
    if (Math.random() > 0.25) {
      unit.flavorTextCooldown = 6.0;
      return;
    }

    const phrases: Record<string, string[]> = {
      shield: ['Hold the line!', 'Shields up!', 'For the Alliance!', 'Stand firm!', 'Brace!'],
      archer: ['Planted aim!', 'Draw and loose!', 'Volley ready!', 'Pinpoint shot!'],
      cavalry: ['Charge!', 'Break their ranks!', 'For the King!', 'Ride them down!'],
    };

    const list = phrases[unit.type] || ['For the Alliance!'];
    const phrase = list[Math.floor(Math.random() * list.length)];

    this.floatingTexts.push({
      id: `battlecry_${Date.now()}_${unit.id}`,
      x: unit.x,
      y: unit.y - 12,
      text: phrase,
      color: '#38bdf8',
      size: 11,
      vy: -18,
      opacity: 1,
      life: 0,
      maxLife: 1.0,
    });

    unit.flavorTextCooldown = 8.0;
  }

  private checkCavalryCollisions(cavalry: Unit) {
    const enemies = this.units.filter((e) => !e.isPlayer && !e.isDying);
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - cavalry.x, enemy.y - cavalry.y);
      if (dist < cavalry.radius + enemy.radius + 4) {
        if (!cavalry.engagedWithId) {
          cavalry.engagedWithId = enemy.id;
          this.triggerEngagementFlavorText(cavalry);
        }
        soundEngine.playShockCharge();

        const isLockedWithShields = enemy.engagedWithId !== null && enemy.engagedWithId !== undefined;
        const cavVetMult = getVeterancyPerks(this.squads.cavalry.tier).damageMultiplier;
        const specMult = cavalry.specialization === 'lancer' ? 1.25 : 1.0;
        const chargeResult = calculateCavalryChargeDamage(
          Math.round(cavalry.damage * cavVetMult * specMult),
          cavalry.momentum,
          isLockedWithShields
        );

        const finalDmg = Math.max(
          1,
          Math.round(
            chargeResult.damage *
              this.cavalryKnockbackBonus *
              this.getRedUnitDamageTakenMultiplier(enemy)
          )
        );

        if (chargeResult.isFlankCrit) {
          this.stats.flankingCrits++;
          this.triggerShake(4.5, 0.26);
          const critLabel = cavalry.specialization === 'lancer' ? '6.0x LANCER CRIT!' : '5.0x CRIT!';
          this.setBanner(`⚡ SHOCK CHARGE! ${critLabel}`);
          this.floatingTexts.push({
            id: `crit_${Date.now()}_${enemy.id}`,
            x: enemy.x,
            y: enemy.y - 14,
            text: `${critLabel} -${finalDmg}`,
            color: '#f59e0b',
            size: 14,
            vy: -30,
            opacity: 1,
            life: 0,
            maxLife: 1.2,
          });
        } else {
          this.floatingTexts.push({
            id: `charge_${Date.now()}_${enemy.id}`,
            x: enemy.x,
            y: enemy.y - 12,
            text: `SHOCK -${finalDmg}`,
            color: '#fbbf24',
            size: 12,
            vy: -24,
            opacity: 1,
            life: 0,
            maxLife: 1.0,
          });
        }

        enemy.hp -= finalDmg;
        this.timeSinceLastCombatDamage = 0;
        enemy.hitFlashTimer = 0.2;
        enemy.stunTimer = 1.5;

        const knockDist = 22 * this.cavalryKnockbackBonus;
        const clampedKnock = clampToSafeZone(
          enemy.x + Math.cos(cavalry.facing) * knockDist,
          enemy.y + Math.sin(cavalry.facing) * (knockDist * 0.4),
          enemy.radius
        );
        enemy.x = clampedKnock.x;
        enemy.y = clampedKnock.y;

        for (let p = 0; p < 6; p++) {
          const angle = (p / 6) * Math.PI * 2;
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * (35 + Math.random() * 25),
            vy: Math.sin(angle) * (35 + Math.random() * 25),
            radius: 2.5 + Math.random() * 2,
            color: '#d4b996',
            alpha: 0.75,
            life: 0,
            maxLife: 0.4,
            type: 'dust',
          });
        }

        if (enemy.hp <= 0) {
          this.killUnit(enemy, cavalry);
        }
      }
    }
  }

  private shootArrow(
    shooter: Unit,
    target: Unit,
    isPlanted: boolean = false,
    spreadOffsetY: number = 0
  ) {
    soundEngine.playBowShot();

    const onHill = isPointOnHighGroundHill(shooter.x, shooter.y);
    const peakHeight = onHill ? 65 : isPlanted ? 55 : 40;
    const isLongbow = shooter.specialization === 'longbow';
    const isAlchemist = shooter.specialization === 'alchemist';
    const arrowSpeed = isLongbow ? 640 : 520;
    const squadVetMult = shooter.isPlayer
      ? getVeterancyPerks(this.squads.archer.tier).damageMultiplier
      : this.isUnitInCommanderAura(shooter)
      ? 1.15
      : 1.0;
    const effDamage = calculateArcherDamage(Math.round(shooter.damage * squadVetMult), onHill);

    const aim = calculatePredictiveAimPoint(
      shooter,
      target,
      arrowSpeed,
      isPlanted,
      isPlanted ? 0 : Math.random()
    );

    this.projectiles.push({
      id: `arrow_${Date.now()}_${Math.random()}`,
      shooterId: shooter.id,
      x: shooter.x,
      y: shooter.y,
      startX: shooter.x,
      startY: shooter.y,
      targetX: aim.x,
      targetY: aim.y + spreadOffsetY,
      speed: arrowSpeed,
      progress: 0,
      peakHeight,
      currentHeight: 0,
      damage: effDamage,
      isPlayer: shooter.isPlayer,
      fromElevation: onHill ? 'plateau' : 'lowland',
      isFlaming: shooter.isPlayer && this.fireArrowsActive,
      isExplosive: isAlchemist,
      isPiercing: isLongbow,
    });
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.targetX - p.startX;
      const dy = p.targetY - p.startY;
      const totalDist = Math.hypot(dx, dy);

      p.progress += (p.speed * dt) / Math.max(1, totalDist);
      p.currentHeight = calculateParabolicHeight(p.progress, p.peakHeight);

      p.x = p.startX + dx * p.progress;
      p.y = p.startY + dy * p.progress;

      // Continuous trail particles for Flame Arrows or Alchemist Green-Glowing Flasks in flight
      if ((p.isFlaming || p.isExplosive) && Math.random() < 0.78) {
        const isGreenFlask = p.isExplosive && !p.isFlaming;
        this.particles.push({
          x: p.x + (Math.random() - 0.5) * 3,
          y: p.y - p.currentHeight + (Math.random() - 0.5) * 3,
          vx: -dx * 0.04 + (Math.random() - 0.5) * 12,
          vy: -dy * 0.04 - 8 + (Math.random() - 0.5) * 12,
          radius: p.isExplosive ? 2.4 : 1.8 + Math.random() * 1.2,
          color: isGreenFlask
            ? Math.random() < 0.5
              ? '#4ade80'
              : '#a3e635'
            : p.isExplosive
            ? Math.random() < 0.4
              ? '#4ade80'
              : '#fb923c'
            : Math.random() < 0.5
            ? '#f97316'
            : '#fde047',
          alpha: 0.9,
          life: 0,
          maxLife: 0.25,
          type: 'ember',
        });
      }

      if (p.progress >= 1.0) {
        this.resolveArrowImpact(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveArrowImpact(p: Projectile) {
    // Arrow hit detection radius (minD) reduced from 38px to 18px to match the 50% micro-unit scale
    const targets = this.units.filter((u) => u.isPlayer !== p.isPlayer && !u.isDying);
    let hitUnit: Unit | null = null;
    let minD = 18;

    for (const u of targets) {
      const d = Math.hypot(u.x - p.x, u.y - p.y);
      if (d < minD) {
        minD = d;
        hitUnit = u;
      }
    }

    const shooter = p.shooterId
      ? this.units.find((u) => u.id === p.shooterId && !u.isDying) ?? null
      : null;

    // Alchemist Crossbows: Controlled Shrapnel Splash (hits up to 3–4 nearby enemies with balanced splash damage)
    if (p.isExplosive && p.isPlayer) {
      this.timeSinceLastCombatDamage = 0;
      const isNapalm = Boolean(p.isFlaming);
      const splashMult = isNapalm ? 0.42 : 0.32;
      const blastRadius = isNapalm ? 32 : 24;
      const burnDur = isNapalm ? 2.8 : 1.6;
      const maxSplashTargets = isNapalm ? 4 : 3;

      this.triggerShake(isNapalm ? 2.2 : 1.6, 0.14);
      this.addGroundDecal({
        x: p.x,
        y: p.y,
        radius: isNapalm ? 11 : 8,
        rotation: Math.random() * Math.PI,
        type: 'scorch',
        alpha: isNapalm ? 0.48 : 0.38,
      });
      const baseSplashDmg = Math.max(1, Math.round(p.damage * splashMult));
      const particleCount = isNapalm ? 8 : 6;
      for (let k = 0; k < particleCount; k++) {
        const ang = (k / particleCount) * Math.PI * 2;
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * (isNapalm ? 48 : 38),
          vy: Math.sin(ang) * (isNapalm ? 48 : 38),
          radius: isNapalm ? 2.6 : 2.3,
          color: isNapalm
            ? k % 2 === 0
              ? '#4ade80'
              : '#f97316'
            : k % 2 === 0
            ? '#4ade80'
            : '#a3e635',
          alpha: 0.92,
          life: 0,
          maxLife: isNapalm ? 0.32 : 0.26,
          type: 'ember',
        });
      }

      const splashTargets = targets
        .filter((u) => u !== hitUnit && Math.hypot(u.x - p.x, u.y - p.y) <= blastRadius)
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
        .slice(0, maxSplashTargets);

      for (const u of splashTargets) {
        const isHeavy = u.type === 'brute' || u.type === 'battering_ram';
        const effSplash = isHeavy ? Math.max(1, Math.round(baseSplashDmg * 0.6)) : baseSplashDmg;
        u.hp -= effSplash;
        u.burnTimer = Math.max(u.burnTimer ?? 0, burnDur);
        u.hitFlashTimer = 0.1;
        if (u.hp <= 0) {
          this.killUnit(u, shooter);
        }
      }
    }

    if (hitUnit) {
      this.timeSinceLastCombatDamage = 0;
      if (hitUnit.isPlayer && hitUnit.type === 'shield') {
        const blockRes = calculateShieldArrowDamage(
          p.damage,
          hitUnit.isBraced ?? false,
          hitUnit.specialization
        );
        hitUnit.hp -= blockRes.damage;

        if (blockRes.deflected) {
          soundEngine.playShieldBlock();
          this.stats.arrowsDeflected++;

          for (let s = 0; s < 5; s++) {
            this.particles.push({
              x: hitUnit.x + 3,
              y: hitUnit.y,
              vx: 30 + Math.random() * 45,
              vy: (Math.random() - 0.5) * 60,
              radius: 1.8,
              color: '#ffffff',
              alpha: 1.0,
              life: 0,
              maxLife: 0.22,
              type: 'spark',
            });
          }

          if (Math.random() < 0.4) {
            const pctText = hitUnit.specialization === 'pavise' ? 'PAVISE -90%' : 'BRACED -75%';
            this.floatingTexts.push({
              id: `deflect_${Date.now()}_${hitUnit.id}_${Math.random()}`,
              x: hitUnit.x,
              y: hitUnit.y - 8,
              text: pctText,
              color: '#93c5fd',
              size: 10,
              vy: -16,
              opacity: 1,
              life: 0,
              maxLife: 0.7,
            });
          }
        } else {
          soundEngine.playSwordClash();
        }
      } else {
        let directDmg = p.damage;
        const isHeavyBossOrRam = hitUnit.type === 'brute' || hitUnit.type === 'battering_ram';

        if (p.isPiercing && p.isPlayer) {
          // Longbow Snipers: 2.0x Giant-Slayer bonus vs Brute & Siege Ram + +25% Searing Bodkin bonus when Flame Arrows [F] is ON
          if (isHeavyBossOrRam) {
            directDmg = Math.round(directDmg * 2.0);
          }
          if (p.isFlaming) {
            directDmg = Math.round(directDmg * 1.25);
          }
        } else if (p.isExplosive && p.isPlayer && isHeavyBossOrRam) {
          // Alchemist Crossbows Con: -35% reduced direct damage against heavily armored Brutes & Siege Rams
          directDmg = Math.max(1, Math.round(directDmg * 0.65));
        }

        if (!hitUnit.isPlayer) {
          directDmg = Math.max(
            1,
            Math.round(directDmg * this.getRedUnitDamageTakenMultiplier(hitUnit))
          );
        }

        hitUnit.hp -= directDmg;
        if (p.isFlaming && !hitUnit.isPlayer) {
          hitUnit.burnTimer = Math.max(hitUnit.burnTimer ?? 0, p.isPiercing ? 3.5 : 3.0);
        }

        // Multi-unit penetration / splinter cleave for Player Arrows:
        if (p.isPlayer && !p.isExplosive) {
          if (p.isPiercing) {
            // Longbow Snipers Directional Line-Penetration:
            // Impales up to 2 additional enemies lined up behind the primary target along the arrow's flight vector (85% and 70% damage)
            const rayDx = p.targetX - p.startX;
            const rayDy = p.targetY - p.startY;
            const rayLen = Math.max(1, Math.hypot(rayDx, rayDy));
            const dirX = rayDx / rayLen;
            const dirY = rayDy / rayLen;

            const pierceCandidates = targets
              .filter((u) => {
                if (u === hitUnit) return false;
                const relX = u.x - hitUnit.x;
                const relY = u.y - hitUnit.y;
                const forwardProj = relX * dirX + relY * dirY;
                const lateralDist = Math.abs(relX * -dirY + relY * dirX);
                return forwardProj >= -6 && forwardProj <= 56 && lateralDist <= 18;
              })
              .sort((a, b) => {
                const da = (a.x - hitUnit.x) * dirX + (a.y - hitUnit.y) * dirY;
                const db = (b.x - hitUnit.x) * dirX + (b.y - hitUnit.y) * dirY;
                return da - db;
              })
              .slice(0, 2);

            pierceCandidates.forEach((secondary, idx) => {
              const mult = idx === 0 ? 0.85 : 0.7;
              const pierceDmg = Math.max(1, Math.round(directDmg * mult));
              secondary.hp -= pierceDmg;
              secondary.hitFlashTimer = 0.12;
              if (p.isFlaming) {
                secondary.burnTimer = Math.max(secondary.burnTimer ?? 0, 3.5);
              }
              this.particles.push({
                x: secondary.x,
                y: secondary.y,
                vx: dirX * 45,
                vy: dirY * 45,
                radius: 2.0,
                color: '#fef08a',
                alpha: 0.95,
                life: 0,
                maxLife: 0.22,
                type: 'spark',
              });
              if (secondary.hp <= 0) {
                this.killUnit(secondary, shooter);
              }
            });
          } else {
            // Standard Bodkin / Volley Arrows: Splinter cleave hits up to 2 nearby enemies within 24px (65% damage)
            const cleaveRadius = p.isVolley || p.isFlaming ? 28 : 22;
            const maxExtraHits = p.isVolley ? 3 : 2;
            let extraHits = 0;
            for (const u of targets) {
              if (u === hitUnit) continue;
              if (Math.hypot(u.x - hitUnit.x, u.y - hitUnit.y) <= cleaveRadius) {
                const splinterDmg = Math.max(1, Math.round(directDmg * 0.65));
                u.hp -= splinterDmg;
                u.hitFlashTimer = 0.1;
                if (p.isFlaming) {
                  u.burnTimer = Math.max(u.burnTimer ?? 0, 2.8);
                }
                if (u.hp <= 0) {
                  this.killUnit(u, shooter);
                }
                extraHits++;
                if (extraHits >= maxExtraHits) break;
              }
            }
          }
        }

        soundEngine.playSwordClash();
        if (Math.random() < 0.5) {
          const hitLabel = p.isExplosive
            ? `💥 -${directDmg}`
            : p.isPiercing && isHeavyBossOrRam
            ? `🎯 CRIT -${directDmg}`
            : `-${directDmg}`;
          this.floatingTexts.push({
            id: `arrow_hit_${Date.now()}_${hitUnit.id}_${Math.random()}`,
            x: hitUnit.x,
            y: hitUnit.y - 8,
            text: hitLabel,
            color: hitUnit.isPlayer ? '#f87171' : '#fde047',
            size: 11,
            vy: -18,
            opacity: 1,
            life: 0,
            maxLife: 0.7,
          });
        }
      }

      hitUnit.hitFlashTimer = 0.12;
      if (hitUnit.hp <= 0) {
        if (p.isPlayer && !shooter) {
          this.stats.archerKills = (this.stats.archerKills ?? 0) + 1;
          this.squads.archer.kills = (this.squads.archer.kills ?? 0) + 1;
        }
        this.killUnit(hitUnit, shooter);
      }
    }
  }

  private killUnit(unit: Unit, killer: Unit | null) {
    if (unit.isDying) return;
    unit.isDying = true;
    unit.deathTimer = 0.4;

    if (Math.random() < 0.35 || unit.type === 'brute' || unit.type === 'battering_ram') {
      this.addGroundDecal({
        x: unit.x,
        y: unit.y + 2,
        radius: unit.type === 'brute' || unit.type === 'battering_ram' ? 11 : 5,
        rotation: (Math.random() - 0.5) * 1.4,
        type: (unit.burnTimer ?? 0) > 0 ? 'scorch' : 'fallen_gear',
        isBlue: unit.isPlayer,
        alpha: 0.5,
      });
    }

    if (!unit.isPlayer) {
      this.stats.enemiesDefeated++;

      let xpEarned = 4;
      if (unit.isCommander) {
        xpEarned = 35;
        this.commanderAlive = false;
        this.commanderOrder = 'RECKLESS_CHARGE';
        this.commanderDefendBraceTimer = 0;
        this.timeSinceLastCombatDamage = 0;
        soundEngine.playRallyHorn();
        soundEngine.playShockCharge();
        this.triggerShake(7.0, 0.38);

        // Dramatic golden/crimson shockwave rings at Commander's death position
        this.goldRings.push({ x: unit.x, y: unit.y, radius: 14, alpha: 1.0 });
        this.goldRings.push({ x: unit.x, y: unit.y, radius: 36, alpha: 0.85 });

        for (let k = 0; k < 18; k++) {
          const ang = (k / 18) * Math.PI * 2;
          this.particles.push({
            x: unit.x,
            y: unit.y,
            vx: Math.cos(ang) * (55 + Math.random() * 40),
            vy: Math.sin(ang) * (55 + Math.random() * 40),
            radius: 3.2,
            color: k % 2 === 0 ? '#facc15' : '#ef4444',
            alpha: 1.0,
            life: 0,
            maxLife: 0.55,
            type: 'spark',
          });
        }

        // Immediately cancel all TACTICAL_DEFEND / holding states and force every surviving Red unit into RECKLESS_CHARGE (+20% sprint speed)
        for (const e of this.units) {
          if (!e.isPlayer && !e.isDying) {
            e.isBraced = false;
            e.panicTimer = 0;
            e.commanderOrder = 'RECKLESS_CHARGE';
            e.speed = Math.round(e.baseSpeed * 1.2);
            if (Math.random() < 0.35) {
              this.floatingTexts.push({
                id: `reckless_${Date.now()}_${e.id}_${Math.random()}`,
                x: e.x,
                y: e.y - 10,
                text: '⚡ RECKLESS CHARGE!',
                color: '#ef4444',
                size: 10,
                vy: -22,
                opacity: 1,
                life: 0,
                maxLife: 1.0,
              });
            }
          }
        }

        this.setBanner(
          '⚔️ ENEMY COMMANDER SLAIN! RED HORDE LAUNCHES RECKLESS ALL-OUT CHARGE! (+35 XP TO ALL SQUADS)'
        );
      } else if (unit.type === 'spearman' || unit.type === 'archer' || unit.type === 'war_hound') {
        xpEarned = 6;
      } else if (unit.type === 'battering_ram') {
        xpEarned = 20;
        this.setBanner('🪵 SIEGE BATTERING RAM DESTROYED! +20 XP to all squads!');
      } else if (unit.type === 'brute') {
        xpEarned = 25;
        this.setBanner('⚔️ RED BRUTE BOSS SLAIN! +25 XP to all squads!');
      }

      if (killer && killer.isPlayer) {
        const killerSq = killer.type as SquadType;
        if (killerSq === 'shield') this.stats.shieldKills = (this.stats.shieldKills ?? 0) + 1;
        else if (killerSq === 'archer') this.stats.archerKills = (this.stats.archerKills ?? 0) + 1;
        else if (killerSq === 'cavalry') this.stats.cavalryKills = (this.stats.cavalryKills ?? 0) + 1;

        this.squads[killerSq].kills = (this.squads[killerSq].kills ?? 0) + 1;

        const promo = applyUnitKillProgress(killer);
        if (promo.rankedUp) {
          this.floatingTexts.push({
            id: `vet_promo_${Date.now()}_${killer.id}`,
            x: killer.x,
            y: killer.y - 14,
            text: promo.newTier === 3 ? '⌃⌃ ELITE!' : '⌃ VETERAN!',
            color: '#facc15',
            size: 12,
            vy: -22,
            opacity: 1,
            life: 0,
            maxLife: 1.1,
          });
        }

        // Direct kill bonus XP to the killer's squad
        this.addSquadXp(killerSq, xpEarned);
      }

      this.addSquadXp('shield', xpEarned);
      this.addSquadXp('archer', xpEarned);
      this.addSquadXp('cavalry', xpEarned);
      this.stats.score += xpEarned * 10;

      // Award persistent War Gold for Royal Armory grinding
      const goldMult =
        (1 + (this.meta.upgrades.warhorn ?? 0) * 0.15) *
        (this.currentWaveIdx >= WAVES.length ? 1.5 : 1.0);
      const baseGold = unit.isCommander
        ? 35
        : unit.type === 'brute'
        ? 25
        : unit.type === 'battering_ram'
        ? 20
        : unit.type === 'war_hound' || unit.type === 'archer'
        ? 2
        : 1;
      const goldDrop = Math.max(1, Math.round(baseGold * goldMult));
      this.stats.goldEarned = (this.stats.goldEarned ?? 0) + goldDrop;
      this.meta.warGold += goldDrop;
      this.meta.totalKills++;
    } else {
      const sq = this.squads[unit.type as SquadType];
      sq.count = Math.max(0, sq.count - 1);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y += ft.vy * dt;
      ft.opacity = Math.max(0, 1 - ft.life / ft.maxLife);
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.goldRings.length - 1; i >= 0; i--) {
      const ring = this.goldRings[i];
      ring.radius += 450 * dt;
      ring.alpha -= 0.8 * dt;
      if (ring.alpha <= 0 || ring.radius > 1200) {
        this.goldRings.splice(i, 1);
      }
    }
  }

  private resolveTerrainCollisions(u: Unit) {
    // UI Safe-Zone Boundaries: at least 65px below top edge and 130px above bottom edge (height: 700 -> maxY: 570)
    const clamped = clampToSafeZone(u.x, u.y, u.radius);
    u.x = clamped.x;
    u.y = clamped.y;
  }

  /**
   * Dynamic soft-body collision separation between units.
   * Spacing proportionally reduced by 50% so miniature squads form tight, multi-rank rectangular formations (2-3 rows deep).
   */
  private resolveUnitSeparation(_dt: number) {
    const aliveUnits = this.units.filter((u) => !u.isDying);
    const n = aliveUnits.length;
    if (n < 2) return;

    const getUnitWeight = (u: Unit) => {
      if (u.isCommander) return 5.0;
      let base = 1.0;
      switch (u.type) {
        case 'brute': base = 3.5; break;
        case 'battering_ram': base = 3.2; break;
        case 'cavalry': base = 2.4; break;
        case 'shield': base = 1.6; break;
        case 'spearman': base = 1.2; break;
        case 'swordsman': base = 1.0; break;
        case 'war_hound': base = 0.9; break;
        case 'archer': base = 0.8; break;
        default: base = 1.0;
      }
      if (u.isBraced) return base * 5.0;
      if (u.isPlanted) return base * 2.5;
      if (u.engagedWithId) return base * 2.0;
      return base;
    };

    const cellSize = 24;
    const grid: Map<number, Unit[]> = new Map();
    const getHash = (cx: number, cy: number) => cx * 1000 + cy;

    for (let pass = 0; pass < 2; pass++) {
      grid.clear();
      for (let i = 0; i < n; i++) {
        const u = aliveUnits[i];
        const cx = Math.floor(u.x / cellSize);
        const cy = Math.floor(u.y / cellSize);
        const hash = getHash(cx, cy);
        let list = grid.get(hash);
        if (!list) {
          list = [];
          grid.set(hash, list);
        }
        list.push(u);
      }

      for (let i = 0; i < n; i++) {
        const u1 = aliveUnits[i];
        const w1 = getUnitWeight(u1);
        const cx = Math.floor(u1.x / cellSize);
        const cy = Math.floor(u1.y / cellSize);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const list = grid.get(getHash(cx + dx, cy + dy));
            if (!list) continue;

            for (let j = 0; j < list.length; j++) {
              const u2 = list[j];
              if (u1.id >= u2.id) continue;

              const distSq = (u2.x - u1.x) * (u2.x - u1.x) + (u2.y - u1.y) * (u2.y - u1.y);
              // Proportionally reduced padding by 50% (3.0px friendly, 1.5px enemy)
              const extraPadding = (u1.isPlayer && u2.isPlayer) ? 3.0 : (u1.isPlayer !== u2.isPlayer ? 1.5 : 2.0);
              const minDist = u1.radius + u2.radius + extraPadding;

              if (distSq < minDist * minDist) {
                let dist = Math.sqrt(distSq);
                let nx = 0;
                let ny = 0;

                if (dist < 0.001) {
                  nx = 1;
                  ny = 0;
                  dist = 0.001;
                } else {
                  nx = (u2.x - u1.x) / dist;
                  ny = (u2.y - u1.y) / dist;
                }

                const overlap = minDist - dist;
                const w2 = getUnitWeight(u2);
                const totalWeight = w1 + w2;
                const ratio1 = w2 / totalWeight;
                const ratio2 = w1 / totalWeight;

                const pushDist = overlap * 0.55;
                u1.x -= nx * pushDist * ratio1;
                u1.y -= ny * pushDist * ratio1;
                u2.x += nx * pushDist * ratio2;
                u2.y += ny * pushDist * ratio2;
              }
            }
          }
        }

        this.resolveTerrainCollisions(u1);
      }
    }
  }

  private updateTugOfWar() {
    let blueHp = 0;
    let blueMax = 0;
    let redHp = 0;
    let redMax = 0;
    let aliveRedCount = 0;

    for (const u of this.units) {
      if (u.isDying) continue;
      if (u.isPlayer) {
        blueHp += u.hp;
        blueMax += u.maxHp;
      } else {
        redHp += u.hp;
        redMax += u.maxHp;
        aliveRedCount++;
      }
    }

    // Account for enemies still queued in wave
    redMax += this.waveSpawnQueue.length * 85;
    redHp += this.waveSpawnQueue.length * 85;

    const tug = calculateTugOfWar(blueHp, blueMax, redHp, redMax);
    this.stats.blueStrength = tug.bluePercent;
    this.stats.redStrength = tug.redPercent;
    this.stats.activeEnemiesCount = aliveRedCount + this.waveSpawnQueue.length;
  }

  private checkWaveProgress() {
    if (!this.isWaveActive) return;

    const aliveAllies = this.units.filter((u) => u.isPlayer && !u.isDying);
    if (aliveAllies.length === 0) {
      this.isWaveActive = false;
      saveMetaProgression(this.meta);
      soundEngine.playDefeatSting();
      if (this.onGameOver) this.onGameOver(false);
      return;
    }

    const aliveEnemies = this.units.filter((u) => !u.isPlayer && !u.isDying);
    if (aliveEnemies.length === 0 && this.waveSpawnQueue.length === 0) {
      this.isWaveActive = false;
      soundEngine.playVictoryFanfare();

      // Award Wave Clear War Gold Bounty!
      const waveBounty = Math.round(
        (55 + this.stats.wave * 25) * (1 + (this.meta.upgrades.warhorn ?? 0) * 0.15)
      );
      this.stats.goldEarned = (this.stats.goldEarned ?? 0) + waveBounty;
      this.meta.warGold += waveBounty;

      if (this.currentWaveIdx + 1 >= WAVES.length && !this.isEndlessMode) {
        this.meta.victories++;
        saveMetaProgression(this.meta);
        if (this.onGameOver) this.onGameOver(true);
      } else {
        saveMetaProgression(this.meta);
        if (this.onWaveComplete) this.onWaveComplete();
      }
    }
  }
}
