/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { SquadType, SquadData, SquadSpecialization, GameStateStats } from '../game/types.ts';
import { SQUAD_SPECIALIZATIONS } from '../game/rules.ts';

// Compact sharp medieval vector SVG icons (~35% more compact) for bottom command dock
const ShieldCardIcon = () => (
  <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-0.5 filter drop-shadow" fill="none" aria-hidden="true">
    <path
      d="M16 2.5 L27 6.5 C27 16 23 24.5 16 29.5 C9 24.5 5 16 5 6.5 Z"
      fill="url(#shieldCardGrad)"
      stroke="#facc15"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M16 4.5 L24.5 7.8 C24.5 15.2 21.5 22.2 16 26.5 C10.5 22.2 7.5 15.2 7.5 7.8 Z"
      fill="#1d4ed8"
      stroke="#3b82f6"
      strokeWidth="1"
    />
    <path d="M14 8 H18 V23 H14 Z" fill="#ffffff" />
    <path d="M10 11.5 H22 V15.5 H10 Z" fill="#ffffff" />
    <circle cx="16" cy="13.5" r="2.2" fill="#fde047" stroke="#ca8a04" strokeWidth="0.8" />
    <defs>
      <linearGradient id="shieldCardGrad" x1="5" y1="2.5" x2="27" y2="29.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563eb" />
        <stop offset="1" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
  </svg>
);

