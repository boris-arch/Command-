/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UI_SAFE_ZONE,
  clampToSafeZone,
  isPointOnPlateau,
  isPointInCliffFace,
  isPointInNorthRamp,
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
  distributePointsAlongStroke,
  distributeMultiRankFormation,
  checkTreeCollision,
  calculateBurnTick,
  checkBarricadeCollision,
  getBattleAccolades,
  calculateUnitVeterancyTier,
  calculateUnitVeterancyBonuses,
  applyUnitKillProgress,
  SQUAD_SPECIALIZATIONS,
  META_UPGRADES,
  getMetaUpgradeCost,
  getDefaultMetaProgression,
  generateEndlessWaveConfig,
  scoreTargetForUnit,
  calculateTacticalSteeringVector,
  evaluateCommanderTacticalDecision,
} from './rules.ts';
import type { Unit } from './types.ts';

test('Topography: strict UI safe zone (78..545), High Ground Hills, and Mud Patches', () => {
  assert.equal(isPointOnPlateau(100, 100), false);
  assert.equal(isPointInCliffFace(150, 280), false);
  assert.equal(isPointInNorthRamp(350, 100), false);

  const clampedTop = clampToSafeZone(500, 10);
  assert.equal(clampedTop.y, UI_SAFE_ZONE.minY); // 78

  const clampedBottom = clampToSafeZone(500, 680);
  assert.equal(clampedBottom.y, UI_SAFE_ZONE.maxY); // 545

  // High Ground Hills on flanks
  assert.equal(isPointOnHighGroundHill(240, 140), true);
  assert.equal(isPointOnHighGroundHill(240, 492), true);
  assert.equal(isPointOnHighGroundHill(400, 335), false);

  // Mud patches on central road
  assert.equal(isPointInMudPatch(465, 300), true);
  assert.equal(isPointInMudPatch(740, 370), true);
  assert.equal(isPointInMudPatch(200, 200), false);
});

test('Ballistics: Planted Formation Bonus (+30%) & High Ground Hill Bonus (+20% range/damage)', () => {
  const baseRange = 300;
  const movingRange = calculateArcherRange(baseRange, false, false);
  const plantedRange = calculateArcherRange(baseRange, true, false);
  const hillRange = calculateArcherRange(baseRange, false, true);
  const plantedHillRange = calculateArcherRange(baseRange, true, true);

  assert.equal(movingRange, 300);
  assert.equal(plantedRange, 390); // 300 * 1.3
  assert.equal(hillRange, 360); // 300 * 1.2
  assert.equal(plantedHillRange, 468); // 300 * 1.3 * 1.2

  assert.equal(calculateArcherDamage(20, false), 20);
  assert.equal(calculateArcherDamage(20, true), 24); // +20% damage on hill
});

test('Ballistics: predictive lead aiming intercepts moving targets & Planted pinpoint accuracy', () => {
  const shooter = { x: 200, y: 300 };
  const target = { x: 500, y: 300, vx: -100, vy: 0 };
  const speed = 500;

  const leadAim = calculatePredictiveAimPoint(shooter, target, speed, true, 0);
  assert.equal(Math.round(leadAim.x), 450);
  assert.equal(Math.round(leadAim.y), 300);
  assert.equal(Math.abs(leadAim.timeToIntercept - 0.5) < 0.01, true);

  const plantedAim = calculatePredictiveAimPoint(shooter, target, speed, true, 0.9);
  assert.equal(Math.round(plantedAim.x), 450);
  assert.equal(Math.round(plantedAim.y), 300);

  const movingAim = calculatePredictiveAimPoint(shooter, target, speed, false, 0.9);
  assert.equal(Math.round(movingAim.x) !== 450, true);
});

test('Ballistics: parabolic height calculation', () => {
  const peakHeight = 80;
  assert.equal(calculateParabolicHeight(0, peakHeight), 0);
  assert.equal(calculateParabolicHeight(0.5, peakHeight), peakHeight);
  assert.equal(calculateParabolicHeight(1, peakHeight), 0);
});

test('Shield Wall: braced block absorbs 75% arrow damage', () => {
  const normal = calculateShieldArrowDamage(20, false);
  assert.equal(normal.damage, 20);
  assert.equal(normal.deflected, false);

  const braced = calculateShieldArrowDamage(20, true);
  assert.equal(braced.damage, 5);
  assert.equal(braced.deflected, true);
});

