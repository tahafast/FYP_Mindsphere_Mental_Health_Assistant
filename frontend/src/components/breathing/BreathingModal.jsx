import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useBreathingEngine } from '@/hooks/useBreathingEngine';
import { BreathingStage } from './BreathingStage';
import { HUD } from './HUD';
import { Controls } from './Controls';
import { getBreathingAudio, disposeBreathingAudio } from '@/utils/audio/breathingAudio';
import { getBreathingPresets, startBreathingSession, stopBreathingSession } from '@/lib/api';
import { toast } from 'sonner';

const USER_ID = 'user123';

// Preset configurations
const PRESET_CONFIGS = {
    'box-breathing': {
        steps: [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 4 },
            { type: 'exhale', duration: 4 },
            { type: 'hold', duration: 4 },
        ],
    },
    '4-7-8': {
        steps: [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 7 },
            { type: 'exhale', duration: 8 },
        ],
    },
    'resonant': {
        steps: [
            { type: 'inhale', duration: 5 },
            { type: 'exhale', duration: 5 },
        ],
    },
    'guided-slow': {
        steps: [
            { type: 'inhale', duration: 4 },
            { type: 'hold', duration: 1 },
            { type: 'exhale', duration: 6 },
        ],
    },
};

/**
 * Main Breathing Modal - Orchestrates all sub-components
 */
