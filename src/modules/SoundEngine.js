export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmInterval = null;
    this.beatCount = 0;
    this.tension = 1.0;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;
  }

  setVolume(val) {
    if (!this.ctx) return;
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
  }

  ensureRunning() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- BGM System ---
  startBGM() {
    this.init();
    this.ensureRunning();
    if (this.bgmInterval) return;
    this.beatCount = 0;
    this.bgmInterval = setInterval(() => this.playBeat(), 240); // 125BPM
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playBeat() {
    const time = this.ctx.currentTime;
    // Nep League Rhythmic Bass/Kick
    this.kick(time);
    if (this.beatCount % 2 === 1) {
      this.bass(time, 40 * this.tension); 
    }
    if (this.beatCount % 4 === 2) {
      this.snare(time);
    }
    this.beatCount++;
  }

  kick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
    gain.gain.setValueAtTime(1.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.3);
  }

  bass(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.2);
  }

  snare(time) {
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    noise.connect(gain); gain.connect(this.masterGain);
    noise.start(time);
  }

  playSelect() {
    if (!this.ctx) this.init();
    this.sweep(150, 40, 0.4);
  }

  playCorrect() {
    if (!this.ctx) this.init();
    this.beep(523.25, 0.1);
    setTimeout(() => this.beep(659.25, 0.1), 100);
    setTimeout(() => this.beep(783.99, 0.3), 200);
  }

  playIncorrect() {
    if (!this.ctx) this.init();
    this.sweep(200, 20, 1.0);
  }

  beep(freq, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  sweep(f1, f2, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(f1, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  playIntensifyTick(remainingRatio = 1) {
    const pitch = 880 + (1 - Math.max(0, Math.min(1, remainingRatio))) * 600;
    this.beep(pitch, 0.06);
  }

  playQuestionChime() {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  playDramaticSting() {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    const freqs = [220, 261.63, 329.63]; // A3 C4 E4
    freqs.forEach((base) => {
      [-4, 0, 4].forEach((detune) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = base;
        osc.detune.value = detune;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    });
  }
}