const ArcherCardIcon: React.FC<{ specialization?: SquadSpecialization | null }> = ({
  specialization,
}) => {
  if (specialization === 'alchemist') {
    return (
      <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-0.5 filter drop-shadow" fill="none" aria-hidden="true">
        <circle cx="16" cy="18" r="10" fill="rgba(74, 222, 128, 0.28)" />
        <rect x="13.5" y="4" width="5" height="4" rx="1" fill="#a16207" stroke="#fde047" strokeWidth="0.9" />
        <path
          d="M13 8 H19 L23.5 16.5 C25 20.5 22 26 16 26 C10 26 7 20.5 8.5 16.5 Z"
          fill="#16a34a"
          stroke="#dcfce7"
          strokeWidth="1.4"
        />
        <circle cx="16" cy="19" r="4.8" fill="#4ade80" />
        <circle cx="14.5" cy="17.2" r="1.8" fill="#bef264" />
      </svg>
    );
  }
  if (specialization === 'longbow') {
    return (
      <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-0.5 filter drop-shadow" fill="none" aria-hidden="true">
        <rect x="4.5" y="8" width="6" height="19" rx="1.2" fill="#78350f" stroke="#facc15" strokeWidth="1.1" />
        <line x1="6.5" y1="8" x2="5.5" y2="2" stroke="#f8fafc" strokeWidth="1.5" />
        <line x1="8.8" y1="8" x2="9.5" y2="1.5" stroke="#fde047" strokeWidth="1.5" />
        <path d="M18 2 C25 8 25 24 18 30" stroke="#facc15" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="18" y1="2" x2="18" y2="30" stroke="#f8fafc" strokeWidth="1.1" />
        <line x1="14" y1="16" x2="29" y2="16" stroke="#fef08a" strokeWidth="2" />
        <path d="M29 16 L24.5 13.2 L26 16 L24.5 18.8 Z" fill="#fef08a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-0.5 filter drop-shadow" fill="none" aria-hidden="true">
      <path
        d="M8 4 C15 7 21 12 21 16 C21 20 15 25 8 28 C9.5 25 11 21 11 16 C11 11 9.5 7 8 4 Z"
        fill="#b45309"
        stroke="#78350f"
        strokeWidth="1.2"
      />
      <path d="M8 4 L6.5 2.5 M8 28 L6.5 29.5" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 2.5 L14 16 L6.5 29.5" stroke="#f8fafc" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 16 L29 16" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 16 L24 13 L25.5 16 L24 19 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
      <path d="M14 16 L10 13 M14 16 L10 19 M12 16 L8 13.5 M12 16 L8 18.5" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const CavalryCardIcon = () => (
  <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-0.5 filter drop-shadow" fill="none" aria-hidden="true">
    <path
      d="M6 28 C7 21 9 14 15 9 C17 6 20 4 23 4 C24 4 25 5 25 6 C25 8 23 9 22 11 L27 12 C28.5 12.5 29 14 28 15.5 L24.5 19 C23 20.5 21 21 19 21.5 L16.5 28 Z"
      fill="#451a03"
      stroke="#78350f"
      strokeWidth="1.2"
    />
    <path
      d="M17 9 L22 6 L26 12 L22 15 Z"
      fill="#94a3b8"
      stroke="#e2e8f0"
      strokeWidth="1"
    />
    <path d="M20 5 L21 2 L22 5" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="21" cy="10.5" r="1.3" fill="#0f172a" />
    <path d="M22 15 L26 13 M18 13 L22 15 L14 23" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="22" cy="15" r="1.8" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
  </svg>
);

const RallyHornCardIcon = () => (
  <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-5.5 sm:h-5.5 mb-0.5 filter drop-shadow" fill="none" aria-hidden="true">
    <path
      d="M5 24 C8 24 12 21 16 16 C20 11 23 7 28 6 C29 7.5 29 10 27 12 C22 16 17 21 11 25 C8 27 5.5 26.5 5 24 Z"
      fill="url(#hornCardGrad)"
      stroke="#b45309"
      strokeWidth="1.2"
    />
    <ellipse cx="27.5" cy="9" rx="2" ry="4" transform="rotate(-30 27.5 9)" fill="#ca8a04" stroke="#facc15" strokeWidth="1" />
    <rect x="3.5" y="23" width="2.5" height="3" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
    <path d="M13 18.5 L15 16 M18 13.5 L20 11" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M13 20 L13 28 L17 25.5 L21 28 L21 14.5"
      fill="#ef4444"
      stroke="#b91c1c"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <circle cx="17" cy="22" r="1.5" fill="#facc15" />
    <defs>
      <linearGradient id="hornCardGrad" x1="5" y1="24" x2="28" y2="6" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.5" stopColor="#facc15" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
    </defs>
  </svg>
);

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
  fireArrowsActive?: boolean;
  onToggleFireArrows?: () => void;
  barricadeStock?: number;
  onDeployBarricade?: () => void;
  isTacticalFocus?: boolean;
  onToggleTacticalFocus?: () => void;
  onSelectSpecialization?: (squad: SquadType, spec: SquadSpecialization) => void;
  warGold?: number;
  onOpenArmory?: () => void;
  armyOrder?: 'defend' | 'attack';
  onArmyDefend?: () => void;
  onArmyAttack?: () => void;
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
  fireArrowsActive = false,
  onToggleFireArrows,
  barricadeStock = 3,
  onDeployBarricade,
  isTacticalFocus = false,
  onToggleTacticalFocus,
  onSelectSpecialization,
  warGold = 0,
  onOpenArmory,
  armyOrder = 'defend',
  onArmyDefend,
  onArmyAttack,
}) => {
  const getXpPct = (sq: SquadData) => {
    if (sq.tier >= 3) return 100;
    if (sq.tier === 2) return Math.min(100, Math.max(0, ((sq.xp - 100) / 150) * 100));
    return Math.min(100, Math.max(0, (sq.xp / 100) * 100));
  };
  const pendingEvolutionSquad: SquadType | null = squads.shield.pendingEvolution
    ? 'shield'
    : squads.archer.pendingEvolution
    ? 'archer'
    : squads.cavalry.pendingEvolution
    ? 'cavalry'
    : null;
  const activeSquadLabel =
    selectedSquad === 'shield'
      ? 'SHIELDS [1]'
      : selectedSquad === 'archer'
      ? 'ARCHERS [2]'
      : selectedSquad === 'cavalry'
      ? 'CAVALRY [3]'
      : 'SELECT SQUAD';

  const archerCooldownPct =
    squads.archer.cooldownTimer > 0
      ? Math.min(100, (squads.archer.cooldownTimer / squads.archer.cooldownMax) * 100)
      : 0;

  const rallyCooldownPct =
    rallyHornTimer > 0
      ? Math.min(100, (rallyHornTimer / Math.max(1, rallyHornCooldown)) * 100)
      : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pt-2 pb-1 px-2.5 sm:px-3.5 select-none">
      {/* ================= TOP BAR ================= */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Wave Pill + Live War Gold Counter */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="bg-white/95 border-2 border-amber-400 rounded-xl px-3 py-1 flex items-center space-x-1.5 shadow-md backdrop-blur-sm">
            <span className="text-amber-900 font-black text-xs sm:text-sm tracking-wide font-sans">
              {stats.isEndless ? `∞ Wave ${stats.wave}` : `Wave ${stats.wave}`}
            </span>
            <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[11px] shadow-inner">
              {stats.isEndless ? '🔥' : '🛡️'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenArmory}
            className="bg-gradient-to-r from-amber-300 to-yellow-200 hover:from-amber-200 hover:to-yellow-100 border-2 border-amber-500 rounded-xl px-2.5 py-1 flex items-center space-x-1 shadow-md transition cursor-pointer"
            title="Open Royal Armory (Permanent Meta-Upgrades)"
          >
            <span className="text-xs">🪙</span>
            <span className="font-mono font-black text-xs sm:text-sm text-amber-950">
              {warGold}
            </span>
          </button>
        </div>

        {/* Top-Center: Dual-Capsule Tug of War + DRAW FORMATION Active Squad Banner */}
        <div className="flex flex-col items-center">
          <div className="flex items-center shadow-lg filter drop-shadow">
            {/* Blue Allies Count */}
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white px-3.5 sm:px-5 py-1 rounded-l-full font-bold flex items-center space-x-1.5 text-xs sm:text-sm shadow-inner min-w-[78px] sm:min-w-[95px] justify-center border-t border-b border-l border-sky-300">
              <span className="text-sm">🛡️</span>
              <span className="font-mono text-sm sm:text-base font-black">
                {squads.shield.count + squads.archer.count + squads.cavalry.count}
              </span>
            </div>

            {/* VS Circle */}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-300 text-amber-950 font-black text-[10px] sm:text-[11px] flex items-center justify-center -mx-2 z-10 shadow-md border-2 border-white ring-2 ring-amber-400/50">
              VS
            </div>

            {/* Red Enemies Count */}
            <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-3.5 sm:px-5 py-1 rounded-r-full font-bold flex items-center space-x-1.5 text-xs sm:text-sm shadow-inner min-w-[78px] sm:min-w-[95px] justify-center border-t border-b border-r border-rose-300">
              <span className="font-mono text-sm sm:text-base font-black">
                {stats.activeEnemiesCount ?? (stats.redStrength > 0 ? Math.max(1, Math.round(stats.redStrength * 2)) : 0)}
              </span>
              <span className="text-sm">💀</span>
            </div>
          </div>

          {/* Action Banner / DRAW FORMATION with Highlighted Active Squad */}
          <div className="mt-1">
            <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-extrabold text-[10px] sm:text-[11px] uppercase px-3.5 py-0.5 rounded-full shadow-md tracking-wider border border-white/90 flex items-center space-x-1.5">
              <span>{actionBanner || `DRAW FORMATION · ${activeSquadLabel}`}</span>
            </div>
          </div>
        </div>

        {/* Top-Right: Playback Controls */}
        <div className="pointer-events-auto flex items-center space-x-1 bg-white/95 border-2 border-amber-300 rounded-xl p-1 shadow-md backdrop-blur-sm">
          <button
            onClick={onToggleSpeed}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Simulation Speed"
            aria-label="Toggle Simulation Speed"
          >
            {gameSpeed}x
          </button>

          <button
            onClick={onTogglePause}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Pause / Resume"
            aria-label="Pause or Resume"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-900" />}
          </button>

          <button
            onClick={onToggleMute}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Sound"
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-stone-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-900" />}
          </button>

          {onOpenArmory && (
            <button
              onClick={onOpenArmory}
              className="px-2 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-xs"
              title="Royal Armory (Permanent Meta-Upgrades)"
              aria-label="Open Royal Armory"
            >
              <span>🏰</span>
              <span className="hidden sm:inline">Armory</span>
            </button>
          )}

          <button
            onClick={onOpenGuide}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-950 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Tactical Field Manual"
            aria-label="Open Tactical Field Manual"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRestart}
            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-950 border border-amber-200 flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Restart"
            aria-label="Restart Skirmish"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= COMPACT BOTTOM COMMAND DOCK (~35% Reduced Height, Docked Cleanly) ================= */}
      <div className="self-center flex flex-col items-center gap-1">
        {/* Tier 3 Elite Class Evolution Choice Bar (Appears when a squad reaches Tier 3 Elite) */}
        {pendingEvolutionSquad && onSelectSpecialization && (
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400 rounded-2xl shadow-xl ring-2 ring-amber-300/60 animate-pulse">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">
              👑 {squads[pendingEvolutionSquad].name} Tier 3 Evolution:
            </span>
            {SQUAD_SPECIALIZATIONS[pendingEvolutionSquad].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectSpecialization(pendingEvolutionSquad, opt.id)}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-[10px] sm:text-[11px] border border-yellow-200 shadow-md transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1"
                title={opt.description}
              >
                <span>{opt.icon}</span>
                <span>{opt.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Compact Tactical Actions Tray: Whole-Army Defend/Attack, Flame Arrows, Barricades, Focus Mode */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-0.5 bg-white/95 border border-amber-300 rounded-full shadow-sm backdrop-blur-sm">
          {/* Whole-Army DEFEND Button [D] */}
          <button
            type="button"
            onClick={onArmyDefend}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center space-x-1 transition cursor-pointer border ${
              armyOrder === 'defend'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-sky-300 shadow-xs ring-2 ring-sky-400/60'
                : 'bg-slate-100 hover:bg-blue-50 text-slate-700 border-slate-300'
            }`}
            title="Command Whole Army to Hold & Brace Defensive Formations [D]"
          >
            <span>🛡️ Defend All [D]</span>
          </button>

          {/* Whole-Army ATTACK Button [A] */}
          <button
            type="button"
            onClick={onArmyAttack}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center space-x-1 transition cursor-pointer border ${
              armyOrder === 'attack'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-300 shadow-xs ring-2 ring-red-400/60 animate-pulse'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300'
            }`}
            title="Command Whole Army to Charge & Attack Enemy Horde [A]"
          >
            <span>⚔️ Attack All [A]</span>
          </button>

          <div className="h-3.5 w-px bg-amber-300 mx-0.5" />

          {/* Flame Arrows Toggle */}
          <button
            type="button"
            onClick={onToggleFireArrows}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center space-x-1 transition cursor-pointer border ${
              fireArrowsActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-300 shadow-xs ring-2 ring-orange-400/50'
                : 'bg-amber-50 hover:bg-amber-100 text-stone-700 border-stone-200'
            }`}
            title="Toggle Flaming Pitch Arrows [F]"
          >
            <span>🔥 Flame Arrows [F]</span>
            <span
              className={`text-[9px] px-1.5 rounded-full font-bold ${
                fireArrowsActive ? 'bg-white text-orange-600' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {fireArrowsActive ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Spike Barricade Deploy */}
          <button
            type="button"
            onClick={onDeployBarricade}
            disabled={barricadeStock <= 0}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center space-x-1 transition cursor-pointer border ${
              barricadeStock > 0
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-xs'
                : 'bg-stone-200 text-stone-400 border-stone-300 cursor-not-allowed'
            }`}
            title="Deploy Wooden Spike Barricade [B]"
          >
            <span>🪵 Spikes [B]</span>
            <span className="text-[9px] px-1.5 rounded-full font-bold bg-amber-200 text-amber-900">
              {barricadeStock}
            </span>
          </button>

          {/* Tactical Focus Slow-Mo */}
          <button
            type="button"
            onClick={onToggleTacticalFocus}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center space-x-1 transition cursor-pointer border ${
              isTacticalFocus
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-300 shadow-xs ring-2 ring-sky-400/50'
                : 'bg-amber-50 hover:bg-amber-100 text-stone-700 border-stone-200'
            }`}
            title="Toggle 0.25x Cinematic Slow-Mo Tactical Planning [Space]"
          >
            <span>⏱️ Focus [Space]</span>
            <span
              className={`text-[9px] px-1.5 rounded-full font-bold ${
                isTacticalFocus ? 'bg-white text-sky-600' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isTacticalFocus ? '0.25x' : '1x'}
            </span>
          </button>
        </div>

        {/* 4 Compact Unit Command Cards with Hotkey Badges [1]-[4], Cooldown Overlays & Active Glow Borders */}
        <div className="pointer-events-auto flex items-center justify-center gap-2 sm:gap-2.5 px-2.5 py-1.5 bg-white/95 border-2 border-amber-400 rounded-2xl shadow-xl backdrop-blur-sm">
          {/* Card 1: Shields [1] */}
          <button
            type="button"
            onClick={() => {
              onSelectSquad('shield');
              onToggleStance();
            }}
            aria-label="Shields Stance"
            className={`relative overflow-hidden cursor-pointer rounded-xl py-1.5 px-2 w-20 sm:w-24 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 border-2 ${
              selectedSquad === 'shield'
                ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-amber-300 ring-3 ring-sky-300/80 shadow-[0_0_14px_rgba(56,189,248,0.85)] -translate-y-0.5'
                : 'bg-gradient-to-b from-blue-600 to-blue-800 border-blue-400/80 shadow-md opacity-95'
            }`}
          >
            <span className="absolute top-1 left-1.5 text-[9px] font-mono font-black px-1 rounded bg-slate-950/60 text-amber-300 border border-amber-400/40">
              [1]
            </span>
            <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-sky-100 flex items-center gap-0.5">
              {squads.shield.tier >= 2 && (
                <span className="text-amber-300 font-black">
                  {squads.shield.tier === 3 ? '⌃⌃' : '⌃'}
                </span>
              )}
              {squads.shield.count}
            </span>
            <ShieldCardIcon />
            <span className="text-white font-black text-[11px] sm:text-xs font-sans leading-tight drop-shadow">
              {squads.shield.specialization === 'halberdier'
                ? '🔱 Halberds'
                : squads.shield.specialization === 'pavise'
                ? '🛡️ Pavise'
                : 'Shields'}
            </span>
            <span className="text-amber-200 text-[9px] sm:text-[10px] font-bold leading-tight">
              {squads.shield.stance === 'braced' ? '🛡️ Braced' : '⚔️ Advance'}
            </span>
            {/* Micro Veterancy XP Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950/50">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-all duration-300"
                style={{ width: `${getXpPct(squads.shield)}%` }}
              />
            </div>
          </button>

          {/* Card 2: Archers [2] */}
          <button
            type="button"
            onClick={() => {
              onSelectSquad('archer');
              onTriggerVolley();
            }}
            aria-label="Archers Volley"
            className={`relative cursor-pointer rounded-xl py-1.5 px-2 w-20 sm:w-24 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 border-2 overflow-hidden ${
              selectedSquad === 'archer'
                ? 'bg-gradient-to-b from-indigo-500 to-purple-700 border-amber-300 ring-3 ring-purple-300/80 shadow-[0_0_14px_rgba(168,85,247,0.85)] -translate-y-0.5'
                : 'bg-gradient-to-b from-indigo-600 to-purple-800 border-indigo-400/80 shadow-md opacity-95'
            }`}
          >
            <span className="absolute top-1 left-1.5 z-10 text-[9px] font-mono font-black px-1 rounded bg-slate-950/60 text-amber-300 border border-amber-400/40">
              [2]
            </span>
            <span className="absolute top-1 right-1.5 z-10 text-[9px] font-mono font-bold text-indigo-100 flex items-center gap-0.5">
              {squads.archer.tier >= 2 && (
                <span className="text-amber-300 font-black">
                  {squads.archer.tier === 3 ? '⌃⌃' : '⌃'}
                </span>
              )}
              {squads.archer.count}
            </span>
            <ArcherCardIcon specialization={squads.archer.specialization} />
            <span className="text-white font-black text-[11px] sm:text-xs font-sans leading-tight drop-shadow">
              {squads.archer.specialization === 'longbow'
                ? '🎯 Longbows'
                : squads.archer.specialization === 'alchemist'
                ? '🧪 Alchemists'
                : 'Archers'}
            </span>
            <span className="text-indigo-100 text-[9px] sm:text-[10px] font-bold leading-tight">
              {squads.archer.cooldownTimer > 0
                ? `${squads.archer.cooldownTimer.toFixed(1)}s`
                : squads.archer.specialization === 'alchemist'
                ? '🧪 Volley (9s)'
                : '🏹 Volley (6s)'}
            </span>

            {/* Vertical Cooldown Progress Sweep */}
            {squads.archer.cooldownTimer > 0 && (
              <div
                className="absolute bottom-0 left-0 right-0 bg-slate-950/65 pointer-events-none transition-all duration-100 flex items-center justify-center"
                style={{ height: `${archerCooldownPct}%` }}
              />
            )}
            {/* Micro Veterancy XP Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950/50">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-all duration-300"
                style={{ width: `${getXpPct(squads.archer)}%` }}
              />
            </div>
          </button>

          {/* Card 3: Cavalry [3] */}
          <button
            type="button"
            onClick={() => onSelectSquad('cavalry')}
            aria-label="Cavalry Flank Path"
            className={`relative overflow-hidden cursor-pointer rounded-xl py-1.5 px-2 w-20 sm:w-24 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 border-2 ${
              selectedSquad === 'cavalry'
                ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-amber-300 ring-3 ring-cyan-300/85 shadow-[0_0_14px_rgba(34,211,238,0.85)] -translate-y-0.5'
                : 'bg-gradient-to-b from-sky-500 to-blue-700 border-sky-300/80 shadow-md opacity-95'
            }`}
          >
            <span className="absolute top-1 left-1.5 text-[9px] font-mono font-black px-1 rounded bg-slate-950/60 text-amber-300 border border-amber-400/40">
              [3]
            </span>
            <span className="absolute top-1 right-1.5 text-[9px] font-mono font-bold text-cyan-100 flex items-center gap-0.5">
              {squads.cavalry.tier >= 2 && (
                <span className="text-amber-300 font-black">
                  {squads.cavalry.tier === 3 ? '⌃⌃' : '⌃'}
                </span>
              )}
              {squads.cavalry.count}
            </span>
            <CavalryCardIcon />
            <span className="text-white font-black text-[11px] sm:text-xs font-sans leading-tight drop-shadow">
              {squads.cavalry.specialization === 'cataphract'
                ? '👑 Cataphract'
                : squads.cavalry.specialization === 'lancer'
                ? '⚡ Lancers'
                : 'Cavalry'}
            </span>
            <span className="text-cyan-100 text-[9px] sm:text-[10px] font-bold leading-tight">
              🐎 Flank Path
            </span>
            {/* Micro Veterancy XP Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950/50">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-all duration-300"
                style={{ width: `${getXpPct(squads.cavalry)}%` }}
              />
            </div>
          </button>

          {/* Card 4: Morale [4] */}
          <button
            type="button"
            onClick={onTriggerRallyHorn}
            disabled={rallyHornTimer > 0}
            aria-label="Morale Rally"
            className={`relative cursor-pointer rounded-xl py-1.5 px-2 w-20 sm:w-24 flex flex-col items-center justify-center transition-all duration-150 transform hover:scale-105 active:scale-95 border-2 overflow-hidden ${
              rallyHornTimer <= 0
                ? 'bg-gradient-to-b from-red-500 to-rose-700 border-amber-300 ring-2 ring-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.5)] hover:from-red-400 hover:to-rose-600'
                : 'bg-stone-700 border-stone-500 opacity-75 cursor-not-allowed text-stone-300'
            }`}
          >
            <span className="absolute top-1 left-1.5 z-10 text-[9px] font-mono font-black px-1 rounded bg-slate-950/60 text-amber-300 border border-amber-400/40">
              [4]
            </span>
            <span className="absolute top-1 right-1.5 z-10 text-[9px] font-mono font-bold text-amber-200">
              🎺
            </span>
            <RallyHornCardIcon />
            <span className="text-white font-black text-[11px] sm:text-xs font-sans leading-tight drop-shadow">
              Morale
            </span>
            <span className="text-rose-100 text-[9px] sm:text-[10px] font-bold leading-tight z-10">
              {rallyHornTimer > 0 ? `${rallyHornTimer.toFixed(1)}s` : '✨ Rally'}
            </span>

            {/* Vertical Cooldown Progress Sweep */}
            {rallyHornTimer > 0 && (
              <div
                className="absolute bottom-0 left-0 right-0 bg-slate-950/65 pointer-events-none transition-all duration-100"
                style={{ height: `${rallyCooldownPct}%` }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
