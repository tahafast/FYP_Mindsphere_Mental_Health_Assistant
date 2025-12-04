import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw, X, Volume2, VolumeX, Sparkles, EyeOff } from 'lucide-react';

/**
 * Controls - All breathing exercise control buttons
 * Calls engine methods: start, pause, resume, stop
 */
export function Controls({
    status,
    audioEnabled,
    reduceMotion,
    onStart,
    onPause,
    onResume,
    onStop,
    onReset,
    onClose,
    onToggleAudio,
    onToggleReduceMotion,
    hasPreset = true,
}) {
    return (
        <div className="space-y-4">
            {/* Main action buttons */}
            <div className="flex justify-center gap-3 flex-wrap">
                {/* Idle - Start button */}
                {status === 'idle' && (
                    <Button
                        size="lg"
                        onClick={onStart}
                        disabled={!hasPreset}
                        className="min-w-[180px] text-lg"
                        aria-label="Start breathing exercise"
                    >
                        <Play className="h-5 w-5 mr-2" />
                        Start
                    </Button>
                )}

                {/* Active - Pause, Restart, Stop */}
                {status === 'active' && (
                    <>
                        <Button variant="outline" size="lg" onClick={onPause} aria-label="Pause">
                            <Pause className="h-5 w-5 mr-2" />
                            Pause
                        </Button>
                        <Button variant="outline" size="lg" onClick={onReset} aria-label="Restart">
                            <RotateCcw className="h-5 w-5 mr-2" />
                            Restart
                        </Button>
                        <Button variant="destructive" size="lg" onClick={onStop} aria-label="Stop">
                            <Square className="h-5 w-5 mr-2" />
                            Stop
                        </Button>
                    </>
                )}

                {/* Paused - Resume, Restart, Stop */}
                {status === 'paused' && (
                    <>
                        <Button size="lg" onClick={onResume} aria-label="Resume">
                            <Play className="h-5 w-5 mr-2" />
                            Resume
                        </Button>
                        <Button variant="outline" size="lg" onClick={onReset} aria-label="Restart">
                            <RotateCcw className="h-5 w-5 mr-2" />
                            Restart
                        </Button>
                        <Button variant="destructive" size="lg" onClick={onStop} aria-label="Stop">
                            <Square className="h-5 w-5 mr-2" />
                            Stop
                        </Button>
                    </>
                )}

                {/* Countdown - Cancel */}
                {status === 'countdown' && (
                    <Button variant="outline" size="lg" onClick={onReset} aria-label="Cancel">
                        <X className="h-5 w-5 mr-2" />
                        Cancel
                    </Button>
                )}

                {/* Completed - New Session, Close */}
                {status === 'completed' && (
                    <>
                        <Button size="lg" onClick={onReset} aria-label="Start new session">
                            <RotateCcw className="h-5 w-5 mr-2" />
                            New Session
                        </Button>
                        <Button variant="outline" size="lg" onClick={onClose} aria-label="Close">
                            <X className="h-5 w-5 mr-2" />
                            Close
                        </Button>
                    </>
                )}
            </div>

            {/* Settings - only in idle */}
            {status === 'idle' && (
                <div className="flex justify-center items-center gap-3 flex-wrap">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleAudio}
                        className={!audioEnabled ? 'text-muted-foreground' : ''}
                        aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
                    >
                        {audioEnabled ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                        {audioEnabled ? 'Sound On' : 'Sound Off'}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleReduceMotion}
                        className={reduceMotion ? 'text-amber-500' : ''}
                        aria-label={reduceMotion ? 'Enable full motion' : 'Reduce motion'}
                    >
                        {reduceMotion ? <EyeOff className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {reduceMotion ? 'Minimal Motion' : 'Full Motion'}
                    </Button>
                </div>
            )}
        </div>
    );
}
