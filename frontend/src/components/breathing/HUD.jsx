import React from 'react';

/**
 * HUD - Heads-Up Display showing breathing instructions
 * Updates every tick with current step and timing info
 */
export function HUD({
    step,
    stepRemaining,
    elapsed,
    sessionRemaining,
    cycleCount,
    status,
    countdown,
    position = 'below',
}) {
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const getStepLabel = () => {
        if (!step) return '';
        switch (step.type) {
            case 'inhale': return 'Breathe In';
            case 'hold': return 'Hold';
            case 'exhale': return 'Breathe Out';
            default: return '';
        }
    };

    const getStepColor = () => {
        if (!step) return 'text-primary';
        switch (step.type) {
            case 'inhale': return 'text-cyan-400';
            case 'hold': return 'text-amber-400';
            case 'exhale': return 'text-blue-400';
            default: return 'text-primary';
        }
    };

    // Countdown display
    if (status === 'countdown') {
        return (
            <div className="flex flex-col items-center justify-center py-6" role="status" aria-live="polite">
                <p className="text-sm text-muted-foreground mb-2">Get Ready</p>
                <p className="text-7xl font-bold text-primary tabular-nums animate-pulse">
                    {countdown}
                </p>
            </div>
        );
    }

    // Idle - no HUD
    if (status === 'idle') {
        return null;
    }

    // Completed display
    if (status === 'completed') {
        return (
            <div className="flex flex-col items-center justify-center py-4" role="status" aria-live="polite">
                <p className="text-2xl font-bold text-primary mb-2">Complete!</p>
                <p className="text-lg text-muted-foreground">
                    {cycleCount} cycles in {formatTime(elapsed)}
                </p>
            </div>
        );
    }

    // Active or Paused - main HUD
    return (
        <div className="flex flex-col items-center py-3" role="status" aria-live="polite" aria-atomic="true">
            {/* Step instruction */}
            <div className="text-center mb-3">
                <p className={`text-3xl md:text-4xl font-bold ${getStepColor()} transition-colors duration-200`}>
                    {getStepLabel()}
                </p>
                <p className="text-5xl md:text-6xl font-bold text-foreground tabular-nums mt-1">
                    {Math.ceil(stepRemaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">seconds</p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-center flex-wrap justify-center">
                <div className="bg-background/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground">Elapsed</p>
                    <p className="text-lg font-semibold text-foreground tabular-nums">{formatTime(elapsed)}</p>
                </div>

                <div className="bg-background/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground">Cycles</p>
                    <p className="text-lg font-semibold text-foreground tabular-nums">{cycleCount}</p>
                </div>

                {sessionRemaining !== null && sessionRemaining > 0 && (
                    <div className="bg-background/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="text-lg font-semibold text-foreground tabular-nums">{formatTime(sessionRemaining)}</p>
                    </div>
                )}
            </div>

            {/* Paused indicator */}
            {status === 'paused' && (
                <div className="mt-3 px-4 py-1.5 bg-amber-500/20 border border-amber-500/50 rounded-full">
                    <p className="text-xs font-medium text-amber-400">⏸ Paused</p>
                </div>
            )}
        </div>
    );
}
