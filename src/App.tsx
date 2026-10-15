/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine.ts';
import { GameRenderer } from './game/renderer.ts';
import { soundEngine } from './game/audio.ts';
import { SquadType, Point } from './game/types.ts';
import { HUD } from './components/HUD.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import {
  PauseModal,
  VictoryModal,
  GameOverModal,
  ReinforcementModal,
  TacticalGuideModal,
} from './components/Modals.tsx';

type GameState = 'title' | 'playing' | 'paused' | 'reinforcement' | 'victory' | 'gameover';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  // High-level Game States
  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedSquad, setSelectedSquad] = useState<SquadType>('shield');
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [waveClearedNumber, setWaveClearedNumber] = useState<number>(1);

  // Throttled HUD State for React rendering
  const [hudStats, setHudStats] = useState({
    score: 0,
    wave: 1,
    maxWaves: 5,
    enemiesDefeated: 0,
    flankingCrits: 0,
    arrowsDeflected: 0,
    rallyHornsUsed: 0,
    elapsedTime: 0,
    blueStrength: 50,
    redStrength: 50,
  });

  const [squadsState, setSquadsState] = useState(
    new GameEngine().squads
  );
  const [rallyHornTimer, setRallyHornTimer] = useState<number>(0);
  const [actionBanner, setActionBanner] = useState<string>('');

  // Line drawing in-progress
  const isDrawingRef = useRef<boolean>(false);
  const drawnStrokeRef = useRef<Point[]>([]);

  // 1. Initialize Engine & Check ?autostart=1
  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    // Check query param ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
      document.body.dataset.state = 'playing';
    } else {
      document.body.dataset.state = 'title';
    }

    // Engine callbacks
    engine.onWaveComplete = () => {
      setWaveClearedNumber(engine.stats.wave);
      setGameState('reinforcement');
      document.body.dataset.state = 'playing';
    };

    engine.onGameOver = (won: boolean) => {
      setGameState(won ? 'victory' : 'gameover');
      document.body.dataset.state = 'gameover';
    };

    return () => {
      engineRef.current = null;
    };
  }, []);

  // Sync document.body.dataset.state
  useEffect(() => {
    if (gameState === 'title') {
      document.body.dataset.state = 'title';
    } else if (gameState === 'paused') {
      document.body.dataset.state = 'paused';
    } else if (gameState === 'victory' || gameState === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [gameState]);

  // 2. Setup Canvas & 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed world buffer coordinates (1200 x 700)
    canvas.width = 1200;
    canvas.height = 700;

    const renderer = new GameRenderer(ctx, 1200, 700);
    rendererRef.current = renderer;

    let lastTime = performance.now();
    let animFrameId: number;
    let hudThrottleTimer = 0;

    const loop = (currentTime: number) => {
      const rawDt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const dt = Math.min(rawDt, 0.05);

      const engine = engineRef.current;
      if (engine && gameState === 'playing') {
        engine.update(dt * gameSpeed);
      }

      // Render 60 FPS Canvas
      if (engine && renderer) {
        renderer.render(
          engine.units,
          engine.projectiles,
          engine.particles,
          engine.floatingTexts,
          drawnStrokeRef.current,
          selectedSquad,
          engine.goldRings,
          currentTime / 1000
        );
      }

      // Throttled HUD update (10 Hz)
      hudThrottleTimer += dt;
      if (hudThrottleTimer >= 0.1 && engine) {
        hudThrottleTimer = 0;
        setHudStats({ ...engine.stats });
        setSquadsState({ ...engine.squads });
        setRallyHornTimer(engine.rallyHornTimer);
        setActionBanner(engine.actionBanner);
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, gameSpeed, selectedSquad]);

  // 3. Pointer & Line Drawing Handlers
  const screenToWorld = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1200 / rect.width;
    const scaleY = 700 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const pt = screenToWorld(e.clientX, e.clientY);
    isDrawingRef.current = true;
    drawnStrokeRef.current = [pt];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || gameState !== 'playing') return;
    const pt = screenToWorld(e.clientX, e.clientY);
    const last = drawnStrokeRef.current[drawnStrokeRef.current.length - 1];
    if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 10) {
      drawnStrokeRef.current.push(pt);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const stroke = drawnStrokeRef.current;
    drawnStrokeRef.current = [];

    if (stroke.length >= 2 && engineRef.current && selectedSquad) {
      engineRef.current.applyDrawnLineToSquad(selectedSquad, stroke);
    }
  };

  // 4. Keyboard Shortcuts Hub
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setGameState('playing');
        }
        return;
      }

      if (e.key === '1') {
        setSelectedSquad('shield');
        soundEngine.playClick();
      } else if (e.key === '2') {
        setSelectedSquad('archer');
        soundEngine.playClick();
      } else if (e.key === '3') {
        setSelectedSquad('cavalry');
        soundEngine.playClick();
      } else if (e.key === 't' || e.key === 'T') {
        engineRef.current?.toggleShieldStance();
      } else if (e.key === 'v' || e.key === 'V') {
        engineRef.current?.triggerTargetedVolley();
      } else if (e.key === 'h' || e.key === 'H') {
        engineRef.current?.triggerRallyHorn();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => {
          const next = !prev;
          soundEngine.isMuted = next;
          return next;
        });
      } else if (e.key === 'r' || e.key === 'R') {
        engineRef.current?.resetGame();
        setGameState('playing');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Handlers
  const handleStartGame = () => {
    soundEngine.playClick();
    engineRef.current?.resetGame();
    setGameState('playing');
  };

  const handleRestart = () => {
    soundEngine.playClick();
    engineRef.current?.resetGame();
    setGameState('playing');
  };

  const handleTogglePause = () => {
    setGameState((prev) => (prev === 'playing' ? 'paused' : 'playing'));
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.isMuted = next;
      return next;
    });
  };

  const handleToggleSpeed = () => {
    setGameSpeed((prev) => (prev === 1 ? 2 : 1));
  };

  const handleSelectPerk = (perkId: string) => {
    soundEngine.playClick();
    engineRef.current?.applyReinforcement(perkId);
    setGameState('playing');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-sky-200 via-amber-50 to-emerald-100 flex items-center justify-center font-sans">
      {/* 1. Canvas Viewport (1200x700 aspect ratio) */}
      <div className="relative w-full h-full max-w-[1440px] max-h-[840px] flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full object-contain rounded-2xl shadow-2xl border-4 border-amber-400/90 ring-4 ring-amber-300/40 touch-none cursor-crosshair"
        />

        {/* 2. Tactical HUD (Active while playing or paused) */}
        {gameState !== 'title' && (
          <HUD
            stats={hudStats}
            squads={squadsState}
            selectedSquad={selectedSquad}
            onSelectSquad={setSelectedSquad}
            onToggleStance={() => engineRef.current?.toggleShieldStance()}
            onTriggerVolley={() => engineRef.current?.triggerTargetedVolley()}
            onTriggerRallyHorn={() => engineRef.current?.triggerRallyHorn()}
            rallyHornTimer={rallyHornTimer}
            rallyHornCooldown={engineRef.current?.rallyHornCooldown ?? 12}
            actionBanner={actionBanner}
            isPaused={gameState === 'paused'}
            onTogglePause={handleTogglePause}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            gameSpeed={gameSpeed}
            onToggleSpeed={handleToggleSpeed}
            onOpenGuide={() => setShowGuide(true)}
            onRestart={handleRestart}
          />
        )}

        {/* 3. Title Screen Overlay */}
        {gameState === 'title' && (
          <TitleScreen
            onStart={handleStartGame}
            onOpenGuide={() => setShowGuide(true)}
          />
        )}

        {/* 4. Pause Modal */}
        {gameState === 'paused' && (
          <PauseModal
            onResume={() => setGameState('playing')}
            onRestart={handleRestart}
            onTitle={() => setGameState('title')}
          />
        )}

        {/* 5. Victory Modal */}
        {gameState === 'victory' && (
          <VictoryModal
            stats={hudStats}
            onRestart={handleRestart}
          />
        )}

        {/* 6. Game Over Modal */}
        {gameState === 'gameover' && (
          <GameOverModal
            stats={hudStats}
            onRestart={handleRestart}
          />
        )}

        {/* 7. Between-Wave Tactical Reinforcements Modal */}
        {gameState === 'reinforcement' && (
          <ReinforcementModal
            waveCleared={waveClearedNumber}
            onSelectPerk={handleSelectPerk}
          />
        )}

        {/* 8. Tactical Guide Field Manual */}
        {showGuide && (
          <TacticalGuideModal onClose={() => setShowGuide(false)} />
        )}
      </div>
    </div>
  );
}
