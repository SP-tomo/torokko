export class SoundEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;

    this.bgmInterval = null;
    this.beatCount = 0;
  }

  setVolume(val) {
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
  }

  // --- BGM System ---
  startBGM() {
    if (this.bgmInterval) return;
    this.beatCount = 0;
    this.bgmInterval = setInterval(() => this.playBeat(), 250); // 120BPM
  }

  stopBGM() {
    clearInterval(this.bgmInterval);
    this.bgmInterval = null;
  }

  playBeat() {
    const time = this.ctx.currentTime;
    
    // Kick Drum (Every beat)
    this.kick(time);

    // Bass Synth (Syncopated)
    if (this.beatCount % 2 === 1) {
      this.bass(time, 55); // A1
    }

    // Suspense pad (Every 4 beats)
    if (this.beatCount % 4 === 0) {
      this.pad(time, 110); // A2
    }

    this.beatCount++;
  }

  kick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  bass(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  pad(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.5);
    gain.gain.linearRampToValueAtTime(0, time + 1.0);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 1.0);
  }

  // --- SE System ---
  playCorrect() {
    const time = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => this.beep(f, 0.4), i * 100);
    });
    this.explosion();
  }

  playIncorrect() {
    this.sweep(200, 50, 0.8);
    this.noise(0.5);
  }

  beep(freq, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  explosion() {
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  sweep(f1, f2, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(f1, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, this.ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  noise(dur) {
    // White noise for failure
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  playTick() {
    this.beep(880, 0.05);
  }
}
