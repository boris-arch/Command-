/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
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

test('Topography: plateau and cliff detection', () => {
  // Plateau is X: [25, 390], Y: [25, 255]
  assert.equal(isPointOnPlateau(100, 100), true);
  assert.equal(isPointOnPlateau(500, 400), false);
  
  // Cliff face is X < 430, Y: [260, 340]
  assert.equal(isPointInCliffFace(150, 280), true);
  assert.equal(isPointInCliffFace(500, 280), false);
  assert.equal(isPointInCliffFace(150, 100), false);

  // North Ramp is X: [315, 470], Y: [15, 180]
  assert.equal(isPointInNorthRamp(350, 100), true);
  assert.equal(isPointInNorthRamp(100, 100), false);
});

test('Ballistics: highland archer range +30%', () => {
  const baseRange = 300;
  const lowlandRange = calculateArcherRange(baseRange, false);
  const highlandRange = calculateArcherRange(baseRange, true);

  assert.equal(lowlandRange, 300);
  assert.equal(highlandRange, 390); // 300 * 1.3
});

test('Ballistics: parabolic height calculation', () => {
  const peakHeight = 80;
  assert.equal(calculateParabolicHeight(0, peakHeight), 0);
  assert.equal(calculateParabolicHeight(0.5, peakHeight), peakHeight); // 4 * 80 * 0.5 * 0.5 = 80
  assert.equal(calculateParabolicHeight(1, peakHeight), 0);
});

test('Shield Wall: braced block absorbs 75% arrow damage', () => {
  const normal = calculateShieldArrowDamage(20, false);
  assert.equal(normal.damage, 20);
  assert.equal(normal.deflected, false);

  const braced = calculateShieldArrowDamage(20, true);
  assert.equal(braced.damage, 5); // 20 * 0.25 = 5
  assert.equal(braced.deflected, true);
});

test('Cavalry: momentum velocity multiplier up to 2.5x', () => {
  const baseSpeed = 50;
  assert.equal(calculateCavalrySpeed(baseSpeed, 1.0), 50);
  assert.equal(calculateCavalrySpeed(baseSpeed, 2.5), 125);
  // Clamped at 2.5
  assert.equal(calculateCavalrySpeed(baseSpeed, 3.5), 125);
});

test('Cavalry: shock charge and 5.0x flanking critical', () => {
  const baseDamage = 30;

  // Unengaged enemy charge
  const chargeRes = calculateCavalryChargeDamage(baseDamage, 2.5, false);
  assert.equal(chargeRes.damage, 75); // 30 * 2.5
  assert.equal(chargeRes.isFlankCrit, false);

  // Enemy engaged with Blue Shields -> 2x flanking critical (5.0x total)
  const flankRes = calculateCavalryChargeDamage(baseDamage, 2.5, true);
  assert.equal(flankRes.damage, 150); // 30 * 5.0
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
  assert.equal(vetPerks.attackSpeedMultiplier, 1.18);
  assert.equal(vetPerks.title, 'VET');

  const elitePerks = getVeterancyPerks(3);
  assert.equal(elitePerks.damageMultiplier, 1.3);
  assert.equal(elitePerks.attackSpeedMultiplier, 1.36);
  assert.equal(elitePerks.title, 'ELITE');
});

test('Rally Horn: enemy panic condition', () => {
  // Should panic if current HP <= 65% of max
  assert.equal(shouldEnemyPanic(65, 100), true);
  assert.equal(shouldEnemyPanic(50, 100), true);
  assert.equal(shouldEnemyPanic(66, 100), false);
  assert.equal(shouldEnemyPanic(100, 100), false);
});

test('Tug of War: strength ratio balance', () => {
  const balanced = calculateTugOfWar(500, 500, 500, 500);
  assert.equal(balanced.bluePercent, 50);
  assert.equal(balanced.redPercent, 50);

  const blueWinning = calculateTugOfWar(400, 500, 100, 500);
  assert.ok(blueWinning.bluePercent > 70);
  assert.equal(blueWinning.bluePercent + blueWinning.redPercent, 100);
});

test('Formations: distributes points evenly along stroke', () => {
  const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const points = distributePointsAlongStroke(line, 5);
  assert.equal(points.length, 5);
  assert.equal(points[0].x, 0);
  assert.equal(points[1].x, 25);
  assert.equal(points[2].x, 50);
  assert.equal(points[3].x, 75);
  assert.equal(points[4].x, 100);
});

test('Collisions: tree obstacle separation', () => {
  const tree = { x: 680, y: 560, radius: 26, type: 'oak' as const };
  // Unit intersecting tree
  const hit = checkTreeCollision(680, 570, 10, [tree]);
  assert.equal(hit.collides, true);
  assert.ok(hit.pushY > 0);

  // Far away
  const miss = checkTreeCollision(100, 100, 10, [tree]);
  assert.equal(miss.collides, false);
});
