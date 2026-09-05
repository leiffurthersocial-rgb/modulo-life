/**
 * All audio is synthesised at runtime with the Web Audio API. That keeps the
 * bundle free of licensed sample assets and means the soundtrack can react to
 * the time of day and location without streaming anything.
 */

export type SfxName =
  | 'step'
  | 'stepRun'
  | 'ui'
  | 'confirm'
  | 'cancel'
  | 'interact'
  | 'door'
  | 'coin'
  | 'buy'
  | 'hit'
  | 'heavy'
  | 'block'
  | 'dodge'
  | 'win'
  | 'lose'
  | 'splash'
  | 'reel'
  | 'blip'
  | 'levelUp'
  | 'dice'
  | 'error';

export type Ambience = 'street' | 'park' | 'interior' | 'arcade' | 'basement' | 'rain' | 'none';

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private ambienceNodes: AudioNode[] = [];
  private currentAmbience: Ambience = 'none';
  private musicTimer: number | null = null;
  private birdTimer: number | null = null;
  private musicStep = 0;
  private started = false;

  private volumes = { master: 0.8, music: 0.5, sfx: 0.8 };

  /** Browsers require a user gesture before audio can start. */
  unlock(): void {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.volumes.music;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.volumes.sfx;
      this.sfxBus.connect(this.master);

      this.ambienceBus = this.ctx.createGain();
      this.ambienceBus.gain.value = 0.5;
      this.ambienceBus.connect(this.master);

      this.noiseBuffer = this.makeNoise();
      this.started = true;
    } catch {
      this.ctx = null;
    }
  }

  private makeNoise(): AudioBuffer | null {
    if (!this.ctx) return null;
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    if (this.master) this.master.gain.value = master;
    if (this.musicBus) this.musicBus.gain.value = music;
    if (this.sfxBus) this.sfxBus.gain.value = sfx;
    if (this.ambienceBus) this.ambienceBus.gain.value = music * 0.8;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainValue = 0.2,
    when = 0,
    bus: GainNode | null = this.sfxBus,
  ): Voice | null {
    if (!this.ctx || !bus) return null;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    return { osc, gain };
  }

  private noise(duration: number, filterFreq: number, gainValue = 0.15, q = 1): void {
    if (!this.ctx || !this.noiseBuffer || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  play(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'step':
        this.noise(0.08, 320 + Math.random() * 120, 0.08, 1.4);
        break;
      case 'stepRun':
        this.noise(0.09, 420 + Math.random() * 160, 0.13, 1.2);
        break;
      case 'ui':
        this.tone(660, 0.06, 'triangle', 0.08);
        break;
      case 'confirm':
        this.tone(587.33, 0.1, 'triangle', 0.13);
        this.tone(880, 0.14, 'triangle', 0.1, 0.06);
        break;
      case 'cancel':
        this.tone(392, 0.09, 'triangle', 0.1);
        this.tone(294, 0.12, 'triangle', 0.08, 0.05);
        break;
      case 'interact':
        this.tone(784, 0.08, 'sine', 0.12);
        break;
      case 'door':
        this.noise(0.22, 200, 0.12, 0.8);
        this.tone(140, 0.18, 'sine', 0.1);
        break;
      case 'coin':
      case 'buy':
        this.tone(988, 0.07, 'square', 0.07);
        this.tone(1318, 0.12, 'square', 0.06, 0.05);
        break;
      case 'hit':
        this.noise(0.13, 180, 0.24, 0.7);
        this.tone(110, 0.14, 'sine', 0.2);
        break;
      case 'heavy':
        this.noise(0.2, 120, 0.3, 0.6);
        this.tone(78, 0.24, 'sine', 0.26);
        break;
      case 'block':
        this.noise(0.1, 900, 0.16, 2.5);
        this.tone(320, 0.08, 'square', 0.08);
        break;
      case 'dodge':
        this.noise(0.18, 1400, 0.09, 0.9);
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.13, i * 0.09));
        break;
      case 'lose':
        [392, 349.23, 293.66, 220].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.13, i * 0.11));
        break;
      case 'splash':
        this.noise(0.34, 700, 0.18, 0.5);
        break;
      case 'reel':
        this.noise(0.14, 2200, 0.07, 3);
        break;
      case 'blip':
        this.tone(1200, 0.05, 'square', 0.07);
        break;
      case 'levelUp':
        [659.25, 830.61, 987.77].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.12, i * 0.1));
        break;
      case 'dice':
        for (let i = 0; i < 4; i++) this.noise(0.05, 900 + Math.random() * 600, 0.09, 3);
        break;
      case 'error':
        this.tone(180, 0.16, 'sawtooth', 0.1);
        break;
    }
  }

  /* ---------------------------------------------------------- ambience */

  setAmbience(kind: Ambience): void {
    if (!this.ctx || !this.ambienceBus || this.currentAmbience === kind) return;
    this.stopAmbience();
    this.currentAmbience = kind;
    if (kind === 'none') return;

    const t = this.ctx.currentTime;

    if (kind === 'rain') {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 1.5);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambienceBus);
      src.start();
      this.ambienceNodes.push(src, filter, gain);
      return;
    }

    // A gentle wind bed under everything else.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'interior' || kind === 'basement' ? 420 : 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(kind === 'arcade' ? 0.02 : 0.05, t + 2);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceBus);
    src.start();
    this.ambienceNodes.push(src, filter, gain);

    if (kind === 'park' || kind === 'street') {
      const chirp = () => {
        if (this.currentAmbience !== kind) return;
        const base = 1800 + Math.random() * 1400;
        this.tone(base, 0.07, 'sine', 0.03, 0, this.ambienceBus);
        this.tone(base * 1.18, 0.06, 'sine', 0.025, 0.09, this.ambienceBus);
        this.birdTimer = window.setTimeout(chirp, 2200 + Math.random() * 6000);
      };
      this.birdTimer = window.setTimeout(chirp, 1200 + Math.random() * 2500);
    }

    if (kind === 'arcade') {
      const blip = () => {
        if (this.currentAmbience !== 'arcade') return;
        this.tone(400 + Math.random() * 900, 0.05, 'square', 0.02, 0, this.ambienceBus);
        this.birdTimer = window.setTimeout(blip, 400 + Math.random() * 1400);
      };
      this.birdTimer = window.setTimeout(blip, 500);
    }
  }

  private stopAmbience(): void {
    if (this.birdTimer !== null) {
      window.clearTimeout(this.birdTimer);
      this.birdTimer = null;
    }
    for (const n of this.ambienceNodes) {
      try {
        if (n instanceof AudioBufferSourceNode) n.stop();
        n.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.ambienceNodes = [];
    this.currentAmbience = 'none';
  }

  /* ------------------------------------------------------------- music */

  /** A slow generative pentatonic loop; the mode shifts with the time of day. */
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    const scales: Record<string, number[]> = {
      day: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
      evening: [220.0, 261.63, 293.66, 349.23, 392.0, 440.0],
      night: [174.61, 196.0, 233.08, 261.63, 293.66, 349.23],
    };
    let mode: keyof typeof scales = 'day';
    const tick = () => {
      if (!this.ctx || !this.musicBus) return;
      const hour = this.hourHint;
      mode = hour < 6 || hour >= 20 ? 'night' : hour >= 17 ? 'evening' : 'day';
      const scale = scales[mode];
      this.musicStep++;

      if (this.musicStep % 2 === 0) {
        const note = scale[Math.floor(Math.random() * scale.length)];
        this.pluck(note, 1.5);
        if (Math.random() < 0.35) this.pluck(note * 1.5, 1.2, 0.5);
      }
      if (this.musicStep % 8 === 1) {
        this.pad(scale[0] / 2, 5.5);
      }
      this.musicTimer = window.setTimeout(tick, 900 + Math.random() * 500);
    };
    this.musicTimer = window.setTimeout(tick, 400);
  }

  /** Set by the game each frame so the music can follow the clock. */
  hourHint = 12;

  private pluck(freq: number, duration: number, delay = 0): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(t);
    osc.stop(t + duration + 0.1);
  }

  private pad(freq: number, duration: number): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    for (const detune of [-4, 4]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(t);
      osc.stop(t + duration + 0.2);
    }
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  dispose(): void {
    this.stopMusic();
    this.stopAmbience();
    void this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}

export const audio = new AudioManager();
