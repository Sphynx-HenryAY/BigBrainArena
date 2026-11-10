import { store } from "./store.js";

let context = null;

function ensureContext() {
  if (!store.getSound()) return null;
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
  }
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  return context;
}

function tone({ freq = 440, duration = 0.12, type = "sine", gain = 0.05, when = 0 }) {
  const audioContext = ensureContext();
  if (!audioContext) return;
  const start = audioContext.currentTime + when;
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const NOTES = [392, 440, 494, 523, 587, 659, 698, 784, 880];

export const sound = {
  unlock() {
    ensureContext();
  },
  note(index) {
    tone({ freq: NOTES[index % NOTES.length], duration: 0.22, type: "triangle", gain: 0.045 });
  },
  click() {
    tone({ freq: 540, duration: 0.05, gain: 0.03 });
  },
  correct() {
    tone({ freq: 660, duration: 0.09, gain: 0.045 });
    tone({ freq: 880, duration: 0.12, gain: 0.045, when: 0.08 });
  },
  wrong() {
    tone({ freq: 190, duration: 0.2, type: "sawtooth", gain: 0.035 });
  },
  start() {
    tone({ freq: 440, duration: 0.1, gain: 0.04 });
    tone({ freq: 660, duration: 0.14, gain: 0.04, when: 0.1 });
  },
  tick() {
    tone({ freq: 900, duration: 0.04, gain: 0.02 });
  },
  finish() {
    [523, 659, 784, 1046].forEach((freq, index) => {
      tone({ freq, duration: 0.18, gain: 0.045, when: index * 0.1 });
    });
  },
};
