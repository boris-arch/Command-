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
  WaveConfig,
  ReinforcementPerk,
  GameStateStats,
  EnemyType,
} from './types.ts';
import {
  isPointOnPlateau,
  isPointInCliffFace,
  isPointInNorthRamp,
  calculateArcherRange,
  calculateParabolicHeight,
  calculateShieldArrowDamage,
  calculateCavalrySpeed,
  calculateCavalryChargeDamage,
  getVeterancyTier,
  getVeterancyPerks,
  shouldEnemyPanic,
  calculateTugOfWar,
  distributePointsAlongStroke,
  checkTreeCollision,
} from './rules.ts';
import { soundEngine } from './audio.ts';

export const WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    title: 'Barbarian Raiding Party',
    description: 'Swordsmen and spearmen test the defile chokepoint.',
    swordsmen: 12,
    spearmen: 6,
    archers: 0,
    brutes: 0,
    spawnInterval: 2.2,
  },
  {
    waveNumber: 2,
    title: 'Highland Archery Screen',
    description: 'Enemy archers unleash volleys while infantry pushes the pass.',
    swordsmen: 16,
    spearmen: 8,
    archers: 8,
    brutes: 0,
    spawnInterval: 2.0,
  },
  {
    waveNumber: 3,
    title: 'The Juggernaut Clash',
    description: 'A Red Brute Champion arrives to shatter frontline shield walls.',
    swordsmen: 18,
    spearmen: 10,
    archers: 8,
    brutes: 1,
    spawnInterval: 1.8,
  },
  {
    waveNumber: 4,
    title: 'Mountain Defile Pincer',
    description: 'Spear phalanxes and barbarian shock troops assault both lanes.',
    swordsmen: 22,
    spearmen: 14,
    archers: 12,
    brutes: 2,
    spawnInterval: 1.6,
  },
  {
    waveNumber: 5,
    title: 'Warlord Chieftain Onslaught',
    description: 'The full Red Horde unleashes berserker brutes and massed archers.',
    swordsmen: 28,
    spearmen: 18,
    archers: 14,
    brutes: 3,
    spawnInterval: 1.4,
  },
];

