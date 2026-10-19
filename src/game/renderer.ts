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
  Barricade,
  GroundDecal,
} from './types.ts';
import {
  UI_SAFE_ZONE,
  BLUE_DEPLOYMENT_ZONE,
  HIGH_GROUND_HILLS,
  MUD_PATCHES,
  distributeMultiRankFormation,
} from './rules.ts';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private bufferWidth: number;
  private bufferHeight: number;
  public readonly worldWidth: number = 1200;
  public readonly worldHeight: number = 700;
  private scaleX: number = 1;
  private scaleY: number = 1;

  constructor(
    ctx: CanvasRenderingContext2D,
    bufferWidth: number = 1200,
    bufferHeight: number = 700,
    scaleX: number = 1,
    scaleY: number = 1
  ) {
    this.ctx = ctx;
    this.bufferWidth = bufferWidth;
    this.bufferHeight = bufferHeight;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.disableSmoothing();
  }

  private disableSmoothing() {
    this.ctx.imageSmoothingEnabled = false;
    if ('webkitImageSmoothingEnabled' in this.ctx) {
      (this.ctx as unknown as { webkitImageSmoothingEnabled: boolean }).webkitImageSmoothingEnabled = false;
    }
  }

  public resize(bufferWidth: number, bufferHeight: number, scaleX: number = 1, scaleY: number = 1) {
    this.bufferWidth = bufferWidth;
    this.bufferHeight = bufferHeight;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.disableSmoothing();
  }

  public render(
    units: Unit[],
    projectiles: Projectile[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    drawnPath: Point[],
    selectedSquad: SquadType | null,
    goldRings: { x: number; y: number; radius: number; alpha: number }[],
    gameTime: number,
    barricades: Barricade[] = [],
    isTacticalFocus: boolean = false,
    groundDecals: GroundDecal[] = [],
    shakeIntensity: number = 0
  ) {
    const ctx = this.ctx;
    ctx.save();
    // 1. Clear physical canvas buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.bufferWidth, this.bufferHeight);

    // 2. High-DPI crisp scaling to native display resolution + subtle combat camera micro-shake
    const sx = shakeIntensity > 0 ? (Math.sin(gameTime * 68) * shakeIntensity) : 0;
    const sy = shakeIntensity > 0 ? (Math.cos(gameTime * 54) * shakeIntensity * 0.7) : 0;
    ctx.setTransform(this.scaleX, 0, 0, this.scaleY, sx * this.scaleX, sy * this.scaleY);
    this.disableSmoothing();

    // 1. Draw Open Flat-Ground Battlefield Topography & Tactical Terrain Zones
    this.drawTerrain(gameTime, barricades, selectedSquad);

    // 1b. Draw Battlefield Scars, Scorch Marks, & Fallen Gear Decals
    if (groundDecals.length > 0) {
      this.drawGroundDecals(groundDecals);
    }

    // 2. Draw Braced Shield Wall Connection Line, Enemy Commander Aura/Signals, Cavalry Flank Trails & Selected Squad Highlight Rings
    this.drawBracedShieldWallLine(units, gameTime);
    this.drawEnemyCommanderAuraAndSignals(units, gameTime);
    this.drawActiveCavalryFlankTrails(units, gameTime);
    if (selectedSquad) {
      this.drawSelectedSquadHighlights(units, selectedSquad, gameTime);
    }

    // 3. Draw Drawn Path preview (Live 3-rank ghost formation slots or cavalry route)
    if (drawnPath.length > 1 && selectedSquad) {
      this.drawActivePathPreview(drawnPath, selectedSquad, units);
    }

    // 4. Draw Units (Sorted by Y for authentic depth layering)
    const sortedUnits = [...units].sort((a, b) => a.y - b.y);

    // Shadows first
    for (const u of sortedUnits) {
      this.drawUnitShadow(u);
    }

    // Units
    for (const u of sortedUnits) {
      this.drawUnit(u, gameTime);
    }

    // 5. Draw Subtle Squad Stance/Formation Banners above allied squad centroids
    this.drawSquadBanners(units, selectedSquad);

    // 6. Draw Projectiles (Ballistic Parabolic Arrows)
    for (const proj of projectiles) {
      this.drawProjectile(proj);
    }

    // 7. Draw Particles
    for (const p of particles) {
      this.drawParticle(p);
    }

    // 8. Draw Golden Shockwave Rings (Rally Horn)
    for (const ring of goldRings) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250, 204, 21, ${ring.alpha})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, Math.max(0, ring.radius - 8), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(253, 224, 71, ${ring.alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 9. Draw Floating Combat Texts (Shrunk by 40%)
    for (const ft of floatingTexts) {
      this.drawFloatingText(ft);
    }

    // 10. Tactical Focus Subtle Border Vignette
    if (isTacticalFocus) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, this.worldWidth - 6, this.worldHeight - 6);
      ctx.restore();
    }

    ctx.restore();
  }

  // ================= FLAT-GROUND TOPOGRAPHY & TACTICAL TERRAIN ================= //

  private drawTerrain(
    gameTime: number,
    deployedBarricades: Barricade[],
    selectedSquad: SquadType | null
  ) {
    const ctx = this.ctx;

    // A. Base Open Flat Grassy Plain (100% walkable sunny meadow)
    const grassGrad = ctx.createLinearGradient(0, 0, 0, this.worldHeight);
    grassGrad.addColorStop(0, '#7ecc4a');
    grassGrad.addColorStop(0.5, '#74c342');
    grassGrad.addColorStop(1, '#6bb83b');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Subtle sunny grass patches across the open plain
    ctx.fillStyle = 'rgba(163, 230, 53, 0.2)';
    const grassPatches = [
      { x: 860, y: 140, rx: 110, ry: 44 },
      { x: 1050, y: 165, rx: 85, ry: 40 },
      { x: 850, y: 495, rx: 115, ry: 42 },
      { x: 1040, y: 500, rx: 90, ry: 38 },
    ];
    for (const gp of grassPatches) {
      ctx.beginPath();
      ctx.ellipse(gp.x, gp.y, gp.rx, gp.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // A2. Tactical High Ground Hills on the North & South Grass Flanks (+20% Archer Range/Damage)
    for (const hill of HIGH_GROUND_HILLS) {
      ctx.save();
      // Outer hill elevation shadow
      ctx.fillStyle = 'rgba(45, 95, 20, 0.22)';
      ctx.beginPath();
      ctx.ellipse(hill.x, hill.y + 4, hill.rx + 4, hill.ry + 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main elevated turf knoll
      const hillGrad = ctx.createRadialGradient(hill.x - 12, hill.y - 8, 8, hill.x, hill.y, hill.rx);
      hillGrad.addColorStop(0, 'rgba(190, 242, 100, 0.55)');
      hillGrad.addColorStop(0.7, 'rgba(132, 204, 22, 0.42)');
      hillGrad.addColorStop(1, 'rgba(101, 163, 13, 0.28)');
      ctx.fillStyle = hillGrad;
      ctx.beginPath();
      ctx.ellipse(hill.x, hill.y, hill.rx, hill.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Topographic contour ring
      ctx.strokeStyle = 'rgba(236, 252, 203, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(hill.x, hill.y, hill.rx * 0.86, hill.ry * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Subtle tactical label on the hill
      ctx.font = 'bold 8.5px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20, 45, 10, 0.65)';
      ctx.fillText(hill.label, hill.x, hill.y + 3);
      ctx.restore();
    }

    // Subtle grass blade tufts
    ctx.fillStyle = '#4d8e25';
    const tufts = [
      { x: 95, y: 115 }, { x: 380, y: 115 }, { x: 740, y: 145 }, { x: 930, y: 122 },
      { x: 125, y: 505 }, { x: 390, y: 515 }, { x: 730, y: 508 }, { x: 950, y: 518 },
    ];
    for (const t of tufts) {
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - 2.5, t.y - 5.5);
      ctx.lineTo(t.x, t.y - 1.5);
      ctx.lineTo(t.x + 2.5, t.y - 6);
      ctx.lineTo(t.x + 1, t.y);
      ctx.fill();
    }

    // B. Wide Central Dirt Road across Open Flat Plain (Y: 235 to 438, centered at Y=336)
    ctx.save();
    ctx.fillStyle = 'rgba(55, 85, 25, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 228);
    ctx.bezierCurveTo(300, 236, 600, 226, 900, 236);
    ctx.lineTo(this.worldWidth, 230);
    ctx.lineTo(this.worldWidth, 444);
    ctx.bezierCurveTo(900, 438, 600, 448, 300, 438);
    ctx.lineTo(0, 443);
    ctx.closePath();
    ctx.fill();

    const roadGrad = ctx.createLinearGradient(0, 235, 0, 438);
    roadGrad.addColorStop(0, '#ebd09f');
    roadGrad.addColorStop(0.3, '#f5deb3');
    roadGrad.addColorStop(0.7, '#ebd19f');
    roadGrad.addColorStop(1, '#dfbc85');
    ctx.fillStyle = roadGrad;
    ctx.strokeStyle = '#c8a36c';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, 235);
    ctx.bezierCurveTo(300, 242, 600, 232, 900, 242);
    ctx.lineTo(this.worldWidth, 236);
    ctx.lineTo(this.worldWidth, 436);
    ctx.bezierCurveTo(900, 430, 600, 440, 300, 430);
    ctx.lineTo(0, 436);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle dirt patches along the wide central road
    const soilPatches = [
      { x: 140, y: 295, rx: 70, ry: 26, rot: -0.04, col: 'rgba(195, 150, 95, 0.22)' },
      { x: 300, y: 365, rx: 85, ry: 30, rot: 0.05, col: 'rgba(215, 175, 120, 0.25)' },
      { x: 920, y: 310, rx: 105, ry: 36, rot: -0.04, col: 'rgba(195, 150, 95, 0.22)' },
      { x: 1060, y: 365, rx: 90, ry: 32, rot: 0.04, col: 'rgba(225, 185, 130, 0.25)' },
    ];
    for (const sp of soilPatches) {
      ctx.fillStyle = sp.col;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.rx, sp.ry, sp.rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle wagon ruts along the central road
    ctx.strokeStyle = 'rgba(180, 135, 80, 0.35)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 290);
    ctx.bezierCurveTo(300, 297, 600, 287, 900, 295);
    ctx.lineTo(this.worldWidth, 291);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 380);
    ctx.bezierCurveTo(300, 387, 600, 377, 900, 385);
    ctx.lineTo(this.worldWidth, 381);
    ctx.stroke();

    // B2. Tactical Rough Dirt / Mud Patches on the Road (-25% Cavalry Charge Speed)
    for (const mud of MUD_PATCHES) {
      ctx.save();
      ctx.fillStyle = 'rgba(105, 72, 38, 0.44)';
      ctx.beginPath();
      ctx.ellipse(mud.x, mud.y, mud.rx, mud.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(78, 50, 24, 0.36)';
      ctx.beginPath();
      ctx.ellipse(mud.x - 8, mud.y + 2, mud.rx * 0.68, mud.ry * 0.62, 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(92, 60, 28, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(mud.x, mud.y, mud.rx, mud.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 248, 220, 0.85)';
      ctx.fillText(mud.label, mud.x, mud.y + 3);
      ctx.restore();
    }

    // Small pebbles scattered along road & plain edges
    const pebbles = [
      { x: 80, y: 270, r: 2.0, c: '#b39268' }, { x: 165, y: 350, r: 1.8, c: '#9c7b52' },
      { x: 245, y: 310, r: 2.2, c: '#c9a87c' }, { x: 335, y: 400, r: 1.9, c: '#a8855c' },
      { x: 595, y: 280, r: 2.1, c: '#b8946a' }, { x: 625, y: 405, r: 2.3, c: '#c4a275' },
      { x: 845, y: 355, r: 2.1, c: '#b59267' }, { x: 925, y: 315, r: 1.8, c: '#c8a77d' },
      { x: 1015, y: 395, r: 2.2, c: '#9a7951' }, { x: 1110, y: 325, r: 1.9, c: '#bda076' },
    ];
    for (const pb of pebbles) {
      ctx.fillStyle = 'rgba(50, 35, 15, 0.28)';
      ctx.beginPath();
      ctx.ellipse(pb.x + 0.8, pb.y + 0.8, pb.r * 1.25, pb.r * 0.85, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pb.c;
      ctx.beginPath();
      ctx.ellipse(pb.x, pb.y, pb.r * 1.2, pb.r * 0.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // C. Translucent Blue Deployment Zone on Left Side when DRAW FORMATION is active
    if (selectedSquad) {
      ctx.save();
      const dz = BLUE_DEPLOYMENT_ZONE;
      const w = dz.maxX - dz.minX;
      const h = dz.maxY - dz.minY;

      const zoneGrad = ctx.createLinearGradient(dz.minX, 0, dz.maxX, 0);
      zoneGrad.addColorStop(0, 'rgba(37, 99, 235, 0.14)');
      zoneGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
      zoneGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
      ctx.fillStyle = zoneGrad;
      ctx.beginPath();
      ctx.roundRect(dz.minX, dz.minY, w, h, 10);
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.roundRect(dz.minX, dz.minY, w, h, 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bottom-left label inside deployment zone so it never overlaps the top-left hill label or unit banners
      const squadLabel =
        selectedSquad === 'shield'
          ? '🛡️ DEPLOYMENT ZONE · SHIELDS [1]'
          : selectedSquad === 'archer'
          ? '🏹 DEPLOYMENT ZONE · ARCHERS [2]'
          : '🐎 DEPLOYMENT ZONE · CAVALRY FLANK [3]';

      const badgeY = dz.maxY - 22;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.roundRect(dz.minX + 8, badgeY, 178, 16, 6);
      ctx.fill();

      ctx.font = 'bold 8.5px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText(squadLabel, dz.minX + 14, badgeY + 11);
      ctx.restore();
    }

    // D. Safe-Zone Tactical Field Perimeter Lines (at Y=78 and Y=545)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(20, UI_SAFE_ZONE.minY);
    ctx.lineTo(this.worldWidth - 20, UI_SAFE_ZONE.minY);
    ctx.moveTo(20, UI_SAFE_ZONE.maxY);
    ctx.lineTo(this.worldWidth - 20, UI_SAFE_ZONE.maxY);
    ctx.stroke();
    ctx.restore();

    // E. Miniature Wooden Spike Barricades (50% scale) - Strictly inside safe-zone!
    const staticBarricades = [
      { x: 375, y: 210 },
      { x: 375, y: 460 },
    ];
    for (const sb of staticBarricades) {
      this.drawSpikeBarricade(sb.x, sb.y);
    }

    for (const b of deployedBarricades) {
      this.drawSpikeBarricade(b.x, b.y, b.hp, b.maxHp);
    }

    // F. Deployment Flags (Strictly inside safe-zone Y: 108..520)
    const blueFlags = [
      { x: 65, y: 118 },
      { x: 65, y: 515 },
      { x: 355, y: 118 },
      { x: 355, y: 515 },
    ];
    for (const fp of blueFlags) {
      this.drawBannerFlag(fp.x, fp.y, '#2563eb', '#60a5fa', gameTime);
    }

    const redFlags = [
      { x: 1145, y: 118 },
      { x: 1145, y: 245 },
      { x: 1145, y: 385 },
      { x: 1145, y: 515 },
    ];
    for (const fp of redFlags) {
      this.drawBannerFlag(fp.x, fp.y, '#dc2626', '#f87171', gameTime + 1.5);
    }
  }

  private drawGroundDecals(decals: GroundDecal[]) {
    const ctx = this.ctx;
    ctx.save();
    for (const d of decals) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.globalAlpha = d.alpha;

      if (d.type === 'scorch') {
        ctx.fillStyle = 'rgba(30, 20, 15, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 0, d.radius * 1.25, d.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'crater') {
        ctx.fillStyle = 'rgba(65, 42, 22, 0.6)';
        ctx.strokeStyle = 'rgba(40, 24, 12, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, d.radius * 1.4, d.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Miniature fallen shield & broken blade remnant
        ctx.fillStyle = d.isBlue ? '#1d4ed8' : '#991b1b';
        ctx.strokeStyle = d.isBlue ? '#93c5fd' : '#fca5a5';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, -1);
        ctx.lineTo(4, 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawActiveCavalryFlankTrails(units: Unit[], gameTime: number) {
    const cavWithRoutes = units.filter(
      (u) => u.isPlayer && u.type === 'cavalry' && !u.isDying && u.pathWaypoints.length > u.currentWaypointIdx
    );
    if (cavWithRoutes.length === 0) return;

    const ctx = this.ctx;
    ctx.save();
    // Draw up to 2 representative wing leader routes (North & South wings) so the map stays clean
    const leaders = [
      cavWithRoutes.find((u) => u.y < 335),
      cavWithRoutes.find((u) => u.y >= 335),
    ].filter((u): u is Unit => Boolean(u));

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -gameTime * 24;

    for (const leader of leaders) {
      ctx.beginPath();
      ctx.moveTo(leader.x, leader.y);
      for (let i = leader.currentWaypointIdx; i < leader.pathWaypoints.length; i++) {
        const wp = leader.pathWaypoints[i];
        ctx.lineTo(wp.x, wp.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draws a continuous golden-blue tactical shield wall line connecting braced front-rank shields.
   */
  private drawBracedShieldWallLine(units: Unit[], gameTime: number) {
    const bracedShields = units
      .filter((u) => u.isPlayer && u.type === 'shield' && !u.isDying && u.isBraced)
      .sort((a, b) => a.y - b.y);

    if (bracedShields.length < 2) return;

    // Pick frontline shields (highest X within each Y slice)
    const ctx = this.ctx;
    ctx.save();
    const pulse = 0.55 + Math.sin(gameTime * 5) * 0.15;
    ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < bracedShields.length; i++) {
      const s = bracedShields[i];
      if (!started) {
        ctx.moveTo(s.x + 4, s.y);
        started = true;
      } else {
        const prev = bracedShields[i - 1];
        if (Math.hypot(s.x - prev.x, s.y - prev.y) < 32) {
          ctx.lineTo(s.x + 4, s.y);
        } else {
          ctx.moveTo(s.x + 4, s.y);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draws the living Enemy Commander's 180px pulsing ground aura, crimson command signal lines,
   * warhorn order ripples, and Red infantry braced wall line when TACTICAL_DEFEND is active.
   */
  private drawEnemyCommanderAuraAndSignals(units: Unit[], gameTime: number) {
    const commander = units.find((u) => !u.isPlayer && u.isCommander && !u.isDying);
    const ctx = this.ctx;

    // If Red infantry are braced under TACTICAL_DEFEND, draw a crimson-iron braced line
    const bracedRed = units
      .filter((u) => !u.isPlayer && !u.isCommander && !u.isDying && u.isBraced)
      .sort((a, b) => a.y - b.y);
    if (bracedRed.length >= 2) {
      ctx.save();
      const pulse = 0.5 + Math.sin(gameTime * 6) * 0.18;
      ctx.strokeStyle = `rgba(248, 113, 113, ${pulse})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < bracedRed.length; i++) {
        const r = bracedRed[i];
        if (!started) {
          ctx.moveTo(r.x - 4, r.y);
          started = true;
        } else {
          const prev = bracedRed[i - 1];
          if (Math.hypot(r.x - prev.x, r.y - prev.y) < 34) {
            ctx.lineTo(r.x - 4, r.y);
          } else {
            ctx.moveTo(r.x - 4, r.y);
          }
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    if (!commander) return;

    const auraR = commander.commanderAuraRadius ?? 180;
    const isDefending = commander.commanderOrder === 'TACTICAL_DEFEND';
    const isAssault = commander.commanderOrder === 'COORDINATED_ASSAULT';
    const pulse = 0.45 + Math.sin(gameTime * 4.5) * 0.15;

    ctx.save();

    // 1. Outer 180px Command Aura Ring on the ground (isometric ellipse perspective)
    ctx.strokeStyle = isDefending
      ? `rgba(56, 189, 248, ${pulse * 0.55})`
      : isAssault
      ? `rgba(239, 68, 68, ${pulse * 0.65})`
      : `rgba(250, 204, 21, ${pulse * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -gameTime * 18;
    ctx.beginPath();
    ctx.ellipse(commander.x, commander.y + 3, auraR, auraR * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Inner Golden-Crimson Royal Command Seal directly beneath the Commander
    const innerGrad = ctx.createRadialGradient(
      commander.x,
      commander.y + 3,
      2,
      commander.x,
      commander.y + 3,
      24
    );
    innerGrad.addColorStop(0, 'rgba(250, 204, 21, 0.38)');
    innerGrad.addColorStop(0.65, 'rgba(220, 38, 38, 0.25)');
    innerGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(commander.x, commander.y + 3, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 + Math.sin(gameTime * 6) * 0.2})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(commander.x, commander.y + 3, 18, 10.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2b. Subtle Golden-Crimson Command Aura Buff Rings beneath Red subordinates inside the 180px aura
    ctx.strokeStyle = isDefending
      ? 'rgba(56, 189, 248, 0.32)'
      : 'rgba(250, 204, 21, 0.28)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = 0; i < units.length; i++) {
      const sub = units[i];
      if (sub.isPlayer || sub.isCommander || sub.isDying) continue;
      if (Math.hypot(sub.x - commander.x, sub.y - commander.y) <= auraR) {
        const r = sub.radius + 1.5;
        ctx.moveTo(sub.x + r, sub.y + 2.5);
        ctx.ellipse(sub.x, sub.y + 2.5, r, r * 0.55, 0, 0, Math.PI * 2);
      }
    }
    ctx.stroke();

    // 3. Crimson Command Signal Lines & Warhorn Ripple when switching orders
    const sigTimer = commander.commanderSignalTimer ?? 0;
    if (sigTimer > 0) {
      const prog = 1 - Math.min(1, sigTimer / 1.65);
      const alpha = Math.max(0, (1 - prog) * 0.75);
      const rippleR = 16 + prog * 155;

      // Expanding Warhorn Ripple
      ctx.strokeStyle = isDefending
        ? `rgba(56, 189, 248, ${alpha})`
        : `rgba(250, 204, 21, ${alpha})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(commander.x, commander.y + 2, rippleR, rippleR * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle Crimson Command Signal Lines to representative squad positions
      const subordinates = units.filter(
        (u) => !u.isPlayer && !u.isCommander && !u.isDying
      );
      if (subordinates.length > 0) {
        const step = Math.max(1, Math.floor(subordinates.length / 6));
        ctx.strokeStyle = isDefending
          ? `rgba(125, 211, 252, ${alpha * 0.75})`
          : `rgba(248, 113, 113, ${alpha * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -gameTime * 36;
        ctx.beginPath();
        let count = 0;
        for (let i = 0; i < subordinates.length && count < 6; i += step) {
          const sub = subordinates[i];
          if (Math.hypot(sub.x - commander.x, sub.y - commander.y) <= 260) {
            ctx.moveTo(commander.x, commander.y - 6);
            ctx.lineTo(sub.x, sub.y - 2);
            count++;
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }

  /**
   * Highlights units belonging to the currently selected squad so the player knows which squad will receive the drawn path.
   */
  private drawSelectedSquadHighlights(units: Unit[], selectedSquad: SquadType, gameTime: number) {
    const ctx = this.ctx;
    const squadUnits = units.filter((u) => u.isPlayer && u.type === selectedSquad && !u.isDying);
    if (squadUnits.length === 0) return;

    const alpha = 0.42 + Math.sin(gameTime * 6) * 0.15;
    const ringColor =
      selectedSquad === 'shield'
        ? `rgba(96, 165, 250, ${alpha})`
        : selectedSquad === 'archer'
        ? `rgba(167, 139, 250, ${alpha})`
        : `rgba(56, 189, 248, ${alpha})`;

    ctx.save();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.4;
    for (const u of squadUnits) {
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 3, u.radius + 2.5, u.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draws compact floating squad stance/status banners above each allied squad's centroid
   * AND boss/commander overhead HP & order bars with unified vertical Y collision avoidance.
   */
  private drawSquadBanners(units: Unit[], selectedSquad: SquadType | null) {
    const ctx = this.ctx;
    const types: SquadType[] = ['shield', 'archer', 'cavalry'];

    interface BannerBox {
      x: number;
      y: number;
      w: number;
      h: number;
      fullLabel: string;
      bgCol: string;
      borderCol: string;
      isSelected: boolean;
      maxTier: number;
    }

    const banners: BannerBox[] = [];
    const occupiedBoxes: { x: number; y: number; w: number; h: number }[] = [];

    // 1. Render & register Enemy Commander + Brute/Siege Ram Boss HP bars with vertical Y collision avoidance
    const bossUnits = units
      .filter(
        (u) =>
          !u.isPlayer &&
          !u.isDying &&
          (u.isCommander ||
            ((u.type === 'brute' || u.type === 'battering_ram') &&
              (u.hp < u.maxHp - 0.5 || u.isCleaving)))
      )
      .sort((a, b) => (a.isCommander === b.isCommander ? a.y - b.y : a.isCommander ? -1 : 1));

    for (const boss of bossUnits) {
      const boxW = boss.isCommander ? 136 : boss.type === 'battering_ram' ? 82 : 92;
      const boxH = boss.isCommander ? 22 : 18;
      let resolvedY = boss.y - boss.radius - (boss.isCommander ? 22 : 15);

      for (let pass = 0; pass < 4; pass++) {
        let collided = false;
        for (const occ of occupiedBoxes) {
          const overlapX = Math.abs(boss.x - occ.x) < (boxW + occ.w) / 2 + 6;
          const overlapY = Math.abs(resolvedY - occ.y) < (boxH + occ.h) / 2 + 3;
          if (overlapX && overlapY) {
            resolvedY = occ.y - (boxH + occ.h) / 2 - 4;
            collided = true;
          }
        }
        if (!collided) break;
      }
      resolvedY = Math.max(UI_SAFE_ZONE.minY + 14, Math.min(UI_SAFE_ZONE.maxY - 14, resolvedY));
      occupiedBoxes.push({ x: boss.x, y: resolvedY, w: boxW, h: boxH });
      this.drawBossHpBar(boss, resolvedY);
    }

    ctx.save();
    ctx.font = 'bold 8px system-ui, sans-serif';

    for (const t of types) {
      const group = units.filter((u) => u.isPlayer && u.type === t && !u.isDying);
      if (group.length === 0) continue;

      const avgX = group.reduce((s, u) => s + u.x, 0) / group.length;
      const minY = Math.min(...group.map((u) => u.y));
      const baseBannerY = Math.max(UI_SAFE_ZONE.minY + 12, minY - 15);

      const isSelected = selectedSquad === t;
      let label = '';
      const bgCol = 'rgba(15, 23, 42, 0.78)';
      let borderCol = '#60a5fa';

      if (t === 'shield') {
        const isBraced = group[0].isBraced;
        label = isBraced ? '🛡️ BRACED (-75% ARR)' : '⚔️ ADVANCE';
        borderCol = isBraced ? '#facc15' : '#60a5fa';
      } else if (t === 'archer') {
        const plantedCount = group.filter((u) => u.isPlanted).length;
        const onHillCount = group.filter((u) => u.elevation === 'plateau').length;
        if (onHillCount > group.length * 0.3) {
          label = '🏹 HILL + PLANTED (+56% RNG)';
          borderCol = '#a3e635';
        } else if (plantedCount > group.length * 0.5) {
          label = '🏹 PLANTED (+30% RNG)';
          borderCol = '#38bdf8';
        } else {
          label = '🏹 MOVING';
          borderCol = '#c084fc';
        }
      } else {
        const maxMom = Math.max(...group.map((u) => u.momentum));
        label = maxMom > 1.3 ? `🐎 CHARGE ${maxMom.toFixed(1)}x` : '🐎 CAVALRY [3]';
        borderCol = maxMom >= 2.0 ? '#facc15' : '#38bdf8';
      }

      const maxTier = Math.max(...group.map((u) => u.veterancyTier ?? 1));
      const spec = group[0].specialization;
      const specTag =
        spec === 'halberdier'
          ? ' · 🔱 HALBERD'
          : spec === 'pavise'
          ? ' · 🛡️ PAVISE'
          : spec === 'longbow'
          ? ' · 🎯 LONGBOW'
          : spec === 'alchemist'
          ? ' · 💥 ALCHEMIST'
          : spec === 'cataphract'
          ? ' · 👑 CATAPHRACT'
          : spec === 'lancer'
          ? ' · ⚡ LANCER'
          : '';
      const vetPrefix = maxTier >= 3 ? '⌃⌃ ' : maxTier === 2 ? '⌃ ' : '';
      const fullLabel = `${vetPrefix}${label}${specTag}`;

      const textW = ctx.measureText(fullLabel).width;
      const pillW = textW + 10;
      const pillH = 13;

      banners.push({
        x: avgX,
        y: baseBannerY,
        w: pillW,
        h: pillH,
        fullLabel,
        bgCol,
        borderCol,
        isSelected,
        maxTier,
      });
    }

    // Sort by Y ascending and apply vertical offset spacing whenever two banners collide
    banners.sort((a, b) => a.y - b.y);
    for (const b of banners) {
      let resolvedY = b.y;
      for (let pass = 0; pass < 4; pass++) {
        let collided = false;
        for (const occ of occupiedBoxes) {
          const overlapX = Math.abs(b.x - occ.x) < (b.w + occ.w) / 2 + 6;
          const overlapY = Math.abs(resolvedY - occ.y) < (b.h + occ.h) / 2 + 3;
          if (overlapX && overlapY) {
            resolvedY = occ.y + (b.h + occ.h) / 2 + 4;
            collided = true;
          }
        }
        if (!collided) break;
      }
      b.y = Math.max(UI_SAFE_ZONE.minY + 10, Math.min(UI_SAFE_ZONE.maxY - 12, resolvedY));
      occupiedBoxes.push({ x: b.x, y: b.y, w: b.w, h: b.h });
    }

    for (const b of banners) {
      ctx.fillStyle = b.bgCol;
      ctx.strokeStyle = b.isSelected ? '#fde047' : b.maxTier >= 2 ? '#facc15' : b.borderCol;
      ctx.lineWidth = b.isSelected ? 1.6 : b.maxTier >= 2 ? 1.4 : 1.1;
      ctx.beginPath();
      ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = b.maxTier >= 2 ? '#fef08a' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.fullLabel, b.x, b.y + 0.5);
    }

    ctx.restore();
  }

  private drawBannerFlag(x: number, y: number, color1: string, color2: string, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();
    // Flagpole
    ctx.strokeStyle = '#6b4321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 18);
    ctx.stroke();

    // Triangular waving pennant
    const wave = Math.sin(gameTime * 5 + x) * 2.5;
    const flagGrad = ctx.createLinearGradient(x, 0, x + 14, 0);
    flagGrad.addColorStop(0, color1);
    flagGrad.addColorStop(1, color2);
    ctx.fillStyle = flagGrad;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 14 + wave, y - 13.5);
    ctx.lineTo(x, y - 9);
    ctx.closePath();
    ctx.fill();

    // Gold finial
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y - 19, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawSpikeBarricade(x: number, y: number, hp?: number, maxHp?: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.5, 0.5); // 50% micro-unit scale

    // Ground shadow
    ctx.fillStyle = 'rgba(20, 30, 10, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 32, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crossbeam
    ctx.fillStyle = '#6b3a1d';
    ctx.fillRect(-26, -4, 52, 8);
    ctx.strokeStyle = '#381705';
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -4, 52, 8);

    // Iron bindings
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-20, -5, 4, 10);
    ctx.fillRect(0, -5, 4, 10);
    ctx.fillRect(16, -5, 4, 10);

    // Sharpened diagonal wooden stakes pointing East
    const stakes = [-22, -11, 0, 11, 22];
    for (const sx of stakes) {
      ctx.save();
      ctx.translate(sx, 0);
      ctx.rotate(0.35);
      ctx.fillStyle = '#854d0e';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-3, 14);
      ctx.lineTo(-3, -16);
      ctx.lineTo(0, -26);
      ctx.lineTo(3, -16);
      ctx.lineTo(3, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Optional mini HP bar if damaged
    if (hp !== undefined && maxHp !== undefined && hp < maxHp) {
      const barW = 16;
      const barH = 2;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - barW / 2, y - 12, barW, barH);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - barW / 2, y - 12, Math.max(0, (hp / maxHp) * barW), barH);
      ctx.restore();
    }
  }

  // ================= DRAWN PATH PREVIEW & GHOST FORMATION SLOTS ================= //

  private drawActivePathPreview(stroke: Point[], squadType: SquadType, units: Unit[]) {
    if (stroke.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    // 1. Outer Glowing Ribbon
    ctx.strokeStyle =
      squadType === 'archer'
        ? 'rgba(168, 85, 247, 0.42)'
        : squadType === 'cavalry'
        ? 'rgba(250, 204, 21, 0.45)'
        : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();

    // 2. Bright Inner Core
    ctx.strokeStyle =
      squadType === 'archer' ? '#c084fc' : squadType === 'cavalry' ? '#fde047' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Live Multi-Rank Ghost Formation Slots (for Shields & Archers)
    if (squadType === 'shield' || squadType === 'archer') {
      const squadCount = units.filter((u) => u.isPlayer && u.type === squadType && !u.isDying).length;
      if (squadCount > 0) {
        const rankSpacing = squadType === 'shield' ? 14 : 16;
        const previewSlots = distributeMultiRankFormation(stroke, squadCount, 3, rankSpacing);
        ctx.fillStyle =
          squadType === 'shield' ? 'rgba(56, 189, 248, 0.42)' : 'rgba(192, 132, 252, 0.42)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        for (const slot of previewSlots) {
          ctx.beginPath();
          ctx.arc(slot.x, slot.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // 4. Forward-Pointing Arrow Cursor at the end
    const last = stroke[stroke.length - 1];
    const prev = stroke[Math.max(0, stroke.length - 3)];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.rotate(angle);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = squadType === 'cavalry' ? '#ca8a04' : '#0284c7';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-10, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ================= UNIT SHADOW & BODY ================= //

  private drawUnitShadow(u: Unit) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 25, 10, 0.35)';
    ctx.beginPath();
    const radiusX =
      u.type === 'battering_ram'
        ? u.radius * 1.55
        : u.type === 'cavalry'
        ? u.radius * 1.45
        : u.type === 'brute'
        ? u.radius * 1.35
        : u.type === 'war_hound'
        ? u.radius * 1.3
        : u.radius * 1.1;
    const radiusY = u.radius * 0.48;
    ctx.ellipse(u.x, u.y + (u.type === 'cavalry' || u.type === 'battering_ram' ? 4.5 : 3.5), radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    if (u.hitFlashTimer && u.hitFlashTimer > 0) {
      ctx.filter = 'brightness(2.2)';
    }

    if (u.isDying) {
      ctx.globalAlpha = Math.max(0, (u.deathTimer ?? 0) / 0.4);
    }

    const isMoving = u.targetX !== undefined && (Math.abs(u.targetX - u.x) > 2 || Math.abs((u.targetY ?? u.y) - u.y) > 2);
    const bobY = isMoving ? Math.sin(gameTime * 14 + u.x * 0.1) * 1.1 : Math.sin(gameTime * 3.5 + u.y * 0.1) * 0.4;
    const bobAngle = isMoving ? Math.sin(gameTime * 14 + u.x * 0.1) * 0.06 : 0;

    ctx.translate(0, bobY);
    if (bobAngle !== 0) {
      ctx.translate(u.x, u.y);
      ctx.rotate(bobAngle);
      ctx.translate(-u.x, -u.y);
    }

    if (u.isPlayer) {
      if (u.type === 'shield') {
        this.drawShieldUnit(u, gameTime);
      } else if (u.type === 'archer') {
        this.drawArcherUnit(u, gameTime);
      } else if (u.type === 'cavalry') {
        this.drawCavalryUnit(u, gameTime);
      }
    } else {
      if (u.isCommander) {
        this.drawEnemyCommander(u, gameTime);
      } else if (u.type === 'swordsman') {
        this.drawRedSwordsman(u, gameTime);
      } else if (u.type === 'spearman') {
        this.drawRedSpearman(u, gameTime);
      } else if (u.type === 'archer') {
        this.drawRedArcher(u, gameTime);
      } else if (u.type === 'brute') {
        this.drawRedBrute(u, gameTime);
      } else if (u.type === 'war_hound') {
        this.drawWarHound(u, gameTime);
      } else if (u.type === 'battering_ram') {
        this.drawBatteringRam(u, gameTime);
      }
    }

    // Status effect overlays (Dizzy stars, sweat drops, frenzy)
    this.drawStatusEffects(u, gameTime);

    // Health Bar (Shrunk by 40%)
    this.drawHealthBar(u);

    ctx.restore();
  }

  // 1. Blue Shield Phalanx (50% Micro-Unit Scale)
  private drawShieldUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isBraced = u.isBraced;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const swingAngle = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 1.3 : 0;
    const isMoving = u.targetX !== undefined && Math.hypot(u.targetX - u.x, (u.targetY ?? u.y) - u.y) > 4;
    const walkStep = isMoving ? Math.sin(gameTime * 14 + u.x * 0.2) * 3 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    // 1. Planted boots
    ctx.fillStyle = '#381a08';
    ctx.fillRect(-6 - walkStep, 6, 4.5, 3);
    ctx.fillRect(1 + walkStep, 7, 5, 3);

    // 2. Armored Legs
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-5 - walkStep, 2, 3.5, 5);
    ctx.fillRect(2 + walkStep, 3, 3.5, 5);

    // 3. Torso / Royal Blue Tabard
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -6, 12, 9);
    const tabardGrad = ctx.createLinearGradient(-5, -6, 5, 4);
    tabardGrad.addColorStop(0, '#2563eb');
    tabardGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = tabardGrad;
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-5, -6, 10, 8, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5.5, -1, 11, 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1.5, -1.5, 3, 3);

    // 4. Knight Helmet
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-4.5, -14, 9, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-0.5, -11, 4.5, 1.8);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -12, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Plume
    ctx.fillStyle = (u.veterancyTier ?? 1) >= 3 ? '#facc15' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.quadraticCurveTo(-6, -18, -3, -21);
    ctx.quadraticCurveTo(0, -17, 0, -14);
    ctx.closePath();
    ctx.fill();

    // 5. Weapon Arm: Steel Arming Sword or Golden Halberd Poleaxe (if Halberdier)
    ctx.save();
    ctx.translate(-4, -4);
    ctx.rotate(0.3 + swingAngle);

    if (u.specialization === 'halberdier') {
      // Long poleaxe shaft
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1, -22, 2.2, 27);
      // Golden halberd crescent axe blade + armor spike
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(1.5, -21);
      ctx.lineTo(6.5, -19);
      ctx.lineTo(5.5, -13);
      ctx.lineTo(1.2, -14);
      ctx.lineTo(-3, -17);
      ctx.lineTo(-1, -21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-1.5, -1, 3, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-0.5, 1, 1, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-3, -2, 6, 1.5);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-1.2, -2);
      ctx.lineTo(0, -15);
      ctx.lineTo(1.2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (attackProg > 0.1 && attackProg < 0.85) {
      ctx.strokeStyle = u.specialization === 'halberdier' ? 'rgba(250, 204, 21, 0.8)' : 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, u.specialization === 'halberdier' ? 21 : 16, -Math.PI * 0.7, -Math.PI * 0.1);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Left Arm: Large Kite Shield or Tower Pavise Shield
    ctx.save();
    ctx.translate(isBraced ? 6 : 4, -1);
    const shieldGrad = ctx.createLinearGradient(0, -12, 0, 13);
    shieldGrad.addColorStop(0, u.specialization === 'pavise' ? '#f59e0b' : '#3b82f6');
    shieldGrad.addColorStop(1, u.specialization === 'pavise' ? '#1d4ed8' : '#1d4ed8');
    ctx.fillStyle = shieldGrad;
    ctx.strokeStyle = u.specialization === 'pavise' ? '#fef08a' : isBraced ? '#facc15' : '#fbbf24';
    ctx.lineWidth = u.specialization === 'pavise' ? 2.8 : isBraced ? 2.5 : 1.6;

    if (u.specialization === 'pavise') {
      ctx.beginPath();
      ctx.roundRect(-5.5, -13, 13, 27, 2.5);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(7, -8);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 13);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-5, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -7, 2.5, 13);
    ctx.fillRect(-3.5, -3, 8, 2.5);

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0.2, -1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    if (isBraced) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(2, 0, 15, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  // 2. Blue Planted Archer (50% Micro-Unit Scale + Planted Formation Aura)
  private drawArcherUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const isMoving = u.targetX !== undefined && Math.hypot(u.targetX - u.x, (u.targetY ?? u.y) - u.y) > 4;
    const walkStep = isMoving ? Math.sin(gameTime * 14 + u.x * 0.2) * 3 : 0;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const bowDraw = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 5 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);

    // Planted Formation Bonus Aura (+30% Range & Pinpoint Accuracy when stationary in formation)
    if (u.isPlanted) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2.5, 2]);
      ctx.beginPath();
      ctx.ellipse(0, 3, 7, 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    // 1. Leather Boots
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5 - walkStep, 5, 4, 3);
    ctx.fillRect(1 + walkStep, 6, 4.5, 3);

    // 2. Trousers
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(-4.5, 1, 3.5, 5);
    ctx.fillRect(1.5, 2, 3.5, 5);

    // 3. Ranger Tunic
    const tunicGrad = ctx.createLinearGradient(-4, -5, 4, 3);
    tunicGrad.addColorStop(0, '#0284c7');
    tunicGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = tunicGrad;
    ctx.strokeStyle = '#075985';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-4.5, -5, 9, 7, 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 2);
    ctx.stroke();

    const isLongbow = u.specialization === 'longbow';
    const isAlchemist = u.specialization === 'alchemist';

    // 4. Back Quiver (Extended Tall Quiver Model for Longbow Snipers vs Alchemist Bolt Case vs Standard Quiver)
    if (isLongbow) {
      // Extended tall heavy leather quiver rising well above the shoulder
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.9;
      ctx.fillRect(-8.8, -13.5, 4.8, 15.5);
      ctx.strokeRect(-8.8, -13.5, 4.8, 15.5);

      // Gold brass reinforcement rings on the extended quiver
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-9.0, -11.5, 5.2, 1.3);
      ctx.fillRect(-9.0, -4.5, 5.2, 1.3);

      // Extra-long clothyard war-arrows protruding high above the quiver
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-7.6, -13.5);
      ctx.lineTo(-8.2, -19.5);
      ctx.moveTo(-6.2, -13.5);
      ctx.lineTo(-6.4, -20.2);
      ctx.moveTo(-4.8, -13.5);
      ctx.lineTo(-4.6, -18.8);
      ctx.stroke();

      // White & gold goose-feather sniper fletching at the top of the long arrows
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-8.8, -19.8, 1.6, 3.2);
      ctx.fillRect(-7.0, -20.5, 1.6, 3.2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-5.2, -19.0, 1.5, 2.8);
    } else if (isAlchemist) {
      // Compact iron-strapped alchemical backpack rack with glowing green reserve vial
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-7.8, -7.5, 4.2, 9.5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-6.8, -10.5, 2.2, 3.2);
      ctx.fillStyle = '#bef264';
      ctx.fillRect(-6.4, -10.0, 1.2, 1.6);
    } else {
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-7, -8, 4, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-6.5, -11, 1.5, 3);
      ctx.fillRect(-4.5, -10, 1.5, 2);
    }

    // 4b. Alchemist Green-Glowing Volatile Flasks on Bandolier & Belt
    if (isAlchemist) {
      const glowPulse = 0.55 + Math.sin(gameTime * 8 + u.x * 0.1) * 0.25;

      // Ambient emerald glow around the chest flask
      ctx.save();
      ctx.fillStyle = `rgba(74, 222, 128, ${glowPulse * 0.55})`;
      ctx.beginPath();
      ctx.arc(-0.8, -0.5, 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Primary bulbous green-glowing glass flask on chest bandolier
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#dcfce7';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-0.8, -0.5, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bright glowing lime alchemical liquid core
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-0.8, -0.2, 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(-1.2, -0.8, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Flask neck & cork stopper
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-1.5, -4.0, 1.4, 1.4);

      // Secondary mini green-glowing flask on waist belt
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(-3.6, 2.2, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 5. Ranger Hood & Head
    ctx.fillStyle = isAlchemist ? '#065f46' : '#0ea5e9';
    ctx.strokeStyle = isAlchemist ? '#10b981' : '#0284c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-4, -13, 8, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -10, 3.5, 3);

    if (isAlchemist) {
      // Alchemist glowing green goggle lens on hood visor
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(2.0, -8.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Hood Plume (Golden Sniper Plume for Longbows, Emerald for Alchemists, Sky Blue for Standard)
    ctx.fillStyle = isLongbow ? '#facc15' : isAlchemist ? '#4ade80' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-1, -13);
    ctx.lineTo(isLongbow ? -5.5 : -4, isLongbow ? -20 : -18);
    ctx.lineTo(0, -15);
    ctx.closePath();
    ctx.fill();

    // 6. Weapon: 6ft War Longbow / Heavy Alchemist Crossbow w/ Green Flask / Standard Recurve Bow
    ctx.save();
    ctx.translate(5, -2);

    if (isAlchemist) {
      // Heavy Iron-Bound Crossbow Stock & Steel Prod
      ctx.fillStyle = '#5c2d0c';
      ctx.strokeStyle = '#291509';
      ctx.lineWidth = 0.9;
      ctx.fillRect(-4, -1.6, 14, 3.2);
      ctx.strokeRect(-4, -1.6, 14, 3.2);

      // Crossbow Steel Prod (Bow Arms)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(6, -10.5);
      ctx.quadraticCurveTo(10, 0, 6, 10.5);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, -10.5);
      ctx.lineTo(1 - bowDraw * 0.6, 0);
      ctx.lineTo(6, 10.5);
      ctx.stroke();

      // Loaded Green-Glowing Alchemical Flask Bolt at the front of the crossbow
      const flaskPulse = 0.65 + Math.sin(gameTime * 10) * 0.25;
      ctx.fillStyle = `rgba(74, 222, 128, ${flaskPulse * 0.6})`;
      ctx.beginPath();
      ctx.arc(12.2, 0, 4.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#dcfce7';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(12.2, 0, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(12.2, -0.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const bowH = isLongbow ? 18.5 : 12;
      ctx.strokeStyle = isLongbow ? '#facc15' : '#b45309';
      ctx.lineWidth = isLongbow ? 3.0 : 2.4;
      ctx.beginPath();
      ctx.moveTo(1, -bowH);
      ctx.quadraticCurveTo(isLongbow ? 6.8 : 5.5, 0, 1, bowH);
      ctx.stroke();

      ctx.fillStyle = isLongbow ? '#fef08a' : '#facc15';
      ctx.fillRect(0, -bowH - 1.2, 2.4, 2.4);
      ctx.fillRect(0, bowH - 1.2, 2.4, 2.4);

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(1, -bowH);
      ctx.lineTo(-2 - bowDraw, 0);
      ctx.lineTo(1, bowH);
      ctx.stroke();

      // Arrow Shaft (Extra-long clothyard shaft for Longbow)
      const shaftTipX = isLongbow ? 13.5 : 10;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = isLongbow ? 2.1 : 1.8;
      ctx.beginPath();
      ctx.moveTo(-2 - bowDraw, 0);
      ctx.lineTo(shaftTipX, 0);
      ctx.stroke();

      // Bodkin Warhead
      ctx.fillStyle = isLongbow ? '#fef08a' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(shaftTipX, -2.4);
      ctx.lineTo(shaftTipX + (isLongbow ? 5 : 4), 0);
      ctx.lineTo(shaftTipX, 2.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isLongbow ? '#f8fafc' : '#38bdf8';
      ctx.fillRect(-1.5 - bowDraw, -2, 2.4, 4);
    }

    ctx.restore();
    ctx.restore();
  }

  // 3. Blue Knight Cavalry (50% Micro-Unit Scale)
  private drawCavalryUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const gallop = Math.sin(gameTime * 18);
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const lanceThrust = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 12 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    // 1. Armored Warhorse
    ctx.strokeStyle = '#4a2612';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.lineTo(13 + gallop * 5, 11);
    ctx.moveTo(6, 4);
    ctx.lineTo(10 - gallop * 4, 11);
    ctx.moveTo(-8, 4);
    ctx.lineTo(-12 - gallop * 5, 11);
    ctx.moveTo(-6, 4);
    ctx.lineTo(-9 + gallop * 4, 11);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(11 + gallop * 5, 10, 4, 2);
    ctx.fillRect(-14 - gallop * 5, 10, 4, 2);

    ctx.fillStyle = '#6b3a1d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const capGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    capGrad.addColorStop(0, u.specialization === 'cataphract' ? '#d97706' : '#1d4ed8');
    capGrad.addColorStop(1, u.specialization === 'cataphract' ? '#facc15' : '#2563eb');
    ctx.fillStyle = capGrad;
    ctx.strokeStyle = u.specialization === 'cataphract' ? '#fef08a' : '#facc15';
    ctx.lineWidth = u.specialization === 'cataphract' ? 2.4 : 1.8;
    ctx.beginPath();
    ctx.roundRect(-10, -7, 20, 13, 3);
    ctx.fill();
    ctx.stroke();

    const headBob = gallop * 2;
    ctx.fillStyle = '#552e17';
    ctx.beginPath();
    ctx.ellipse(14, -4 + headBob, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13, -8 + headBob);
    ctx.lineTo(19, -4 + headBob);
    ctx.lineTo(16, 1 + headBob);
    ctx.lineTo(11, -3 + headBob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(10, -10 + headBob, 5, 4);

    // 2. Knight Rider
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-2, -3, 6, 6);

    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-4, -11, 8, 8, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-3.5, -18, 7, 7, 2.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -15, 3, 1.5);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.lineTo(-7, -23);
    ctx.lineTo(-3, -19);
    ctx.closePath();
    ctx.fill();

    // 3. Couched Heavy Jouster Lance
    ctx.save();
    ctx.translate(4, -4);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(24 + lanceThrust, 0);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.lineTo(6, 0);
    ctx.lineTo(2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(24 + lanceThrust, -3);
    ctx.lineTo(32 + lanceThrust, 0);
    ctx.lineTo(24 + lanceThrust, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const pennonWave = Math.sin(gameTime * 15) * 4;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(18 + lanceThrust, 0);
    ctx.lineTo(25 + lanceThrust + pennonWave, 6);
    ctx.lineTo(25 + lanceThrust, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (u.momentum > 1.3) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-18, -4);
      ctx.lineTo(-32, -4);
      ctx.moveTo(-18, 4);
      ctx.lineTo(-35, 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 4. Red Swordsman (50% Micro-Unit Scale)
  private drawRedSwordsman(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const isMoving = u.targetX !== undefined && Math.hypot(u.targetX - u.x, (u.targetY ?? u.y) - u.y) > 4;
    const walkStep = isMoving ? Math.sin(gameTime * 14 + u.x * 0.2) * 3 : 0;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const slashAngle = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 1.5 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5 - walkStep, 5, 4.5, 3);
    ctx.fillRect(1 + walkStep, 6, 5, 3);

    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-4.5, 1, 3.5, 5);
    ctx.fillRect(1.5, 2, 3.5, 5);

    ctx.fillStyle = '#d97706';
    ctx.fillRect(-5, -5, 10, 7);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(5, 2);
    ctx.moveTo(5, -5);
    ctx.lineTo(-5, 2);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, -1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-4.5, -13, 9, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-4, -11);
    ctx.lineTo(-8, -15);
    ctx.moveTo(4, -11);
    ctx.lineTo(8, -15);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1, -9.5, 4.5, 1.5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1, -9, 2, 1);

    ctx.save();
    ctx.translate(5, -1);
    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-4, -3);
    ctx.rotate(0.4 + slashAngle);

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-1, 0, 2, 3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-3, -1.5, 6, 1.5);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.5, -1.5);
    ctx.lineTo(-2, -14);
    ctx.lineTo(1.5, -16);
    ctx.lineTo(2, -1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (attackProg > 0.1 && attackProg < 0.85) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 17, -Math.PI * 0.7, -Math.PI * 0.1);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  // 5. Red Spearman (50% Micro-Unit Scale)
  private drawRedSpearman(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const isMoving = u.targetX !== undefined && Math.hypot(u.targetX - u.x, (u.targetY ?? u.y) - u.y) > 4;
    const walkStep = isMoving ? Math.sin(gameTime * 14 + u.x * 0.2) * 3 : 0;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const spearThrust = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 11 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    ctx.fillStyle = '#381705';
    ctx.fillRect(-5 - walkStep, 5, 4.5, 3);
    ctx.fillRect(1 + walkStep, 6, 5, 3);

    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-4.5, -5, 9, 11);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -5, 9, 11);

    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(4.5, -8);
    ctx.lineTo(-4.5, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -9, 3, 1.5);

    ctx.save();
    ctx.translate(2, -2);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(18 + spearThrust, 0);
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(18 + spearThrust, -3);
    ctx.lineTo(26 + spearThrust, 0);
    ctx.lineTo(18 + spearThrust, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(16 + spearThrust, -2, 2.5, 4);

    ctx.restore();
    ctx.restore();
  }

  // 6. Red Enemy Archer (50% Micro-Unit Scale)
  private drawRedArcher(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const isMoving = u.targetX !== undefined && Math.hypot(u.targetX - u.x, (u.targetY ?? u.y) - u.y) > 4;
    const walkStep = isMoving ? Math.sin(gameTime * 14 + u.x * 0.2) * 3 : 0;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const bowDraw = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 4 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    ctx.fillStyle = '#29180c';
    ctx.fillRect(-5 - walkStep, 5, 4, 3);
    ctx.fillRect(1 + walkStep, 6, 4.5, 3);

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-4.5, -4, 9, 10);
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -4, 9, 10);

    ctx.fillStyle = '#52525b';
    ctx.beginPath();
    ctx.roundRect(-4.5, -12, 9, 8, 3);
    ctx.fill();

    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    ctx.moveTo(-3, -12);
    ctx.lineTo(-5, -16);
    ctx.lineTo(-1, -13);
    ctx.moveTo(1, -13);
    ctx.lineTo(4, -16);
    ctx.lineTo(3, -12);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, -9, 3, 2);

    ctx.save();
    ctx.translate(4, -1);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 10, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const tipY = 10 * Math.sin(Math.PI * 0.45);
    const tipX = 10 * Math.cos(Math.PI * 0.45);
    ctx.moveTo(tipX, -tipY);
    ctx.lineTo(1 - bowDraw, 0);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(1 - bowDraw, 0);
    ctx.lineTo(tipX + 6, 0);
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(tipX + 6, -2);
    ctx.lineTo(tipX + 10, 0);
    ctx.lineTo(tipX + 6, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // 7. Red Brute Boss (50% Micro-Unit Scale)
  private drawRedBrute(u: Unit, _gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const cleaveLift = u.isCleaving && u.cleaveWindupTimer !== undefined
      ? (1 - (u.cleaveWindupTimer / 0.65))
      : 0;
    const clubAngle = cleaveLift > 0
      ? -Math.PI * 0.6 + cleaveLift * 0.2
      : (attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 1.6 : 0);

    // Cleave windup telegraphed ground danger zone (scaled for micro-units)
    if (u.isCleaving && u.cleaveWindupTimer !== undefined) {
      const progress = 1 - (u.cleaveWindupTimer / 0.65);
      ctx.save();
      ctx.beginPath();
      ctx.arc(u.x - 10, u.y, 28, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.lineTo(u.x - 10, u.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(239, 68, 68, ${0.25 + progress * 0.45})`;
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    // 1. Spiked Iron Boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, 10, 9, 6);
    ctx.fillRect(3, 11, 10, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-11, 13, 2, 3);
    ctx.fillRect(12, 14, 2, 3);

    // 2. Muscular Torso
    const bodyGrad = ctx.createLinearGradient(-14, -14, 14, 14);
    bodyGrad.addColorStop(0, '#dc2626');
    bodyGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-14, -12, 28, 22, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-15, 3, 30, 6);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 6, 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Spiked Bronze Pauldrons
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-14, -12, 10, 0, Math.PI * 2);
    ctx.arc(14, -12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(-16, -26, 4, 6);
    ctx.fillRect(12, -26, 4, 6);

    // 4. Iron Skull Great Helm with Curved Horns
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-8, -24, 16, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -18, 3, 2);
    ctx.fillRect(2, -18, 3, 2);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-6, -23);
    ctx.quadraticCurveTo(-18, -30, -22, -35);
    ctx.moveTo(6, -23);
    ctx.quadraticCurveTo(18, -30, 22, -35);
    ctx.stroke();

    // 5. Massive Spiked Warclub
    ctx.save();
    ctx.translate(6, -8);
    ctx.rotate(clubAngle);

    ctx.fillStyle = '#573318';
    ctx.fillRect(0, -6, 38, 12);
    ctx.strokeStyle = '#29180c';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -6, 38, 12);

    ctx.fillStyle = '#facc15';
    for (let sp = 12; sp <= 34; sp += 7) {
      ctx.fillRect(sp, -10, 4, 4);
      ctx.fillRect(sp, 6, 4, 4);
    }
    ctx.restore();

    ctx.restore();
  }

  // 8. Barbarian War Hound (Fast Flanking Pack Runner - 50% Micro-Unit Scale)
  private drawWarHound(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const sprint = Math.sin(gameTime * 22 + u.x * 0.15) * 4.5;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    // 1. Sprinting Legs
    ctx.strokeStyle = '#3f2314';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(11 + sprint, 8);
    ctx.moveTo(4, 2);
    ctx.lineTo(7 - sprint, 8);
    ctx.moveTo(-6, 2);
    ctx.lineTo(-10 - sprint, 8);
    ctx.moveTo(-4, 2);
    ctx.lineTo(-7 + sprint, 8);
    ctx.stroke();

    // 2. Lean Wolf/Hound Torso
    const furGrad = ctx.createLinearGradient(-10, -4, 10, 5);
    furGrad.addColorStop(0, '#57331d');
    furGrad.addColorStop(1, '#291509');
    ctx.fillStyle = furGrad;
    ctx.strokeStyle = '#1c0d06';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -1, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Spiked Red Iron War Collar
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, -5);
    ctx.lineTo(8, 3);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(6, -7, 2, 2);
    ctx.fillRect(8, -4, 2, 2);

    // 4. Snarling Head, Ears & Glowing Red Eye
    ctx.fillStyle = '#432312';
    ctx.beginPath();
    ctx.ellipse(10.5, -3.5, 5.5, 4, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Pointed Ears
    ctx.beginPath();
    ctx.moveTo(7, -6);
    ctx.lineTo(9, -11);
    ctx.lineTo(11, -6.5);
    ctx.closePath();
    ctx.fill();

    // White Fangs & Red Eye
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(13, -2, 2.5, 1.5);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(11.5, -4.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Bushy Tail
    ctx.strokeStyle = '#3f2314';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.quadraticCurveTo(-15, -5, -16, -2);
    ctx.stroke();

    ctx.restore();
  }

  // 9. Siege Battering Ram (Armored Wheeled War Wagon - 50% Micro-Unit Scale)
  private drawBatteringRam(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const ramSwing = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 14 : 0;
    const wheelSpin = gameTime * 4;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.5, 0.5); // 50% micro-unit scale

    // 1. Four Heavy Iron-Rimmed Siege Wheels (Back Pair)
    const drawWheel = (wx: number, wy: number) => {
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(wheelSpin);
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      ctx.restore();
    };

    drawWheel(-14, 9);
    drawWheel(14, 9);

    // 2. Heavy Timber Chassis & Sloped Red Hide Canopy
    const roofGrad = ctx.createLinearGradient(0, -18, 0, 6);
    roofGrad.addColorStop(0, '#991b1b');
    roofGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = roofGrad;
    ctx.strokeStyle = '#291509';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-22, 6);
    ctx.lineTo(-18, -15);
    ctx.lineTo(18, -15);
    ctx.lineTo(22, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Iron Shield Plates along canopy sides
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    for (const sx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.arc(sx, -3, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 3. Suspended Iron-Capped Ram Log & Bronze Ram Head
    ctx.save();
    ctx.translate(ramSwing, 0);
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#291509';
    ctx.lineWidth = 1.6;
    ctx.fillRect(-16, -2, 42, 7);
    ctx.strokeRect(-16, -2, 42, 7);

    // Forged Bronze/Gold Ram Head Tip
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, -4);
    ctx.lineTo(35, 1.5);
    ctx.lineTo(25, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Front Wheels
    drawWheel(-12, 11);
    drawWheel(12, 11);

    ctx.restore();
  }

  // 7b. Enemy Wave Commander (1.6x Unit Scale = 0.8x Canvas Scale, Crimson Royal Cape, Golden War-Crown & War Standard)
  private drawEnemyCommander(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const attackProg = u.attackTimer > 0 ? u.attackTimer / u.attackCooldown : 0;
    const swingAngle = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 1.15 : 0;
    const signalRaise = (u.commanderSignalTimer ?? 0) > 0 ? -0.55 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX * 0.8, 0.8); // 1.6x unit scale relative to 0.5x micro-units

    // 1. Flowing Royal Crimson War-Cape with Gold Border
    const capeWave = Math.sin(gameTime * 6.5 + u.x * 0.1) * 2.5;
    const capeGrad = ctx.createLinearGradient(-18, -12, -4, 14);
    capeGrad.addColorStop(0, '#991b1b');
    capeGrad.addColorStop(0.6, '#dc2626');
    capeGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = capeGrad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -11);
    ctx.quadraticCurveTo(-17, -2 + capeWave * 0.4, -19 + capeWave, 13);
    ctx.lineTo(-6 + capeWave * 0.5, 14);
    ctx.lineTo(-3, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Back-Mounted Golden-Crimson War Banner Standard
    ctx.save();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(-6, -34);
    ctx.stroke();

    // Banner Crossbar & Pennant
    const flagFlutter = Math.sin(gameTime * 8) * 2.8;
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -33);
    ctx.lineTo(-22 + flagFlutter, -29);
    ctx.lineTo(-17 + flagFlutter * 0.6, -24);
    ctx.lineTo(-22 + flagFlutter, -19);
    ctx.lineTo(-6, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Finial atop Banner Pole
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-6, -35.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Gilded Dark-Iron War Greaves
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-7, 8, 6, 5);
    ctx.fillRect(2, 9, 6, 5);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-7, 10, 6, 1.5);
    ctx.fillRect(2, 11, 6, 1.5);

    // 4. Ornate Crimson & Black-Iron Plate Cuirass
    const armorGrad = ctx.createLinearGradient(-10, -12, 10, 10);
    armorGrad.addColorStop(0, '#450a0a');
    armorGrad.addColorStop(0.5, '#991b1b');
    armorGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = armorGrad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 19, 4);
    ctx.fill();
    ctx.stroke();

    // Golden Sunburst Emblem on Chest & War Belt
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -1, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10.5, 4, 21, 3);

    // 5. Gilded Royal Pauldrons
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-10, -9, 6.5, 0, Math.PI * 2);
    ctx.arc(10, -9, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6. Warlord Great Helm + Golden War-Crown
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-6.5, -20, 13, 11, 3);
    ctx.fill();
    ctx.stroke();

    // Glowing Crimson Visor Slit
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-3.5, -15.5, 8, 2);

    // Golden War-Crown with 3 Peaks & Crimson Ruby Center
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, -19.5);
    ctx.lineTo(-7.5, -26.5);
    ctx.lineTo(-3.5, -22.5);
    ctx.lineTo(0, -28.5);
    ctx.lineTo(3.5, -22.5);
    ctx.lineTo(7.5, -26.5);
    ctx.lineTo(7, -19.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -22, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 7. Blazing Golden-Crimson Command Halberd / Runeblade
    ctx.save();
    ctx.translate(6, -5);
    ctx.rotate(swingAngle + signalRaise);

    // Pole Shaft
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, -1.8, 24, 3.6);

    // Golden-Crimson Halberd Axe & Spearhead
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(16, -2);
    ctx.lineTo(29, 0);
    ctx.lineTo(16, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(13, -2);
    ctx.quadraticCurveTo(18, -11, 23, -8);
    ctx.lineTo(20, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  private drawBossHpBar(u: Unit, overrideCenterY?: number) {
    if (!u.isCommander && u.hp >= u.maxHp - 0.5 && !u.isCleaving) return;

    const ctx = this.ctx;
    const isCmd = Boolean(u.isCommander);
    const barW = isCmd ? 118 : u.type === 'battering_ram' ? 74 : 84;
    const barH = isCmd ? 9.2 : 8.4;
    const barX = u.x - barW / 2;
    const barY =
      overrideCenterY !== undefined ? overrideCenterY : u.y - u.radius - (isCmd ? 22 : 16);

    const orderTag =
      u.commanderOrder === 'TACTICAL_DEFEND'
        ? 'DEFENDING'
        : u.commanderOrder === 'COORDINATED_ASSAULT'
        ? 'ATTACKING'
        : 'MARCHING';

    ctx.save();
    ctx.fillStyle = isCmd ? 'rgba(24, 10, 10, 0.82)' : 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3, 3);
    ctx.fill();

    ctx.strokeStyle =
      isCmd && u.commanderOrder === 'TACTICAL_DEFEND' ? '#38bdf8' : '#facc15';
    ctx.lineWidth = isCmd ? 1.5 : 1.2;
    ctx.stroke();

    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2.5);
    ctx.fill();

    const fillW = Math.max(0, (u.hp / u.maxHp) * barW);
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (isCmd) {
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(0.35, '#ef4444');
      grad.addColorStop(1, '#991b1b');
    } else {
      grad.addColorStop(0, u.type === 'battering_ram' ? '#fb923c' : '#f87171');
      grad.addColorStop(0.5, u.type === 'battering_ram' ? '#ea580c' : '#ef4444');
      grad.addColorStop(1, '#b91c1c');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 2.5);
    ctx.fill();

    const bossLabel = isCmd
      ? `👑 ${(u.commanderName ?? 'COMMANDER').toUpperCase()} [${orderTag}] · ${Math.max(0, Math.round(u.hp))} HP`
      : u.type === 'battering_ram'
      ? `🪵 SIEGE RAM · ${Math.round(u.hp)} / ${u.maxHp}`
      : `💀 BRUTE · ${Math.round(u.hp)} / ${u.maxHp}`;

    ctx.fillStyle = isCmd ? '#fef08a' : '#ffffff';
    ctx.font = isCmd ? 'bold 7.5px system-ui, sans-serif' : 'bold 7px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 1.8;
    ctx.strokeText(bossLabel, u.x, barY - 3.2);
    ctx.fillText(bossLabel, u.x, barY - 3.2);
    ctx.restore();
  }

  private drawHealthBar(u: Unit) {
    if (u.type === 'brute' || u.type === 'battering_ram') return;
    const vetTier = u.isPlayer ? (u.veterancyTier ?? 1) : 1;
    const isDamaged = u.hp < u.maxHp - 0.5;
    if (!isDamaged && vetTier < 2) return;

    const ctx = this.ctx;
    const barW = Math.max(11, u.radius * 2.1); // Shrunk by 40%
    const barH = 2.1; // Shrunk by 40% (from 3.5)
    const barX = u.x - barW / 2;
    const barY = u.y - u.radius - 6;

    ctx.save();
    // Health bar background & border (golden border for veteran units)
    ctx.fillStyle = vetTier >= 2 ? 'rgba(234, 179, 8, 0.85)' : 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(barX - 0.8, barY - 0.8, barW + 1.6, barH + 1.6, 1);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 1);
    ctx.fill();

    const fillW = Math.max(0, (u.hp / u.maxHp) * barW);
    ctx.fillStyle = u.isPlayer ? (vetTier >= 3 ? '#fde047' : '#38bdf8') : '#f87171';
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 1);
    ctx.fill();

    // Small Chevron Rank Icon above the health bar for Veteran (Tier 2: ^) and Elite (Tier 3: ^^) units
    if (vetTier >= 2) {
      const drawChevron = (cy: number) => {
        ctx.beginPath();
        ctx.moveTo(u.x - 2.6, cy + 1.2);
        ctx.lineTo(u.x, cy - 1.3);
        ctx.lineTo(u.x + 2.6, cy + 1.2);
        ctx.strokeStyle = '#422006';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.strokeStyle = vetTier >= 3 ? '#fef08a' : '#facc15';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      };

      drawChevron(barY - 2.6);
      if (vetTier >= 3) {
        drawChevron(barY - 5.0);
      }
    }

    ctx.restore();
  }

  // ================= STATUS EFFECTS ================= //

  private drawStatusEffects(u: Unit, gameTime: number) {
    const ctx = this.ctx;

    // Stunned: 3 orbiting dizzy stars
    if (u.stunTimer && u.stunTimer > 0) {
      ctx.save();
      const orbitRadius = u.radius + 4;
      const angle = gameTime * 6;
      for (let i = 0; i < 3; i++) {
        const starAngle = angle + (i * Math.PI * 2) / 3;
        const sx = u.x + Math.cos(starAngle) * orbitRadius;
        const sy = u.y - u.radius - 3 + Math.sin(starAngle) * (orbitRadius * 0.4);

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Panicking / Fleeing: sweat drop hopping
    if (u.panicTimer && u.panicTimer > 0) {
      ctx.save();
      const bounce = Math.abs(Math.sin(gameTime * 10)) * 4;
      const dropX = u.x + u.radius + 1.5;
      const dropY = u.y - u.radius - bounce;

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(dropX, dropY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dropX - 1.8, dropY);
      ctx.lineTo(dropX, dropY - 3.5);
      ctx.lineTo(dropX + 1.8, dropY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Frenzy / Morale - Rally Golden Aura
    if (u.frenzyTimer && u.frenzyTimer > 0) {
      ctx.save();
      const pulse = 0.55 + Math.sin(gameTime * 8) * 0.2;
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 2, u.radius + 3.5, u.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(253, 224, 71, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ================= PROJECTILES ================= //

  private drawProjectile(proj: Projectile) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.y, 2.5, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Parabolic Arrow Body
    const arrowY = proj.y - proj.currentHeight;
    const dx = proj.targetX - proj.startX;
    const dy = proj.targetY - proj.startY;
    const baseAngle = Math.atan2(dy, dx);
    const arcAngle = (0.5 - proj.progress) * 0.7;
    const totalAngle = baseAngle + arcAngle;

    ctx.translate(proj.x, arrowY);
    ctx.rotate(totalAngle);
    ctx.scale(0.65, 0.65);

    if (proj.isExplosive) {
      // Alchemist Bolt carrying a Green-Glowing Volatile Flask
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(5, 0);
      ctx.stroke();

      // Outer emerald alchemical glow halo
      ctx.fillStyle = proj.isFlaming ? 'rgba(251, 146, 60, 0.45)' : 'rgba(74, 222, 128, 0.48)';
      ctx.beginPath();
      ctx.arc(8, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // Bulbous Green-Glowing Alchemical Flask at bolt tip
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#dcfce7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(8, 0, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = proj.isFlaming ? '#fde047' : '#bef264';
      ctx.beginPath();
      ctx.arc(8.4, -0.8, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Fletching
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();
    } else if (proj.isPiercing) {
      // Longbow Sniper Elongated Clothyard Bodkin Arrow + Armor-Piercing Wind Streak
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-20, -2.5);
      ctx.lineTo(-4, -2.5);
      ctx.moveTo(-18, 2.5);
      ctx.lineTo(-4, 2.5);
      ctx.stroke();

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();

      // Diamond Armor-Piercing Bodkin Warhead
      ctx.fillStyle = proj.isFlaming ? '#f97316' : '#fef08a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(15.5, 0);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Long White Goose-Feather Fletching
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-10, -3.5);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-10, 3.5);
      ctx.closePath();
      ctx.fill();
    } else {
      // Standard Arrow Shaft
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();

      // Arrowhead (or Flaming Pitch Head)
      ctx.fillStyle = proj.isFlaming ? '#f97316' : '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(6, -2.5);
      ctx.lineTo(12, 0);
      ctx.lineTo(6, 2.5);
      ctx.closePath();
      ctx.fill();

      if (proj.isFlaming) {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(7, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fletching feathers
      ctx.fillStyle = proj.isPlayer ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-7, -3);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-7, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // ================= PARTICLES ================= //

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.alpha;

    if (p.type === 'spark') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
    } else if (p.type === 'ember') {
      ctx.fillStyle = p.color || '#f97316';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'dust' || p.type === 'smoke') {
      ctx.fillStyle = p.color || '#d4b996';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'blood') {
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'star') {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ================= FLOATING TEXT (SHRUNK BY 40%) ================= //

  private drawFloatingText(ft: FloatingText) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = ft.opacity;
    const fontSize = Math.max(6.5, Number((ft.size * 0.6).toFixed(1))); // Shrunk by 40%
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);

    ctx.restore();
  }
}
