export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = 'cave';
    this.speed = 1.0;
    this.shake = 0;
    this.t = 0;
    this.images = {};
    this.imgOffset = {};

    this._loadImages();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _loadImages() {
    const base = import.meta.env.BASE_URL;
    const map = {
      cave:   `${base}assets/background/洞窟.webp`,
      jungle: `${base}assets/background/ジャングル.webp`,
      sky:    `${base}assets/background/大空.webp`,
    };
    for (const [key, src] of Object.entries(map)) {
      const img = new Image();
      img.onload  = () => { this.images[key] = img; this.imgOffset[key] = 0; };
      img.onerror = () => {};
      img.src = src;
    }
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    this.theme = theme;
  }

  update() {
    this.t += 0.016;
    this.draw();
    requestAnimationFrame(() => this.update());
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const jx = (Math.random() - 0.5) * this.shake * this.speed;
    const jy = (Math.random() - 0.5) * this.shake * this.speed;

    this.ctx.save();
    this.ctx.translate(jx, jy);

    if (this.images[this.theme]) {
      this._drawRealBg(w, h);
    } else {
      switch (this.theme) {
        case 'cave':   this._drawCave(w, h); break;
        case 'jungle': this._drawJungle(w, h); break;
        case 'sky':    this._drawSky(w, h); break;
        default:       this._drawCave(w, h);
      }
    }

    if (this.speed > 1.5) this._drawSpeedLines(w, h);
    this.ctx.restore();
  }

  _drawRealBg(w, h) {
    const img = this.images[this.theme];
    const ctx = this.ctx;

    const scrollSpeed = 40 * this.speed;
    this.imgOffset[this.theme] = ((this.imgOffset[this.theme] || 0) + scrollSpeed * 0.016) % img.width;

    const scale = Math.max(w / img.width, h / img.height) * 1.05;
    const iw = img.width  * scale;
    const ih = img.height * scale;
    const iy = (h - ih) / 2;
    const offset = this.imgOffset[this.theme] * scale;

    for (let x = -offset; x < w + iw; x += iw) {
      ctx.drawImage(img, x, iy, iw, ih);
    }

    if (this.speed > 1) {
      const extra = (this.speed - 1) * 0.03;
      ctx.drawImage(img, -offset * (1 + extra), iy - h * extra * 0.5, iw * (1 + extra * 2), ih * (1 + extra));
    }

    this._drawVignette(w, h, 'rgba(0,0,0,0.35)');
    if (this.speed > 2) this._drawSpeedLines(w, h);
  }

  // ── CAVE ──────────────────────────────────────────────────────────────
  _drawCave(w, h) {
    const ctx = this.ctx, t = this.t;
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.5, w * 0.8);
    bg.addColorStop(0, '#3a2010');
    bg.addColorStop(0.4, '#1a0e08');
    bg.addColorStop(1, '#050202');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    this._drawRockWalls(w, h, t);
    this._drawRails(w, h);

    for (let i = 0; i < 4; i++) {
      this._drawTorch(w * 0.15 + i * w * 0.25, h * 0.58, t + i * 1.3);
    }
    this._drawCaveDust(w, h, t);
    this._drawVignette(w, h, 'rgba(0,0,0,0.55)');
  }

  _drawRockWalls(w, h, t) {
    const ctx = this.ctx;
    const scroll = (t * 80 * this.speed) % w;
    ctx.save();
    ctx.translate(-scroll, 0);
    for (let layer = 0; layer < 3; layer++) {
      const alpha = 0.3 + layer * 0.2;
      ctx.fillStyle = `rgba(${30 + layer * 10},${15 + layer * 5},8,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      for (let x = -w; x < w * 3; x += 60) {
        ctx.lineTo(x, h * (0.08 + layer * 0.05) - 60 - Math.sin(x * 0.05 + layer) * 30 + Math.sin(x * 0.03 + layer * 2) * 20);
      }
      ctx.lineTo(w * 3, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(${20 + layer * 8},${10 + layer * 4},5,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(-w, h);
      for (let x = -w; x < w * 3; x += 70) {
        ctx.lineTo(x, h - h * 0.12 + 50 + Math.cos(x * 0.04 + layer) * 25 + Math.sin(x * 0.035 + layer * 3) * 15);
      }
      ctx.lineTo(w * 3, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawTorch(x, y, t) {
    const ctx = this.ctx;
    const r = 80 + Math.sin(t * 8) * 15;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, 'rgba(255,160,20,0.35)');
    glow.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    ctx.save(); ctx.translate(x, y);
    for (let f = 0; f < 4; f++) {
      const fw = 6 - f, fh = 20 + f * 6 + Math.sin(t * 12 + f) * 5;
      ctx.fillStyle = `rgba(255,${120 + f * 30 - Math.sin(t * 10) * 20},0,${0.9 - f * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(Math.sin(t * 7 + f) * 4, -fh * 0.5, fw, fh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawCaveDust(w, h, t) {
    const ctx = this.ctx;
    for (let i = 0; i < 30; i++) {
      const x = ((i * 137.5 + t * 20 * this.speed) % w);
      const y = h * 0.15 + (Math.sin(i * 2.1 + t * 0.4) + 1) * h * 0.35;
      ctx.fillStyle = `rgba(255,200,120,${0.12 + Math.sin(i + t) * 0.05})`;
      ctx.beginPath(); ctx.arc(x, y, 1 + Math.sin(i) * 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── JUNGLE ────────────────────────────────────────────────────────────
  _drawJungle(w, h) {
    const ctx = this.ctx, t = this.t;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    sky.addColorStop(0, '#1a3a1a'); sky.addColorStop(1, '#0d2010');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    this._drawSunbeams(w, h, t);
    this._drawJungleTrees(w, h, t, 3);

    const gnd = ctx.createLinearGradient(0, h * 0.7, 0, h);
    gnd.addColorStop(0, '#1a3a10'); gnd.addColorStop(1, '#0a1a08');
    ctx.fillStyle = gnd; ctx.fillRect(0, h * 0.68, w, h * 0.32);

    this._drawRails(w, h);
    this._drawVines(w, h, t);
    this._drawFireflies(w, h, t);
    this._drawVignette(w, h, 'rgba(0,20,0,0.4)');
  }

  _drawSunbeams(w, h, t) {
    const ctx = this.ctx;
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const x = w * (0.1 + i * 0.16) + Math.sin(t * 0.3 + i) * 20;
      ctx.save(); ctx.translate(x, 0); ctx.rotate(-0.3 + i * 0.1);
      const beam = ctx.createLinearGradient(0, 0, 0, h * 0.8);
      beam.addColorStop(0, `rgba(180,255,120,${0.06 + Math.sin(t * 0.5 + i) * 0.02})`);
      beam.addColorStop(1, 'rgba(180,255,120,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(-15, 0, 30, h * 0.8);
      ctx.restore();
    }
    ctx.restore();
  }

  _drawJungleTrees(w, h, t, layers) {
    const ctx = this.ctx;
    for (let layer = layers; layer >= 1; layer--) {
      const scroll = (t * 30 * layer * this.speed) % w;
      ctx.save(); ctx.translate(-scroll, 0);
      const alpha = 0.5 + layer * 0.15;
      ctx.fillStyle = `rgba(${10 + layer * 5},${40 + layer * 12},${10 + layer * 5},${alpha})`;
      for (let x = -w; x < w * 3; x += 80 - layer * 10) {
        const th = h * (0.3 + layer * 0.1) + Math.sin(x * 0.02 + layer) * 40;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.72);
        ctx.lineTo(x - 35 + layer * 5, h * 0.72 - th);
        ctx.lineTo(x + 35 - layer * 5, h * 0.72 - th);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, h * 0.72 - th * 0.6);
        ctx.lineTo(x - 45 + layer * 8, h * 0.72 - th * 0.6 - th * 0.45);
        ctx.lineTo(x + 45 - layer * 8, h * 0.72 - th * 0.6 - th * 0.45);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawVines(w, h, t) {
    const ctx = this.ctx;
    const scroll = (t * 120 * this.speed) % w;
    ctx.save(); ctx.translate(-scroll, 0);
    ctx.strokeStyle = 'rgba(20,80,15,0.7)'; ctx.lineWidth = 3;
    for (let x = 0; x < w * 3; x += 150) {
      const baseX = x + Math.sin(x * 0.1) * 30;
      ctx.beginPath(); ctx.moveTo(baseX, -10);
      for (let y = 0; y < h * 0.6; y += 20) {
        ctx.lineTo(baseX + Math.sin(y * 0.05 + t * 0.8 + x * 0.02) * 15, y);
      }
      ctx.stroke();
      for (let ly = 40; ly < h * 0.55; ly += 60) {
        const lx = baseX + Math.sin(ly * 0.05 + t * 0.8 + x * 0.02) * 15;
        ctx.fillStyle = `rgba(30,120,20,${0.5 + Math.sin(ly + x) * 0.2})`;
        ctx.beginPath(); ctx.ellipse(lx + 12, ly, 12, 6, Math.PI * 0.3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawFireflies(w, h, t) {
    const ctx = this.ctx;
    for (let i = 0; i < 20; i++) {
      const x = w * 0.1 + (Math.sin(i * 2.3 + t * 0.6) + 1) * w * 0.4;
      const y = h * 0.2 + (Math.cos(i * 1.7 + t * 0.4) + 1) * h * 0.35;
      const alpha = (Math.sin(t * 3 + i * 1.8) + 1) * 0.4;
      ctx.fillStyle = `rgba(180,255,120,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── SKY ───────────────────────────────────────────────────────────────
  _drawSky(w, h) {
    const ctx = this.ctx, t = this.t;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#08143a'); sky.addColorStop(0.3, '#1a3a8a');
    sky.addColorStop(0.6, '#4a90d9'); sky.addColorStop(0.75, '#f0c060');
    sky.addColorStop(1, '#e07030');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    this._drawStars(w, h, t);
    this._drawClouds(w, h, t);
    this._drawMountains(w, h);
    this._drawRails(w, h);
    this._drawBirds(w, h, t);
    this._drawVignette(w, h, 'rgba(0,10,30,0.3)');
  }

  _drawStars(w, h, t) {
    const ctx = this.ctx;
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5) % w, y = h * 0.05 + (i * 73.1) % (h * 0.35);
      const alpha = 0.3 + Math.sin(t * 2 + i * 0.7) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawClouds(w, h, t) {
    const ctx = this.ctx;
    const clouds = [
      { x: 0.1, y: 0.25, s: 1.2, sp: 0.8 }, { x: 0.35, y: 0.18, s: 0.8, sp: 1.1 },
      { x: 0.6, y: 0.28, s: 1.5, sp: 0.6 }, { x: 0.8, y: 0.15, s: 0.9, sp: 1.3 },
      { x: 0.15, y: 0.38, s: 0.7, sp: 1.5 }, { x: 0.7, y: 0.42, s: 1.0, sp: 0.9 },
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    for (const c of clouds) {
      const cx = ((c.x * w + t * 25 * c.sp * this.speed) % (w + 300)) - 150;
      ctx.save(); ctx.translate(cx, c.y * h); ctx.scale(c.s, c.s * 0.65);
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.arc(63, -21, 52, 0, Math.PI * 2);
      ctx.arc(119, 0, 59, 0, Math.PI * 2); ctx.arc(56, 21, 42, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }
  }

  _drawMountains(w, h) {
    const ctx = this.ctx;
    for (const m of [{ color: 'rgba(30,50,100,0.7)', s: 1 }, { color: 'rgba(50,80,130,0.5)', s: 0.8 }]) {
      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.moveTo(0, h * 0.72);
      for (let x = 0; x <= w; x += 80) {
        ctx.lineTo(x, h * 0.72 - (Math.sin(x * 0.008 * m.s + m.s) + 1) * h * 0.18 * m.s);
      }
      ctx.lineTo(w, h * 0.72); ctx.closePath(); ctx.fill();
    }
    const g = ctx.createLinearGradient(0, h * 0.68, 0, h);
    g.addColorStop(0, '#c87030'); g.addColorStop(1, '#6a3010');
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.68, w, h * 0.32);
  }

  _drawBirds(w, h, t) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(20,20,40,0.7)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const bx = ((i * 157 + t * 40 * (0.6 + i * 0.1) * this.speed) % (w + 80)) - 40;
      const by = h * 0.15 + Math.sin(t * 0.8 + i * 1.4) * h * 0.08 + i * h * 0.03;
      const wing = Math.sin(t * 6 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + wing); ctx.quadraticCurveTo(bx, by, bx + 10, by + wing);
      ctx.stroke();
    }
  }

  // ── SHARED ────────────────────────────────────────────────────────────
  _drawRails(w, h) {
    const ctx = this.ctx, t = this.t;
    const railY = h * 0.72;
    const spacing = 60;
    const offset = (t * 120 * this.speed) % spacing;

    ctx.strokeStyle = 'rgba(80,50,20,0.8)'; ctx.lineWidth = 6;
    for (let x = -spacing + offset; x < w + spacing; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, railY - 6); ctx.lineTo(x, railY + 10); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(180,160,120,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, railY - 2); ctx.lineTo(w, railY - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, railY + 4); ctx.lineTo(w, railY + 4); ctx.stroke();
  }

  _drawSpeedLines(w, h) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const len = (Math.random() * 180 + 60) * (this.speed - 1);
      const angle = Math.atan2(y - h / 2, x - w / 2);
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  _drawVignette(w, h, color) {
    const ctx = this.ctx;
    const v = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, w * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, color);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
}
