/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine.ts';
import { GameRenderer } from './game/renderer.ts';
import { soundEngine } from './game/audio.ts';
import {
  SquadType,
  SquadSpecialization,
  Point,
  MetaProgressionState,
  MetaUpgradeId,
} from './game/types.ts';
import { loadMetaProgression } from './game/rules.ts';
import { HUD } from './components/HUD.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import {
  PauseModal,
  VictoryModal,
  GameOverModal,
  ReinforcementModal,
  TacticalGuideModal,
  RoyalArmoryModal,
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
  const [showArmory, setShowArmory] = useState<boolean>(false);
  const [metaState, setMetaState] = useState<MetaProgressionState>(() =>
    loadMetaProgression()
  );
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

  // 2. High-DPI Resolution & Resize Management (Dynamic DPR Buffer matching Viewport)
  const updateCanvasResolution = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Device Pixel Ratio (e.g. 2 for Retina, 1.5, 3)
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const physicalWidth = Math.round(rect.width * dpr);
    const physicalHeight = Math.round(rect.height * dpr);

    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
    }

    const scaleX = physicalWidth / 1200;
    const scaleY = physicalHeight / 700;

    if (!rendererRef.current) {
      rendererRef.current = new GameRenderer(ctx, physicalWidth, physicalHeight, scaleX, scaleY);
    } else {
      rendererRef.current.resize(physicalWidth, physicalHeight, scaleX, scaleY);
    }
  }, []);

  // ResizeObserver + window resize listener to keep buffer matching physical display pixels at all times
  useEffect(() => {
    updateCanvasResolution();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      updateCanvasResolution();
    });
    ro.observe(canvas);

    window.addEventListener('resize', updateCanvasResolution);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateCanvasResolution);
    };
  }, [updateCanvasResolution]);

  // 3. Setup 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!rendererRef.current) {
      updateCanvasResolution();
    }

    let lastTime = performance.now();
    let animFrameId: number;
    let hudThrottleTimer = 0;

    const loop = (currentTime: number) => {
      const rawDt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const dt = Math.min(rawDt, 0.05);

      const engine = engineRef.current;
      if (engine && gameState === 'playing') {
        const effectiveSpeed = engine.isTacticalFocus ? 0.25 : gameSpeed;
        engine.update(dt * effectiveSpeed);
      }

      // Render 60 FPS Canvas with High-DPI buffer
      if (engine && rendererRef.current) {
        rendererRef.current.render(
          engine.units,
          engine.projectiles,
          engine.particles,
          engine.floatingTexts,
          drawnStrokeRef.current,
          selectedSquad,
          engine.goldRings,
          currentTime / 1000,
          engine.barricades,
          engine.isTacticalFocus,
          engine.groundDecals,
          engine.shakeIntensity
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
        setMetaState({
          ...engine.meta,
          upgrades: { ...engine.meta.upgrades },
        });
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, gameSpeed, selectedSquad, updateCanvasResolution]);

  // 4. Pointer & Line Drawing Handlers with dynamic viewport scaling
  const screenToWorld = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 20, y: 78 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 20, y: 78 };
    const scaleX = 1200 / rect.width;
    const scaleY = 700 / rect.height;
    return {
      x: Math.max(20, Math.min(1180, (clientX - rect.left) * scaleX)),
      y: Math.max(78, Math.min(545, (clientY - rect.top) * scaleY)),
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
      } else if (e.key === '4' || e.key === 'h' || e.key === 'H') {
        engineRef.current?.triggerRallyHorn();
      } else if (e.key === 't' || e.key === 'T') {
        engineRef.current?.toggleShieldStance();
      } else if (e.key === 'v' || e.key === 'V') {
        engineRef.current?.triggerTargetedVolley();
      } else if (e.key === 'f' || e.key === 'F') {
        engineRef.current?.toggleFireArrows();
      } else if (e.key === 'b' || e.key === 'B') {
        engineRef.current?.deployBarricade();
      } else if (e.key === 'd' || e.key === 'D') {
        engineRef.current?.commandArmyDefend();
      } else if (e.key === 'a' || e.key === 'A') {
        engineRef.current?.commandArmyAttack();
      } else if (e.key === ' ') {
        e.preventDefault();
        engineRef.current?.toggleTacticalFocus();
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

  const handlePurchaseUpgrade = (id: MetaUpgradeId) => {
    if (engineRef.current?.purchaseMetaUpgrade(id)) {
      setMetaState({
        ...engineRef.current.meta,
        upgrades: { ...engineRef.current.meta.upgrades },
        selectedSpecialists: { ...(engineRef.current.meta.selectedSpecialists ?? {}) },
      });
    }
  };

  const handleSelectSpecialist = (squad: SquadType, spec: SquadSpecialization | null) => {
    if (!engineRef.current) return;
    engineRef.current.selectSquadSpecialization(squad, spec);
    setMetaState({
      ...engineRef.current.meta,
      upgrades: { ...engineRef.current.meta.upgrades },
      selectedSpecialists: { ...(engineRef.current.meta.selectedSpecialists ?? {}) },
    });
    setSquadsState({
      shield: { ...engineRef.current.squads.shield },
      archer: { ...engineRef.current.squads.archer },
      cavalry: { ...engineRef.current.squads.cavalry },
    });
  };

  const handleContinueEndless = () => {
    soundEngine.playClick();
    engineRef.current?.startEndlessCrusade();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-sky-200 via-amber-50 to-emerald-100 flex items-center justify-center font-sans">
      {/* 1. Canvas Viewport (1200x700 aspect ratio strictly preserved) */}
      <div className="relative w-full h-full max-w-[1440px] max-h-[840px] flex items-center justify-center p-2 sm:p-4">
        <div
          className="relative w-full max-h-full max-w-full flex items-center justify-center"
          style={{
            aspectRatio: '1200 / 700',
            width: 'min(100%, calc((100vh - 2rem) * 1200 / 700))',
          }}
        >
          <canvas
            ref={canvasRef}
            data-testid="game-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full block rounded-2xl shadow-2xl border-4 border-amber-400/90 ring-4 ring-amber-300/40 touch-none cursor-crosshair crisp-canvas"
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
              gameSpeed={engineRef.current?.isTacticalFocus ? 0.25 : gameSpeed}
              onToggleSpeed={handleToggleSpeed}
              onOpenGuide={() => setShowGuide(true)}
              onRestart={handleRestart}
              fireArrowsActive={engineRef.current?.fireArrowsActive ?? false}
              onToggleFireArrows={() => engineRef.current?.toggleFireArrows()}
              barricadeStock={engineRef.current?.barricadeStock ?? 0}
              onDeployBarricade={() => engineRef.current?.deployBarricade()}
              isTacticalFocus={engineRef.current?.isTacticalFocus ?? false}
              onToggleTacticalFocus={() => engineRef.current?.toggleTacticalFocus()}
              onSelectSpecialization={(squad, spec) =>
                engineRef.current?.selectSquadSpecialization(squad, spec)
              }
              warGold={metaState.warGold}
              onOpenArmory={() => setShowArmory(true)}
              armyOrder={engineRef.current?.armyOrder ?? 'defend'}
              onArmyDefend={() => engineRef.current?.commandArmyDefend()}
              onArmyAttack={() => engineRef.current?.commandArmyAttack()}
            />
          )}

          {/* 3. Title Screen Overlay */}
          {gameState === 'title' && (
            <TitleScreen
              onStart={handleStartGame}
              onOpenGuide={() => setShowGuide(true)}
              onOpenArmory={() => setShowArmory(true)}
              meta={metaState}
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
              onContinueEndless={handleContinueEndless}
              onOpenArmory={() => setShowArmory(true)}
            />
          )}

          {/* 6. Game Over Modal */}
          {gameState === 'gameover' && (
            <GameOverModal
              stats={hudStats}
              onRestart={handleRestart}
              onOpenArmory={() => setShowArmory(true)}
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

          {/* 9. Royal Armory Permanent Meta-Progression & Squad Specialist Modal */}
          {showArmory && (
            <RoyalArmoryModal
              meta={metaState}
              onUpgrade={handlePurchaseUpgrade}
              onSelectSpecialist={handleSelectSpecialist}
              activeSpecialists={{
                shield:
                  squadsState.shield.specialization ??
                  metaState.selectedSpecialists?.shield ??
                  null,
                archer:
                  squadsState.archer.specialization ??
                  metaState.selectedSpecialists?.archer ??
                  null,
                cavalry:
                  squadsState.cavalry.specialization ??
                  metaState.selectedSpecialists?.cavalry ??
                  null,
              }}
              onClose={() => setShowArmory(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
