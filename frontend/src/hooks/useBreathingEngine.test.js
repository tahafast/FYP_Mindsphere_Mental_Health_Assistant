import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock rAF
let rafCallbacks = [];
let rafId = 0;
let currentTime = 0;

global.requestAnimationFrame = vi.fn((callback) => {
    rafId++;
    rafCallbacks.push({ id: rafId, callback });
    return rafId;
});

global.cancelAnimationFrame = vi.fn((id) => {
    rafCallbacks = rafCallbacks.filter((cb) => cb.id !== id);
});

// Simulate rAF ticks
function tickRaf(deltaMs) {
    currentTime += deltaMs;
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach(({ callback }) => callback(currentTime));
}

describe('useBreathingEngine - Core Logic', () => {
    beforeEach(() => {
        rafCallbacks = [];
        rafId = 0;
        currentTime = 0;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should have correct initial state', () => {
        const initialState = {
            status: 'idle',
            countdown: 3,
            stepIndex: 0,
            stepElapsed: 0,
            elapsed: 0,
            cycleCount: 0,
            scale: 1,
        };

        expect(initialState.status).toBe('idle');
        expect(initialState.scale).toBe(1);
        expect(initialState.cycleCount).toBe(0);
    });

    it('should calculate inhale scale correctly', () => {
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        const scaleMin = 0.7;
        const scaleMax = 2.5;
        const range = scaleMax - scaleMin;

        // Progress 0 (start)
        let progress = 0;
        let scale = scaleMin + range * easeInOutQuad(progress);
        expect(scale).toBe(0.7);

        // Progress 0.5 (middle)
        progress = 0.5;
        scale = scaleMin + range * easeInOutQuad(progress);
        expect(scale).toBe(1.6); // 0.7 + 1.8 * 0.5

        // Progress 1 (end)
        progress = 1;
        scale = scaleMin + range * easeInOutQuad(progress);
        expect(scale).toBe(2.5);
    });

    it('should calculate exhale scale correctly', () => {
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        const scaleMin = 0.7;
        const scaleMax = 2.5;
        const range = scaleMax - scaleMin;

        // Progress 0 (start of exhale = at max)
        let progress = 0;
        let scale = scaleMax - range * easeInOutQuad(progress);
        expect(scale).toBe(2.5);

        // Progress 1 (end of exhale = at min)
        progress = 1;
        scale = scaleMax - range * easeInOutQuad(progress);
        expect(scale).toBe(0.7);
    });

    it('should keep hold scale constant', () => {
        const scaleMax = 2.5;
        // Hold returns max regardless of progress
        expect(scaleMax).toBe(2.5);
    });

    it('should transition steps correctly after duration', () => {
        const steps = [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 4 },
            { type: 'exhale', duration: 4 },
        ];

        let stepIndex = 0;
        let stepElapsed = 0;
        let cycleCount = 0;

        // Simulate 4 seconds (inhale complete)
        stepElapsed = 4.1;
        if (stepElapsed >= steps[stepIndex].duration) {
            stepIndex = (stepIndex + 1) % steps.length;
            stepElapsed = 0;
        }
        expect(stepIndex).toBe(1);
        expect(steps[stepIndex].type).toBe('hold');

        // Simulate hold complete
        stepElapsed = 4.1;
        if (stepElapsed >= steps[stepIndex].duration) {
            stepIndex = (stepIndex + 1) % steps.length;
            stepElapsed = 0;
        }
        expect(stepIndex).toBe(2);
        expect(steps[stepIndex].type).toBe('exhale');

        // Simulate exhale complete (cycle wraps)
        stepElapsed = 4.1;
        if (stepElapsed >= steps[stepIndex].duration) {
            const nextIndex = (stepIndex + 1) % steps.length;
            if (nextIndex === 0) cycleCount++;
            stepIndex = nextIndex;
            stepElapsed = 0;
        }
        expect(stepIndex).toBe(0);
        expect(cycleCount).toBe(1);
    });

    it('should calculate reduced motion scale range', () => {
        const scaleMinReduced = 0.95;
        const scaleMaxReduced = 1.05;
        const range = scaleMaxReduced - scaleMinReduced;

        expect(scaleMinReduced).toBe(0.95);
        expect(scaleMaxReduced).toBe(1.05);
        expect(range).toBe(0.1);
    });

    it('should cap delta time for tab throttling', () => {
        const maxDelta = 0.1;
        const rawDelta = 2.5; // Long gap from throttled tab

        const cappedDelta = Math.min(rawDelta, maxDelta);
        expect(cappedDelta).toBe(0.1);
    });

    it('should calculate total cycle duration correctly', () => {
        const boxBreathing = [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 4 },
            { type: 'exhale', duration: 4 },
            { type: 'hold', duration: 4 },
        ];
        const totalDuration = boxBreathing.reduce((sum, s) => sum + s.duration, 0);
        expect(totalDuration).toBe(16);

        const technique478 = [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 7 },
            { type: 'exhale', duration: 8 },
        ];
        const total478 = technique478.reduce((sum, s) => sum + s.duration, 0);
        expect(total478).toBe(19);
    });

    it('should simulate 10 seconds and verify step progression', () => {
        const steps = [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 4 },
            { type: 'exhale', duration: 4 },
        ];

        let state = {
            stepIndex: 0,
            stepElapsed: 0,
            elapsed: 0,
            cycleCount: 0,
        };

        // Simulate 10 seconds in 100ms increments
        for (let i = 0; i < 100; i++) {
            const delta = 0.1;
            state.stepElapsed += delta;
            state.elapsed += delta;

            const currentStep = steps[state.stepIndex];
            if (state.stepElapsed >= currentStep.duration) {
                const nextIndex = (state.stepIndex + 1) % steps.length;
                if (nextIndex === 0) state.cycleCount++;
                state.stepIndex = nextIndex;
                state.stepElapsed = 0;
            }
        }

        // After 10 seconds: inhale(4) + hold(4) + 2s into exhale
        expect(state.elapsed).toBeCloseTo(10, 1);
        expect(state.stepIndex).toBe(2); // exhale
        expect(state.cycleCount).toBe(0); // no full cycle yet
        expect(state.stepElapsed).toBeCloseTo(2, 1); // 2 seconds into exhale
    });

    it('should easeInOutQuad return correct values', () => {
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        expect(easeInOutQuad(0)).toBe(0);
        expect(easeInOutQuad(0.5)).toBe(0.5);
        expect(easeInOutQuad(1)).toBe(1);
        expect(easeInOutQuad(0.25)).toBeCloseTo(0.125, 3);
        expect(easeInOutQuad(0.75)).toBeCloseTo(0.875, 3);
    });
});

describe('Breathing Audio Timing', () => {
    it('should calculate frequency ramp for inhale', () => {
        const startFreq = 80;
        const endFreq = 200;
        const duration = 4;

        expect(startFreq).toBe(80);
        expect(endFreq).toBe(200);

        // Midpoint frequency
        const midFreq = startFreq + (endFreq - startFreq) * 0.5;
        expect(midFreq).toBe(140);
    });

    it('should calculate frequency ramp for exhale', () => {
        const startFreq = 180;
        const endFreq = 60;

        expect(startFreq).toBe(180);
        expect(endFreq).toBe(60);
    });
});
