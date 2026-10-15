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
    gameTime: number
  ) {
    const ctx = this.ctx;
    ctx.save();
    // 1. Clear physical canvas buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.bufferWidth, this.bufferHeight);

    // 2. High-DPI crisp integer scaling to native display resolution
    ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    this.disableSmoothing();

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
    ctx.restore();
  }

  // ================= TOPOGRAPHY RENDERING ================= //

  private drawTerrain(gameTime: number) {
    const ctx = this.ctx;

    // A. Base Grassy Green (Bright, lush, sunny vibrant cartoon meadow)
    const grassGrad = ctx.createLinearGradient(0, 0, 0, this.worldHeight);
    grassGrad.addColorStop(0, '#7ecc4a');
    grassGrad.addColorStop(1, '#6bb83b');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

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
    // Natural curve running smoothly from bottom-left corner (0, 545 to 0, 695) across defile to eastern edge
    ctx.save();
    
    // Soft ambient ground shadow at the road edges
    ctx.fillStyle = 'rgba(40, 60, 20, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, 535);
    ctx.bezierCurveTo(140, 510, 270, 360, 440, 315);
    ctx.bezierCurveTo(680, 245, 920, 205, this.worldWidth, 185);
    ctx.lineTo(this.worldWidth, 685);
    ctx.bezierCurveTo(920, 695, 650, 635, 420, 555);
    ctx.bezierCurveTo(270, 595, 130, 665, 0, 705);
    ctx.closePath();
    ctx.fill();

    // Main Dirt Road Surface (Layered warm soil gradations)
    const roadGrad = ctx.createLinearGradient(0, 600, this.worldWidth, 350);
    roadGrad.addColorStop(0, '#ebd09f');
    roadGrad.addColorStop(0.35, '#f5deb3');
    roadGrad.addColorStop(0.7, '#ebd19f');
    roadGrad.addColorStop(1, '#dfbc85');
    ctx.fillStyle = roadGrad;
    ctx.strokeStyle = '#c8a36c';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, 545);
    ctx.bezierCurveTo(140, 520, 270, 370, 440, 325);
    ctx.bezierCurveTo(680, 255, 920, 215, this.worldWidth, 195);
    ctx.lineTo(this.worldWidth, 675);
    ctx.bezierCurveTo(920, 685, 650, 625, 420, 545);
    ctx.bezierCurveTo(270, 585, 130, 655, 0, 695);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle uneven dirt patches & soil variations (No dashed highway lines!)
    const soilPatches = [
      { x: 120, y: 610, rx: 65, ry: 28, rot: -0.3, col: 'rgba(195, 150, 95, 0.28)' },
      { x: 260, y: 530, rx: 75, ry: 35, rot: -0.4, col: 'rgba(215, 175, 120, 0.35)' },
      { x: 380, y: 440, rx: 90, ry: 40, rot: -0.2, col: 'rgba(185, 140, 85, 0.25)' },
      { x: 540, y: 390, rx: 110, ry: 50, rot: -0.15, col: 'rgba(215, 175, 120, 0.3)' },
      { x: 740, y: 370, rx: 120, ry: 55, rot: -0.05, col: 'rgba(195, 150, 95, 0.25)' },
      { x: 960, y: 360, rx: 130, ry: 60, rot: 0.05, col: 'rgba(225, 185, 130, 0.3)' },
      { x: 1120, y: 380, rx: 90, ry: 45, rot: 0.08, col: 'rgba(185, 140, 85, 0.25)' },
    ];
    for (const sp of soilPatches) {
      ctx.fillStyle = sp.col;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.rx, sp.ry, sp.rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Natural curved wagon ruts (organic continuous grooves pressed into clay)
    ctx.strokeStyle = 'rgba(180, 135, 80, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 580);
    ctx.bezierCurveTo(140, 555, 280, 420, 440, 385);
    ctx.bezierCurveTo(680, 315, 920, 275, this.worldWidth, 260);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 650);
    ctx.bezierCurveTo(140, 620, 270, 490, 440, 475);
    ctx.bezierCurveTo(680, 435, 920, 420, this.worldWidth, 425);
    ctx.stroke();

    // Natural river pebbles & gravel clusters with 3D drop shadow & highlight
    const pebbles = [
      { x: 90, y: 625, r: 3, c: '#b39268' }, { x: 170, y: 585, r: 2.2, c: '#9c7b52' },
      { x: 230, y: 540, r: 3.5, c: '#c9a87c' }, { x: 310, y: 470, r: 2.8, c: '#a8855c' },
      { x: 380, y: 395, r: 3.2, c: '#b8946a' }, { x: 440, y: 445, r: 2.5, c: '#997850' },
      { x: 530, y: 410, r: 3.8, c: '#c4a275' }, { x: 610, y: 490, r: 3, c: '#a58359' },
      { x: 690, y: 370, r: 2.6, c: '#b59267' }, { x: 770, y: 430, r: 3.6, c: '#c8a77d' },
      { x: 860, y: 345, r: 2.8, c: '#9a7951' }, { x: 940, y: 465, r: 3.4, c: '#bda076' },
      { x: 1030, y: 360, r: 2.4, c: '#ab885e' }, { x: 1110, y: 440, r: 3.2, c: '#c5a479' }
    ];
    for (const pb of pebbles) {
      // Pebble shadow
      ctx.fillStyle = 'rgba(50, 35, 15, 0.35)';
      ctx.beginPath();
      ctx.ellipse(pb.x + 1.2, pb.y + 1.2, pb.r * 1.3, pb.r * 0.9, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Pebble stone body
      ctx.fillStyle = pb.c;
      ctx.beginPath();
      ctx.ellipse(pb.x, pb.y, pb.r * 1.25, pb.r * 0.85, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Pebble sunlight highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(pb.x - pb.r * 0.3, pb.y - pb.r * 0.3, pb.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // C. High Cliff Plateau with Tiered 3D Isometric Rocks & Wooden Ramp Bridge
    ctx.save();

    // 1. Deep cast shadow beneath the entire cliff onto the road and defile
    ctx.fillStyle = 'rgba(25, 40, 15, 0.38)';
    ctx.beginPath();
    ctx.moveTo(0, 335);
    ctx.bezierCurveTo(140, 345, 270, 350, 355, 305);
    ctx.bezierCurveTo(430, 230, 440, 160, 375, 0);
    ctx.lineTo(395, 0);
    ctx.bezierCurveTo(465, 160, 455, 240, 370, 320);
    ctx.bezierCurveTo(280, 370, 140, 365, 0, 355);
    ctx.closePath();
    ctx.fill();

    // 2. Base Cliff Wall (Terracotta sandstone foundation)
    const cliffBaseGrad = ctx.createLinearGradient(0, 200, 360, 340);
    cliffBaseGrad.addColorStop(0, '#c7784f');
    cliffBaseGrad.addColorStop(0.5, '#ab5e35');
    cliffBaseGrad.addColorStop(1, '#7a3b1a');
    ctx.fillStyle = cliffBaseGrad;
    ctx.strokeStyle = '#4a210c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.bezierCurveTo(140, 210, 280, 220, 335, 160);
    ctx.bezierCurveTo(370, 120, 360, 50, 340, 0);
    ctx.lineTo(365, 0);
    ctx.bezierCurveTo(395, 80, 410, 160, 345, 280);
    ctx.bezierCurveTo(310, 335, 160, 335, 0, 330);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Tiered 3D Isometric Rock Strata (Faceted rock blocks with deep undercuts & shadows)
    const rockTiers = [
      // Lower Tier boulders & ledges
      { pts: [[0, 270], [80, 260], [120, 290], [150, 280], [210, 310], [180, 330], [90, 332], [0, 330]], shadow: '#542610', face: '#a45731', light: '#d98157' },
      { pts: [[140, 275], [220, 260], [270, 290], [310, 280], [335, 305], [290, 328], [210, 325], [150, 280]], shadow: '#421d0a', face: '#944b26', light: '#c86f45' },
      // Mid Tier stone shelf
      { pts: [[0, 230], [95, 225], [145, 245], [220, 235], [260, 255], [230, 280], [130, 275], [0, 275]], shadow: '#592912', face: '#b8663d', light: '#e58e63' },
      { pts: [[210, 225], [275, 210], [325, 225], [350, 250], [335, 280], [265, 270], [215, 240]], shadow: '#4a200c', face: '#a0542c', light: '#ce764b' },
      // Upper Escarpment under plateau rim
      { pts: [[310, 140], [345, 90], [355, 40], [340, 0], [360, 0], [375, 50], [370, 120], [335, 160]], shadow: '#421b08', face: '#8c4420', light: '#b85f34' }
    ];

    for (const rock of rockTiers) {
      // Dark undercut shadow
      ctx.fillStyle = rock.shadow;
      ctx.beginPath();
      ctx.moveTo(rock.pts[0][0], rock.pts[0][1]);
      for (let i = 1; i < rock.pts.length; i++) {
        ctx.lineTo(rock.pts[i][0], rock.pts[i][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Main rock face
      ctx.fillStyle = rock.face;
      ctx.beginPath();
      ctx.moveTo(rock.pts[0][0] + 2, rock.pts[0][1] - 3);
      for (let i = 1; i < rock.pts.length - 1; i++) {
        ctx.lineTo(rock.pts[i][0] + 1, rock.pts[i][1] - 4);
      }
      ctx.closePath();
      ctx.fill();

      // Sunlit top edge highlight
      ctx.strokeStyle = rock.light;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rock.pts[0][0], rock.pts[0][1] - 4);
      for (let i = 1; i < Math.ceil(rock.pts.length / 2); i++) {
        ctx.lineTo(rock.pts[i][0], rock.pts[i][1] - 4);
      }
      ctx.stroke();
    }

    // Vertical crags and rock fracture fissures
    ctx.strokeStyle = '#381607';
    ctx.lineWidth = 2.2;
    const fissures = [
      [[70, 225], [65, 260], [75, 290], [70, 325]],
      [[155, 235], [165, 270], [160, 315]],
      [[245, 220], [240, 255], [250, 300]],
      [[300, 185], [305, 230], [295, 275]],
      [[335, 80], [340, 130], [325, 170]]
    ];
    for (const f of fissures) {
      ctx.beginPath();
      ctx.moveTo(f[0][0], f[0][1]);
      for (let i = 1; i < f.length; i++) {
        ctx.lineTo(f[i][0], f[i][1]);
      }
      ctx.stroke();
    }

    // 4. Wooden Ramp Bridge on the right side of the cliff (Connecting plateau to defile)
    // Runs from around (325, 140) down to (375, 290)
    // Ground shadow beneath ramp stilts
    ctx.fillStyle = 'rgba(25, 35, 15, 0.4)';
    ctx.beginPath();
    ctx.ellipse(360, 305, 35, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Heavy vertical timber support stilts
    const stilts = [
      { x: 335, topY: 155, botY: 220 },
      { x: 352, topY: 195, botY: 260 },
      { x: 370, topY: 235, botY: 298 }
    ];
    for (const s of stilts) {
      ctx.fillStyle = '#3a1b08';
      ctx.fillRect(s.x - 4, s.topY, 8, s.botY - s.topY);
      ctx.fillStyle = '#6b3614';
      ctx.fillRect(s.x - 2, s.topY, 4, s.botY - s.topY);
      ctx.strokeStyle = '#4a240c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.topY + 12);
      ctx.lineTo(s.x + 6, s.botY - 6);
      ctx.stroke();
    }

    // Heavy wooden inclined stringer beams
    ctx.strokeStyle = '#4e250c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(320, 145);
    ctx.lineTo(375, 290);
    ctx.moveTo(332, 140);
    ctx.lineTo(387, 285);
    ctx.stroke();

    // Wooden plank treads (slanted stepped planks)
    for (let step = 0; step <= 10; step++) {
      const t = step / 10;
      const px = 320 + t * 55;
      const py = 145 + t * 145;
      ctx.fillStyle = step % 2 === 0 ? '#85471d' : '#9c5523';
      ctx.strokeStyle = '#381705';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 10, py - 4);
      ctx.lineTo(px + 12, py + 2);
      ctx.lineTo(px + 10, py + 8);
      ctx.lineTo(px - 12, py + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e1006';
      ctx.beginPath();
      ctx.arc(px - 6, py - 1, 1, 0, Math.PI * 2);
      ctx.arc(px + 6, py + 3, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wooden Handrail with balusters
    ctx.strokeStyle = '#633110';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(320, 125);
    ctx.lineTo(375, 270);
    ctx.stroke();

    for (let p = 0; p <= 4; p++) {
      const t = p / 4;
      const hx = 320 + t * 55;
      const hy = 145 + t * 145;
      ctx.strokeStyle = '#4a220a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx, hy - 20);
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(hx - 2, hy - 18, 4, 3);
    }

    // 5. Top Plateau Surface (Bright sunny green lawn)
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
      if (i > 0) {
        const prevP = fencePosts[i - 1];
        ctx.strokeStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(prevP.x, prevP.y - 7);
        ctx.quadraticCurveTo((prevP.x + fp.x) / 2, (prevP.y + fp.y) / 2 - 4, fp.x, fp.y - 7);
        ctx.stroke();
      }
    }

    // Highland Archer Vantage Badge
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
      const lx = ((gameTime * 35 + i * 110) % (this.worldWidth + 100)) - 50;
      const ly = (100 + i * 48 + Math.sin(gameTime * 2 + i) * 25) % this.worldHeight;
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
    // Dark crisp oval ground shadow planted firmly under feet
    ctx.fillStyle = 'rgba(15, 25, 10, 0.38)';
    ctx.beginPath();
    const radiusX = u.type === 'cavalry' ? u.radius * 1.55 : (u.type === 'brute' ? u.radius * 1.45 : u.radius * 1.15);
    const radiusY = u.radius * 0.5;
    ctx.ellipse(u.x, u.y + (u.type === 'cavalry' ? 9 : 6), radiusX, radiusY, 0, 0, Math.PI * 2);
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

  // 1. Blue Shield Phalanx (Tabletop Miniature Knight with Plate Armor, Kite Shield & Sword)
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
    ctx.scale(flipX, 1);

    // 1. Planted boots on ground
    ctx.fillStyle = '#381a08';
    ctx.fillRect(-6 - walkStep, 6, 4.5, 3);
    ctx.fillRect(1 + walkStep, 7, 5, 3);

    // 2. Armored Legs & Greaves
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-5 - walkStep, 2, 3.5, 5);
    ctx.fillRect(2 + walkStep, 3, 3.5, 5);

    // 3. Torso / Royal Blue Tabard with Chainmail
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

    // Leather belt with golden buckle
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5.5, -1, 11, 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1.5, -1.5, 3, 3);

    // 4. Knight Helmet & Great Helm
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-4.5, -14, 9, 8, 3);
    ctx.fill();
    ctx.stroke();

    // Visor eye slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-0.5, -11, 4.5, 1.8);

    // Specular gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -12, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Plume on crest
    ctx.fillStyle = (u.veterancyTier ?? 1) >= 3 ? '#facc15' : '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.quadraticCurveTo(-6, -18, -3, -21);
    ctx.quadraticCurveTo(0, -17, 0, -14);
    ctx.closePath();
    ctx.fill();

    // 5. Weapon Arm: Steel Arming Sword with Attack Arc
    ctx.save();
    ctx.translate(-4, -4);
    ctx.rotate(0.3 + swingAngle);

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

    // Attack slash arc motion trail
    if (attackProg > 0.1 && attackProg < 0.85) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -Math.PI * 0.7, -Math.PI * 0.1);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Left Arm: Large Kite Shield
    ctx.save();
    ctx.translate(isBraced ? 6 : 4, -1);
    const shieldGrad = ctx.createLinearGradient(0, -12, 0, 13);
    shieldGrad.addColorStop(0, '#3b82f6');
    shieldGrad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = shieldGrad;
    ctx.strokeStyle = isBraced ? '#facc15' : '#fbbf24';
    ctx.lineWidth = isBraced ? 2.5 : 1.6;

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

    // White Heraldic Cross on Shield
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -7, 2.5, 13);
    ctx.fillRect(-3.5, -3, 8, 2.5);

    // Golden boss rivet
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0.2, -1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Braced shield wall golden aura sparkles
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

  // 2. Blue Highland Archer (Tabletop Miniature Ranger with Yew Longbow)
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
    ctx.scale(flipX, 1);

    // 1. Leather Boots planted
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5 - walkStep, 5, 4, 3);
    ctx.fillRect(1 + walkStep, 6, 4.5, 3);

    // 2. Leather Vambraces & Trousers
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(-4.5, 1, 3.5, 5);
    ctx.fillRect(1.5, 2, 3.5, 5);

    // 3. Cyan/Teal Ranger Tunic
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

    // Cross-body leather quiver strap
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 2);
    ctx.stroke();

    // 4. Back Quiver with Arrows
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-7, -8, 4, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-6.5, -11, 1.5, 3);
    ctx.fillRect(-4.5, -10, 1.5, 2);

    // 5. Ranger Hood & Head
    ctx.fillStyle = '#0ea5e9';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-4, -13, 8, 8, 3);
    ctx.fill();
    ctx.stroke();

    // Shadow face opening
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -10, 3.5, 3);

    // Azure feather plume
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-1, -13);
    ctx.lineTo(-4, -18);
    ctx.lineTo(0, -15);
    ctx.closePath();
    ctx.fill();

    // 6. Recurve Yew Bow & Arrow
    ctx.save();
    ctx.translate(5, -2);

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(1, -12);
    ctx.quadraticCurveTo(5, 0, 1, 12);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, -13, 2, 2);
    ctx.fillRect(0, 11, 2, 2);

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, -12);
    ctx.lineTo(-2 - bowDraw, 0);
    ctx.lineTo(1, 12);
    ctx.stroke();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2 - bowDraw, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(14, 0);
    ctx.lineTo(10, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1 - bowDraw, -2, 2, 4);

    ctx.restore();
    ctx.restore();
  }

  // 3. Blue Knight Cavalry (Tabletop Miniature Armored Warhorse & Lance Knight)
  private drawCavalryUnit(u: Unit, gameTime: number) {
    const ctx = this.ctx;
    const isFacingLeft = Math.cos(u.facing) < 0;
    const flipX = isFacingLeft ? -1 : 1;
    const gallop = Math.sin(gameTime * 18);
    const attackProg = u.attackTimer > 0 ? (u.attackTimer / u.attackCooldown) : 0;
    const lanceThrust = attackProg > 0 ? Math.sin((1 - attackProg) * Math.PI) * 12 : 0;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX, 1);

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

    // Hooves
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(11 + gallop * 5, 10, 4, 2);
    ctx.fillRect(-14 - gallop * 5, 10, 4, 2);

    // Muscular torso
    ctx.fillStyle = '#6b3a1d';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Royal Blue Caparison (Cloth Barding with Gold Trim)
    const capGrad = ctx.createLinearGradient(-10, 0, 10, 0);
    capGrad.addColorStop(0, '#1d4ed8');
    capGrad.addColorStop(1, '#2563eb');
    ctx.fillStyle = capGrad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-10, -7, 20, 13, 3);
    ctx.fill();
    ctx.stroke();

    // Warhorse Head & Neck with Steel Chamfron
    const headBob = gallop * 2;
    ctx.fillStyle = '#552e17';
    ctx.beginPath();
    ctx.ellipse(14, -4 + headBob, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Steel Chamfron Armor Faceplate
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

    // 2. Knight Rider in Gleaming Steel Plate
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

    // Momentum Golden Speed Trails
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

  // 4. Red Swordsman (Tabletop Miniature Barbarian Raider with Broadsword & Buckler)
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
    ctx.scale(flipX, 1);

    // 1. Fur boots planted
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5 - walkStep, 5, 4.5, 3);
    ctx.fillRect(1 + walkStep, 6, 5, 3);

    // 2. Barbarian Legs & Crimson Trousers
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-4.5, 1, 3.5, 5);
    ctx.fillRect(1.5, 2, 3.5, 5);

    // 3. Muscular Torso & Studded Leather Harness
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

    // 4. Spiked Iron Spangenhelm & Bearded Face
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

    // 5. Left Arm: Spiked Round Wooden Buckler Shield
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

    // 6. Right Arm: Notched Heavy Broadsword with Slash Arc
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

  // 5. Red Spearman (Tabletop Miniature Barbarian Pikeman with Thrusting Spear)
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
    ctx.scale(flipX, 1);

    // 1. Leather boots
    ctx.fillStyle = '#381705';
    ctx.fillRect(-5 - walkStep, 5, 4.5, 3);
    ctx.fillRect(1 + walkStep, 6, 5, 3);

    // 2. Crimson Tunic & Legs
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-4.5, -5, 9, 11);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -5, 9, 11);

    // 3. Conical Iron Helm
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

    // Eyes slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -9, 3, 1.5);

    // 4. Long Barbarian Pike with Thrust Animation
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

  // 6. Red Enemy Archer (Tabletop Miniature Wolf-Pelt Hunter with Shortbow)
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
    ctx.scale(flipX, 1);

    // 1. Leather boots
    ctx.fillStyle = '#29180c';
    ctx.fillRect(-5 - walkStep, 5, 4, 3);
    ctx.fillRect(1 + walkStep, 6, 4.5, 3);

    // 2. Red hunter tunic
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-4.5, -4, 9, 10);
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -4, 9, 10);

    // 3. Wolf Fur Hood & Cowl
    ctx.fillStyle = '#52525b';
    ctx.beginPath();
    ctx.roundRect(-4.5, -12, 9, 8, 3);
    ctx.fill();

    // Wolf ears
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

    // 4. Shortbow & Barbed Arrow
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

  // 7. Red Brute Boss (Tabletop Miniature Hulking Barbarian Juggernaut)
  private drawRedBrute(u: Unit, gameTime: number) {
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

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.scale(flipX, 1);

    // 1. Massive Spiked Iron Boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, 10, 9, 6);
    ctx.fillRect(3, 11, 10, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-11, 13, 2, 3);
    ctx.fillRect(12, 14, 2, 3);

    // 2. Colossal Muscular Barbarian Torso
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

    // Heavy iron spiked belt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-15, 3, 30, 6);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 6, 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Massive Spiked Bronze Pauldrons
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

    // 4. Iron Skull Great Helm with Giant Curved Horns
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-8, -24, 16, 14, 4);
    ctx.fill();
    ctx.stroke();

    // Glowing Ruby Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -18, 3, 2);
    ctx.fillRect(2, -18, 3, 2);

    // Giant Golden Curved Bull Horns
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-6, -23);
    ctx.quadraticCurveTo(-18, -30, -22, -35);
    ctx.moveTo(6, -23);
    ctx.quadraticCurveTo(18, -30, 22, -35);
    ctx.stroke();

    // 5. Massive Spiked Warclub / Greataxe
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

    // Overhead Boss HP Bar
    this.drawBossHpBar(u);
  }

  private drawBossHpBar(u: Unit) {
    // Only display boss health bar once he takes damage or begins combat
    if (u.hp >= u.maxHp - 0.5 && !u.isCleaving) return;

    const ctx = this.ctx;
    const barW = 140;
    const barH = 14;
    const barX = u.x - barW / 2;
    const barY = u.y - u.radius - 32;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const fillW = Math.max(0, (u.hp / u.maxHp) * barW);
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(0.5, '#ef4444');
    grad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(barX + 2, barY + 1, Math.max(0, fillW - 4), barH * 0.4);

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
    if (u.type === 'brute') return;

    // Sembunyikan jika HP masih penuh (100%)
    if (u.hp >= u.maxHp - 0.5) return;

    const ctx = this.ctx;
    const barW = Math.max(20, u.radius * 1.8);
    const barH = 3.5;
    const barX = u.x - barW / 2;
    const barY = u.y - u.radius - 12;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 1.5);
    ctx.fill();

    const fillW = Math.max(0, (u.hp / u.maxHp) * barW);
    ctx.fillStyle = u.isPlayer ? '#38bdf8' : '#f87171';
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 1.5);
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