test('Cavalry: momentum velocity multiplier up to 2.5x and -25% mud speed penalty', () => {
  const baseSpeed = 60;
  assert.equal(calculateCavalrySpeed(baseSpeed, 1.0, false), 60);
  assert.equal(calculateCavalrySpeed(baseSpeed, 2.5, false), 150);
  assert.equal(calculateCavalrySpeed(baseSpeed, 3.5, false), 150);
  // In mud: reduced by 25% (0.75x)
  assert.equal(calculateCavalrySpeed(baseSpeed, 1.0, true), 45);
  assert.equal(calculateCavalrySpeed(baseSpeed, 2.0, true), 90);
});

test('Cavalry: shock charge and 5.0x flanking critical', () => {
  const baseDamage = 30;

  const chargeRes = calculateCavalryChargeDamage(baseDamage, 2.5, false);
  assert.equal(chargeRes.damage, 75);
  assert.equal(chargeRes.isFlankCrit, false);

  const flankRes = calculateCavalryChargeDamage(baseDamage, 2.5, true);
  assert.equal(flankRes.damage, 150);
  assert.equal(flankRes.isFlankCrit, true);
  assert.equal(flankRes.multiplier, 5.0);
});

test('Veterancy tiers & perks', () => {
  assert.equal(getVeterancyTier(0), 1);
  assert.equal(getVeterancyTier(99), 1);
  assert.equal(getVeterancyTier(100), 2);
  assert.equal(getVeterancyTier(249), 2);
  assert.equal(getVeterancyTier(250), 3);

  const vetPerks = getVeterancyPerks(2);
  assert.equal(vetPerks.damageMultiplier, 1.15);
  assert.equal(vetPerks.hpMultiplier, 1.15);
  assert.equal(vetPerks.attackSpeedMultiplier, 1.18);
  assert.equal(vetPerks.title, 'VET');

  const elitePerks = getVeterancyPerks(3);
  assert.equal(elitePerks.damageMultiplier, 1.3);
  assert.equal(elitePerks.hpMultiplier, 1.3);
  assert.equal(elitePerks.attackSpeedMultiplier, 1.36);
  assert.equal(elitePerks.title, 'ELITE');
});

test('Rally Horn: enemy panic condition (weakened or frontline within 260px)', () => {
  assert.equal(shouldEnemyPanic(65, 100), true);
  assert.equal(shouldEnemyPanic(50, 100), true);
  assert.equal(shouldEnemyPanic(66, 100), false);
  assert.equal(shouldEnemyPanic(100, 100), false);
  // Frontline enemy at 100% HP within 260px of Blue frontline panics
  assert.equal(shouldEnemyPanic(100, 100, 180), true);
  assert.equal(shouldEnemyPanic(100, 100, 320), false);
});

test('Tug of War: strength ratio balance', () => {
  const balanced = calculateTugOfWar(500, 500, 500, 500);
  assert.equal(balanced.bluePercent, 50);
  assert.equal(balanced.redPercent, 50);

  const blueWinning = calculateTugOfWar(400, 500, 100, 500);
  assert.ok(blueWinning.bluePercent > 70);
  assert.equal(blueWinning.bluePercent + blueWinning.redPercent, 100);
});

test('Formations: distributes points evenly along stroke and multi-rank blocks with x >= 80 clamp', () => {
  const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const points = distributePointsAlongStroke(line, 5);
  assert.equal(points.length, 5);
  assert.equal(points[0].x, 0);
  assert.equal(points[1].x, 25);
  assert.equal(points[2].x, 50);
  assert.equal(points[3].x, 75);
  assert.equal(points[4].x, 100);

  const multiRank = distributeMultiRankFormation([{ x: 40, y: 200 }, { x: 40, y: 400 }], 45, 3, 15);
  assert.equal(multiRank.length, 45);
  assert.ok(multiRank.every((p) => p.x >= 80 && p.y >= UI_SAFE_ZONE.minY && p.y <= UI_SAFE_ZONE.maxY));
});

test('Collisions: tree obstacle separation', () => {
  const tree = { x: 680, y: 560, radius: 26, type: 'oak' as const };
  const hit = checkTreeCollision(680, 570, 10, [tree]);
  assert.equal(hit.collides, true);
  assert.ok(hit.pushY > 0);

  const miss = checkTreeCollision(100, 100, 10, [tree]);
  assert.equal(miss.collides, false);
});

test('Burn status: calculates incremental tick damage', () => {
  const tick1 = calculateBurnTick(3.0, 0.5, 12);
  assert.equal(tick1.remainingTimer, 2.5);
  assert.equal(tick1.damageDealt, 6.0);

  const tick2 = calculateBurnTick(0.2, 0.5, 12);
  assert.equal(tick2.remainingTimer, 0);
  assert.equal(tick2.damageDealt, 2.4);

  const tickZero = calculateBurnTick(0, 0.5, 12);
  assert.equal(tickZero.damageDealt, 0);
});

