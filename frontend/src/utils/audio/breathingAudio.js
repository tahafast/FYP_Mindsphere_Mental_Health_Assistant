/**
 * Breathing Audio Engine - WebAudio API with continuous sounds
 */

class BreathingAudio {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.oscillator = null;
        this.isMuted = false;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return true;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return false;

            this.audioContext = new AudioContextClass();

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0;
            this.masterGain.connect(this.audioContext.destination);

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Audio init failed:', error);
            return false;
        }
    }

    /**
     * Called when step changes - start appropriate sound
     */
    onStepChange(step, duration, reduceMotion = false) {
        if (!this.isInitialized || this.isMuted) return;

        this.stopCurrentSound();

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        this.oscillator = ctx.createOscillator();
        const stepGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        this.oscillator.connect(filter);
        filter.connect(stepGain);
        stepGain.connect(this.masterGain);

        filter.type = 'lowpass';
        this.oscillator.type = 'sine';

        if (reduceMotion) {
            // Simple chime
            this.oscillator.frequency.setValueAtTime(440, now);
            filter.frequency.setValueAtTime(2000, now);
            stepGain.gain.setValueAtTime(0, now);
            stepGain.gain.linearRampToValueAtTime(0.12, now + 0.1);
            stepGain.gain.linearRampToValueAtTime(0, now + 0.4);
            this.masterGain.gain.setValueAtTime(0.7, now);
            this.oscillator.start(now);
            this.oscillator.stop(now + 0.5);
        } else {
            switch (step.type) {
                case 'inhale':
                    this.oscillator.frequency.setValueAtTime(80, now);
                    this.oscillator.frequency.linearRampToValueAtTime(200, now + duration);
                    filter.frequency.setValueAtTime(400, now);
                    filter.frequency.linearRampToValueAtTime(1000, now + duration);
                    stepGain.gain.setValueAtTime(0.02, now);
                    stepGain.gain.linearRampToValueAtTime(0.1, now + duration * 0.7);
                    stepGain.gain.linearRampToValueAtTime(0.06, now + duration);
                    break;

                case 'hold':
                    this.oscillator.frequency.setValueAtTime(100, now);
                    filter.frequency.setValueAtTime(500, now);
                    stepGain.gain.setValueAtTime(0.03, now);
                    stepGain.gain.linearRampToValueAtTime(0.05, now + duration * 0.5);
                    stepGain.gain.linearRampToValueAtTime(0.03, now + duration);
                    break;

                case 'exhale':
                    this.oscillator.frequency.setValueAtTime(180, now);
                    this.oscillator.frequency.linearRampToValueAtTime(60, now + duration);
                    filter.frequency.setValueAtTime(800, now);
                    filter.frequency.linearRampToValueAtTime(300, now + duration);
                    stepGain.gain.setValueAtTime(0.08, now);
                    stepGain.gain.linearRampToValueAtTime(0.04, now + duration * 0.8);
                    stepGain.gain.linearRampToValueAtTime(0.01, now + duration);
                    break;
            }

            this.masterGain.gain.setValueAtTime(0.7, now);
            this.oscillator.start(now);
            this.oscillator.stop(now + duration + 0.1);
        }
    }

    /**
     * Called every tick - can update envelope in real-time if needed
     */
    onTick(stepElapsed, stepDuration) {
        // Currently audio is pre-programmed via linearRamp
        // Could add real-time modulation here if desired
    }

    stopCurrentSound() {
        if (this.oscillator) {
            try {
                this.oscillator.stop();
            } catch (e) { }
            this.oscillator = null;
        }
    }

    mute() {
        this.isMuted = true;
        this.stopCurrentSound();
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    }

    unmute() {
        this.isMuted = false;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0.7, this.audioContext.currentTime);
        }
    }

    toggleMute() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.isMuted;
    }

    dispose() {
        this.stopCurrentSound();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isInitialized = false;
    }
}

let audioInstance = null;

export function getBreathingAudio() {
    if (!audioInstance) {
        audioInstance = new BreathingAudio();
    }
    return audioInstance;
}

export function disposeBreathingAudio() {
    if (audioInstance) {
        audioInstance.dispose();
        audioInstance = null;
    }
}
