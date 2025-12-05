import React from 'react';
import { Bubble } from './Bubble';

/**
 * Breathing Stage - Visual container for bubble
 * Passes scale to Bubble, handles overflow
 */
export function BreathingStage({ scale, step, reduceMotion, isVisible = true }) {
    return (
        <div
            className="breathing-stage-container"
            style={{
                position: 'relative',
                width: '100%',
                height: '45vh',
                minHeight: '300px',
                maxHeight: '400px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 300ms ease-in-out',
            }}
        >
            {/* Background gradient */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at center, rgba(70, 180, 220, 0.08) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Bubble with scale */}
            <Bubble
                scale={scale}
                step={step}
                reduceMotion={reduceMotion}
            />
        </div>
    );
}
