type EffectName = 'launch' | 'briefing' | 'lock' | 'laser' | 'hit' | 'warning' | 'complete';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function tone(frequency: number, durationSeconds: number, type: OscillatorType, gain = 0.055) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.0001, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(gain, context.currentTime + 0.018);
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationSeconds);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + durationSeconds + 0.025);
}

export function playEffect(effect: EffectName) {
  if (effect === 'launch') {
    tone(220, 0.09, 'sawtooth', 0.04);
    window.setTimeout(() => tone(440, 0.12, 'triangle', 0.05), 80);
    return;
  }

  if (effect === 'briefing') {
    tone(660, 0.08, 'sine', 0.035);
    window.setTimeout(() => tone(880, 0.08, 'sine', 0.035), 70);
    return;
  }

  if (effect === 'lock') {
    tone(523, 0.06, 'triangle', 0.035);
    window.setTimeout(() => tone(784, 0.07, 'triangle', 0.035), 60);
    return;
  }

  if (effect === 'laser') {
    tone(980, 0.055, 'square', 0.025);
    return;
  }

  if (effect === 'hit') {
    tone(160, 0.08, 'sawtooth', 0.045);
    window.setTimeout(() => tone(90, 0.08, 'sine', 0.025), 30);
    return;
  }

  if (effect === 'warning') {
    tone(180, 0.11, 'triangle', 0.04);
    return;
  }

  tone(523, 0.08, 'triangle', 0.04);
  window.setTimeout(() => tone(659, 0.08, 'triangle', 0.04), 75);
  window.setTimeout(() => tone(784, 0.14, 'triangle', 0.04), 150);
}

export function speakBriefing(text: string) {
  if (!('speechSynthesis' in window)) {
    playEffect('briefing');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = chooseBriefingVoice();
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 0.95;
  window.speechSynthesis.speak(utterance);
  playEffect('briefing');
}

function chooseBriefingVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const preferredNames = [
    'natural',
    'jenny',
    'aria',
    'guy',
    'ava',
    'andrew',
    'emma',
    'brian',
    'microsoft',
    'google us english',
  ];

  return (
    preferredNames
      .map((name) =>
        englishVoices.find(
          (voice) => voice.name.toLowerCase().includes(name) && voice.localService,
        ),
      )
      .find(Boolean) ??
    preferredNames
      .map((name) => englishVoices.find((voice) => voice.name.toLowerCase().includes(name)))
      .find(Boolean) ??
    englishVoices.find((voice) => voice.localService) ??
    englishVoices[0] ??
    null
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