test('Barricades: circular unit collision and separation', () => {
  const barricade = { x: 500, y: 300, width: 20, height: 12, hp: 100, maxHp: 100 };
  const hit = checkBarricadeCollision({ x: 500, y: 310, radius: 6 }, barricade);
  assert.equal(hit.collides, true);
  assert.ok(hit.pushY > 0);

  const miss = checkBarricadeCollision({ x: 600, y: 400, radius: 6 }, barricade);
  assert.equal(miss.collides, false);
});

test('Accolades: awards honorary medals based on battlefield achievements', () => {
  const stats = {
    score: 1200,
    wave: 5,
    maxWaves: 5,
    enemiesDefeated: 50,
    flankingCrits: 4,
    arrowsDeflected: 8,
    rallyHornsUsed: 2,
    elapsedTime: 120,
    blueStrength: 80,
    redStrength: 20,
    flameKills: 5,
    barricadesBuilt: 2,
  };

  const medals = getBattleAccolades(stats);
  assert.ok(medals.some((m) => m.includes('Thunderous Flanker')));
  assert.ok(medals.some((m) => m.includes('Adamantine Wall')));
  assert.ok(medals.some((m) => m.includes('Highland Pyromancer')));
  assert.ok(medals.some((m) => m.includes('Fortification Engineer')));
  assert.ok(medals.some((m) => m.includes('Sovereign of the Pass')));
});

test('Unit Veterancy: tiers based on enemies defeated', () => {
  assert.equal(calculateUnitVeterancyTier(0), 1);
  assert.equal(calculateUnitVeterancyTier(1), 1);
  assert.equal(calculateUnitVeterancyTier(2), 2);
  assert.equal(calculateUnitVeterancyTier(3), 2);
  assert.equal(calculateUnitVeterancyTier(4), 3);
  assert.equal(calculateUnitVeterancyTier(10), 3);

  const vetBonus = calculateUnitVeterancyBonuses(2);
  assert.equal(vetBonus.hpMultiplier, 1.2);
  assert.equal(vetBonus.damageMultiplier, 1.25);
  assert.equal(vetBonus.rankIcon, '★');

  const eliteBonus = calculateUnitVeterancyBonuses(3);
  assert.equal(eliteBonus.hpMultiplier, 1.4);
  assert.equal(eliteBonus.damageMultiplier, 1.5);
  assert.equal(eliteBonus.rankIcon, '★★');
});

test('Unit Veterancy: applyUnitKillProgress promotes unit with bonus HP and damage', () => {
  const dummyUnit = {
    id: 'shield_0',
    type: 'shield' as const,
    isPlayer: true,
    x: 100,
    y: 100,
    targetX: 100,
    targetY: 100,
    vx: 0,
    vy: 0,
    radius: 6,
    hp: 100,
    maxHp: 100,
    baseSpeed: 38,
    speed: 38,
    damage: 16,
    range: 14,
    attackCooldown: 1.0,
    attackTimer: 0,
    targetUnitId: null,
    elevation: 'lowland' as const,
    facing: 0,
    momentum: 1.0,
    pathWaypoints: [],
    currentWaypointIdx: 0,
    kills: 0,
    veterancyTier: 1 as const,
  };

  const kill1 = applyUnitKillProgress(dummyUnit);
  assert.equal(kill1.rankedUp, false);
  assert.equal(dummyUnit.veterancyTier, 1);

  const kill2 = applyUnitKillProgress(dummyUnit);
  assert.equal(kill2.rankedUp, true);
  assert.equal(kill2.newTier, 2);
  assert.equal(dummyUnit.maxHp, 120);
  assert.equal(dummyUnit.damage, 20);

  const kill3 = applyUnitKillProgress(dummyUnit);
  assert.equal(kill3.rankedUp, false);

  const kill4 = applyUnitKillProgress(dummyUnit);
  assert.equal(kill4.rankedUp, true);
  assert.equal(kill4.newTier, 3);
  assert.equal(dummyUnit.maxHp, 140);
  assert.equal(dummyUnit.damage, 24);
});

test('Tier 3 Squad Evolutions: Pavise 90% arrow block and Lancer 3.2x max momentum speed', () => {
  assert.equal(SQUAD_SPECIALIZATIONS.shield.length, 2);
  assert.equal(SQUAD_SPECIALIZATIONS.archer.length, 2);
  assert.equal(SQUAD_SPECIALIZATIONS.cavalry.length, 2);

  // Tower Pavise Guard reduces braced arrow damage by 90%
  const paviseBlock = calculateShieldArrowDamage(40, true, 'pavise');
  assert.equal(paviseBlock.deflected, true);
  assert.equal(paviseBlock.damage, 4);

  // Outrider Lancers allow momentum up to 3.2x
  const lancerSpeed = calculateCavalrySpeed(50, 3.2, false, 'lancer');
  assert.equal(lancerSpeed, 160);
});

