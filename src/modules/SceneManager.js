/**
 * SceneManager — Perspective Infinite Tunnel Renderer
 * テーマごとにトンネルをリアルタイム描画。
 * 消失点パースペクティブ投影で、常に道を駆け抜ける感覚を演出。
 */
export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.theme  = 'cave';
    this.speed  = 1.0;
    this.shake  = 0;

    this._z      = 0;      // world Z accumulator
    this._frame  = 0;
    this._raf    = null;
    this._running = false;

    // Particle pool
    this._particles = [];

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    this.theme = theme;
    this._particles = []; // reset theme particles
  }

  /** Called once to start the render loop */
  update() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      this._frame++;
      this._z += this.speed * 4;
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  // ── THEME CONFIGS ────────────────────────────────────────────────
  _theme() {
    const T = {
      cave: {
        sky:        ['#0a0008', '#1a0020', '#0a0010'],
        wall:       ['#3a2a2a', '#2a1a1a', '#1a0f0f'],
        floor:      ['#2a1a0a', '#1a0f05', '#0f0800'],
        ceil:       ['#1a0f0f', '#0f0808'],
        stripe:     'rgba(80,40,20,0.6)',
        gridFloor:  'rgba(180, 100, 50, 0.25)',
        gridCeil:   'rgba(100, 50, 20, 0.2)',
        fog:        'rgba(5, 0, 5, 0.7)',
        rail:       '#8B6914',
        tie:        '#5a3a1a',
        particleFn: (w, h) => this._emitDust('#ff6633', w, h),
        light:      'rgba(255,80,20,0.06)',
      },
      jungle: {
        sky:        ['#001a08', '#003010', '#001808'],
        wall:       ['#0d3a0d', '#0a2a0a', '#081808'],
        floor:      ['#1a2a0a', '#0f1a06', '#080f03'],
        ceil:       ['#0a2a0a', '#061806'],
        stripe:     'rgba(20,120,20,0.5)',
        gridFloor:  'rgba(80, 160, 40, 0.2)',
        gridCeil:   'rgba(40, 100, 20, 0.15)',
        fog:        'rgba(0, 8, 0, 0.65)',
        rail:       '#4a7a1a',
        tie:        '#2a4a0a',
        particleFn: (w, h) => this._emitDust('#44ff44', w, h),
        light:      'rgba(40,255,40,0.05)',
      },
      cloud: {
        sky:        ['#001040', '#002080', '#0040c0'],
        wall:       ['#1a2a5a', '#102050', '#0a1840'],
        floor:      ['#0a1840', '#060f30', '#030820'],
        ceil:       ['#2040a0', '#1a3080'],
        stripe:     'rgba(100,150,255,0.4)',
        gridFloor:  'rgba(100, 150, 255, 0.2)',
        gridCeil:   'rgba(150, 200, 255, 0.15)',
        fog:        'rgba(0, 5, 20, 0.5)',
        rail:       '#4060c0',
        tie:        '#202040',
        particleFn: (w, h) => this._emitDust('#88aaff', w, h),
        light:      'rgba(100,150,255,0.06)',
      },
      ice: {
        sky:        ['#050818', '#0a1030', '#050a20'],
        wall:       ['#0a2040', '#0f2850', '#0a1838'],
        floor:      ['#0a1828', '#061018', '#03080f'],
        ceil:       ['#102848', '#0a2040'],
        stripe:     'rgba(150,200,255,0.35)',
        gridFloor:  'rgba(150, 200, 255, 0.25)',
        gridCeil:   'rgba(180, 220, 255, 0.2)',
        fog:        'rgba(0, 5, 15, 0.6)',
        rail:       '#60a0d0',
        tie:        '#203050',
        particleFn: (w, h) => this._emitDust('#aad4ff', w, h),
        light:      'rgba(150,200,255,0.07)',
      },
      temple: {
        sky:        ['#100808', '#200a04', '#100600'],
        wall:       ['#3a1a0a', '#2a1006', '#1a0803'],
        floor:      ['#200c04', '#140802', '#0a0401'],
        ceil:       ['#200c04', '#140802'],
        stripe:     'rgba(200,80,10,0.5)',
        gridFloor:  'rgba(255, 100, 20, 0.25)',
        gridCeil:   'rgba(200, 80, 10, 0.2)',
        fog:        'rgba(10, 3, 0, 0.65)',
        rail:       '#c06820',
        tie:        '#602808',
        particleFn: (w, h) => this._emitDust('#ffaa22', w, h),
        light:      'rgba(255,100,20,0.07)',
      },
      underwater: {
        sky:        ['#000a18', '#001025', '#000818'],
        wall:       ['#001830', '#001028', '#000818'],
        floor:      ['#001020', '#000818', '#000510'],
        ceil:       ['#001828', '#001020'],
        stripe:     'rgba(0,150,200,0.4)',
        gridFloor:  'rgba(0, 150, 200, 0.2)',
        gridCeil:   'rgba(0, 100, 180, 0.15)',
        fog:        'rgba(0, 5, 15, 0.7)',
        rail:       '#008899',
        tie:        '#003345',
        particleFn: (w, h) => this._emitBubble(w, h),
        light:      'rgba(0,180,220,0.05)',
      },
      space: {
        sky:        ['#000005', '#00000a', '#000002'],
        wall:       ['#050010', '#040008', '#020005'],
        floor:      ['#030008', '#020005', '#010002'],
        ceil:       ['#050010', '#040008'],
        stripe:     'rgba(80,40,160,0.4)',
        gridFloor:  'rgba(120, 60, 200, 0.2)',
        gridCeil:   'rgba(80, 40, 160, 0.15)',
        fog:        'rgba(0, 0, 5, 0.75)',
        rail:       '#4020a0',
        tie:        '#180830',
        particleFn: (w, h) => this._emitStar(w, h),
        light:      'rgba(100,60,255,0.05)',
      },
      sky: {
        sky:        ['#001040', '#002080', '#0040c0'],
        wall:       ['#1a2a5a', '#102050', '#0a1840'],
        floor:      ['#0a1840', '#060f30', '#030820'],
        ceil:       ['#2040a0', '#1a3080'],
        stripe:     'rgba(100,150,255,0.4)',
        gridFloor:  'rgba(100, 150, 255, 0.2)',
        gridCeil:   'rgba(150, 200, 255, 0.15)',
        fog:        'rgba(0, 5, 20, 0.5)',
        rail:       '#4060c0',
        tie:        '#202040',
        particleFn: (w, h) => this._emitDust('#88aaff', w, h),
        light:      'rgba(100,150,255,0.06)',
      },
    };
    return T[this.theme] || T.cave;
  }

  // ── MAIN DRAW ────────────────────────────────────────────────────
  _draw() {
    const canvas = this.canvas;
    const ctx    = this.ctx;
    const W      = canvas.width;
    const H      = canvas.height;
    const t      = this._theme();

    // Shake offset
    const sx = this.shake * this.speed > 0 ? (Math.random() - 0.5) * this.shake * this.speed * 0.6 : 0;
    const sy = this.shake * this.speed > 0 ? (Math.random() - 0.5) * this.shake * this.speed * 0.3 : 0;

    ctx.save();
    ctx.translate(sx, sy);

    // 1. Background gradient (sky/deep)
    this._drawSky(W, H, t);

    // 2. Perspective tunnel walls, floor, ceiling
    this._drawTunnel(W, H, t);

    // 3. Perspective grid lines rushing toward viewer
    this._drawGrid(W, H, t);

    // 4. Rails (always two parallel rails converging to VP)
    this._drawRails(W, H, t);

    // 5. Theme particles
    this._updateParticles(W, H, t);
    this._drawParticles();

    // 6. Ambient light pulse at VP
    this._drawLight(W, H, t);

    // 7. Vignette
    this._drawVignette(W, H);

    ctx.restore();
  }

  // ── SKY ─────────────────────────────────────────────────────────
  _drawSky(W, H, t) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    t.sky.forEach((c, i) => g.addColorStop(i / (t.sky.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ── TUNNEL (walls, floor, ceiling as perspective trapezoids) ──────
  _drawTunnel(W, H, t) {
    const ctx  = this.ctx;
    const vpX  = W * 0.5;   // vanishing point X
    const vpY  = H * 0.42;  // vanishing point Y (slightly above center)

    // Tunnel mouth dimensions at screen edge
    const farW  = W * 0.10;  // tunnel width at far end
    const farH  = H * 0.12;  // tunnel height at far end
    const nearW = W * 1.2;   // width at near edge (wider than screen)
    const nearH = H * 0.55;  // floor/ceil band at near edge

    const farLeft   = vpX - farW * 0.5;
    const farRight  = vpX + farW * 0.5;
    const farTop    = vpY - farH * 0.5;
    const farBottom = vpY + farH * 0.5;

    const nearLeft   = vpX - nearW * 0.5;
    const nearRight  = vpX + nearW * 0.5;
    const nearTop    = vpY - nearH;
    const nearBottom = vpY + nearH;

    // Left wall
    const lgLeft = ctx.createLinearGradient(nearLeft, 0, vpX, 0);
    lgLeft.addColorStop(0, t.wall[2]);
    lgLeft.addColorStop(0.5, t.wall[1]);
    lgLeft.addColorStop(1, t.wall[0]);
    ctx.beginPath();
    ctx.moveTo(nearLeft, nearTop);
    ctx.lineTo(farLeft,  farTop);
    ctx.lineTo(farLeft,  farBottom);
    ctx.lineTo(nearLeft, nearBottom);
    ctx.closePath();
    ctx.fillStyle = lgLeft;
    ctx.fill();

    // Right wall
    const lgRight = ctx.createLinearGradient(nearRight, 0, vpX, 0);
    lgRight.addColorStop(0, t.wall[2]);
    lgRight.addColorStop(0.5, t.wall[1]);
    lgRight.addColorStop(1, t.wall[0]);
    ctx.beginPath();
    ctx.moveTo(nearRight, nearTop);
    ctx.lineTo(farRight,  farTop);
    ctx.lineTo(farRight,  farBottom);
    ctx.lineTo(nearRight, nearBottom);
    ctx.closePath();
    ctx.fillStyle = lgRight;
    ctx.fill();

    // Floor
    const lgFloor = ctx.createLinearGradient(0, nearBottom, 0, vpY);
    lgFloor.addColorStop(0, t.floor[2]);
    lgFloor.addColorStop(0.6, t.floor[1]);
    lgFloor.addColorStop(1, t.floor[0]);
    ctx.beginPath();
    ctx.moveTo(nearLeft,  nearBottom);
    ctx.lineTo(nearRight, nearBottom);
    ctx.lineTo(farRight,  farBottom);
    ctx.lineTo(farLeft,   farBottom);
    ctx.closePath();
    ctx.fillStyle = lgFloor;
    ctx.fill();

    // Ceiling
    const lgCeil = ctx.createLinearGradient(0, nearTop, 0, vpY);
    lgCeil.addColorStop(0, t.ceil[1]);
    lgCeil.addColorStop(1, t.ceil[0]);
    ctx.beginPath();
    ctx.moveTo(nearLeft,  nearTop);
    ctx.lineTo(nearRight, nearTop);
    ctx.lineTo(farRight,  farTop);
    ctx.lineTo(farLeft,   farTop);
    ctx.closePath();
    ctx.fillStyle = lgCeil;
    ctx.fill();

    // Tunnel opening glow
    ctx.save();
    const openGlow = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, farW * 3);
    openGlow.addColorStop(0, t.stripe.replace(/[\d.]+\)/, '0.35)'));
    openGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = openGlow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── GRID LINES rushing toward viewer ─────────────────────────────
  _drawGrid(W, H, t) {
    const ctx = this.ctx;
    const vpX = W * 0.5;
    const vpY = H * 0.42;

    // Parameters
    const SEGS   = 12;          // number of segments visible
    const SEG_D  = 200;         // world-space depth per segment
    const FL     = 600;         // focal length
    const TUNNEL_HALF_W = W * 0.55;
    const TUNNEL_HALF_H = H * 0.5;

    // Z offset makes segments animate (scroll toward us)
    const zOff = this._z % SEG_D;

    ctx.lineCap = 'round';

    for (let seg = 0; seg < SEGS; seg++) {
      const worldZ = SEG_D * (seg + 1) - zOff;
      if (worldZ <= 0) continue;

      const scale  = FL / worldZ;
      const halfW  = TUNNEL_HALF_W * scale * 0.45;
      const halfH  = TUNNEL_HALF_H * scale * 0.45;

      const alpha = Math.min(1, (1 - seg / SEGS) * 0.9 + 0.05);
      const color = t.stripe.replace(/[\d.]+\)/, `${alpha * 0.7})`);
      ctx.strokeStyle = color;
      ctx.lineWidth   = Math.max(0.5, scale * 2);

      // Horizontal cross-section rect at this depth
      const left   = vpX - halfW;
      const right  = vpX + halfW;
      const top    = vpY - halfH;
      const bottom = vpY + halfH;

      // Floor line segment (horizontal)
      ctx.beginPath();
      ctx.moveTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      // Ceiling line
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
      ctx.stroke();

      // Left wall line
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      ctx.stroke();

      // Right wall line
      ctx.beginPath();
      ctx.moveTo(right, top);
      ctx.lineTo(right, bottom);
      ctx.stroke();
    }

    // Radial rails: perspective lines from corners to VP
    ctx.strokeStyle = t.stripe.replace(/[\d.]+\)/, '0.25)');
    ctx.lineWidth = 1;
    const corners = [
      [0, 0], [W, 0], [W, H], [0, H],
      [W * 0.3, 0], [W * 0.7, 0],
      [W * 0.3, H], [W * 0.7, H],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    });
  }

  // ── RAILS ────────────────────────────────────────────────────────
  _drawRails(W, H, t) {
    const ctx = this.ctx;
    const vpX = W * 0.5;
    const vpY = H * 0.42;

    const SEGS   = 16;
    const SEG_D  = 200;
    const FL     = 600;
    const RAIL_HALF_WORLD = 80; // world-space half-gap between rails
    const RAIL_Y_WORLD    = 120; // how far below center the floor is in world-space

    const zOff = this._z % SEG_D;

    // Draw ties (横木 cross-ties)
    for (let seg = 0; seg < SEGS; seg++) {
      const worldZ = SEG_D * (seg + 1) - zOff;
      if (worldZ <= 20) continue;

      const scale  = FL / worldZ;
      const railY  = vpY + RAIL_Y_WORLD * scale;
      const railLX = vpX - RAIL_HALF_WORLD * scale;
      const railRX = vpX + RAIL_HALF_WORLD * scale;
      const tieH   = Math.max(1, scale * 4);

      const alpha = Math.min(0.75, (1 - seg / SEGS) * 0.8);
      ctx.fillStyle = t.tie.replace ? t.tie : '#5a3a1a';
      ctx.globalAlpha = alpha;
      ctx.fillRect(railLX - tieH, railY, railRX - railLX + tieH * 2, Math.max(1.5, scale * 5));
      ctx.globalAlpha = 1;
    }

    // Draw the two rails as bezier curves from VP to bottom
    const railFL = FL;
    const perspR = (wx, wy, wz) => ({
      x: vpX + (wx / wz) * railFL,
      y: vpY + (wy / wz) * railFL,
    });

    const drawRail = (worldX) => {
      ctx.beginPath();
      let started = false;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const wz = 30 + (SEGS * SEG_D - zOff) * (1 - i / steps);
        if (wz <= 0) continue;
        const p = perspR(worldX, RAIL_Y_WORLD, wz);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = t.rail;
      ctx.lineWidth   = 4;
      ctx.shadowColor = t.rail;
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    };

    drawRail(-RAIL_HALF_WORLD);
    drawRail( RAIL_HALF_WORLD);
  }

  // ── PARTICLES ────────────────────────────────────────────────────
  _emitDust(color, w, h) {
    if (this._particles.length > 80) return;
    this._particles.push({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: 600 + Math.random() * 1200,
      size: 2 + Math.random() * 4,
      color, type: 'dust',
    });
  }

  _emitBubble(w, h) {
    if (this._particles.length > 60) return;
    this._particles.push({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: 400 + Math.random() * 1400,
      size: 3 + Math.random() * 6,
      color: `rgba(180,230,255,${0.3 + Math.random() * 0.4})`,
      type: 'bubble',
    });
  }

  _emitStar(w, h) {
    if (this._particles.length > 100) return;
    this._particles.push({
      x: (Math.random() - 0.5) * w * 1.5,
      y: (Math.random() - 0.5) * h * 1.5,
      z: 200 + Math.random() * 2000,
      size: 1 + Math.random() * 3,
      color: `rgba(255,255,255,${0.5 + Math.random() * 0.5})`,
      type: 'star',
    });
  }

  _updateParticles(w, h, t) {
    // Emit
    if (Math.random() < 0.4 + this.speed * 0.3) {
      t.particleFn(w, h);
    }

    const vpX = w * 0.5;
    const vpY = h * 0.42;
    const FL  = 600;

    // Move and project
    this._particles = this._particles.filter(p => {
      p.z -= (8 + this.speed * 10);
      if (p.z <= 10) return false;
      const scale = FL / p.z;
      p.sx = vpX + p.x * scale;
      p.sy = vpY + p.y * scale;
      p.ss = p.size * scale;
      p.alpha = Math.min(1, (600 - p.z) / 400);
      return p.sx > -50 && p.sx < w + 50 && p.sy > -50 && p.sy < h + 50;
    });
  }

  _drawParticles() {
    const ctx = this.ctx;
    this._particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.type === 'bubble') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(1, p.ss), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        const s = Math.max(0.5, p.ss);
        ctx.fillRect(p.sx - s * 0.5, p.sy - s * 0.5, s, s);
      }
      ctx.globalAlpha = 1;
    });
  }

  // ── AMBIENT LIGHT at VP ──────────────────────────────────────────
  _drawLight(W, H, t) {
    const ctx = this.ctx;
    const vpX = W * 0.5;
    const vpY = H * 0.42;
    const pulse = 0.7 + Math.sin(this._frame * 0.04) * 0.3;

    const g = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, W * 0.4);
    const rawColor = t.light.replace(/[\d.]+\)/, `${pulse * 0.12})`);
    g.addColorStop(0, rawColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ── VIGNETTE ────────────────────────────────────────────────────
  _drawVignette(W, H) {
    const ctx = this.ctx;
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
}
