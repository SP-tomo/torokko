export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = 'cave';
    this.speed = 1.0;
    this.shake = 2;
    this.images = {};
    this.isLoaded = false;
    this.frame = 0;
    this.particles = [];
    
    // Infinite Tunnel Layers
    this.layers = [
        { z: 0 },
        { z: 666 },
        { z: 1333 }
    ];

    this.loadImages();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  async loadImages() {
    console.log("SceneManager: Loading images...");
    const loader = (src) => new Promise((res) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        console.log("SceneManager: Loaded", src);
        res(img);
      };
      img.onerror = () => {
        console.error("SceneManager: ERROR loading", src);
        res(null); // Return null instead of rejecting to keep the loop going
      };
    });

    try {
      // Use absolute-looking paths which Vite serves from the public directory
      this.images.cave = await loader('/assets/background/cave_bg.png');
      this.images.jungle = await loader('/assets/background/jungle_bg.png');
      this.images.temple = await loader('/assets/background/temple_bg.png');
      this.images.ice = await loader('/assets/background/ice_bg.png');
      this.images.space = await loader('/assets/background/space_bg.png');
      this.images.underwater = await loader('/assets/background/underwater_bg.png');
      this.images.cloud = await loader('/assets/background/cloud_bg.png');
      
      this.isLoaded = true;
      console.log("SceneManager: All images attempted.");
    } catch (e) {
      console.error("SceneManager: Critical loading error", e);
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    this.theme = theme;
  }

  update() {
    this.frame++;
    this.layers.forEach(l => {
        l.z -= 10 * this.speed;
        if (l.z <= 0) l.z = 2000;
    });
    this.draw();
    requestAnimationFrame(() => this.update());
  }

  draw() {
    if (!this.isLoaded) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, w, h);

    const jitterX = (Math.random() - 0.5) * this.shake * this.speed;
    const jitterY = (Math.random() - 0.5) * this.shake * this.speed;

    const img = this.images[this.theme];
    if (img) {
      const sortedLayers = [...this.layers].sort((a, b) => b.z - a.z);
      sortedLayers.forEach(l => {
        const scale = 2000 / (l.z || 1);
        const baseScale = Math.max(w / img.width, h / img.height);
        const finalScale = baseScale * scale * 0.5;
        
        const iw = img.width * finalScale;
        const ih = img.height * finalScale;
        const ix = (w - iw) / 2 + jitterX;
        const iy = (h - ih) / 2 + jitterY;
        
        this.ctx.globalAlpha = Math.min(1.0, (2000 - l.z) / 500);
        this.ctx.drawImage(img, ix, iy, iw, ih);
      });
      this.ctx.globalAlpha = 1.0;
    }

    this._drawVignette(w, h);
    this.updateParticles(w, h);
    this.drawParticles();

    if (this.speed > 1) {
      this.drawSpeedLines(w, h);
    }
  }

  _drawVignette(w, h) {
    const v = this.ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, w*0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.7)');
    this.ctx.fillStyle = v;
    this.ctx.fillRect(0, 0, w, h);
  }

  updateParticles(w, h) {
    if (this.particles.length < 100) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 2000,
        s: Math.random() * 2 + 1,
        color: this.getParticleColor()
      });
    }
    this.particles.forEach(p => {
      p.z -= 15 * this.speed;
      if (p.z <= 0) {
        p.z = 2000;
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
    });
  }

  getParticleColor() {
    switch(this.theme) {
      case 'ice': return 'rgba(200, 230, 255, 0.8)';
      case 'underwater': return 'rgba(255, 255, 255, 0.5)';
      case 'temple': return 'rgba(255, 100, 0, 0.8)';
      case 'space': return 'rgba(255, 255, 255, 0.9)';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }

  drawParticles() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.particles.forEach(p => {
      const scale = 1000 / p.z;
      const x = (p.x - w/2) * scale + w/2;
      const y = (p.y - h/2) * scale + h/2;
      const size = p.s * scale;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(x, y, size, size);
    });
  }

  drawSpeedLines(w, h) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + (x - w/2) * 0.3 * this.speed, y + (y - h/2) * 0.3 * this.speed);
      this.ctx.stroke();
    }
  }
}
