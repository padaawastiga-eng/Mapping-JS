/**
 * Audio synthesis & chime notification helper for navigation alerts.
 */

class AudioNotifier {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;
  private lastSpokenText: string = '';
  private lastSpeechTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a clean synthesize chime beep sound using Web Audio API
   */
  public playChime(type: 'success' | 'warning' | 'info' = 'info') {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'warning') {
        // High alert double-beep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(440, now + 0.15); // A4
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'success') {
        // Pleasant rising major triad chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Standard info chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Ignore audio context errors if browser blocks autoplay before user gesture
    }
  }

  /**
   * Speak announcement text in Indonesian
   */
  public speak(text: string, priority: 'high' | 'normal' = 'normal') {
    if (!this.enabled || typeof window === 'undefined' || !this.synth) return;

    const now = Date.now();
    // Throttle identical speech within 8 seconds unless high priority
    if (text === this.lastSpokenText && now - this.lastSpeechTime < 8000 && priority !== 'high') {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpeechTime = now;

    if (priority === 'high') {
      this.synth.cancel(); // Cancel ongoing lower-priority speech
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Indonesian voice
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Try finding an Indonesian voice if available
    const voices = this.synth.getVoices();
    const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    this.synth.speak(utterance);
  }
}

export const audioNotifier = new AudioNotifier();
