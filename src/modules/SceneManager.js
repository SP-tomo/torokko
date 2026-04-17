export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = 'cave';
    this.speed = 1.0;
    this.shake = 0;
    this.images = {};
    this.isLoaded = false;
    this.frame = 0;
    this.particles = [];
    
    this.loadImages();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  async loadImages() {
    console.log("Loading realistic assets...");
    const loader = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { console.log("Loaded:", src); res(img); };
      img.onerror = () => { console.error("Failed to load:", src); rej(); };
    });

    try {
      this.images.cave = await loader('/assets/background/cave_bg.png');
      this.images.jungle = await loader('/assets/background/jungle_bg.png');
      this.images.temple = await loader('/assets/background/temple_bg.png');
      this.images.ice = await loader('/assets/background/ice_bg.png');
      this.images.space = await loader('/assets/background/space_bg.png');
      this.images.underwater = await loader('/assets/background/underwater_bg.png');
      this.images.cloud = await loader('/assets/background/cloud_bg.png');
      this.isLoaded = true;
    } catch (e) {
      console.error("Image loading failed");
      this.isLoaded = false;
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    if (this.theme !== theme) {
      this.theme = theme;
      this.particles = []; // Clear particles on theme change
    }
  }

  update() {
    this.frame++;
    this.draw();
    requestAnimationFrame(() => this.update());
  }

  draw() {
    if (!this.isLoaded) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // 1. Camera Shake/Bobbing
    const bobY = Math.sin(this.frame * 0.1) * 2 * this.speed;
    const jitterX = (Math.random() - 0.5) * this.shake * this.speed;
    const jitterY = (Math.random() - 0.5) * this.shake * this.speed;

    this.ctx.clearRect(0, 0, w, h);
    
    const img = this.images[this.theme];
    if (img) {
      // 2. VIDEO-LIKE ZOOM EFFECT
      // Simulating moving through a tunnel by oscillating zoom level
      const baseScale = Math.max(w / img.width, h / img.height);
      const zoomCycle = (Math.sin(this.frame * 0.02 * this.speed) + 1) * 0.05 + 1.0; 
      const scale = baseScale * zoomCycle;
      
      const iw = img.width * scale;
      const ih = img.height * scale;
      const ix = (w - iw) / 2 + jitterX;
      const iy = (h - ih) / 2 + jitterY + bobY;
      
      this.ctx.drawImage(img, ix, iy, iw, ih);
    }
    
    // 3. THEME-SPECIFIC PARTICLES
    this.updateParticles(w, h);
    this.drawParticles();
    
    // 4. OVERLAY SPEED LINES
    if (this.speed > 1) {
      this.drawSpeedLines(w, h);
    }
  }

  updateParticles(w, h) {
    // Generate particles based on theme
    if (this.particles.length < 50) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 1000,
        s: Math.random() * 2 + 1,
        color: this.getParticleColor()
      });
    }

    this.particles.forEach(p => {
      p.z -= 10 * this.speed;
      if (p.z <= 0) {
        p.z = 1000;
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
    });
  }

  getParticleColor() {
    switch(this.theme) {
      case 'ice': return 'rgba(200, 230, 255, 0.8)';
      case 'underwater': return 'rgba(255, 255, 255, 0.5)'; // Bubbles
      case 'temple': return 'rgba(255, 100, 0, 0.8)'; // Embers
      case 'space': return 'rgba(255, 255, 255, 0.9)'; // Stars
      case 'jungle': return 'rgba(100, 200, 100, 0.6)'; // Leaves
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  }

  drawParticles() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    this.particles.forEach(p => {
      const scale = 500 / p.z;
      const x = (p.x - w/2) * scale + w/2;
      const y = (p.y - h/2) * scale + h/2;
      const size = p.s * scale;
      
      this.ctx.fillStyle = p.color;
      if (this.theme === 'underwater') {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillRect(x, y, size, size);
      }
    });
  }

  drawSpeedLines(w, h) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + (x - w/2) * 0.2 * this.speed, y + (y - h/2) * 0.2 * this.speed);
      this.ctx.stroke();
    }
  }
}
