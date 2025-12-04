import React from 'react';

/**
 * Breathing Bubble - Pure visual component
 * Receives scale from parent and applies CSS transform
 */
export function Bubble({ scale = 1, step = 'inhale', reduceMotion = false }) {
    const glowIntensity = Math.min(scale * 0.5, 1.2);

    return (
        <div
            className="bubble"
            style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '120px',
                height: '120px',
                borderRadius: '9999px',
                transform: `translate(-50%, -50%) scale(${scale})`,
                willChange: 'transform',
                transition: reduceMotion ? 'transform 200ms ease-out' : 'none',
                background: `radial-gradient(
          circle at 30% 30%,
          rgba(130, 220, 255, 0.45) 0%,
          rgba(70, 180, 220, 0.3) 40%,
          rgba(40, 140, 180, 0.2) 70%,
          rgba(30, 100, 140, 0.15) 100%
        )`,
                boxShadow: `
          0 0 ${30 * glowIntensity}px rgba(70, 180, 220, 0.5),
          0 0 ${60 * glowIntensity}px rgba(70, 180, 220, 0.3),
          0 0 ${100 * glowIntensity}px rgba(70, 180, 220, 0.15),
          inset 0 0 ${20 * glowIntensity}px rgba(255, 255, 255, 0.15)
        `,
                pointerEvents: 'none',
            }}
            aria-hidden="true"
            data-step={step}
        />
    );
}
