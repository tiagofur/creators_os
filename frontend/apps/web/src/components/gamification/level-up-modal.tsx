'use client';

import * as React from 'react';
import { Button } from '@ordo/ui';
import type { CreatorLevel } from '@ordo/types';

interface LevelUpModalProps {
  newLevel: CreatorLevel;
  onClose: () => void;
}

export function LevelUpModal({ newLevel, onClose }: LevelUpModalProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    // Dynamically import canvas-confetti to avoid SSR issues
    let cleanup = false;
    import('canvas-confetti').then((confettiModule) => {
      if (cleanup) return;
      const confetti = confettiModule.default;
      const canvas = canvasRef.current;
      if (!canvas) {
        // Fire default confetti if canvas not ready
        void confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        return;
      }
      const myConfetti = confetti.create(canvas, { resize: true });
      void myConfetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }).catch(() => {
      // canvas-confetti not available, skip animation
    });
    return () => { cleanup = true; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 rounded-2xl border bg-background p-10 shadow-2xl text-center max-w-sm w-full mx-4 animate-in zoom-in-90">
        <p className="text-5xl">🎉</p>
        <h2 className="text-2xl font-bold">Level Up!</h2>

        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
          {newLevel.level}
        </div>

        <div>
          <p className="text-xl font-semibold">{newLevel.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You've reached Level {newLevel.level}!
          </p>
        </div>

        <Button onClick={onClose} className="w-full">
          Keep creating!
        </Button>
      </div>
    </div>
  );
}
