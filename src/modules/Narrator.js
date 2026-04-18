export class Narrator {
  constructor(panel) {
    this.panel = panel;
    if (!panel) return;
    this.face = panel.querySelector('.narrator-face');
    this.textEl = panel.querySelector('.narrator-text');
    this.clipEl = panel.querySelector('.narrator-text-clip');
    this.hideTimer = null;
    this.typeTimer = null;
    this.token = 0;
  }

  say(line, { speedMs = 45, holdMs = 1400 } = {}) {
    if (!this.panel || !line) return;
    this._cancelTimers();
    const myToken = ++this.token;

    this.panel.classList.remove('hidden');
    this.face?.classList.add('speaking');

    this.textEl.textContent = line;
    this.clipEl.textContent = line;
    this.panel.style.setProperty('--typed', '0%');

    const chars = [...line].length;
    const step = 100 / Math.max(chars, 1);
    let i = 0;

    const tick = () => {
      if (myToken !== this.token) return;
      i++;
      const pct = Math.min(100, step * i);
      this.panel.style.setProperty('--typed', `${pct}%`);
      if (i < chars) {
        this.typeTimer = setTimeout(tick, speedMs);
      } else {
        this.face?.classList.remove('speaking');
        this.hideTimer = setTimeout(() => {
          if (myToken !== this.token) return;
          this.panel.classList.add('hidden');
        }, holdMs);
      }
    };

    this.typeTimer = setTimeout(tick, speedMs);
  }

  hideNow() {
    this._cancelTimers();
    this.token++;
    if (this.panel) this.panel.classList.add('hidden');
    this.face?.classList.remove('speaking');
  }

  _cancelTimers() {
    if (this.typeTimer) { clearTimeout(this.typeTimer); this.typeTimer = null; }
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }
}
