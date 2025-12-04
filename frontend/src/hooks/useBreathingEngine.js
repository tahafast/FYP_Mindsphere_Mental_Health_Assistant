import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Easing function for smooth scale transitions
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Breathing Engine Hook - Fully reactive with proper rAF loop
 * Uses refs for timing and state for UI reactivity
 */
export function useBreathingEngine(config = {}) {
    // Default configuration
    const defaultConfig = {
        steps: [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 4 },
            { type: 'exhale', duration: 4 },
        ],
        sessionDuration: 300,
        reduceMotion: false,
        audioEnabled: true,
        scaleMin: 0.7,
        scaleMax: 2.5,
        scaleMinReduced: 0.95,
        scaleMaxReduced: 1.05,
        onStepChange: null,
        onTick: null,
    };

    const mergedConfig = { ...defaultConfig, ...config };

    // ===== REACTIVE STATE (causes re-renders) =====
    const [status, setStatus] = useState('idle'); // idle, countdown, active, paused, completed
    const [countdown, setCountdown] = useState(3);
    const [stepIndex, setStepIndex] = useState(0);
    const [stepElapsed, setStepElapsed] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [cycleCount, setCycleCount] = useState(0);
    const [scale, setScale] = useState(1);
    const [stepRemaining, setStepRemaining] = useState(0);
    const [sessionRemaining, setSessionRemaining] = useState(mergedConfig.sessionDuration);

    // ===== REFS (for rAF loop, no re-renders) =====
    const rafRef = useRef(null);
    const lastTimestampRef = useRef(null);
    const configRef = useRef(mergedConfig);
    const stateRef = useRef({
        status: 'idle',
        stepIndex: 0,
        stepElapsed: 0,
        elapsed: 0,
        cycleCount: 0,
    });

    // Keep config ref updated
    useEffect(() => {
        configRef.current = { ...defaultConfig, ...config };
    }, [config]);

    // Calculate scale from step progress
    const calculateScale = useCallback((stepType, progress) => {
        const cfg = configRef.current;
        const min = cfg.reduceMotion ? cfg.scaleMinReduced : cfg.scaleMin;
        const max = cfg.reduceMotion ? cfg.scaleMaxReduced : cfg.scaleMax;
        const range = max - min;
        const easedProgress = easeInOutQuad(Math.min(1, Math.max(0, progress)));

        switch (stepType) {
            case 'inhale':
                return min + range * easedProgress;
            case 'hold':
                return max;
            case 'exhale':
                return max - range * easedProgress;
            default:
                return (min + max) / 2;
        }
    }, []);

    // ===== CORE ANIMATION LOOP =====
    const tick = useCallback((timestamp) => {
        if (!lastTimestampRef.current) {
            lastTimestampRef.current = timestamp;
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        // Calculate delta time (capped to prevent large jumps)
        const delta = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.1);
        lastTimestampRef.current = timestamp;

        const state = stateRef.current;
        const cfg = configRef.current;
        const steps = cfg.steps;

        if (state.status !== 'active') {
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        // Update times
        const newStepElapsed = state.stepElapsed + delta;
        const newElapsed = state.elapsed + delta;
        const currentStep = steps[state.stepIndex];
        const stepDuration = currentStep.duration;

        // Check for step transition
        if (newStepElapsed >= stepDuration) {
            // Move to next step
            const nextIndex = (state.stepIndex + 1) % steps.length;
            const nextStep = steps[nextIndex];

            // Increment cycle when wrapping
            let newCycleCount = state.cycleCount;
            if (nextIndex === 0) {
                newCycleCount++;
            }

            // Update ref state
            state.stepIndex = nextIndex;
            state.stepElapsed = 0;
            state.elapsed = newElapsed;
            state.cycleCount = newCycleCount;

            // Update React state
            setStepIndex(nextIndex);
            setStepElapsed(0);
            setElapsed(newElapsed);
            setCycleCount(newCycleCount);
            setStepRemaining(nextStep.duration);
            setScale(calculateScale(nextStep.type, 0));
            setSessionRemaining(Math.max(0, cfg.sessionDuration - newElapsed));

            // Callback
            if (cfg.onStepChange) {
                cfg.onStepChange(nextStep, newElapsed, newCycleCount);
            }
        } else {
            // Update within current step
            const progress = newStepElapsed / stepDuration;

            // Update ref state
            state.stepElapsed = newStepElapsed;
            state.elapsed = newElapsed;

            // Update React state
            setStepElapsed(newStepElapsed);
            setElapsed(newElapsed);
            setStepRemaining(Math.max(0, stepDuration - newStepElapsed));
            setScale(calculateScale(currentStep.type, progress));
            setSessionRemaining(Math.max(0, cfg.sessionDuration - newElapsed));

            // Tick callback
            if (cfg.onTick) {
                cfg.onTick({ elapsed: newElapsed, stepElapsed: newStepElapsed, progress });
            }
        }

        // Check session completion
        if (cfg.sessionDuration && newElapsed >= cfg.sessionDuration) {
            state.status = 'completed';
            setStatus('completed');
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            return;
        }

        // Continue loop
        rafRef.current = requestAnimationFrame(tick);
    }, [calculateScale]);

    // ===== COUNTDOWN EFFECT =====
    useEffect(() => {
        if (status !== 'countdown') return;

        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // Start active mode
            const cfg = configRef.current;
            const firstStep = cfg.steps[0];

            stateRef.current = {
                status: 'active',
                stepIndex: 0,
                stepElapsed: 0,
                elapsed: 0,
                cycleCount: 0,
            };

            setStatus('active');
            setStepIndex(0);
            setStepElapsed(0);
            setElapsed(0);
            setCycleCount(0);
            setStepRemaining(firstStep.duration);
            setSessionRemaining(cfg.sessionDuration);
            setScale(calculateScale(firstStep.type, 0));

            // Start animation loop
            lastTimestampRef.current = null;
            rafRef.current = requestAnimationFrame(tick);

            // Initial step callback
            if (cfg.onStepChange) {
                cfg.onStepChange(firstStep, 0, 0);
            }
        }
    }, [status, countdown, tick, calculateScale]);

    // ===== CLEANUP =====
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // ===== CONTROL METHODS =====
    const start = useCallback((countdownSeconds = 3) => {
        setCountdown(countdownSeconds);
        setStatus('countdown');
    }, []);

    const pause = useCallback(() => {
        stateRef.current.status = 'paused';
        setStatus('paused');
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const resume = useCallback(() => {
        stateRef.current.status = 'active';
        setStatus('active');
        lastTimestampRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
    }, [tick]);

    const stop = useCallback(() => {
        stateRef.current.status = 'completed';
        setStatus('completed');
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        stateRef.current = {
            status: 'idle',
            stepIndex: 0,
            stepElapsed: 0,
            elapsed: 0,
            cycleCount: 0,
        };

        setStatus('idle');
        setCountdown(3);
        setStepIndex(0);
        setStepElapsed(0);
        setElapsed(0);
        setCycleCount(0);
        setScale(1);
        setStepRemaining(0);
        setSessionRemaining(configRef.current.sessionDuration);
        lastTimestampRef.current = null;
    }, []);

    // Current step info
    const steps = configRef.current.steps;
    const currentStep = steps[stepIndex] || steps[0];

    return {
        // State
        status,
        countdown,
        step: currentStep,
        stepIndex,
        stepElapsed,
        stepRemaining,
        elapsed,
        sessionRemaining,
        cycleCount,
        scale,

        // Methods
        start,
        pause,
        resume,
        stop,
        reset,

        // Config
        config: configRef.current,
    };
}
