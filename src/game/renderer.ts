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
} from './types.ts';
import {
  PLATEAU_BOUNDS,
  CLIFF_FACE_BOUNDS,
  NORTH_RAMP_BOUNDS,
  CENTRAL_ROAD_BOUNDS,
  TREE_OBSTACLES,
} from './rules.ts';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public render(
    units: Unit[],
    projectiles: Projectile[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    drawnPath: Point[],
    selectedSquad: SquadType | null,
    goldRings: { x: number; y: number; radius: number; alpha: number }[],
    gameTime: number
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Battlefield Topography
    this.drawTerrain(gameTime);

    // 2. Draw Drawn Path preview (Line formation or cavalry route)
    if (drawnPath.length > 1 && selectedSquad) {
      this.drawActivePathPreview(drawnPath, selectedSquad);
    }

    // 3. Draw Units (Sorted by Y for authentic depth layering)
    const sortedUnits = [...units].sort((a, b) => a.y - b.y);

    // Shadows first
    for (const u of sortedUnits) {
      this.drawUnitShadow(u);
    }

    // Units
    for (const u of sortedUnits) {
      this.drawUnit(u, gameTime);
    }

    // 4. Draw Projectiles (Ballistic Parabolic Arrows)
    for (const proj of projectiles) {
      this.drawProjectile(proj);
    }

    // 5. Draw Particles
    for (const p of particles) {
      this.drawParticle(p);
    }

    // 6. Draw Golden Shockwave Rings (Rally Horn)
    for (const ring of goldRings) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(250, 204, 21, ${ring.alpha})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, Math.max(0, ring.radius - 10), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(253, 224, 71, ${ring.alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 7. Draw Floating Combat Texts
    for (const ft of floatingTexts) {
      this.drawFloatingText(ft);
    }
  }

  // ================= TOPOGRAPHY RENDERING ================= //

  private drawTerrain(gameTime: number) {
    const ctx = this.ctx;

    // A. Base Grassy Green (Bright, lush, sunny vibrant cartoon meadow)
    const grassGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    grassGrad.addColorStop(0, '#7ecc4a');
    grassGrad.addColorStop(1, '#6bb83b');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Sunny dappled meadow patches
    ctx.fillStyle = 'rgba(163, 230, 53, 0.25)';
    const sunnyPatches = [
      { x: 220, y: 160, r: 90 },
      { x: 550, y: 140, r: 120 },
      { x: 820, y: 120, r: 140 },
      { x: 980, y: 380, r: 110 },
      { x: 480, y: 600, r: 100 },
      { x: 800, y: 620, r: 130 },
      { x: 120, y: 460, r: 80 },
    ];
    for (const p of sunnyPatches) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Little cheerful wildflowers (Daisies & Golden Buttercups)
    const flowers = [
      { x: 160, y: 370, col: '#fef08a' }, { x: 175, y: 430, col: '#ffffff' },
      { x: 270, y: 530, col: '#ffffff' }, { x: 310, y: 620, col: '#fef08a' },
      { x: 440, y: 220, col: '#ffffff' }, { x: 580, y: 130, col: '#f472b6' },
      { x: 670, y: 160, col: '#fef08a' }, { x: 790, y: 110, col: '#ffffff' },
      { x: 910, y: 140, col: '#fef08a' }, { x: 1050, y: 180, col: '#ffffff' },
      { x: 460, y: 630, col: '#ffffff' }, { x: 530, y: 670, col: '#fef08a' },
      { x: 720, y: 610, col: '#fef08a' }, { x: 890, y: 620, col: '#ffffff' },
      { x: 1080, y: 590, col: '#f472b6' }, { x: 90, y: 640, col: '#ffffff' }
    ];
    for (const f of flowers) {
      // Petals
      ctx.fillStyle = f.col;
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(f.x + Math.cos(ang) * 3, f.y + Math.sin(ang) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Natural grass tufts
    ctx.fillStyle = '#4d8e25';
    const tufts = [
      { x: 210, y: 400 }, { x: 280, y: 500 }, { x: 420, y: 240 },
      { x: 630, y: 170 }, { x: 750, y: 140 }, { x: 940, y: 110 },
      { x: 490, y: 610 }, { x: 680, y: 640 }, { x: 860, y: 590 },
      { x: 1020, y: 570 }, { x: 130, y: 600 }
    ];
    for (const t of tufts) {
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - 3, t.y - 7);
      ctx.lineTo(t.x, t.y - 2);
      ctx.lineTo(t.x + 3, t.y - 8);
      ctx.lineTo(t.x + 1, t.y);
      ctx.fill();
    }

    // B. Warm Sunny Curved Dirt Road & Defile Chokepoint
    ctx.save();
    const roadGrad = ctx.createLinearGradient(310, 350, this.width, 450);
    roadGrad.addColorStop(0, '#fae6be');
    roadGrad.addColorStop(0.5, '#f5deb3');
    roadGrad.addColorStop(1, '#ebd19f');
    ctx.fillStyle = roadGrad;
    ctx.strokeStyle = '#cda972';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(310, 340);
    ctx.bezierCurveTo(480, 310, 750, 230, this.width, 210);
    ctx.lineTo(this.width, 670);
    ctx.bezierCurveTo(750, 680, 480, 620, 310, 520);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warm soft cart track ruts
    ctx.strokeStyle = '#dec292';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(330, 390);
    ctx.bezierCurveTo(550, 360, 850, 300, this.width, 290);
    ctx.moveTo(330, 470);
    ctx.bezierCurveTo(550, 500, 850, 520, this.width, 530);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small smooth river pebbles along the road
    ctx.fillStyle = '#bfa27a';
    const pebbles = [
      { x: 380, y: 370, r: 2.5 }, { x: 460, y: 440, r: 3 },
      { x: 590, y: 390, r: 2 }, { x: 670, y: 510, r: 3 },
      { x: 780, y: 340, r: 2.5 }, { x: 890, y: 460, r: 3.5 },
      { x: 960, y: 320, r: 2 }, { x: 1040, y: 480, r: 3 }
    ];
    for (const pb of pebbles) {
      ctx.beginPath();
      ctx.ellipse(pb.x, pb.y, pb.r * 1.3, pb.r, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // C. High Cliff Plateau (Warm sunny sandstone bluff with vibrant grass top)
    ctx.save();
    // Warm soft ground shadow under cliff
    ctx.fillStyle = 'rgba(40, 65, 20, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 325);
    ctx.bezierCurveTo(180, 335, 290, 340, 345, 295);
    ctx.bezierCurveTo(420, 220, 430, 160, 365, 0);
    ctx.lineTo(380, 0);
    ctx.bezierCurveTo(450, 160, 440, 230, 360, 310);
    ctx.bezierCurveTo(300, 355, 180, 350, 0, 345);
    ctx.closePath();
    ctx.fill();

    // Cliff Face (Warm sunny terracotta clay / sandstone)
    const cliffGrad = ctx.createLinearGradient(0, 210, 350, 330);
    cliffGrad.addColorStop(0, '#d98b64');
    cliffGrad.addColorStop(0.6, '#c47851');
    cliffGrad.addColorStop(1, '#a85f38');
    ctx.fillStyle = cliffGrad;
    ctx.strokeStyle = '#5a311b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.bezierCurveTo(140, 210, 280, 220, 335, 160);
    ctx.bezierCurveTo(370, 120, 360, 50, 340, 0);
    ctx.lineTo(365, 0);
    ctx.bezierCurveTo(395, 80, 410, 160, 345, 280);
    ctx.bezierCurveTo(310, 330, 160, 330, 0, 325);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cliff rock striations & highlights
    ctx.strokeStyle = '#e8a885';
    ctx.lineWidth = 2;
    for (let cx = 80; cx < 330; cx += 45) {
      ctx.beginPath();
      ctx.moveTo(cx, 225);
      ctx.lineTo(cx + 12, 305);
      ctx.stroke();
    }

    // Top Plateau Surface (Bright sunny green lawn)
    const plateauGrass = ctx.createLinearGradient(0, 0, 300, 200);
    plateauGrass.addColorStop(0, '#86d84e');
    plateauGrass.addColorStop(1, '#72c840');
    ctx.fillStyle = plateauGrass;
    ctx.strokeStyle = '#4a2c1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(340, 0);
    ctx.bezierCurveTo(360, 50, 370, 120, 335, 160);
    ctx.bezierCurveTo(280, 220, 140, 210, 0, 210);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plateau edge wooden fence posts
    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    const fencePosts = [
      { x: 30, y: 206 }, { x: 80, y: 207 }, { x: 130, y: 208 },
      { x: 180, y: 205 }, { x: 230, y: 195 }, { x: 275, y: 175 },
      { x: 310, y: 145 }, { x: 330, y: 100 }, { x: 336, y: 50 }
    ];
    for (let i = 0; i < fencePosts.length; i++) {
      const fp = fencePosts[i];
      ctx.fillRect(fp.x - 2.5, fp.y - 12, 5, 14);
      ctx.strokeRect(fp.x - 2.5, fp.y - 12, 5, 14);
      // Rope between posts
      if (i > 0) {
        const prevP = fencePosts[i - 1];
        ctx.strokeStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(prevP.x, prevP.y - 7);
        ctx.quadraticCurveTo((prevP.x + fp.x) / 2, (prevP.y + fp.y) / 2 - 4, fp.x, fp.y - 7);
        ctx.stroke();
      }
    }

    // Highland Archer Vantage Badge (Vivid royal blue & shiny gold)
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(18, 165, 155, 26, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('🏹 HIGH GROUND (+30%)', 24, 182);
    ctx.restore();

    // D. Decorative Blue Pennant Flags on Ground (Lively animated waving)
    const flagPoints = [
      { x: 260, y: 490 },
      { x: 330, y: 560 },
      { x: 240, y: 380 }
    ];
    for (const fp of flagPoints) {
      ctx.save();
      // Flagpole
      ctx.strokeStyle = '#6b4321';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y);
      ctx.lineTo(fp.x, fp.y - 28);
      ctx.stroke();

      // Royal blue triangular flag with sunny highlights
      const wave = Math.sin(gameTime * 5 + fp.x) * 4;
      const flagGrad = ctx.createLinearGradient(fp.x, 0, fp.x + 22, 0);
      flagGrad.addColorStop(0, '#2563eb');
      flagGrad.addColorStop(1, '#60a5fa');
      ctx.fillStyle = flagGrad;
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y - 28);
      ctx.lineTo(fp.x + 20 + wave, fp.y - 21);
      ctx.lineTo(fp.x, fp.y - 14);
      ctx.closePath();
      ctx.fill();

      // Gleaming gold finial
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y - 29, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // E. Stylized Pine Trees (Bright, lush cartoon foliage)
    const pineTrees = [
      { x: 140, y: 550, size: 30 },
      { x: 195, y: 590, size: 28 },
      { x: 100, y: 590, size: 26 },
      { x: 220, y: 640, size: 24 },
    ];
    for (const tree of pineTrees) {
      this.drawStylizedPine(tree.x, tree.y, tree.size, gameTime);
    }

    // F. Drifting Sunny Pollen / Leaves (Brings the scene alive!)
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const lx = ((gameTime * 35 + i * 110) % (this.width + 100)) - 50;
      const ly = (100 + i * 48 + Math.sin(gameTime * 2 + i) * 25) % this.height;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(250, 204, 21, 0.45)' : 'rgba(134, 239, 172, 0.45)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 3, 1.8, Math.sin(gameTime + i), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawStylizedPine(x: number, y: number, size: number, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();
    // Warm soft tree shadow
    ctx.fillStyle = 'rgba(30, 55, 15, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 8, size * 0.95, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(x - 3.5, y - 6, 7, 14);

    // Pine tiers (Bright lively cartoon greens)
    const layers = [
      { offsetY: -10, w: size * 0.92, h: size * 0.58, col: '#15803d' },
      { offsetY: -21, w: size * 0.74, h: size * 0.52, col: '#16a34a' },
      { offsetY: -32, w: size * 0.52, h: size * 0.46, col: '#22c55e' },
    ];

    const windSway = Math.sin(gameTime * 2.5 + x) * 1.5;

    for (let idx = 0; idx < layers.length; idx++) {
      const l = layers[idx];
      const tierSway = windSway * (idx + 1) * 0.6;
      ctx.fillStyle = l.col;
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + tierSway, y + l.offsetY - l.h);
      ctx.lineTo(x - l.w, y + l.offsetY);
      ctx.lineTo(x + l.w, y + l.offsetY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // ================= DRAWN PATH PREVIEW ================= //

  private drawActivePathPreview(stroke: Point[], squadType: SquadType) {
    if (stroke.length < 2) return;
    const ctx = this.ctx;
    ctx.save();

    // 1. Outer Glowing Cyan Ribbon (As seen in video 00:01)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();

    // 2. Bright Inner Cyan Core
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 3. Animated Forward-Pointing Arrow Cursor at the end (Exact video match!)
    const last = stroke[stroke.length - 1];
    const prev = stroke[Math.max(0, stroke.length - 3)];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.rotate(angle);

    // Outer arrow outline
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-14, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-14, 10);
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
    // Warm soft translucent shadow (never dark or dreary)
    ctx.fillStyle = 'rgba(35, 60, 20, 0.24)';
    ctx.beginPath();
    const radiusX = u.type === 'cavalry' ? u.radius * 1.5 : (u.type === 'brute' ? u.radius * 1.4 : u.radius * 1.15);
    const radiusY = u.radius * 0.55;
    ctx.ellipse(u.x, u.y + (u.type === 'cavalry' ? 7 : 4), radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    // Hit flash
    if (u.hitFlashTimer && u.hitFlashTimer > 0) {
      ctx.filter = 'brightness(2.2)';
    }

    // Dying fade
    if (u.isDying) {
      ctx.globalAlpha = Math.max(0, (u.deathTimer ?? 0) / 0.5);
    }

    // Bouncy energetic animation: walk bobbing when moving, soft breathing when idle
    const isMoving = u.targetX !== undefined && (Math.abs(u.targetX - u.x) > 2 || Math.abs((u.targetY ?? u.y) - u.y) > 2);
    const bobY = isMoving ? Math.sin(gameTime * 14 + u.x * 0.1) * 2.2 : Math.sin(gameTime * 3.5 + u.y * 0.1) * 0.8;
    const bobAngle = isMoving ? Math.sin(gameTime * 14 + u.x * 0.1) * 0.08 : 0;

    ctx.translate(0, bobY);
    if (bobAngle !== 0) {
      ctx.translate(u.x, u.y);
      ctx.rotate(bobAngle);
      ctx.translate(-u.x, -u.y);
    }

    // Draw unit by archetype
    if (u.isPlayer) {
      if (u.type === 'shield') {
        this.drawShieldUnit(u, gameTime);
      } else if (u.type === 'archer') {
        this.drawArcherUnit(u, gameTime);
      } else if (u.type === 'cavalry') {
        this.drawCavalryUnit(u, gameTime);
      }
    } else {
      if (u.type === 'swordsman') {
        this.drawRedSwordsman(u, gameTime);
      } else if (u.type === 'spearman') {
        this.drawRedSpearman(u, gameTime);
      } else if (u.type === 'archer') {
        this.drawRedArcher(u, gameTime);
      } else if (u.type === 'brute') {
        this.drawRedBrute(u, gameTime);
      }
    }

    // Status effect overlays (Dizzy stars, sweat drops)
    this.drawStatusEffects(u, gameTime);

    // Health Bar
    this.drawHealthBar(u);

    ctx.restore();
  }

  // 1. Blue Shield Phalanx (Vivid Royal Blue & Polished Steel)
  private drawShieldUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isBraced = u.isBraced;

    // Body (Vibrant Royal Blue tunic)
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Gleaming Silver Helmet with highlight
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(u.x - 2, u.y - 2, u.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular sunny glint on helm
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(u.x - 4, u.y - 4, u.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Eye visor slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(u.x - 1, u.y - 3, 3, 2);

    // Helmet Plume (Crimson feather)
    ctx.fillStyle = (u.veterancyTier ?? 1) >= 3 ? '#facc15' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(u.x - 3, u.y - u.radius * 0.6);
    ctx.quadraticCurveTo(u.x - 6, u.y - u.radius * 1.1, u.x - 2, u.y - u.radius * 1.3);
    ctx.quadraticCurveTo(u.x, u.y - u.radius * 0.9, u.x - 1, u.y - u.radius * 0.6);
    ctx.fill();

    // Large Kite Shield (Vivid Royal Blue with Golden Trim & Alliance Cross)
    ctx.save();
    ctx.translate(u.x + (isBraced ? 7 : 4), u.y);
    const shieldGrad = ctx.createLinearGradient(0, -u.radius * 1.1, 0, u.radius * 1.3);
    shieldGrad.addColorStop(0, '#3b82f6');
    shieldGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = shieldGrad;
    ctx.strokeStyle = isBraced ? '#facc15' : '#fbbf24';
    ctx.lineWidth = isBraced ? 2.8 : 1.8;

    ctx.beginPath();
    ctx.moveTo(0, -u.radius * 1.15);
    ctx.lineTo(u.radius * 0.95, -u.radius * 0.85);
    ctx.lineTo(u.radius * 0.75, u.radius * 1.1);
    ctx.lineTo(0, u.radius * 1.35);
    ctx.lineTo(-u.radius * 0.75, u.radius * 1.1);
    ctx.lineTo(-u.radius * 0.95, -u.radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pure White Alliance Cross emblem
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -u.radius * 0.7, 4, u.radius * 1.3);
    ctx.fillRect(-u.radius * 0.55, -u.radius * 0.25, u.radius * 1.1, 4);

    // Golden shield boss rivet
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -u.radius * 0.05, 3, 0, Math.PI * 2);
    ctx.fill();

    // Braced sparkling golden defensive barrier
    if (isBraced) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, u.radius * 1.45, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Blue Highland Archer (Cyan/Teal Ranger with fine longbow)
  private drawArcherUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;

    // Tunic (Bright Cyan Ranger)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ranger Hood & Feathers
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(u.x, u.y - 2, u.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Cyan/Yellow feather plume
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(u.x + 2, u.y - 6);
    ctx.lineTo(u.x + 8, u.y - 12);
    ctx.lineTo(u.x + 3, u.y - 8);
    ctx.fill();

    // Quiver with arrows on back
    ctx.fillStyle = '#92400e';
    ctx.fillRect(u.x - u.radius - 2, u.y - 6, 4, 12);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(u.x - u.radius - 1, u.y - 9, 2, 3);

    // Longbow
    ctx.save();
    ctx.translate(u.x + 6, u.y);
    ctx.rotate(u.facing);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, u.radius * 1.25, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // Bowstring
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const tipTopY = -u.radius * 1.25 * Math.sin(Math.PI * 0.45);
    const tipBotY = u.radius * 1.25 * Math.sin(Math.PI * 0.45);
    const tipX = u.radius * 1.25 * Math.cos(Math.PI * 0.45);
    ctx.moveTo(tipX, tipTopY);
    ctx.lineTo(1, 0);
    ctx.lineTo(tipX, tipBotY);
    ctx.stroke();

    // Nocked arrow with steel tip
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(tipX + 8, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tipX + 8, -2);
    ctx.lineTo(tipX + 13, 0);
    ctx.lineTo(tipX + 8, 2);
    ctx.fill();

    ctx.restore();
  }

  // 3. Blue Knight Cavalry (Vibrant Galloping Warhorse & Pennoned Lance)
  private drawCavalryUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.facing);

    // Gallop leg animation
    const gallop = Math.sin(gameTime * 18);

    // Warm Chestnut Warhorse
    ctx.fillStyle = '#6b3a1d';
    ctx.beginPath();
    ctx.ellipse(0, 0, u.radius * 1.35, u.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horse legs (animated gallop)
    ctx.strokeStyle = '#4a2612';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Front legs
    ctx.moveTo(u.radius * 0.8, 4);
    ctx.lineTo(u.radius * 1.2 + gallop * 4, 10);
    // Rear legs
    ctx.moveTo(-u.radius * 0.8, 4);
    ctx.lineTo(-u.radius * 1.2 - gallop * 4, 10);
    ctx.stroke();

    // Royal Blue Caparison / Saddle Cloth with bright gold border
    const caparisonGrad = ctx.createLinearGradient(-u.radius * 0.7, 0, u.radius * 0.7, 0);
    caparisonGrad.addColorStop(0, '#2563eb');
    caparisonGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = caparisonGrad;
    ctx.fillRect(-u.radius * 0.7, -u.radius * 0.65, u.radius * 1.4, u.radius * 1.3);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-u.radius * 0.7, -u.radius * 0.65, u.radius * 1.4, u.radius * 1.3);

    // Warhorse Head & Neck with animated bob
    const headBob = gallop * 2;
    ctx.fillStyle = '#552e17';
    ctx.beginPath();
    ctx.ellipse(u.radius * 1.15, -3 + headBob, u.radius * 0.65, u.radius * 0.5, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Horse Mane
    ctx.fillStyle = '#facc15';
    ctx.fillRect(u.radius * 0.8, -8 + headBob, 6, 4);

    // Knight in Gleaming Steel Armor
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, u.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular shine on Knight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -2, u.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Flowing Crimson & Gold Plume
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -u.radius * 0.7);
    ctx.lineTo(-6, -u.radius * 1.4);
    ctx.lineTo(2, -u.radius * 0.9);
    ctx.fill();

    // Long Jouster Lance
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(u.radius * 0.4, 4);
    ctx.lineTo(u.radius * 2.5, 4);
    ctx.stroke();

    // Steel Spearhead
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(u.radius * 2.5, 1);
    ctx.lineTo(u.radius * 3.0, 4);
    ctx.lineTo(u.radius * 2.5, 7);
    ctx.closePath();
    ctx.fill();

    // Fluttering Lance Pennon Flag
    const pennonWave = Math.sin(gameTime * 15) * 3;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(u.radius * 2.1, 4);
    ctx.lineTo(u.radius * 2.5 + pennonWave, 8);
    ctx.lineTo(u.radius * 2.5, 4);
    ctx.fill();

    // Momentum Golden Speed Trails & Wind Blasts
    if (u.momentum > 1.3) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-u.radius * 1.6, -5);
      ctx.lineTo(-u.radius * 2.7, -5);
      ctx.moveTo(-u.radius * 1.6, 5);
      ctx.lineTo(-u.radius * 3.0, 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 4. Red Swordsman (Energetic Barbarian Infantry)
  private drawRedSwordsman(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    // Energetic Crimson Barbarian Body
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Round Barbarian Wooden Shield with Iron Spikes
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(u.x + 4, u.y, u.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Iron Boss
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(u.x + 4, u.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Spiked Helmet with animated horns
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(u.x - 2, u.y - 2, u.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Barbarian Battleaxe
    ctx.save();
    ctx.translate(u.x - 5, u.y);
    ctx.rotate(u.facing);
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(u.radius * 1.3, 0);
    ctx.stroke();

    // Curved Steel Axe Blade
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(u.radius * 0.85, -7);
    ctx.lineTo(u.radius * 1.35, -10);
    ctx.lineTo(u.radius * 1.35, 10);
    ctx.lineTo(u.radius * 0.85, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 5. Red Spearman (Barbarian Polearm Guard)
  private drawRedSpearman(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Helmet
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(u.x - 2, u.y - 2, u.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Long Barbarian Spear
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.facing);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-u.radius * 0.5, 3);
    ctx.lineTo(u.radius * 2.3, 3);
    ctx.stroke();

    // Broad Leaf-shaped Steel Spearhead
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(u.radius * 2.3, 0);
    ctx.lineTo(u.radius * 2.9, 3);
    ctx.lineTo(u.radius * 2.3, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 6. Red Enemy Archer (Vibrant Crimson Raider)
  private drawRedArcher(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    // Cowl & Tunic
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red Hood
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(u.x, u.y - 2, u.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Wooden Bow
    ctx.save();
    ctx.translate(u.x - 4, u.y);
    ctx.rotate(u.facing);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, u.radius * 1.15, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // String
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const tipY = u.radius * 1.15 * Math.sin(Math.PI * 0.45);
    const tipX = u.radius * 1.15 * Math.cos(Math.PI * 0.45);
    ctx.moveTo(tipX, -tipY);
    ctx.lineTo(2, 0);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Red Brute Boss (Energetic Massive Barbarian Juggernaut)
  private drawRedBrute(u: Unit, gameTime: number) {
    const ctx = this.ctx;

    // Cleave windup telegraphed bright red/orange ground danger zone
    if (u.isCleaving && u.cleaveWindupTimer !== undefined) {
      const progress = 1 - (u.cleaveWindupTimer / 0.65);
      ctx.save();
      ctx.beginPath();
      ctx.arc(u.x - 25, u.y, 80, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.lineTo(u.x - 25, u.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(239, 68, 68, ${0.25 + progress * 0.45})`;
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.restore();
    }

    // Huge hulking body (Deep barbarian crimson & bronze)
    const bodyGrad = ctx.createLinearGradient(u.x - u.radius, u.y - u.radius, u.x + u.radius, u.y + u.radius);
    bodyGrad.addColorStop(0, '#dc2626');
    bodyGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Massive Bronze Spiked Pauldrons
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(u.x - 12, u.y - 14, 11, 0, Math.PI * 2);
    ctx.arc(u.x + 12, u.y - 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Spikes on pauldrons
    ctx.fillStyle = '#facc15';
    ctx.fillRect(u.x - 14, u.y - 28, 4, 6);
    ctx.fillRect(u.x + 10, u.y - 28, 4, 6);

    // Iron Skull Helm
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(u.x, u.y - 6, u.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing ruby eyes
    ctx.fillStyle = '#f87171';
    ctx.fillRect(u.x - 5, u.y - 7, 3, 2);
    ctx.fillRect(u.x + 2, u.y - 7, 3, 2);

    // Giant Golden Curved Horns
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(u.x - 10, u.y - 12);
    ctx.quadraticCurveTo(u.x - 22, u.y - 18, u.x - 24, u.y - 24);
    ctx.moveTo(u.x + 10, u.y - 12);
    ctx.quadraticCurveTo(u.x + 22, u.y - 18, u.x + 24, u.y - 24);
    ctx.stroke();

    // Massive Spiked Warclub
    ctx.save();
    ctx.translate(u.x - 14, u.y);
    ctx.rotate(u.facing + (u.isCleaving ? Math.PI * 0.4 : 0));
    ctx.fillStyle = '#573318';
    ctx.fillRect(0, -7, 36, 14);
    ctx.strokeStyle = '#29180c';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -7, 36, 14);

    // Golden & Steel Spikes
    ctx.fillStyle = '#facc15';
    for (let sp = 10; sp <= 32; sp += 7) {
      ctx.fillRect(sp, -11, 4, 4);
      ctx.fillRect(sp, 7, 4, 4);
    }
    ctx.restore();

    // Overhead Boss HP Bar (💀 680 HP)
    this.drawBossHpBar(u);
  }

  private drawBossHpBar(u: Unit) {
    const ctx = this.ctx;
    const barW = 140;
    const barH = 14;
    const barX = u.x - barW / 2;
    const barY = u.y - u.radius - 32;

    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);
    ctx.fill();

    // Gold outer frame
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Background track
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    // Health Fill (Vibrant red to crimson gradient)
    const fillW = Math.max(0, (u.hp / u.maxHp) * barW);
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(0.5, '#ef4444');
    grad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 4);
    ctx.fill();

    // Top shine highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(barX + 2, barY + 1, Math.max(0, fillW - 4), barH * 0.4);

    // Label with Skull
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.5;
    ctx.strokeText(`💀 RED BRUTE · ${Math.round(u.hp)} / ${u.maxHp} HP`, u.x, barY - 6);
    ctx.fillText(`💀 RED BRUTE · ${Math.round(u.hp)} / ${u.maxHp} HP`, u.x, barY - 6);
    ctx.restore();
  }

  private drawHealthBar(u: Unit) {
    // For regular units (not the Brute boss which has dedicated large bar)
    if (u.type === 'brute') return;

    const ctx = this.ctx;
    const barW = u.radius * 2.2;
    const barH = 4.5;
    const barX = u.x - barW / 2;
    const barY = u.y - u.radius - 9;

    ctx.save();
    // Soft shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 3);
    ctx.fill();

    // Health fill (Bright blue for blue alliance, bright coral red for red barbarians)
    const fillW = Math.max(0, (u.hp / u.maxHp) * barW);
    ctx.fillStyle = u.isPlayer ? '#38bdf8' : '#f87171';
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 2.5);
    ctx.fill();
    ctx.restore();
  }

  // ================= STATUS EFFECTS ================= //

  private drawStatusEffects(u: Unit, gameTime: number) {
    const ctx = this.ctx;

    // Stunned: 3 orbiting dizzy stars
    if (u.stunTimer && u.stunTimer > 0) {
      ctx.save();
      const orbitRadius = u.radius + 6;
      const angle = gameTime * 6;
      for (let i = 0; i < 3; i++) {
        const starAngle = angle + (i * Math.PI * 2) / 3;
        const sx = u.x + Math.cos(starAngle) * orbitRadius;
        const sy = u.y - u.radius - 4 + Math.sin(starAngle) * (orbitRadius * 0.4);

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Panicking / Fleeing: sweat drop hopping
    if (u.panicTimer && u.panicTimer > 0) {
      ctx.save();
      const bounce = Math.abs(Math.sin(gameTime * 10)) * 6;
      const dropX = u.x + u.radius + 2;
      const dropY = u.y - u.radius - bounce;

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(dropX, dropY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dropX - 3, dropY);
      ctx.lineTo(dropX, dropY - 5);
      ctx.lineTo(dropX + 3, dropY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Frenzy / Rally Aura
    if (u.frenzyTimer && u.frenzyTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ================= PROJECTILES ================= //

  private drawProjectile(proj: Projectile) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.y, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Parabolic Arrow Body (lifted by currentHeight)
    const arrowY = proj.y - proj.currentHeight;

    // Angle of flight (dx, dy including vertical arc delta)
    const dx = proj.targetX - proj.startX;
    const dy = proj.targetY - proj.startY;
    const baseAngle = Math.atan2(dy, dx);
    // Vertical slope
    const arcAngle = (0.5 - proj.progress) * 0.7;
    const totalAngle = baseAngle + arcAngle;

    ctx.translate(proj.x, arrowY);
    ctx.rotate(totalAngle);

    // Arrow Shaft
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.lineTo(11, 0);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();

    // Fletching feathers
    ctx.fillStyle = proj.isPlayer ? '#38bdf8' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-7, -3);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-7, 3);
    ctx.closePath();
    ctx.fill();

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
    } else if (p.type === 'dust') {
      ctx.fillStyle = '#d4b996';
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

  // ================= FLOATING TEXT ================= //

  private drawFloatingText(ft: FloatingText) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = ft.opacity;
    ctx.font = `bold ${ft.size}px system-ui, sans-serif`;
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';

    // Outline for strong readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);

    ctx.restore();
  }
}
