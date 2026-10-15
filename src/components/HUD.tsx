/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Shield,
  Target,
  Zap,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
  FastForward,
} from 'lucide-react';
import { SquadType, SquadData, GameStateStats, ShieldStance } from '../game/types.ts';
import { getVeterancyPerks } from '../game/rules.ts';

interface HUDProps {
  stats: GameStateStats;
  squads: Record<SquadType, SquadData>;
  selectedSquad: SquadType | null;
  onSelectSquad: (squad: SquadType) => void;
  onToggleStance: () => void;
  onTriggerVolley: () => void;
  onTriggerRallyHorn: () => void;
  rallyHornTimer: number;
  rallyHornCooldown: number;
  actionBanner: string;
  isPaused: boolean;
  onTogglePause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  gameSpeed: number;
  onToggleSpeed: () => void;
  onOpenGuide: () => void;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  squads,
  selectedSquad,
  onSelectSquad,
  onToggleStance,
  onTriggerVolley,
  onTriggerRallyHorn,
  rallyHornTimer,
  rallyHornCooldown,
  actionBanner,
  isPaused,
  onTogglePause,
  isMuted,
  onToggleMute,
  gameSpeed,
  onToggleSpeed,
  onOpenGuide,
  onRestart,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* ================= TOP BAR ================= */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Wave Pill (Crisp white & gold as in video) */}
        <div className="pointer-events-auto bg-white/95 border-2 border-amber-400 rounded-2xl px-4 py-2 flex items-center space-x-2 shadow-lg backdrop-blur-sm">
          <span className="text-amber-900 font-black text-sm sm:text-base tracking-wide font-sans">
            Wave {stats.wave}
          </span>
          <span className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-xs shadow-inner">
            🛡️
          </span>
        </div>

        {/* Top-Center: Dual-Capsule Tug of War + Action Banner */}
        <div className="flex flex-col items-center">
          {/* Dual Capsule */}
          <div className="flex items-center shadow-xl filter drop-shadow">
            {/* Blue Allies Count */}
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white px-4 sm:px-6 py-1.5 rounded-l-full font-bold flex items-center space-x-2 text-sm shadow-inner min-w-[85px] sm:min-w-[105px] justify-center border-t border-b border-l border-sky-300">
              <span className="text-base">🛡️</span>
              <span className="font-mono text-base font-black">
                {squads.shield.count + squads.archer.count + squads.cavalry.count}
              </span>
            </div>

            {/* VS Circle */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-300 text-amber-950 font-black text-[11px] sm:text-xs flex items-center justify-center -mx-2.5 z-10 shadow-lg border-2 border-white ring-2 ring-amber-400/50">
              VS
            </div>

            {/* Red Enemies Count */}
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-4 sm:px-6 py-1.5 rounded-r-full font-bold flex items-center space-x-2 text-sm shadow-inner min-w-[85px] sm:min-w-[105px] justify-center border-t border-b border-r border-rose-300">
              <span className="font-mono text-base font-black">
                {stats.redStrength > 0 ? Math.max(1, Math.round(stats.redStrength * 1.2)) : 0}
              </span>
              <span className="text-base">💀</span>
            </div>
          </div>

          {/* Action Banner Directly Below Tug of War */}
          <div className="mt-2.5">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold text-[11px] sm:text-xs uppercase px-5 py-1 rounded-full shadow-lg tracking-wider border-2 border-white flex items-center space-x-1.5">
              <span>{actionBanner || 'DRAW FORMATION'}</span>
            </div>
          </div>
        </div>

        {/* Top-Right: Playback Controls (Clean rounded bright pills) */}
        <div className="pointer-events-auto flex items-center space-x-1.5 bg-white/95 border-2 border-amber-300 rounded-2xl p-1.5 shadow-lg backdrop-blur-sm">
          <button
            onClick={onToggleSpeed}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center transition cursor-pointer shadow-sm"
            title="Simulation Speed"
            aria-label="Toggle Simulation Speed"
          >
            {gameSpeed}x
          </button>

          <button
            onClick={onTogglePause}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-sm"
            title="Pause / Resume"
            aria-label="Pause or Resume"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-600" /> : <Pause className="w-4 h-4 text-amber-900" />}
          </button>

          <button
            onClick={onToggleMute}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-sm"
            title="Sound"
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-amber-900" />}
          </button>

          <button
            onClick={onRestart}
            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-950 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-sm"
            title="Restart"
            aria-label="Restart Skirmish"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= BOTTOM COMMAND DOCK ================= */}
      {/* 4 Exact Rounded Cards from the video (Shields, Archers, Cavalry, Morale) */}
      <div className="pointer-events-auto self-center flex items-center justify-center gap-2.5 sm:gap-4 p-2.5 bg-white/95 border-2 border-amber-400 rounded-3xl shadow-2xl backdrop-blur-sm">
        {/* Card 1: Shields (Vibrant Royal Blue) */}
        <button
          type="button"
          onClick={() => {
            onSelectSquad('shield');
            onToggleStance();
          }}
          aria-label="Shields Stance"
          className={`cursor-pointer rounded-2xl p-2.5 sm:p-3 w-24 sm:w-28 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-lg border-2 ${
            selectedSquad === 'shield'
              ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-amber-300 ring-4 ring-amber-400/50'
              : 'bg-gradient-to-b from-blue-600 to-blue-800 border-blue-400'
          }`}
        >
          <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow">🛡️</span>
          <span className="text-white font-black text-xs sm:text-sm font-sans drop-shadow">
            Shields
          </span>
          <span className="text-sky-100 text-[10px] sm:text-[11px] font-bold mt-0.5">
            {squads.shield.stance === 'braced' ? 'Braced' : 'Advance'}
          </span>
        </button>

        {/* Card 2: Archers (Vibrant Indigo/Purple) */}
        <button
          type="button"
          onClick={() => {
            onSelectSquad('archer');
            onTriggerVolley();
          }}
          aria-label="Archers Volley"
          className={`cursor-pointer rounded-2xl p-2.5 sm:p-3 w-24 sm:w-28 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-lg border-2 relative overflow-hidden ${
            selectedSquad === 'archer'
              ? 'bg-gradient-to-b from-indigo-500 to-purple-700 border-amber-300 ring-4 ring-amber-400/50'
              : 'bg-gradient-to-b from-indigo-600 to-purple-800 border-indigo-400'
          }`}
        >
          <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow">🏹</span>
          <span className="text-white font-black text-xs sm:text-sm font-sans drop-shadow">
            Archers
          </span>
          <span className="text-indigo-100 text-[10px] sm:text-[11px] font-bold mt-0.5">
            Volley
          </span>

          {/* Cooldown indicator */}
          {squads.archer.cooldownTimer > 0 && (
            <div
              className="absolute inset-0 bg-indigo-950/75 flex items-center justify-center text-white font-bold text-xs"
            >
              {squads.archer.cooldownTimer.toFixed(1)}s
            </div>
          )}
        </button>

        {/* Card 3: Cavalry (Vibrant Sky Blue/Cyan) */}
        <button
          type="button"
          onClick={() => onSelectSquad('cavalry')}
          aria-label="Cavalry Flank Path"
          className={`cursor-pointer rounded-2xl p-2.5 sm:p-3 w-24 sm:w-28 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-lg border-2 ${
            selectedSquad === 'cavalry'
              ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-amber-300 ring-4 ring-amber-400/50'
              : 'bg-gradient-to-b from-sky-500 to-blue-700 border-sky-300'
          }`}
        >
          <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow">🐎</span>
          <span className="text-white font-black text-xs sm:text-sm font-sans drop-shadow">
            Cavalry
          </span>
          <span className="text-cyan-100 text-[10px] sm:text-[11px] font-bold mt-0.5">
            Flank Path
          </span>
        </button>

        {/* Card 4: Morale (Vibrant Crimson / Gold Rally) */}
        <button
          type="button"
          onClick={onTriggerRallyHorn}
          disabled={rallyHornTimer > 0}
          aria-label="Morale Rally"
          className={`cursor-pointer rounded-2xl p-2.5 sm:p-3 w-24 sm:w-28 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-lg border-2 relative overflow-hidden ${
            rallyHornTimer <= 0
              ? 'bg-gradient-to-b from-red-500 to-rose-700 border-amber-300 ring-2 ring-amber-400/40 hover:from-red-400 hover:to-rose-600'
              : 'bg-stone-300 border-stone-400 opacity-60 cursor-not-allowed text-stone-600'
          }`}
        >
          <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow">🎺</span>
          <span className="text-white font-black text-xs sm:text-sm font-sans drop-shadow">
            Morale
          </span>
          <span className="text-rose-100 text-[10px] sm:text-[11px] font-bold mt-0.5">
            {rallyHornTimer > 0 ? `${rallyHornTimer.toFixed(1)}s` : 'Rally'}
          </span>

          {/* Cooldown sweep */}
          {rallyHornTimer > 0 && (
            <div
              className="absolute inset-0 bg-stone-900/60"
              style={{
                width: `${(rallyHornTimer / rallyHornCooldown) * 100}%`,
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
};