test('Grindable Meta-Progression & Endless Crusade Wave Scaling', () => {
  assert.equal(META_UPGRADES.length, 6);
  const def = getDefaultMetaProgression();
  assert.equal(def.warGold, 0);
  assert.equal(def.upgrades.conscription, 0);

  const conscriptionCfg = META_UPGRADES[0];
  assert.equal(getMetaUpgradeCost(conscriptionCfg, 0), 80);
  assert.ok(getMetaUpgradeCost(conscriptionCfg, 3) > 80);

  const wave6 = generateEndlessWaveConfig(6);
  const wave10 = generateEndlessWaveConfig(10);
  assert.equal(wave6.waveNumber, 6);
  assert.ok(wave10.swordsmen > wave6.swordsmen);
  assert.ok((wave10.batteringRams ?? 0) > (wave6.batteringRams ?? 0));
});

test('AI Pathfinding: Engagement Load Balancing & Context-Aware Obstacle/Congestion Steering', () => {
  const makeDummyUnit = (id: string, x: number, y: number, isPlayer: boolean): Unit => ({
    id,
    type: 'swordsman',
    isPlayer,
    x,
    y,
    targetX: x,
    targetY: y,
    vx: 0,
    vy: 0,
    radius: 6,
    hp: 85,
    maxHp: 85,
    baseSpeed: 42,
    speed: 42,
    damage: 14,
    range: 14,
    attackCooldown: 1.2,
    attackTimer: 0,
    targetUnitId: null,
    elevation: 'lowland',
    facing: Math.PI,
    momentum: 1.0,
    pathWaypoints: [],
    currentWaypointIdx: 0,
  });

  const seeker = makeDummyUnit('red_1', 600, 320, false);
  const crowdedBlue = makeDummyUnit('blue_crowded', 540, 320, true);
  const freeBlue = makeDummyUnit('blue_free', 535, 328, true);

  // Even though crowdedBlue is 5px closer, 3 existing engagers make freeBlue score better (lower)
  const scoreCrowded = scoreTargetForUnit(seeker, crowdedBlue, 3, false);
  const scoreFree = scoreTargetForUnit(seeker, freeBlue, 0, false);
  assert.ok(scoreFree < scoreCrowded);

  // Lateral wrap-around when a braced friendly unit blocks the direct line of advance
  const movingAlly = makeDummyUnit('blue_mover', 300, 330, true);
  const bracedAlly = makeDummyUnit('blue_blocker', 316, 332, true);
  bracedAlly.isBraced = true;

  const steer = calculateTacticalSteeringVector(movingAlly, 400, 330, [movingAlly, bracedAlly], []);
  assert.ok(Math.abs(steer.y) > 0.15, 'Should steer laterally around braced friendly blocker');

  // Enemy Wave Commander AI: Reactive Counter-Volley Brace & Flank Pincer Trap
  const volleyBraceDecision = evaluateCommanderTacticalDecision({
    currentOrder: 'MARCH_IN_FORMATION',
    orderTimer: 4.5,
    defendCooldown: 0,
    minRedX: 610,
    redMeleeCount: 30,
    redArcherCount: 10,
    redFlankerCount: 8,
    blueShieldBraced: true,
    blueBarricadesCount: 2,
    blueVolleyActive: true,
    blueFireArrowsActive: false,
    blueArmyAttacking: false,
    flankersInPosition: 1,
    commanderThreatDist: 280,
  });
  assert.equal(volleyBraceDecision.shouldSwitch, true);
  assert.equal(volleyBraceDecision.nextOrder, 'TACTICAL_DEFEND');

  const pincerDecision = evaluateCommanderTacticalDecision({
    currentOrder: 'TACTICAL_DEFEND',
    orderTimer: 1.8,
    defendCooldown: 5.0,
    minRedX: 530,
    redMeleeCount: 28,
    redArcherCount: 10,
    redFlankerCount: 8,
    blueShieldBraced: true,
    blueBarricadesCount: 1,
    blueVolleyActive: false,
    blueFireArrowsActive: false,
    blueArmyAttacking: false,
    flankersInPosition: 5,
    commanderThreatDist: 240,
  });
  assert.equal(pincerDecision.shouldSwitch, true);
  assert.equal(pincerDecision.nextOrder, 'COORDINATED_ASSAULT');
});



