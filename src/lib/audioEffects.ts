import { CheerType } from '../types';

let audioCtx: AudioContext | null = null;
let isAudioMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setAudioMuted(muted: boolean) {
  isAudioMuted = muted;
}

export function getAudioMuted(): boolean {
  return isAudioMuted;
}

export function playSoundEffect(type: CheerType | 'success' | 'ding') {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'airhorn') {
      // Iconic 3-burst ragga airhorn
      const freqs = [466.16, 466.16, 523.25, 466.16]; // Bb4 -> C5 -> Bb4
      const times = [0, 0.12, 0.24, 0.4];

      times.forEach((startTime, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freqs[idx] || 466.16, now + startTime);
        
        gain.gain.setValueAtTime(0, now + startTime);
        gain.gain.linearRampToValueAtTime(0.2, now + startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startTime);
        osc.stop(now + startTime + 0.16);
      });
    } else if (type === 'applause') {
      // Crowd clapping noise burst
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.7));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.Q.setValueAtTime(1.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } else if (type === 'cheer' || type === 'wow') {
      // Bright cheering chord sweep
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.9, now + i * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.2 + i * 0.04);

        gain.gain.setValueAtTime(0, now + i * 0.04);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.04 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + 0.7 + i * 0.04);
      });
    } else if (type === 'mic_drop') {
      // Deep sub bass boom + high resonance click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.4);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'success' || type === 'ding' || type === 'heart' || type === 'fire') {
      // Pleasant marimba / chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  } catch (err) {
    console.warn('Audio effect playback error:', err);
  }
}