export const AVAILABLE_PERKS: ReinforcementPerk[] = [
  {
    id: 'shields_15',
    title: '+15 Shield Soldiers',
    icon: '🛡️',
    description: 'Reinforces frontline phalanx with fresh heavy armored recruits.',
  },
  {
    id: 'archer_fire_rate',
    title: '+25% Archer Fire Rate',
    icon: '🏹',
    description: 'Highland bowstrings strung taut for rapid ballistic saturation.',
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

  // Squad State
  public squads: Record<SquadType, SquadData> = {
    shield: {
      type: 'shield',
      name: 'Shield Wall Phalanx',
      count: 14,
      maxCount: 20,
      tier: 1,
      xp: 0,
      xpToNextTier: 100,
      stance: 'braced',
      cooldownTimer: 0,
      cooldownMax: 1,
    },
    archer: {
      type: 'archer',
      name: 'Highland Archers',
      count: 10,
      maxCount: 15,
      tier: 1,
      xp: 0,
      xpToNextTier: 100,
      cooldownTimer: 0,
      cooldownMax: 6, // 6s Cooldown for Targeted Volley
    },
    cavalry: {
      type: 'cavalry',
      name: 'Knight Cavalry',
      count: 6,
      maxCount: 10,
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
  public isWaveActive: boolean = false;
  public waveSpawnQueue: EnemyType[] = [];
  public waveSpawnTimer: number = 0;
  public enemiesRemainingInWave: number = 0;

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
  };

  // Upgrades active
  public archerFireRateBonus: number = 1.0;
  public cavalryKnockbackBonus: number = 1.0;

  // Banner announcement
  public actionBanner: string = 'Blue Alliance takes field position. Draw lines to form ranks!';
  public bannerTimer: number = 5;

  // Callbacks
  public onStateChange?: () => void;
  public onWaveComplete?: () => void;
  public onGameOver?: (won: boolean) => void;

  constructor() {
    this.resetGame();
  }

  public resetGame() {
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.goldRings = [];

    this.currentWaveIdx = 0;
    this.rallyHornTimer = 0;
    this.archerFireRateBonus = 1.0;
    this.cavalryKnockbackBonus = 1.0;

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
    };

    // Reset Squad Data
    this.squads.shield.count = 14;
    this.squads.shield.tier = 1;
    this.squads.shield.xp = 0;
    this.squads.shield.stance = 'braced';

    this.squads.archer.count = 10;
    this.squads.archer.tier = 1;
    this.squads.archer.xp = 0;
    this.squads.archer.cooldownTimer = 0;

    this.squads.cavalry.count = 6;
    this.squads.cavalry.tier = 1;
    this.squads.cavalry.xp = 0;

    this.spawnAlliedSquads();
    this.prepareWave(0);
    this.setBanner('Blue Alliance deployed. Form your Shield Wall at the defile!');
  }

  public spawnAlliedSquads() {
    // 1. Shields: tight rectangular phalanx at chokepoint entrance (X: 320-345, Y: 420 to 475)
    for (let i = 0; i < this.squads.shield.count; i++) {
      const col = Math.floor(i / 7); // 2 columns of 7
      const row = i % 7;
      const x = 320 + col * 20;
      const y = 415 + row * 16;
      this.units.push({
        id: `shield_${i}_${Date.now()}`,
        type: 'shield',
        isPlayer: true,
        x: x,
        y: y,
        targetX: x,
        targetY: y,
        vx: 0,
        vy: 0,
        radius: 12,
        hp: 120,
        maxHp: 120,
        baseSpeed: 38,
        speed: 38,
        damage: 16,
        range: 22,
        attackCooldown: 1.0,
        attackTimer: Math.random() * 0.5,
        targetUnitId: null,
        elevation: 'lowland',
        facing: 0, // facing East
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
        isBraced: true,
      });
    }

    // 2. Highland Archers: 2 neat rows on the High Cliff Plateau (X: 90-260, Y: 65-115)
    for (let i = 0; i < this.squads.archer.count; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = 90 + col * 36;
      const y = 65 + row * 40;
      this.units.push({
        id: `archer_${i}_${Date.now()}`,
        type: 'archer',
        isPlayer: true,
        x: x,
        y: y,
        targetX: x,
        targetY: y,
        vx: 0,
        vy: 0,
        radius: 10,
        hp: 75,
        maxHp: 75,
        baseSpeed: 36,
        speed: 36,
        damage: 22,
        range: 320,
        attackCooldown: 1.4,
        attackTimer: Math.random() * 0.8,
        targetUnitId: null,
        elevation: 'plateau',
        facing: 0,
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
      });
    }

    // 3. Knight Cavalry: Reserve in western meadow (X: 160 to 220, Y: 420 to 470)
    for (let i = 0; i < this.squads.cavalry.count; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 160 + col * 32;
      const y = 425 + row * 34;
      this.units.push({
        id: `cavalry_${i}_${Date.now()}`,
        type: 'cavalry',
        isPlayer: true,
        x: x,
        y: y,
        targetX: x,
        targetY: y,
        vx: 0,
        vy: 0,
        radius: 15,
        hp: 180,
        maxHp: 180,
        baseSpeed: 65,
        speed: 65,
        damage: 28,
        range: 26,
        attackCooldown: 1.2,
        attackTimer: 0,
        targetUnitId: null,
        elevation: 'lowland',
        facing: 0,
        momentum: 1.0,
        pathWaypoints: [],
        currentWaypointIdx: 0,
      });
    }
  }

  public prepareWave(waveIndex: number) {
    if (waveIndex >= WAVES.length) {
      if (this.onGameOver) this.onGameOver(true);
      return;
    }

    this.currentWaveIdx = waveIndex;
    const wave = WAVES[waveIndex];
    this.stats.wave = wave.waveNumber;

    const queue: EnemyType[] = [];
    for (let i = 0; i < wave.swordsmen; i++) queue.push('swordsman');
    for (let i = 0; i < wave.spearmen; i++) queue.push('spearman');
    for (let i = 0; i < wave.archers; i++) queue.push('archer');
    for (let i = 0; i < wave.brutes; i++) queue.push('brute');

    // Shuffle queue slightly
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    this.waveSpawnQueue = queue;
    this.enemiesRemainingInWave = queue.length;
    this.waveSpawnTimer = 0.5;
    this.isWaveActive = true;

    this.setBanner(`Wave ${wave.waveNumber}: ${wave.title} approaches!`);
  }

  public setBanner(msg: string) {
    this.actionBanner = msg;
    this.bannerTimer = 4.5;
  }

  // ================= PLAYER CONTROLS & COMMANDS ================= //

  /**
   * Line Drawing: Player drags stroke across canvas for chosen squad.
   */
  public applyDrawnLineToSquad(squadType: SquadType, stroke: Point[]) {
    if (stroke.length < 2) return;

    const squadUnits = this.units.filter((u) => u.isPlayer && u.type === squadType && !u.isDying);
    if (squadUnits.length === 0) return;

    if (squadType === 'cavalry') {
      // Cavalry receives the full waypoint path to gallop along in column!
      soundEngine.playClick();
      this.setBanner('🐎 Knight Cavalry galloping along drawn flanking route!');
      squadUnits.forEach((u, idx) => {
        // Stagger slightly along the route
        u.pathWaypoints = [...stroke];
        u.currentWaypointIdx = 0;
        u.momentum = 1.0;
        u.targetX = stroke[0].x;
        u.targetY = stroke[0].y;
      });
    } else {
      // Shield or Archer: Distribute soldiers evenly along the drawn line
      const positions = distributePointsAlongStroke(stroke, squadUnits.length);
      squadUnits.forEach((u, idx) => {
        const p = positions[idx];
        if (p) {
          // If archer, clamp or ensure within plateau if drawn there
          u.targetX = p.x;
          u.targetY = p.y;
          u.pathWaypoints = [];
          u.currentWaypointIdx = 0;

          // Face eastward along the wall
          if (squadType === 'shield') {
            u.facing = 0;
            u.isBraced = this.squads.shield.stance === 'braced';
          }
        }
      });

      if (squadType === 'shield') {
        soundEngine.playClick();
        this.setBanner('🛡️ Shield Wall reformed along drawn line!');
      } else {
        soundEngine.playClick();
        this.setBanner('🏹 Highland Archers redeployed along vantage line!');
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
          // Advance forward slightly towards eastern road
          u.targetX = Math.min(1000, u.x + 80);
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
   * Command Ability: Targeted Volley (Highland Archers, 6s cooldown).
   * Spreads an instant 6-arrow saturated bombardment over clustered enemies.
   */
  public triggerTargetedVolley() {
    if (this.squads.archer.cooldownTimer > 0) return;

    const archers = this.units.filter((u) => u.isPlayer && u.type === 'archer' && !u.isDying);
    if (archers.length === 0) return;

    const enemies = this.units.filter((u) => !u.isPlayer && !u.isDying);
    if (enemies.length === 0) return;

    // Pick central enemy cluster
    const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    soundEngine.playBowShot();

    for (let i = 0; i < 6; i++) {
      const shooter = archers[i % archers.length];
      const offsetX = (Math.random() - 0.5) * 70;
      const offsetY = (Math.random() - 0.5) * 70;

      this.projectiles.push({
        id: `volley_${Date.now()}_${i}`,
        x: shooter.x,
        y: shooter.y,
        startX: shooter.x,
        startY: shooter.y,
        targetX: targetEnemy.x + offsetX,
        targetY: targetEnemy.y + offsetY,
        speed: 380 + Math.random() * 40,
        progress: 0,
        peakHeight: 90,
        currentHeight: 0,
        damage: Math.round(shooter.damage * 1.3),
        isPlayer: true,
        fromElevation: shooter.elevation,
        isVolley: true,
      });
    }

    this.squads.archer.cooldownTimer = this.squads.archer.cooldownMax;
    this.setBanner('🏹 TARGETED VOLLEY! 6-Arrow saturation bombardment launched!');
  }

  /**
   * Tactical Ultimate: Morale "Rally Horn" (12s cooldown).
   * - Golden ring shockwave
   * - Restores 25% Max HP to surviving blue soldiers (floating heal text)
   * - +40% attack speed frenzy for 4s
   * - Low HP red units (<= 65% HP) flee in terror with sweat drops for 3s
   */
  public triggerRallyHorn() {
    if (this.rallyHornTimer > 0) return;

    soundEngine.playRallyHorn();
    this.rallyHornTimer = this.rallyHornCooldown;
    this.stats.rallyHornsUsed++;

    // Expanding golden shockwave ring
    this.goldRings.push({
      x: 350,
      y: 350,
      radius: 20,
      alpha: 1.0,
    });

    // Allied Restoration + Frenzy
    const allies = this.units.filter((u) => u.isPlayer && !u.isDying);
    allies.forEach((u) => {
      const healAmt = Math.round(u.maxHp * 0.25);
      u.hp = Math.min(u.maxHp, u.hp + healAmt);
      u.frenzyTimer = 4.0;

      this.floatingTexts.push({
        id: `heal_${Date.now()}_${u.id}`,
        x: u.x,
        y: u.y - 12,
        text: `+${healAmt} HP`,
        color: '#4ade80',
        size: 13,
        vy: -30,
        opacity: 1,
        life: 0,
        maxLife: 1.2,
      });
    });

    // Enemy Panic
    let panickedCount = 0;
    const enemies = this.units.filter((u) => !u.isPlayer && !u.isDying);
    enemies.forEach((u) => {
      if (shouldEnemyPanic(u.hp, u.maxHp)) {
        u.panicTimer = 3.0;
        panickedCount++;
        this.floatingTexts.push({
          id: `flee_${Date.now()}_${u.id}`,
          x: u.x,
          y: u.y - 16,
          text: 'FLEE!',
          color: '#38bdf8',
          size: 12,
          vy: -25,
          opacity: 1,
          life: 0,
          maxLife: 1.0,
        });
      }
    });

    this.setBanner(`🎺 RALLY HORN! Allies healed + Frenzy active! ${panickedCount} barbarians flee in panic!`);
  }

  /**
   * Apply selected reinforcement perk after wave victory.
   */
  public applyReinforcement(perkId: string) {
    if (perkId === 'shields_15') {
      // Add fresh shield units
      const currentShields = this.units.filter((u) => u.isPlayer && u.type === 'shield' && !u.isDying).length;
      const toAdd = Math.min(15, this.squads.shield.maxCount - currentShields);
      for (let i = 0; i < toAdd; i++) {
        const y = 350 + i * 16;
        this.units.push({
          id: `shield_reinf_${Date.now()}_${i}`,
          type: 'shield',
          isPlayer: true,
          x: 480,
          y: y,
          targetX: 520,
          targetY: y,
          vx: 0,
          vy: 0,
          radius: 12,
          hp: 120,
          maxHp: 120,
          baseSpeed: 38,
          speed: 38,
          damage: 16,
          range: 22,
          attackCooldown: 1.0,
          attackTimer: 0,
          targetUnitId: null,
          elevation: 'lowland',
          facing: 0,
          momentum: 1.0,
          pathWaypoints: [],
          currentWaypointIdx: 0,
          isBraced: true,
        });
      }
      this.squads.shield.count += toAdd;
      this.setBanner(`🛡️ Reinforcements arrived: +${toAdd} heavy shields!`);
    } else if (perkId === 'archer_fire_rate') {
      this.archerFireRateBonus *= 1.25;
      this.setBanner('🏹 Highland Archer fire rate increased by +25%!');
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

    // Award +25 XP skirmish victory bonus to all surviving squads
    this.addSquadXp('shield', 25);
    this.addSquadXp('archer', 25);
    this.addSquadXp('cavalry', 25);

    // Proceed to next wave
    this.prepareWave(this.currentWaveIdx + 1);
  }

  public addSquadXp(squadType: SquadType, amount: number) {
    const sq = this.squads[squadType];
    sq.xp += amount;
    const newTier = getVeterancyTier(sq.xp);
    if (newTier > sq.tier) {
      sq.tier = newTier;
      const perk = getVeterancyPerks(newTier);
      this.setBanner(`⭐ ${sq.name} PROMOTED TO ${perk.title}! (${perk.attackSpeedMultiplier}x Atk Spd)`);
      soundEngine.playVictoryFanfare();
    }
  }

  // ================= MAIN SIMULATION UPDATE LOOP ================= //

  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    this.stats.elapsedTime += clampedDt;

    // Cooldown timers
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

    // Spawn wave enemies
    this.updateWaveSpawning(clampedDt);

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
      const type = this.waveSpawnQueue.shift()!;
      this.spawnEnemy(type);
      const wave = WAVES[this.currentWaveIdx];
      this.waveSpawnTimer = wave ? wave.spawnInterval * (0.6 + Math.random() * 0.8) : 2.0;
    }
  }

  private spawnEnemy(type: EnemyType) {
    // Enemies spawn from the eastern road edge (X: 1100-1180, Y: 370-490)
    const spawnY = 370 + Math.random() * 120;
    const spawnX = 1120 + Math.random() * 60;

    let hp = 85;
    let speed = 42;
    let damage = 14;
    let range = 24;
    let radius = 12;

    if (type === 'spearman') {
      hp = 95;
      speed = 38;
      damage = 18;
      range = 28;
      radius = 12;
    } else if (type === 'archer') {
      hp = 65;
      speed = 36;
      damage = 16;
      range = 300;
      radius = 10;
    } else if (type === 'brute') {
      hp = 680;
      speed = 28;
      damage = 60;
      range = 36;
      radius = 24;
      soundEngine.playBruteRoar();
      this.setBanner('💀 RED BRUTE BOSS HAS ENTERED THE FIELD! (680 HP)');
    }

    this.units.push({
      id: `enemy_${type}_${Date.now()}_${Math.random()}`,
      type: type,
      isPlayer: false,
      x: spawnX,
      y: spawnY,
      targetX: 520, // march towards the defile
      targetY: spawnY,
      vx: 0,
      vy: 0,
      radius: radius,
      hp: hp,
      maxHp: hp,
      baseSpeed: speed,
      speed: speed,
      damage: damage,
      range: range,
      attackCooldown: type === 'brute' ? 2.0 : 1.2,
      attackTimer: Math.random() * 0.5,
      targetUnitId: null,
      elevation: 'lowland',
      facing: Math.PI, // Facing West towards player
      momentum: 1.0,
      pathWaypoints: [],
      currentWaypointIdx: 0,
    });
  }

  private updateUnits(dt: number) {
    // Clean up dead units that finished dying animation
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.isDying) {
        u.deathTimer = (u.deathTimer ?? 0.4) - dt;
        if (u.deathTimer <= 0) {
          this.units.splice(i, 1);
        }
      }
    }

    for (const u of this.units) {
      if (u.isDying) continue;

      // Update timers
      if (u.hitFlashTimer && u.hitFlashTimer > 0) u.hitFlashTimer -= dt;
      if (u.stunTimer && u.stunTimer > 0) {
        u.stunTimer -= dt;
        continue; // Immobilized while stunned!
      }
      if (u.frenzyTimer && u.frenzyTimer > 0) u.frenzyTimer -= dt;
      if (u.panicTimer && u.panicTimer > 0) {
        u.panicTimer -= dt;
        // Run East away from battle
        u.x += u.baseSpeed * 1.3 * dt;
        u.facing = 0;
        continue;
      }

      // Attack timer
      if (u.attackTimer > 0) {
        const frenzyMult = u.frenzyTimer && u.frenzyTimer > 0 ? 1.4 : 1.0;
        const vetPerk = u.isPlayer ? getVeterancyPerks(this.squads[u.type as SquadType].tier) : { attackSpeedMultiplier: 1.0 };
        const totalAtkSpeed = frenzyMult * vetPerk.attackSpeedMultiplier * (u.type === 'archer' ? this.archerFireRateBonus : 1.0);
        u.attackTimer -= dt * totalAtkSpeed;
      }

      // Archetype specific AI & Movement
      if (u.isPlayer) {
        this.updateAlliedUnit(u, dt);
      } else {
        this.updateEnemyUnit(u, dt);
      }

      // Separation from trees and cliff face
      this.resolveTerrainCollisions(u);
    }
  }

  private updateAlliedUnit(u: Unit, dt: number) {
    // 1. Cavalry Path Following & Momentum
    if (u.type === 'cavalry' && u.pathWaypoints.length > 0) {
      const targetWp = u.pathWaypoints[u.currentWaypointIdx];
      if (targetWp) {
        const dx = targetWp.x - u.x;
        const dy = targetWp.y - u.y;
        const dist = Math.hypot(dx, dy);

        // Build momentum up to 2.5x as cavalry runs along path
        u.momentum = Math.min(2.5, u.momentum + dt * 0.8);
        const currSpeed = calculateCavalrySpeed(u.baseSpeed, u.momentum);

        if (dist < 18) {
          u.currentWaypointIdx++;
          if (u.currentWaypointIdx >= u.pathWaypoints.length) {
            u.pathWaypoints = [];
          }
        } else {
          u.vx = (dx / dist) * currSpeed;
          u.vy = (dy / dist) * currSpeed;
          u.x += u.vx * dt;
          u.y += u.vy * dt;
          u.facing = Math.atan2(dy, dx);
        }

        // Kick up dust trail particles
        if (Math.random() < 0.35) {
          this.particles.push({
            x: u.x - Math.cos(u.facing) * 12,
            y: u.y - Math.sin(u.facing) * 12,
            vx: -u.vx * 0.2 + (Math.random() - 0.5) * 15,
            vy: -u.vy * 0.2 + (Math.random() - 0.5) * 15,
            radius: 3 + Math.random() * 3,
            color: '#d4b996',
            alpha: 0.6,
            life: 0,
            maxLife: 0.4,
            type: 'dust',
          });
        }

        // Check Shock Charge collision with enemies
        this.checkCavalryCollisions(u);
        return;
      }
    }

    // 2. Highland Archers Firing AI
    if (u.type === 'archer') {
      // Prioritize Red Brutes, then nearest enemy
      const enemies = this.units.filter((e) => !e.isPlayer && !e.isDying);
      if (enemies.length > 0 && u.attackTimer <= 0) {
        // Find brute first
        let target = enemies.find((e) => e.type === 'brute');
        if (!target) {
          // Nearest enemy within range
          let minDist = 99999;
          const maxRange = calculateArcherRange(u.range, u.elevation === 'plateau');
          for (const e of enemies) {
            const dist = Math.hypot(e.x - u.x, e.y - u.y);
            if (dist < maxRange && dist < minDist) {
              minDist = dist;
              target = e;
            }
          }
        }

        if (target) {
          u.facing = Math.atan2(target.y - u.y, target.x - u.x);
          this.shootArrow(u, target);
          u.attackTimer = u.attackCooldown;
        }
      }
      return;
    }

    // 3. Melee (Shields or stationary Cavalry)
    const enemies = this.units.filter((e) => !e.isPlayer && !e.isDying);
    let nearestDist = 99999;
    let targetEnemy: Unit | null = null;

    for (const e of enemies) {
      const dist = Math.hypot(e.x - u.x, e.y - u.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        targetEnemy = e;
      }
    }

    // Move towards target if not locked
    if (targetEnemy && nearestDist <= u.range) {
      // Attack melee
      u.engagedWithId = targetEnemy.id;
      targetEnemy.engagedWithId = u.id;
      u.facing = Math.atan2(targetEnemy.y - u.y, targetEnemy.x - u.x);

      if (u.attackTimer <= 0) {
        this.performMeleeAttack(u, targetEnemy);
        u.attackTimer = u.attackCooldown;
      }

      // Shield Pushback against regular red infantry
      if (u.type === 'shield' && u.isBraced && (targetEnemy.type === 'swordsman' || targetEnemy.type === 'spearman')) {
        targetEnemy.x += 18 * dt; // shove them backwards east
      }
    } else {
      // Move to targetX, targetY
      const dx = u.targetX - u.x;
      const dy = u.targetY - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        u.vx = (dx / dist) * u.speed;
        u.vy = (dy / dist) * u.speed;
        u.x += u.vx * dt;
        u.y += u.vy * dt;
        u.facing = Math.atan2(dy, dx);
      }
    }
  }

  private updateEnemyUnit(u: Unit, dt: number) {
    const allies = this.units.filter((a) => a.isPlayer && !a.isDying);
    if (allies.length === 0) return;

    // Red Brute telegraphed cleave smash
    if (u.type === 'brute') {
      if (u.isCleaving && u.cleaveWindupTimer !== undefined) {
        u.cleaveWindupTimer -= dt;
        if (u.cleaveWindupTimer <= 0) {
          // Execute Cleave Smash!
          this.executeBruteCleave(u);
          u.isCleaving = false;
          u.attackTimer = u.attackCooldown;
        }
        return;
      }
    }

    // Enemy Archer AI
    if (u.type === 'archer') {
      let nearestDist = 99999;
      let target: Unit | null = null;
      for (const a of allies) {
        const dist = Math.hypot(a.x - u.x, a.y - u.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          target = a;
        }
      }

      if (target) {
        if (nearestDist <= u.range) {
          if (u.attackTimer <= 0) {
            this.shootArrow(u, target);
            u.attackTimer = u.attackCooldown;
          }
        } else {
          // Approach along road
          u.x -= u.speed * dt;
          u.facing = Math.PI;
        }
      }
      return;
    }

    // Melee enemies (Swordsmen, Spearmen, Brute)
    let nearestDist = 99999;
    let target: Unit | null = null;
    for (const a of allies) {
      // Melee prefers ground units first
      if (a.elevation === 'plateau' && allies.some((other) => other.elevation === 'lowland')) {
        continue;
      }
      const dist = Math.hypot(a.x - u.x, a.y - u.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        target = a;
      }
    }

    if (!target) {
      // If only plateau archers remain, climb via North Ramp!
      target = allies[0];
      if (u.x > 450) {
        // Move towards ramp entry
        u.targetX = 420;
        u.targetY = 120;
      } else {
        // Move onto plateau
        u.targetX = 250;
        u.targetY = 140;
      }
    }

    if (target) {
      const dist = Math.hypot(target.x - u.x, target.y - u.y);
      if (dist <= u.range) {
        u.facing = Math.atan2(target.y - u.y, target.x - u.x);

        if (u.type === 'brute') {
          // Initiate 0.65s telegraphed cleave
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
        // Step forward
        const dx = target.x - u.x;
        const dy = target.y - u.y;
        const d = Math.hypot(dx, dy);
        u.vx = (dx / d) * u.speed;
        u.vy = (dy / d) * u.speed;
        u.x += u.vx * dt;
        u.y += u.vy * dt;
        u.facing = Math.atan2(dy, dx);
      }
    }
  }

  private executeBruteCleave(brute: Unit) {
    soundEngine.playShockCharge();
    this.setBanner('💥 RED BRUTE CLEAVE SMASH! Shields knocked flying!');

    // Damage and send clustered shields within 75px radius flying backward
    const allies = this.units.filter((u) => u.isPlayer && !u.isDying);
    for (const ally of allies) {
      const dist = Math.hypot(ally.x - brute.x, ally.y - brute.y);
      if (dist < 85) {
        ally.hp -= brute.damage;
        ally.hitFlashTimer = 0.15;
        // Knockback West
        ally.x -= 45;
        ally.vx = -60;

        this.floatingTexts.push({
          id: `cleave_${Date.now()}_${ally.id}`,
          x: ally.x,
          y: ally.y - 14,
          text: `-${brute.damage} CLEAVE!`,
          color: '#ef4444',
          size: 14,
          vy: -35,
          opacity: 1,
          life: 0,
          maxLife: 1.2,
        });

        if (ally.hp <= 0) {
          this.killUnit(ally, brute);
        }
      }
    }
  }

  private performMeleeAttack(attacker: Unit, target: Unit) {
    soundEngine.playSwordClash();
    let dmg = attacker.damage;

    // Veterancy bonus
    if (attacker.isPlayer) {
      const sq = this.squads[attacker.type as SquadType];
      dmg = Math.round(dmg * getVeterancyPerks(sq.tier).damageMultiplier);
    }

    target.hp -= dmg;
    target.hitFlashTimer = 0.12;

    this.floatingTexts.push({
      id: `melee_${Date.now()}_${target.id}`,
      x: target.x,
      y: target.y - 10,
      text: `-${dmg}`,
      color: target.isPlayer ? '#f87171' : '#fde047',
      size: 11,
      vy: -20,
      opacity: 1,
      life: 0,
      maxLife: 0.8,
    });

    if (target.hp <= 0) {
      this.killUnit(target, attacker);
    }
  }

  private checkCavalryCollisions(cavalry: Unit) {
    const enemies = this.units.filter((e) => !e.isPlayer && !e.isDying);
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - cavalry.x, enemy.y - cavalry.y);
      if (dist < cavalry.radius + enemy.radius + 6) {
        // High speed collision!
        soundEngine.playShockCharge();

        const isLockedWithShields = enemy.engagedWithId !== null && enemy.engagedWithId !== undefined;
        const chargeResult = calculateCavalryChargeDamage(
          cavalry.damage,
          cavalry.momentum,
          isLockedWithShields
        );

        let finalDmg = Math.round(chargeResult.damage * this.cavalryKnockbackBonus);

        // Flanking Critical Check
        if (chargeResult.isFlankCrit) {
          this.stats.flankingCrits++;
          this.setBanner('⚡ SHOCK CHARGE! 5.0x FLANKING CRITICAL!');
          this.floatingTexts.push({
            id: `crit_${Date.now()}_${enemy.id}`,
            x: enemy.x,
            y: enemy.y - 24,
            text: `5.0x FLANK CRIT! -${finalDmg}`,
            color: '#f59e0b',
            size: 15,
            vy: -40,
            opacity: 1,
            life: 0,
            maxLife: 1.5,
          });
        } else {
          this.floatingTexts.push({
            id: `charge_${Date.now()}_${enemy.id}`,
            x: enemy.x,
            y: enemy.y - 18,
            text: `SHOCK -${finalDmg}`,
            color: '#fbbf24',
            size: 13,
            vy: -30,
            opacity: 1,
            life: 0,
            maxLife: 1.2,
          });
        }

        // Apply damage & stun
        enemy.hp -= finalDmg;
        enemy.hitFlashTimer = 0.2;
        enemy.stunTimer = 1.5; // Stunned with dizzy stars!

        // Knock enemy backward along cavalry trajectory
        const knockDist = 40 * this.cavalryKnockbackBonus;
        enemy.x += Math.cos(cavalry.facing) * knockDist;
        enemy.y += Math.sin(cavalry.facing) * (knockDist * 0.4);

        // Dust shockwave burst
        for (let p = 0; p < 12; p++) {
          const angle = (p / 12) * Math.PI * 2;
          this.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * (50 + Math.random() * 40),
            vy: Math.sin(angle) * (50 + Math.random() * 40),
            radius: 4 + Math.random() * 4,
            color: '#d4b996',
            alpha: 0.8,
            life: 0,
            maxLife: 0.5,
            type: 'dust',
          });
        }

        if (enemy.hp <= 0) {
          this.killUnit(enemy, cavalry);
        }
      }
    }
  }

  private shootArrow(shooter: Unit, target: Unit) {
    soundEngine.playBowShot();

    const isHighland = shooter.elevation === 'plateau';
    const peakHeight = isHighland ? 85 : 55;

    this.projectiles.push({
      id: `arrow_${Date.now()}_${Math.random()}`,
      x: shooter.x,
      y: shooter.y,
      startX: shooter.x,
      startY: shooter.y,
      targetX: target.x + (Math.random() - 0.5) * 10,
      targetY: target.y + (Math.random() - 0.5) * 10,
      speed: 360,
      progress: 0,
      peakHeight: peakHeight,
      currentHeight: 0,
      damage: shooter.damage,
      isPlayer: shooter.isPlayer,
      fromElevation: shooter.elevation,
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

      if (p.progress >= 1.0) {
        // Arrow arrived at target location!
        this.resolveArrowImpact(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveArrowImpact(p: Projectile) {
    // Find closest target near impact
    const targets = this.units.filter((u) => u.isPlayer !== p.isPlayer && !u.isDying);
    let hitUnit: Unit | null = null;
    let minD = 22; // Arrow hit radius

    for (const u of targets) {
      const d = Math.hypot(u.x - p.x, u.y - p.y);
      if (d < minD) {
        minD = d;
        hitUnit = u;
      }
    }

    if (hitUnit) {
      // Check Braced Shield Block (75% reduction + sparks)
      if (hitUnit.isPlayer && hitUnit.type === 'shield') {
        const blockRes = calculateShieldArrowDamage(p.damage, hitUnit.isBraced ?? false);
        hitUnit.hp -= blockRes.damage;

        if (blockRes.deflected) {
          soundEngine.playShieldBlock();
          this.stats.arrowsDeflected++;

          // Silver-white deflection sparks!
          for (let s = 0; s < 7; s++) {
            this.particles.push({
              x: hitUnit.x + 4,
              y: hitUnit.y,
              vx: 40 + Math.random() * 60,
              vy: (Math.random() - 0.5) * 80,
              radius: 2.5,
              color: '#ffffff',
              alpha: 1.0,
              life: 0,
              maxLife: 0.25,
              type: 'spark',
            });
          }

          this.floatingTexts.push({
            id: `deflect_${Date.now()}_${hitUnit.id}`,
            x: hitUnit.x,
            y: hitUnit.y - 12,
            text: `BRACED -75%`,
            color: '#93c5fd',
            size: 11,
            vy: -20,
            opacity: 1,
            life: 0,
            maxLife: 0.8,
          });
        } else {
          soundEngine.playSwordClash();
        }
      } else {
        // Direct hit
        hitUnit.hp -= p.damage;
        soundEngine.playSwordClash();
        this.floatingTexts.push({
          id: `arrow_hit_${Date.now()}_${hitUnit.id}`,
          x: hitUnit.x,
          y: hitUnit.y - 10,
          text: `-${p.damage}`,
          color: hitUnit.isPlayer ? '#f87171' : '#fde047',
          size: 11,
          vy: -20,
          opacity: 1,
          life: 0,
          maxLife: 0.8,
        });
      }

      hitUnit.hitFlashTimer = 0.12;
      if (hitUnit.hp <= 0) {
        this.killUnit(hitUnit, null);
      }
    }
  }

  private killUnit(unit: Unit, killer: Unit | null) {
    unit.isDying = true;
    unit.deathTimer = 0.45;

    if (!unit.isPlayer) {
      this.stats.enemiesDefeated++;

      // Award XP to player squads
      let xpEarned = 8;
      if (unit.type === 'spearman' || unit.type === 'archer') xpEarned = 12;
      if (unit.type === 'brute') {
        xpEarned = 25;
        this.setBanner('⚔️ RED BRUTE BOSS SLAIN! +25 XP to all squads!');
      }

      this.addSquadXp('shield', xpEarned);
      this.addSquadXp('archer', xpEarned);
      this.addSquadXp('cavalry', xpEarned);
      this.stats.score += xpEarned * 10;
    } else {
      // Allied unit lost
      const sq = this.squads[unit.type as SquadType];
      sq.count = Math.max(0, sq.count - 1);
    }
  }

  private updateParticles(dt: number) {
    // Particles
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

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y += ft.vy * dt;
      ft.opacity = Math.max(0, 1 - ft.life / ft.maxLife);
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Golden Rings (Rally Horn)
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
    // 1. Cliff Face: Y in [260, 340], X < 430 is impassable wall
    if (isPointInCliffFace(u.x, u.y)) {
      if (u.elevation === 'plateau') {
        u.y = Math.min(u.y, 255);
      } else {
        u.y = Math.max(u.y, 345);
      }
    }

    // 2. Tree collisions
    const treeCol = checkTreeCollision(u.x, u.y, u.radius);
    if (treeCol.collides) {
      u.x += treeCol.pushX;
      u.y += treeCol.pushY;
    }

    // 3. Screen bounds clamping
    u.x = Math.max(u.radius + 10, Math.min(1190 - u.radius, u.x));
    u.y = Math.max(u.radius + 10, Math.min(680 - u.radius, u.y));
  }

  private updateTugOfWar() {
    let blueHp = 0;
    let blueMax = 0;
    let redHp = 0;
    let redMax = 0;

    for (const u of this.units) {
      if (u.isDying) continue;
      if (u.isPlayer) {
        blueHp += u.hp;
        blueMax += u.maxHp;
      } else {
        redHp += u.hp;
        redMax += u.maxHp;
      }
    }

    // Account for enemies still queued in wave
    redMax += this.waveSpawnQueue.length * 90;
    redHp += this.waveSpawnQueue.length * 90;

    const tug = calculateTugOfWar(blueHp, blueMax, redHp, redMax);
    this.stats.blueStrength = tug.bluePercent;
    this.stats.redStrength = tug.redPercent;
  }

  private checkWaveProgress() {
    if (!this.isWaveActive) return;

    const aliveAllies = this.units.filter((u) => u.isPlayer && !u.isDying);
    if (aliveAllies.length === 0) {
      this.isWaveActive = false;
      soundEngine.playDefeatSting();
      if (this.onGameOver) this.onGameOver(false);
      return;
    }

    const aliveEnemies = this.units.filter((u) => !u.isPlayer && !u.isDying);
    if (aliveEnemies.length === 0 && this.waveSpawnQueue.length === 0) {
      // Wave cleared!
      this.isWaveActive = false;
      soundEngine.playVictoryFanfare();

      if (this.currentWaveIdx + 1 >= WAVES.length) {
        // Game victory!
        if (this.onGameOver) this.onGameOver(true);
      } else {
        // Trigger between-wave tactical reinforcement selection modal!
        if (this.onWaveComplete) this.onWaveComplete();
      }
    }
  }
}