export function BreathingModal({ isOpen, onClose, initialPreset }) {
    // Settings (persisted)
    const [audioEnabled, setAudioEnabled] = useState(() => {
        const saved = localStorage.getItem('breathing_audioEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [reduceMotion, setReduceMotion] = useState(() => {
        const saved = localStorage.getItem('breathing_reduceMotion');
        if (saved !== null) return JSON.parse(saved);
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    // Presets
    const [presets, setPresets] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState(initialPreset || null);
    const [durationMinutes, setDurationMinutes] = useState(5);
    const [sessionId, setSessionId] = useState(null);

    const audioRef = useRef(null);

    // Get steps from selected preset
    const getSteps = useCallback(() => {
        if (!selectedPreset) return PRESET_CONFIGS['box-breathing'].steps;
        return selectedPreset.config?.steps ||
            PRESET_CONFIGS[selectedPreset.technique_id]?.steps ||
            PRESET_CONFIGS['box-breathing'].steps;
    }, [selectedPreset]);

    // Handle step change - sync audio
    const handleStepChange = useCallback((step, elapsed, cycles) => {
        if (audioEnabled && audioRef.current?.isInitialized) {
            audioRef.current.onStepChange(step, step.duration, reduceMotion);
        }
    }, [audioEnabled, reduceMotion]);

    // Handle tick - could sync audio envelope
    const handleTick = useCallback(({ elapsed, stepElapsed, progress }) => {
        if (audioRef.current?.isInitialized) {
            audioRef.current.onTick(stepElapsed, getSteps()[0]?.duration || 4);
        }
    }, [getSteps]);

    // Breathing engine with callbacks
    const engine = useBreathingEngine({
        steps: getSteps(),
        sessionDuration: durationMinutes * 60,
        reduceMotion,
        audioEnabled,
        onStepChange: handleStepChange,
        onTick: handleTick,
    });

    // Fetch presets on mount
    useEffect(() => {
        fetchPresets();
    }, []);

    // Update from prop
    useEffect(() => {
        if (initialPreset) setSelectedPreset(initialPreset);
    }, [initialPreset]);

    // Persist settings
    useEffect(() => {
        localStorage.setItem('breathing_audioEnabled', JSON.stringify(audioEnabled));
    }, [audioEnabled]);

    useEffect(() => {
        localStorage.setItem('breathing_reduceMotion', JSON.stringify(reduceMotion));
    }, [reduceMotion]);

    const fetchPresets = async () => {
        try {
            const data = await getBreathingPresets(USER_ID);
            const allPresets = [...data.builtin_presets, ...data.user_presets];
            setPresets(allPresets);
            if (!selectedPreset && allPresets.length > 0) {
                setSelectedPreset(allPresets[0]);
            }
        } catch (error) {
            console.error('Failed to fetch presets:', error);
        }
    };

    const handleStart = async () => {
        if (!selectedPreset) return;

        // Initialize audio
        if (audioEnabled) {
            audioRef.current = getBreathingAudio();
            await audioRef.current.init();
        }

        try {
            const response = await startBreathingSession(
                USER_ID,
                selectedPreset.technique_id,
                selectedPreset.name,
                durationMinutes
            );
            setSessionId(response.session_id);
            engine.start(3);
        } catch (error) {
            toast.error('Failed to start session');
        }
    };

    const handlePause = () => engine.pause();
    const handleResume = () => engine.resume();

    const handleStop = async () => {
        if (sessionId) {
            try {
                await stopBreathingSession(sessionId, engine.cycleCount, Math.floor(engine.elapsed), false);
            } catch (error) {
                console.error('Failed to save session:', error);
            }
        }
        engine.stop();
        if (audioRef.current) audioRef.current.stopCurrentSound();
        toast.success(`Session stopped. ${engine.cycleCount} cycles in ${Math.floor(engine.elapsed / 60)}m ${Math.floor(engine.elapsed % 60)}s`);
    };

    const handleReset = () => {
        engine.reset();
        if (audioRef.current) audioRef.current.stopCurrentSound();
        setSessionId(null);
    };

    const handleClose = () => {
        engine.reset();
        if (audioRef.current) audioRef.current.stopCurrentSound();
        disposeBreathingAudio();
        audioRef.current = null;
        setSessionId(null);
        onClose();
    };

    const handleToggleAudio = () => {
        const newValue = !audioEnabled;
        setAudioEnabled(newValue);
        if (audioRef.current) {
            if (newValue) audioRef.current.unmute();
            else audioRef.current.mute();
        }
    };

    const handleToggleReduceMotion = () => setReduceMotion(prev => !prev);

    const isExercising = engine.status !== 'idle';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent
                className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden"
                aria-labelledby="breathing-modal-title"
            >
                <DialogHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
                    <DialogTitle id="breathing-modal-title">Breathing Exercise</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Preset selection - idle only */}
                    {engine.status === 'idle' && (
                        <div className="p-6 pb-4 space-y-4 flex-shrink-0">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Select Exercise</label>
                                <Select
                                    value={selectedPreset?.preset_id}
                                    onValueChange={(value) => {
                                        const preset = presets.find((p) => p.preset_id === value);
                                        if (preset) setSelectedPreset(preset);
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose a breathing technique" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {presets.map((preset) => (
                                            <SelectItem key={preset.preset_id} value={preset.preset_id}>
                                                {preset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedPreset && (
                                <Card className="bg-primary/5">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-muted-foreground">
                                            {selectedPreset.config?.description || 'Focus on your breath'}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            <div>
                                <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="60"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 5)}
                                    className="w-24 px-3 py-2 border border-border rounded-md bg-background"
                                />
                            </div>
                        </div>
                    )}

                    {/* Visual area */}
                    <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
                        {/* Breathing Stage with bubble */}
                        <BreathingStage
                            scale={engine.scale}
                            step={engine.step?.type}
                            reduceMotion={reduceMotion}
                            isVisible={isExercising}
                        />

                        {/* HUD - separate from bubble */}
                        <HUD
                            step={engine.step}
                            stepRemaining={engine.stepRemaining}
                            elapsed={engine.elapsed}
                            sessionRemaining={engine.sessionRemaining}
                            cycleCount={engine.cycleCount}
                            status={engine.status}
                            countdown={engine.countdown}
                            position="below"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 pt-4 border-t border-border flex-shrink-0">
                    <Controls
                        status={engine.status}
                        audioEnabled={audioEnabled}
                        reduceMotion={reduceMotion}
                        hasPreset={!!selectedPreset}
                        onStart={handleStart}
                        onPause={handlePause}
                        onResume={handleResume}
                        onStop={handleStop}
                        onReset={handleReset}
                        onClose={handleClose}
                        onToggleAudio={handleToggleAudio}
                        onToggleReduceMotion={handleToggleReduceMotion}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

export { BreathingModal as BreathingExercise };
