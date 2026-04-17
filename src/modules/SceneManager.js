export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = 'cave'; // 'cave', 'jungle', 'temple'
    this.speed = 1.0;
    this.shake = 0;
    this.images = {};
    this.isLoaded = false;
    
    this.loadImages();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  async loadImages() {
    const loader = (src) => new Promise((res) => {
      const img = new Image();
      img.src = src;
      img.onload = () => res(img);
    });

    this.images.cave = await loader('/assets/background/cave_bg.png');
    this.images.jungle = await loader('/assets/background/jungle_bg.png');
    this.images.temple = await loader('/assets/background/temple_bg.png');
    this.isLoaded = true;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setTheme(theme) {
    this.theme = theme;
  }

  update() {
    this.draw();
    requestAnimationFrame(() => this.update());
  }

  draw() {
    if (!this.isLoaded) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Add jitter/shake based on speed
    const jitterX = (Math.random() - 0.5) * this.shake * this.speed;
    const jitterY = (Math.random() - 0.5) * this.shake * this.speed;

    this.ctx.clearRect(0, 0, w, h);
    
    const img = this.images[this.theme];
    if (img) {
      // Draw background image to fit screen (Cover)
      const scale = Math.max(w / img.width, h / img.height);
      const iw = img.width * scale * (1 + 0.05 * this.speed); // Slight zoom out effect as speed increases?
      const ih = img.height * scale * (1 + 0.05 * this.speed);
      const ix = (w - iw) / 2 + jitterX;
      const iy = (h - ih) / 2 + jitterY;
      
      this.ctx.drawImage(img, ix, iy, iw, ih);
    }
    
    // Low-pass speed line effects on top
    if (this.speed > 1) {
      this.drawSpeedLines(w, h);
    }
  }

  drawSpeedLines(w, h) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = Math.random() * 200 * this.speed;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + (x - w / 2) * 0.5, y + (y - h / 2) * 0.5);
      this.ctx.stroke();
    }
  }
}
