/**
 * SceneManager v3 — Thematic Perspective Tunnel Renderer
 * 各テーマのランドマーク（鍾乳石・巨木・石柱・氷晶・珊瑚・星雲）を
 * 透視投影でリアルタイム描画し、走り抜ける感覚を演出する。
 */
export class SceneManager {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.theme   = 'cave';
    this.speed   = 1.0;
    this.shake   = 0;

    this._z       = 0;
    this._frame   = 0;
    this._raf     = null;
    this._running = false;
    this._objects = [];

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._initObjects();
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    if (this.theme === theme) return;
    this.theme = theme;
    this._objects = [];
    this._initObjects();
  }

  // ---- World constants --------------------------------------------------
  get FL()     { return 700; }                          // focal length
  get VPX()    { return this.canvas.width  * 0.5; }
  get VPY()    { return this.canvas.height * 0.42; }
  get WORLD_W(){ return 280; }  // tunnel half-width  (world units)
  get WORLD_H(){ return 240; }  // tunnel half-height (world units)

  _project(wx, wy, wz) {
    if (wz <= 0) return null;
    const s = this.FL / wz;
    return { x: this.VPX + wx * s, y: this.VPY + wy * s, scale: s };
  }

  // ---- Object pool ------------------------------------------------------
  _initObjects() {
    const N = 28;
    for (let i = 0; i < N; i++) {
      this._objects.push(this._newObj(Math.random() * 4000 + 400));
    }
  }

  _newObj(z) {
    const side    = Math.random() < 0.5 ? -1 : 1;
    const type    = this._pickType();
    const wallOff = 30  + Math.random() * 100;   // beyond the tunnel wall
    const wallY   = this._wallY(type);
    return { side, z, type, wallOff, wallY,
             variant: Math.floor(Math.random() * 5),
             size:    0.55 + Math.random() * 0.85,
             phase:   Math.random() * Math.PI * 2 };
  }

  _pickType() {
    const MAP = {
      cave:       ['stalactite','stalactite','stalagmite','torch','rock','crystal'],
      jungle:     ['tree','tree','vine','vine','leaf_cluster','fern'],
      temple:     ['pillar','pillar','wall_torch','relief','banner'],
      ice:        ['ice_spike','ice_spike','ice_crystal','snowdrift'],
      underwater: ['coral','coral','seaweed','seaweed','bubble_cluster','rock'],
      space:      ['nebula','nebula','asteroid','star_cluster'],
      cloud:      ['cloud_puff','cloud_puff','cloud_wisp'],
      sky:        ['cloud_puff','cloud_wisp'],
    };
    const arr = MAP[this.theme] || MAP.cave;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  _wallY(type) {
    const TOP = ['stalactite','vine','ice_spike','banner','star_cluster','cloud_wisp','leaf_cluster'];
    const BOT = ['stalagmite','coral','seaweed','snowdrift','fern','rock'];
    if (TOP.includes(type)) return -(this.WORLD_H * (0.25 + Math.random() * 0.55));
    if (BOT.includes(type)) return  (this.WORLD_H * (0.2  + Math.random() * 0.5));
    return (Math.random() - 0.3) * this.WORLD_H * 0.5;
  }

  // ---- Render loop ------------------------------------------------------
  update() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      this._frame++;
      this._z += this.speed * 5;
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _draw() {
    const { canvas, ctx } = this;
    const W = canvas.width, H = canvas.height;
    const sx = this.shake * this.speed > 0 ? (Math.random()-0.5) * this.shake * this.speed * 0.5 : 0;
    const sy = this.shake * this.speed > 0 ? (Math.random()-0.5) * this.shake * this.speed * 0.25 : 0;

    ctx.save();
    ctx.translate(sx, sy);

    const t = this._theme();
    this._drawBG(W, H, t);
    this._drawTunnel(W, H, t);
    this._drawGrid(W, H, t);
    this._advanceAndSort();
    this._drawObjects(W, H, t);
    this._drawRails(W, H, t);
    this._drawVPGlow(W, H, t);
    this._drawVignette(W, H);

    ctx.restore();
  }

  // ---- Theme config -----------------------------------------------------
  _theme() {
    const T = {
      cave: {
        sky:       ['#140008','#220010','#0e0006'],
        wallA:     '#3d1f0f', wallB: '#1a0906', wallC: '#0f0503',
        floor:     ['#2a1005','#120502'],
        ceil:      ['#1f0c06','#0a0302'],
        lineColor: 'rgba(200,100,40,0.2)',
        ambientR:255,ambientG:70,ambientB:20, ambientA:0.08,
        fogColor:  'rgba(8,2,1,0.65)',
        rail:'#8B6914', tie:'#5a3a1a',
      },
      jungle: {
        sky:       ['#001800','#003010','#001400'],
        wallA:     '#0a3a08', wallB: '#051e04', wallC: '#020e02',
        floor:     ['#1a2a05','#0a1503'],
        ceil:      ['#0a2a08','#052005'],
        lineColor: 'rgba(60,180,40,0.2)',
        ambientR:40,ambientG:200,ambientB:30, ambientA:0.07,
        fogColor:  'rgba(0,6,0,0.7)',
        rail:'#4a7a1a', tie:'#2a4a0a',
      },
      temple: {
        sky:       ['#120800','#1e1000','#0e0600'],
        wallA:     '#5a390f', wallB: '#3a2208', wallC: '#200f04',
        floor:     ['#3a2205','#1e1103'],
        ceil:      ['#2a1a06','#120d03'],
        lineColor: 'rgba(220,160,40,0.25)',
        ambientR:255,ambientG:160,ambientB:30, ambientA:0.09,
        fogColor:  'rgba(10,5,1,0.6)',
        rail:'#c06820', tie:'#602808',
      },
      ice: {
        sky:       ['#000a18','#001228','#000814'],
        wallA:     '#0a2a50', wallB: '#061828', wallC: '#030e18',
        floor:     ['#0a1830','#050c18'],
        ceil:      ['#0c2040','#061428'],
        lineColor: 'rgba(160,220,255,0.25)',
        ambientR:140,ambientG:210,ambientB:255, ambientA:0.09,
        fogColor:  'rgba(0,4,12,0.65)',
        rail:'#60a0d0', tie:'#203050',
      },
      underwater: {
        sky:       ['#000812','#00101e','#00080e'],
        wallA:     '#002a40', wallB: '#001828', wallC: '#000e18',
        floor:     ['#001830','#000c18'],
        ceil:      ['#002035','#001020'],
        lineColor: 'rgba(0,180,200,0.2)',
        ambientR:0,ambientG:180,ambientB:200, ambientA:0.07,
        fogColor:  'rgba(0,4,10,0.7)',
        rail:'#008899', tie:'#003345',
      },
      space: {
        sky:       ['#000005','#00000c','#000003'],
        wallA:     '#060018', wallB: '#040010', wallC: '#020008',
        floor:     ['#040012','#020008'],
        ceil:      ['#06001a','#040010'],
        lineColor: 'rgba(100,60,200,0.2)',
        ambientR:120,ambientG:60,ambientB:255, ambientA:0.07,
        fogColor:  'rgba(0,0,6,0.8)',
        rail:'#4020a0', tie:'#180830',
      },
      cloud: {
        sky:       ['#001550','#003090','#0050c0'],
        wallA:     '#1530a0', wallB: '#0c1c70', wallC: '#060e40',
        floor:     ['#0c1860','#060f30'],
        ceil:      ['#2040b0','#1030a0'],
        lineColor: 'rgba(150,180,255,0.2)',
        ambientR:140,ambientG:180,ambientB:255, ambientA:0.08,
        fogColor:  'rgba(0,6,20,0.45)',
        rail:'#4060c0', tie:'#1a2860',
      },
      sky: {
        sky:       ['#001550','#003090','#0050c0'],
        wallA:     '#1530a0', wallB: '#0c1c70', wallC: '#060e40',
        floor:     ['#0c1860','#060f30'],
        ceil:      ['#2040b0','#1030a0'],
        lineColor: 'rgba(150,180,255,0.2)',
        ambientR:140,ambientG:180,ambientB:255, ambientA:0.08,
        fogColor:  'rgba(0,6,20,0.45)',
        rail:'#4060c0', tie:'#1a2860',
      },
    };
    return T[this.theme] || T.cave;
  }

  // ---- Background -------------------------------------------------------
  _drawBG(W, H, t) {
    const g = this.ctx.createLinearGradient(0, 0, 0, H);
    t.sky.forEach((c, i) => g.addColorStop(i / (t.sky.length-1), c));
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, W, H);
  }

  // ---- Tunnel geometry --------------------------------------------------
  _drawTunnel(W, H, t) {
    const ctx = this.ctx;
    const { VPX: vpX, VPY: vpY, FL } = this;

    // Near dimensions (screen edge)
    const nearW = W * 0.62;
    const nearH = H * 0.52;
    // Far dimensions (at vanishing point, proportional to near)
    const farScale = 0.12;
    const farW = nearW * farScale;
    const farH = nearH * farScale;

    const farL = vpX - farW, farR = vpX + farW;
    const farT = vpY - farH, farB = vpY + farH;
    const nL = vpX - nearW, nR = vpX + nearW;
    const nT = vpY - nearH, nB = vpY + nearH;

    // Left wall
    const gL = ctx.createLinearGradient(nL, 0, vpX, 0);
    gL.addColorStop(0, t.wallC); gL.addColorStop(0.6, t.wallB); gL.addColorStop(1, t.wallA);
    ctx.beginPath();
    ctx.moveTo(nL, nT); ctx.lineTo(farL, farT);
    ctx.lineTo(farL, farB); ctx.lineTo(nL, nB);
    ctx.closePath(); ctx.fillStyle = gL; ctx.fill();

    // Right wall
    const gR = ctx.createLinearGradient(nR, 0, vpX, 0);
    gR.addColorStop(0, t.wallC); gR.addColorStop(0.6, t.wallB); gR.addColorStop(1, t.wallA);
    ctx.beginPath();
    ctx.moveTo(nR, nT); ctx.lineTo(farR, farT);
    ctx.lineTo(farR, farB); ctx.lineTo(nR, nB);
    ctx.closePath(); ctx.fillStyle = gR; ctx.fill();

    // Floor
    const gF = ctx.createLinearGradient(0, nB, 0, vpY);
    gF.addColorStop(0, t.floor[1]); gF.addColorStop(1, t.floor[0]);
    ctx.beginPath();
    ctx.moveTo(nL, nB); ctx.lineTo(nR, nB);
    ctx.lineTo(farR, farB); ctx.lineTo(farL, farB);
    ctx.closePath(); ctx.fillStyle = gF; ctx.fill();

    // Ceiling
    const gC = ctx.createLinearGradient(0, nT, 0, vpY);
    gC.addColorStop(0, t.ceil[1]); gC.addColorStop(1, t.ceil[0]);
    ctx.beginPath();
    ctx.moveTo(nL, nT); ctx.lineTo(nR, nT);
    ctx.lineTo(farR, farT); ctx.lineTo(farL, farT);
    ctx.closePath(); ctx.fillStyle = gC; ctx.fill();
  }

  // ---- Perspective grid -------------------------------------------------
  _drawGrid(W, H, t) {
    const ctx = this.ctx;
    const { VPX: vpX, VPY: vpY } = this;
    const SEGS = 14, SEG_D = 220;
    const tunnelW = W * 0.58, tunnelH = H * 0.48;
    const zOff = this._z % SEG_D;

    ctx.lineCap = 'round';
    for (let s = 0; s < SEGS; s++) {
      const wz = SEG_D * (s + 1) - zOff;
      if (wz <= 0) continue;
      const sc = this.FL / wz;
      const hw = tunnelW * sc * 0.42, hh = tunnelH * sc * 0.42;
      const alpha = Math.min(0.7, (1 - s/SEGS) * 0.85);
      ctx.strokeStyle = t.lineColor.replace(/[\d.]+\)/, `${alpha * 0.7})`);
      ctx.lineWidth   = Math.max(0.5, sc * 1.5);

      ctx.strokeRect(vpX - hw, vpY - hh, hw * 2, hh * 2);
    }
    // Corner rays to VP
    const corners = [
      [0,0],[W,0],[W,H],[0,H],
      [vpX*0.5,0],[vpX*1.5,0],[vpX*0.5,H],[vpX*1.5,H],
    ];
    ctx.strokeStyle = t.lineColor.replace(/[\d.]+\)/, '0.15)');
    ctx.lineWidth = 1;
    corners.forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vpX, vpY); ctx.stroke();
    });
  }

  // ---- Side object system -----------------------------------------------
  _advanceAndSort() {
    const speed = this.speed * 10;
    for (const o of this._objects) {
      o.z -= speed;
      if (o.z <= 80) {
        Object.assign(o, this._newObj(3200 + Math.random() * 1200));
      }
    }
    // sort back-to-front so far objects render under near objects
    this._objects.sort((a, b) => b.z - a.z);
  }

  _drawObjects(W, H, t) {
    const ctx = this.ctx;
    for (const o of this._objects) {
      const wx = o.side * (this.WORLD_W + o.wallOff);
      const p  = this._project(wx, o.wallY, o.z);
      if (!p) continue;
      // Fade in gradually — start fading in at z=2500, fully visible by z=1000
      const alpha = Math.min(1, Math.max(0, (2500 - o.z) / 1500));
      if (alpha <= 0.02) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      try { this._drawObject(ctx, o, p, t); } catch(e) { /* ignore single object error */ }
      ctx.restore();
    }
  }

  _drawObject(ctx, o, p, t) {
    const s = p.scale * o.size;
    const { x, y } = p;
    const f = this._frame;

    switch (o.type) {
      case 'stalactite':    this._drawStalactite(ctx, x, y, s, false); break;
      case 'stalagmite':    this._drawStalactite(ctx, x, y, s, true);  break;
      case 'torch':         this._drawTorch(ctx, x, y, s, f);          break;
      case 'crystal':       this._drawCrystal(ctx, x, y, s, '#a040ff', '#cc88ff'); break;
      case 'rock':          this._drawRock(ctx, x, y, s);              break;
      case 'tree':          this._drawTree(ctx, x, y, s, o.side);      break;
      case 'vine':          this._drawVine(ctx, x, y, s, f, o.phase);  break;
      case 'leaf_cluster':  this._drawLeafCluster(ctx, x, y, s);       break;
      case 'fern':          this._drawFern(ctx, x, y, s, o.side);      break;
      case 'pillar':        this._drawPillar(ctx, x, y, s, o.variant); break;
      case 'wall_torch':    this._drawTorch(ctx, x, y, s, f);          break;
      case 'relief':        this._drawRelief(ctx, x, y, s);            break;
      case 'banner':        this._drawBanner(ctx, x, y, s, o.variant); break;
      case 'ice_spike':     this._drawStalactite(ctx, x, y, s, o.wallY > 0, '#9dd8f0', '#c8eeff'); break;
      case 'ice_crystal':   this._drawCrystal(ctx, x, y, s, '#4ab8e0', '#aadff8'); break;
      case 'snowdrift':     this._drawSnowdrift(ctx, x, y, s);         break;
      case 'coral':         this._drawCoral(ctx, x, y, s, o.variant);  break;
      case 'seaweed':       this._drawSeaweed(ctx, x, y, s, f, o.phase); break;
      case 'bubble_cluster':this._drawBubbles(ctx, x, y, s, f, o.phase); break;
      case 'nebula':        this._drawNebula(ctx, x, y, s, o.variant); break;
      case 'asteroid':      this._drawAsteroid(ctx, x, y, s, o.variant); break;
      case 'star_cluster':  this._drawStarCluster(ctx, x, y, s);       break;
      case 'cloud_puff':    this._drawCloud(ctx, x, y, s, 1.0);        break;
      case 'cloud_wisp':    this._drawCloud(ctx, x, y, s, 0.4);        break;
    }
  }

  // ---- Individual drawers -----------------------------------------------

  /** 鍾乳石 / 石筍 / 氷柱 */
  _drawStalactite(ctx, x, y, s, flip = false, col1 = '#7a5a3a', col2 = '#3a2010') {
    const bw = 60 * s, bh = 120 * s;
    const tip = flip ? -bh : bh;
    const base = flip ? 0 : 0;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(1, -1);

    // Main stalactite
    const g = ctx.createLinearGradient(-bw/2, 0, bw/2, 0);
    g.addColorStop(0, col2);
    g.addColorStop(0.4, col1);
    g.addColorStop(0.6, col1);
    g.addColorStop(1, col2);
    ctx.beginPath();
    ctx.moveTo(-bw/2, 0);
    ctx.lineTo(-bw/3, bh * 0.3);
    ctx.lineTo(-bw/6, bh * 0.65);
    ctx.lineTo(0, bh);
    ctx.lineTo(bw/6, bh * 0.65);
    ctx.lineTo(bw/3, bh * 0.3);
    ctx.lineTo(bw/2, 0);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill();

    // Smaller secondary stalactite
    ctx.beginPath();
    ctx.moveTo(bw*0.2, 0);
    ctx.lineTo(bw*0.45, bh*0.25);
    ctx.lineTo(bw*0.6, bh*0.55);
    ctx.lineTo(bw*0.72, bh*0.7);
    ctx.lineTo(bw*0.85, bh*0.5);
    ctx.lineTo(bw*0.95, bh*0.25);
    ctx.lineTo(bw*1.05, 0);
    ctx.closePath();
    ctx.fillStyle = col2; ctx.fill();

    // Highlight
    ctx.strokeStyle = 'rgba(255,200,150,0.25)';
    ctx.lineWidth   = 2 * s;
    ctx.beginPath();
    ctx.moveTo(-bw*0.1, bh*0.05);
    ctx.lineTo(-bw*0.03, bh*0.7);
    ctx.stroke();

    // Water drip
    if (!flip) {
      ctx.fillStyle = 'rgba(100,150,255,0.6)';
      const drip = (this._frame * 3 * this.speed) % (bh * 1.5);
      ctx.beginPath();
      ctx.arc(0, bh + drip * 0.3, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 松明 / トーチ */
  _drawTorch(ctx, x, y, s, frame) {
    const h = 50 * s, w = 10 * s;
    ctx.save(); ctx.translate(x, y);
    // Handle
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(-w/2, -h, w, h);
    // Bowl
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(-w, -h, w*2, h*0.2);
    // Flame — animated
    const flicker = Math.sin(frame * 0.35) * 0.3 + Math.sin(frame * 0.7 + 1) * 0.2;
    const fh = (20 + flicker * 8) * s;
    const fw = (12 + flicker * 4) * s;
    // Outer flame (orange)
    const gFlame = ctx.createRadialGradient(0, -h - fh*0.5, 0, 0, -h, fw);
    gFlame.addColorStop(0, 'rgba(255,200,50,0.95)');
    gFlame.addColorStop(0.5,'rgba(255,100,20,0.8)');
    gFlame.addColorStop(1,  'rgba(255,30,0,0)');
    ctx.fillStyle = gFlame;
    ctx.beginPath();
    ctx.ellipse(0, -h - fh*0.4, fw, fh, 0, 0, Math.PI*2);
    ctx.fill();
    // Inner flame (white core)
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, -h - fh*0.3, fw*0.3, fh*0.5, 0, 0, Math.PI*2);
    ctx.fill();
    // Glow on wall
    const glow = ctx.createRadialGradient(0, -h, 0, 0, -h, 80*s);
    glow.addColorStop(0, `rgba(255,150,30,${0.15 + flicker * 0.08})`);
    glow.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, -h, 80*s, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  /** 岩 / 石 */
  _drawRock(ctx, x, y, s) {
    const r = 40 * s;
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r*0.2, -r*0.2, 0, 0, 0, r*1.1);
    g.addColorStop(0, '#7a6a5a');
    g.addColorStop(0.6,'#4a3a2a');
    g.addColorStop(1,  '#181008');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r, 0.2*r);
    ctx.bezierCurveTo(-r*1.1, -r*0.5, -r*0.5, -r*1.1, 0.2*r, -r);
    ctx.bezierCurveTo(r*0.9, -r*0.9, r*1.1, -r*0.2, r*0.9, 0.3*r);
    ctx.bezierCurveTo(r*0.7, r*0.8, -r*0.5, r*0.5, -r*0.8, r*0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /** ジャングル巨木 */
  _drawTree(ctx, x, y, s, side) {
    const tw = 55 * s, th = 280 * s;
    ctx.save(); ctx.translate(x, y);
    // Trunk gradient (bark)
    const g = ctx.createLinearGradient(-tw/2, 0, tw/2, 0);
    g.addColorStop(0, '#1a0a04');
    g.addColorStop(0.2,'#3d1f08');
    g.addColorStop(0.5,'#5a2e10');
    g.addColorStop(0.8,'#3d1f08');
    g.addColorStop(1,  '#1a0a04');
    ctx.fillStyle = g;
    // Use compatible path instead of roundRect
    const r = Math.min(6*s, tw*0.3);
    ctx.beginPath();
    ctx.moveTo(-tw/2 + r, -th);
    ctx.lineTo(tw/2 - r, -th);
    ctx.arcTo(tw/2, -th, tw/2, -th + r, r);
    ctx.lineTo(tw/2, -r);
    ctx.arcTo(tw/2, 0, tw/2 - r, 0, r);
    ctx.lineTo(-tw/2 + r, 0);
    ctx.arcTo(-tw/2, 0, -tw/2, -r, r);
    ctx.lineTo(-tw/2, -th + r);
    ctx.arcTo(-tw/2, -th, -tw/2 + r, -th, r);
    ctx.closePath();
    ctx.fill();
    // Bark lines
    ctx.strokeStyle = 'rgba(10,5,2,0.5)';
    ctx.lineWidth = 2*s;
    for (let i = 0; i < 6; i++) {
      const yy = -th * (i/6 + 0.1) + Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(-tw/2, yy); ctx.lineTo(tw/2, yy); ctx.stroke();
    }
    // Roots at base
    ctx.fillStyle = '#2a1506';
    for (let r = -1; r <= 1; r++) {
      ctx.beginPath();
      ctx.moveTo(r * tw * 0.3, 0);
      ctx.quadraticCurveTo(r * tw * 0.85, 12*s, r * tw * 1.1, 22*s);
      ctx.quadraticCurveTo(r * tw * 1.0,  6*s,  r * tw * 0.6,  0);
      ctx.fill();
    }
    // Canopy top — layered ovals
    const canopyColors = ['#0a2808', '#143d0a', '#1a5010', '#215e12'];
    canopyColors.forEach((col, i) => {
      const cy = -th - (30 - i*15)*s;
      const cx = (i % 2 === 0 ? -1 : 1) * 20 * s;
      const cw = (90 + i*30)*s, ch = (70 + i*20)*s;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI*2);
      ctx.fill();
    });
    // Dripping vines
    ctx.strokeStyle = '#1a4005';
    ctx.lineWidth = 2*s;
    for (let v = -1; v <= 1; v++) {
      ctx.beginPath();
      ctx.moveTo(v * tw * 0.8, -th * 0.7);
      ctx.quadraticCurveTo(v*tw*0.5 + 10*s, -th*0.5, v*tw*0.6, -th*0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** ツタ・蔦 */
  _drawVine(ctx, x, y, s, frame, phase) {
    const len = 180 * s;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#2a6010';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const sway = Math.sin(frame * 0.02 + phase + t * 2) * 12 * s;
      ctx.lineTo(sway, len * t);
    }
    ctx.stroke();
    // Leaves every 30px
    ctx.fillStyle = '#2a7010';
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const sway = Math.sin(frame * 0.02 + phase + t * 2) * 12 * s;
      ctx.save(); ctx.translate(sway, len * t);
      ctx.rotate(Math.sin(frame * 0.015 + phase + i) * 0.4);
      ctx.beginPath();
      ctx.ellipse(10*s, 0, 18*s, 9*s, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /** 葉の茂み */
  _drawLeafCluster(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    const cols = ['#0a3008','#144010','#1a5514','#205e18','#0a2808'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 30 * s;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle)*r, Math.sin(angle)*r, 35*s, 18*s, angle, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** シダ */
  _drawFern(ctx, x, y, s, side) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#1a5008';
    ctx.lineWidth = 2*s;
    const fronds = 5;
    for (let f = 0; f < fronds; f++) {
      const baseAngle = (-Math.PI/2) + (f - fronds/2) * 0.35;
      const len = (60 + f*10) * s;
      ctx.save(); ctx.rotate(baseAngle + Math.PI/2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len); ctx.stroke();
      // Leaflets
      for (let l = 2; l <= 8; l++) {
        const lp = l / 10;
        const ll = (len * 0.25) * (1 - lp);
        ctx.save(); ctx.translate(0, -len * lp);
        ctx.rotate(-0.6); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(ll,0); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(0, -len * lp);
        ctx.rotate( 0.6); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-ll,0); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /** 神殿の柱 */
  _drawPillar(ctx, x, y, s, variant) {
    const pw = 50 * s, ph = 260 * s;
    ctx.save(); ctx.translate(x, y);
    // Column shaft gradient
    const g = ctx.createLinearGradient(-pw/2, 0, pw/2, 0);
    g.addColorStop(0, '#3a2008');
    g.addColorStop(0.25,'#8a6030');
    g.addColorStop(0.5, '#c49050');
    g.addColorStop(0.75,'#8a6030');
    g.addColorStop(1,  '#3a2008');
    ctx.fillStyle = g; ctx.fillRect(-pw/2, -ph, pw, ph);
    // Fluting (vertical grooves)
    ctx.strokeStyle = 'rgba(30,15,5,0.35)';
    ctx.lineWidth = 2*s;
    for (let c = -3; c <= 3; c++) {
      ctx.beginPath();
      ctx.moveTo(c*pw/7, -ph); ctx.lineTo(c*pw/7, 0); ctx.stroke();
    }
    // Capital (top piece)
    const capH = 25*s, capW = pw*1.5;
    ctx.fillStyle = '#b08040';
    ctx.fillRect(-capW/2, -ph-capH, capW, capH);
    // Base
    ctx.fillStyle = '#8a6030';
    ctx.fillRect(-capW/2, -8*s, capW, 8*s);
    // Hieroglyph-like markings (simple geometric)
    ctx.strokeStyle = 'rgba(255,200,80,0.25)';
    ctx.lineWidth = 1.5*s;
    [-ph*0.3, -ph*0.55, -ph*0.75].forEach(yy => {
      ctx.strokeRect(-pw*0.3, yy, pw*0.6, 12*s);
    });
    ctx.restore();
  }

  /** レリーフ (壁の彫刻) */
  _drawRelief(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    const w = 60*s, h = 80*s;
    ctx.fillStyle = '#7a5530'; ctx.fillRect(-w/2, -h, w, h);
    ctx.strokeStyle = 'rgba(255,200,50,0.35)'; ctx.lineWidth = 2*s;
    // Geometric pattern
    ctx.strokeRect(-w*0.4, -h*0.9, w*0.8, h*0.8);
    ctx.beginPath(); ctx.moveTo(0, -h*0.9); ctx.lineTo(0, -h*0.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -h*0.5, w*0.2, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  /** 旗 / バナー */
  _drawBanner(ctx, x, y, s, variant) {
    const colors = ['#8a0000','#00408a','#4a006a','#8a5000'];
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#5a4020'; ctx.fillRect(-4*s, 0, 4*s, -100*s); // pole
    ctx.fillStyle = colors[variant % colors.length];
    ctx.beginPath();
    ctx.moveTo(0, -100*s);
    ctx.lineTo(50*s, -90*s);
    ctx.lineTo(50*s, -60*s);
    ctx.lineTo(0, -50*s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,100,0.6)'; ctx.lineWidth = 1.5*s;
    ctx.strokeRect(5*s, -95*s, 40*s, 35*s);
    ctx.restore();
  }

  /** クリスタル */
  _drawCrystal(ctx, x, y, s, col1, col2) {
    ctx.save(); ctx.translate(x, y);
    const h = 80*s, w = 25*s;
    const g = ctx.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, col1.replace(')', '').replace('rgb','rgba') + ',0.3)');
    g.addColorStop(0.4, col2);
    g.addColorStop(0.6, col2);
    g.addColorStop(1, col1.replace(')', '').replace('rgb','rgba') + ',0.3)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w*0.5, -h*0.7);
    ctx.lineTo(0, -h);
    ctx.lineTo(w*0.5, -h*0.7);
    ctx.lineTo(w, 0);
    ctx.closePath(); ctx.fill();
    // Highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5*s;
    ctx.beginPath();
    ctx.moveTo(-w*0.2, -h*0.2); ctx.lineTo(-w*0.1, -h*0.8); ctx.stroke();
    ctx.restore();
  }

  /** 雪だまり */
  _drawSnowdrift(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#c8e8ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 60*s, 25*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8f5ff';
    ctx.beginPath();
    ctx.ellipse(-10*s, -8*s, 35*s, 18*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  /** 珊瑚 */
  _drawCoral(ctx, x, y, s, variant) {
    const colors = ['#ff5030','#ff8040','#ff60a0','#ff40c0','#f06030'];
    const col = colors[variant % colors.length];
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.lineWidth = 5*s; ctx.lineCap = 'round';
    // Main branch
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80*s); ctx.stroke();
    // Sub branches
    [[-30, 0.5], [25, 0.65], [-20, 0.8], [30, 0.35]].forEach(([dx, t]) => {
      ctx.lineWidth = 3*s;
      ctx.beginPath();
      ctx.moveTo(0, -80*s*t);
      ctx.lineTo(dx*s, -80*s*(t+0.25)); ctx.stroke();
      // Tips
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(dx*s, -80*s*(t+0.25), 5*s, 0, Math.PI*2); ctx.fill();
    });
    // Tips on main
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -80*s, 6*s, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  /** 海藻 */
  _drawSeaweed(ctx, x, y, s, frame, phase) {
    ctx.save(); ctx.translate(x, y);
    const h = 120*s, segs = 8;
    ctx.strokeStyle = '#1a7a20'; ctx.lineWidth = 5*s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const sway = Math.sin(frame*0.04 + phase + t*3) * 20*s;
      ctx.lineTo(sway, -h*t);
    }
    ctx.stroke();
    // Fronds
    ctx.fillStyle = '#2a9030';
    for (let i = 1; i <= 4; i++) {
      const t = i/5;
      const sway = Math.sin(frame*0.04 + phase + t*3) * 20*s;
      ctx.save(); ctx.translate(sway, -h*t);
      ctx.rotate(Math.sin(frame*0.03+phase+i) * 0.5 + 0.5);
      ctx.beginPath(); ctx.ellipse(15*s, 0, 22*s, 8*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /** 泡 */
  _drawBubbles(ctx, x, y, s, frame, phase) {
    ctx.save(); ctx.translate(x, y);
    const count = 5;
    for (let i = 0; i < count; i++) {
      const rise = ((frame*0.5*this.speed + phase*30 + i*20) % 80)*s;
      const bx   = Math.sin(phase + i) * 20*s;
      const r    = (4 + i*2)*s;
      ctx.strokeStyle = `rgba(180,230,255,${0.5 + Math.sin(frame*0.05+i)*0.2})`;
      ctx.lineWidth = 1.5*s;
      ctx.fillStyle = `rgba(200,240,255,0.08)`;
      ctx.beginPath(); ctx.arc(bx, -rise, r, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  /** 星雲 */
  _drawNebula(ctx, x, y, s, variant) {
    const colors = [
      ['rgba(150,60,255,0.15)','rgba(80,0,200,0.1)'],
      ['rgba(255,60,150,0.13)','rgba(150,0,80,0.08)'],
      ['rgba(60,100,255,0.15)','rgba(20,40,200,0.1)'],
    ];
    const [c1, c2] = colors[variant % colors.length];
    ctx.save(); ctx.translate(x, y);
    const r = 120*s;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, c1); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r*0.6, variant*0.5, 0, Math.PI*2); ctx.fill();
    // Star dots
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2 + variant;
      const d = r * (0.2 + Math.random()*0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(Math.cos(a)*d, Math.sin(a)*d, 1.5*s, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  /** 小惑星 */
  _drawAsteroid(ctx, x, y, s, variant) {
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(variant * 0.8);
    const r = 40*s;
    const g = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
    g.addColorStop(0, '#6a5a50'); g.addColorStop(0.6,'#3a2e28'); g.addColorStop(1,'#150f0b');
    ctx.fillStyle = g;
    ctx.beginPath();
    const pts = 8 + variant;
    for (let i = 0; i < pts; i++) {
      const a = (i/pts)*Math.PI*2;
      const rr = r * (0.75 + Math.sin(a*3+variant)*0.25);
      i === 0 ? ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr)
              : ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /** 星のクラスター */
  _drawStarCluster(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 10; i++) {
      const a = (i/10)*Math.PI*2;
      const d = (20 + i*8)*s;
      const r = (1 + (i%3))*s;
      ctx.fillStyle = `rgba(255,240,200,${0.6+Math.random()*0.4})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a)*d, Math.sin(a)*d, r, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  /** 雲 */
  _drawCloud(ctx, x, y, s, opacity) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= opacity;
    const puffs = [[0,0,45],[35,-10,35],[-30,5,30],[60,5,30],[-55,10,25]];
    puffs.forEach(([px, py, r]) => {
      const g = ctx.createRadialGradient(px*s, py*s, 0, px*s, py*s, r*s);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.7,'rgba(230,240,255,0.5)');
      g.addColorStop(1,  'rgba(200,220,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px*s, py*s, r*s, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  // ---- Rails ------------------------------------------------------------
  _drawRails(W, H, t) {
    const ctx = this.ctx;
    const { VPX: vpX, VPY: vpY, FL } = this;
    const SEGS = 18, SEG_D = 220;
    const zOff = this._z % SEG_D;
    const RAIL_HW = 80, RAIL_Y = 130;

    // Ties
    for (let s = 0; s < SEGS; s++) {
      const wz = SEG_D*(s+1) - zOff;
      if (wz <= 20) continue;
      const sc = FL / wz;
      const railY = vpY + RAIL_Y * sc;
      const lX = vpX - RAIL_HW * sc;
      const rX = vpX + RAIL_HW * sc;
      ctx.fillStyle = t.tie;
      ctx.globalAlpha = Math.min(0.8, (1 - s/SEGS)*0.9);
      ctx.fillRect(lX - sc*2, railY, rX - lX + sc*4, Math.max(2, sc*5));
      ctx.globalAlpha = 1;
    }

    const drawRail = (wx) => {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 40; i++) {
        const wz = 50 + (SEGS*SEG_D - zOff)*(1 - i/40);
        if (wz <= 0) continue;
        const p = this._project(wx, RAIL_Y, wz);
        if (!p) continue;
        started ? ctx.lineTo(p.x, p.y) : (ctx.moveTo(p.x, p.y), started = true);
      }
      ctx.strokeStyle = t.rail;
      ctx.lineWidth   = 4;
      ctx.shadowColor = t.rail;
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    };
    drawRail(-RAIL_HW); drawRail(RAIL_HW);
  }

  // ---- VP Glow ----------------------------------------------------------
  _drawVPGlow(W, H, t) {
    const ctx = this.ctx;
    const pulse = 0.7 + Math.sin(this._frame * 0.04) * 0.3;
    const { ambientR: R, ambientG: G, ambientB: B, ambientA: A } = t;
    const g = ctx.createRadialGradient(this.VPX, this.VPY, 0, this.VPX, this.VPY, W*0.4);
    g.addColorStop(0, `rgba(${R},${G},${B},${A*pulse})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ---- Vignette ---------------------------------------------------------
  _drawVignette(W, H) {
    const ctx = this.ctx;
    const v = ctx.createRadialGradient(W/2, H/2, H*0.12, W/2, H/2, W*0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
}
