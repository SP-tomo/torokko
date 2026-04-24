// BGM: place your BGM file at public/assets/audio/ with one of these names.
// Supported formats: m4a, mp3, ogg, wav  (tried in this order)
const BGM_CANDIDATES = [
  './assets/audio/bgm_main.m4a',
  './assets/audio/bgm_main.mp3',
  './assets/audio/bgm_main.ogg',
  './assets/audio/bgm_main.wav',
];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmInterval = null;
    this.beatCount = 0;
    this.tension = 1.0;

    // File-based BGM (null until successfully pre-loaded)
    this.bgmAudio = null;
    this._preloadBgmFile();
  }

  _preloadBgmFile(candidates = [...BGM_CANDIDATES]) {
    if (candidates.length === 0) return; // all tried, none worked
    const path = candidates.shift();
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.addEventListener('canplaythrough', () => {
      this.bgmAudio = audio;
    }, { once: true });
    audio.addEventListener('error', () => {
      // This format failed — try the next candidate
      this._preloadBgmFile(candidates);
    }, { once: true });
    audio.src = path;
    audio.load();
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
    // Mirror volume on audio-file BGM
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.volume = Math.max(0, Math.min(1, val));
    }
  }

  ensureRunning() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ── BGM ─────────────────────────────────────────────────────────
  startBGM() {
    this.init();
    this.ensureRunning();

    // Try file-based BGM first
    if (this.bgmAudio && this.bgmAudio.readyState >= 3) {
      this.bgmAudio.volume = this.masterGain.gain.value;
      this.bgmAudio.currentTime = 0;
      this.bgmAudio.play().catch(() => {
        // Autoplay blocked or file failed — fall back to procedural
        this.bgmAudio = null;
        this._startProceduralBGM();
      });
      return;
    }

    this._startProceduralBGM();
  }

  _startProceduralBGM() {
    if (this.bgmInterval) return;
    this.beatCount = 0;
    this.bgmInterval = setInterval(() => this.playBeat(), 240); // ~125BPM
  }

  stopBGM() {
    // Stop file BGM
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    // Stop procedural BGM
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  playBeat() {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    this.kick(time);
    if (this.beatCount % 2 === 1) { this.bass(time, 40 * this.tension); }
    if (this.beatCount % 4 === 2) { this.snare(time); }
    this.beatCount++;
  }

  kick(time) {
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
    g.gain.setValueAtTime(1.2, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.3);
  }

  bass(time, freq) {
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.3, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.2);
  }

  snare(time) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.1, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    noise.connect(g); g.connect(this.masterGain);
    noise.start(time);
  }

  // ── UI Sounds ────────────────────────────────────────────────────
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

  playIntensifyTick(remainingRatio = 1) {
    if (!this.ctx) return;
    const pitch = 880 + (1 - Math.max(0, Math.min(1, remainingRatio))) * 600;
    this.beep(pitch, 0.06);
  }

  // ── Stage Ceremony ───────────────────────────────────────────────
  playWipe(duration = 0.5) {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise  = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(4000, t + duration);
    filter.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.35, t + duration * 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.connect(filter); filter.connect(g); g.connect(this.masterGain);
    noise.start(t); noise.stop(t + duration);
  }

  playStageFanfare() {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.type  = 'triangle';
      osc.frequency.value = f;
      const start = t + i * 0.12;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.2, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(start); osc.stop(start + 0.55);
    });
    // Timpani roll
    for (let i = 0; i < 6; i++) {
      const start = t + i * 0.06;
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.frequency.setValueAtTime(120, start);
      osc.frequency.exponentialRampToValueAtTime(40, start + 0.15);
      g.gain.setValueAtTime(0.2, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(start); osc.stop(start + 0.2);
    }
  }

  playApplause(duration = 1.5) {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() < 0.25
        ? (Math.random() * 2 - 1)
        : (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const bp  = this.ctx.createBiquadFilter();
    bp.type   = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.15);
    g.gain.linearRampToValueAtTime(0.25, t + duration - 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const lfo   = this.ctx.createOscillator();
    lfo.frequency.value  = 8;
    const lfoG  = this.ctx.createGain();
    lfoG.gain.value = 0.12;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    noise.connect(bp); bp.connect(g); g.connect(this.masterGain);
    noise.start(t); lfo.start(t);
    noise.stop(t + duration); lfo.stop(t + duration);
  }

  playGasp(duration = 0.8) {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise  = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type  = 'lowpass';
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.connect(filter); filter.connect(g); g.connect(this.masterGain);
    noise.start(t); noise.stop(t + duration);
  }

  playDramaticSting() {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    [220, 261.63, 329.63].forEach(base => {
      [-4, 0, 4].forEach(detune => {
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = 'sawtooth';
        osc.frequency.value = base;
        osc.detune.value    = detune;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g); g.connect(this.masterGain);
        osc.start(t); osc.stop(t + 0.55);
      });
    });
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise  = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type  = 'highpass';
    filter.frequency.value = 800;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(filter); filter.connect(ng); ng.connect(this.masterGain);
    noise.start(t);
  }

  playQuestionChime() {
    if (!this.ctx) this.init();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.type  = 'square';
      osc.frequency.value = f;
      const start = t + i * 0.08;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.12, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(g); g.connect(this.masterGain);
      osc.start(start); osc.stop(start + 0.22);
    });
  }

  // ── Primitives ───────────────────────────────────────────────────
  beep(freq, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.type  = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  sweep(f1, f2, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.frequency.setValueAtTime(f1, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + dur);
    g.gain.setValueAtTime(0.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }
}
