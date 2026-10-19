/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Shield, Sparkles, BookOpen } from 'lucide-react';
import { MetaProgressionState } from '../game/types.ts';

interface TitleScreenProps {
  onStart: () => void;
  onOpenGuide: () => void;
  onOpenArmory?: () => void;
  meta?: MetaProgressionState;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenGuide,
  onOpenArmory,
  meta,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-5 sm:p-7 bg-gradient-to-b from-sky-400/90 via-amber-100/95 to-amber-200/95 text-stone-900 select-none backdrop-blur-sm">
      {/* Top Banner & Crest */}
      <div className="flex flex-col items-center mt-1 sm:mt-3">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-700 border-2 border-amber-300 flex items-center justify-center shadow-xl mb-2.5 ring-4 ring-amber-400/40">
          <Shield className="w-9 h-9 text-amber-300 drop-shadow" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-serif tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-950 via-indigo-900 to-amber-900 drop-shadow text-center">
          TACTICAL MEDIEVAL SKIRMISH
        </h1>
        <p className="text-xs sm:text-sm text-stone-700 max-w-xl text-center mt-1.5 font-sans font-medium leading-relaxed">
          Lead 105+ Blue Alliance micro-units against endless Red Barbarian Horde swarms. Grind War Gold, unlock Tier 3 Class Evolutions, and upgrade your Royal Armory!
        </p>

        {/* Persistent Career Grind Banner */}
        {meta && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 bg-white/90 border-2 border-amber-400 rounded-2xl px-4 py-1.5 shadow-md text-xs font-mono">
            <span className="font-black text-amber-900">🪙 {meta.warGold} War Gold</span>
            <span className="text-amber-400">·</span>
            <span className="font-bold text-stone-800">🏆 Best: Wave {meta.highestWave}</span>
            <span className="text-amber-400">·</span>
            <span className="font-bold text-rose-800">💀 {meta.totalKills} Slain</span>
            <span className="text-amber-400">·</span>
            <span className="font-bold text-blue-800">👑 {meta.victories} Wins</span>
          </div>
        )}
      </div>

      {/* Feature Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl w-full my-2">
        <div className="bg-white/95 border-2 border-blue-400 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-lg">
          <div className="text-2xl mb-1">🛡️</div>
          <h2 className="font-serif font-black text-blue-900 text-sm mb-0.5">
            Multi-Rank Phalanx
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Draw defensive lines across the open plain to form tight 3-rank blocks. Evolve into Halberdiers or Pavise Guard at Tier 3!
          </p>
        </div>

        <div className="bg-white/95 border-2 border-sky-400 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-lg">
          <div className="text-2xl mb-1">🏹</div>
          <h2 className="font-serif font-black text-sky-900 text-sm mb-0.5">
            Longbow vs. Alchemist
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Stationary Archers gain +30% Planted range. Choose Longbow Snipers (2x Boss/Pierce) or Alchemist Crossbows (Napalm AoE)!
          </p>
        </div>

        <div className="bg-white/95 border-2 border-amber-400 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-lg">
          <div className="text-2xl mb-1">🏰</div>
          <h2 className="font-serif font-black text-amber-900 text-sm mb-0.5">
            Royal Armory & Endless
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Earn persistent War Gold from every kill and wave bounty. Upgrade 6 permanent perks (Lv 1–10) and push into Endless Crusade!
          </p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col items-center space-y-2.5 mb-1">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            data-start="true"
            onClick={onStart}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-serif font-black text-base sm:text-lg rounded-2xl border-2 border-amber-300 ring-4 ring-amber-400/40 shadow-2xl transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>SOUND THE CALL TO ARMS</span>
          </button>

          {onOpenArmory && (
            <button
              type="button"
              onClick={onOpenArmory}
              className="px-5 py-3 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-amber-950 font-serif font-black text-sm sm:text-base rounded-2xl border-2 border-amber-600 shadow-xl transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2"
            >
              <span>🏰</span>
              <span>ROYAL ARMORY</span>
              {meta && (
                <span className="bg-amber-950 text-amber-200 font-mono text-xs px-2 py-0.5 rounded-lg">
                  🪙 {meta.warGold}
                </span>
              )}
            </button>
          )}
        </div>

        <button
          onClick={onOpenGuide}
          className="px-4 py-1 text-xs text-amber-900 font-bold hover:text-blue-900 flex items-center space-x-1.5 transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>View Tactical Field Manual</span>
        </button>
      </div>

      {/* Control Hint in bottom safe margin */}
      <div className="text-[11px] text-stone-600 font-mono font-medium tracking-wide text-center">
        1/2/3 Squads · Drag to Draw Lines · [T] Stance · [V] Volley · [F] Flame Arrows · [B] Spikes · [H] Rally Horn · [Space] Focus Mode
      </div>
    </div>
  );
};
