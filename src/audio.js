function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createSoundSystem() {
  let context = null;
  let enabled = true;

  function getContext() {
    if (!enabled) {
      return null;
    }

    if (context) {
      return context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    context = new AudioContextClass();
    return context;
  }

  function unlock() {
    const audio = getContext();
    if (audio && audio.state === "suspended") {
      void audio.resume();
    }
  }

  function tone(frequency, duration, type = "sine", gainValue = 0.05, atTime = 0) {
    const audio = getContext();
    if (!audio) {
      return;
    }

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime + atTime);
    gain.gain.setValueAtTime(0.0001, audio.currentTime + atTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + atTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + atTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime + atTime);
    oscillator.stop(audio.currentTime + atTime + duration + 0.02);
  }

  function play(effect) {
    if (!enabled || !effect) {
      return;
    }

    switch (effect.type) {
      case "start":
        tone(220, 0.08, "triangle", 0.03);
        tone(330, 0.1, "triangle", 0.03, 0.08);
        tone(440, 0.12, "triangle", 0.03, 0.16);
        break;
      case "move":
        tone(280, 0.04, "square", 0.02);
        break;
      case "special":
        tone(520, 0.08, "sawtooth", 0.03);
        tone(780, 0.09, "triangle", 0.025, 0.05);
        break;
      case "hit":
        tone(130, 0.1, "square", 0.035);
        tone(90, 0.12, "triangle", 0.02, 0.04);
        break;
      case "loot":
        tone(620, 0.08, "sine", 0.03);
        tone(880, 0.1, "sine", 0.025, 0.04);
        break;
      case "damage":
        tone(240, 0.08, "triangle", 0.03);
        tone(150, 0.12, "square", 0.02, 0.04);
        break;
      case "win":
        tone(392, 0.12, "triangle", 0.035);
        tone(523.25, 0.12, "triangle", 0.035, 0.08);
        tone(659.25, 0.18, "triangle", 0.035, 0.16);
        break;
      case "restart":
        tone(180, 0.06, "sine", 0.02);
        break;
      default:
        break;
    }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
    if (enabled) {
      unlock();
    }
  }

  return {
    unlock,
    play,
    setEnabled,
    get enabled() {
      return enabled;
    }
  };
}
