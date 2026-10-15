/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Shield, Sparkles, BookOpen } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  onOpenGuide: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenGuide }) => {
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
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-8 bg-gradient-to-b from-sky-400/90 via-amber-100/95 to-amber-200/95 text-stone-900 select-none backdrop-blur-sm">
      {/* Top Banner & Crest */}
      <div className="flex flex-col items-center mt-3 sm:mt-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-700 border-2 border-amber-300 flex items-center justify-center shadow-xl mb-3 ring-4 ring-amber-400/40">
          <Shield className="w-10 h-10 text-amber-300 drop-shadow" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-serif tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-950 via-indigo-900 to-amber-900 drop-shadow text-center">
          TACTICAL MEDIEVAL SKIRMISH
        </h1>
        <p className="text-xs sm:text-sm text-stone-700 max-w-xl text-center mt-2 font-sans font-medium leading-relaxed">
          Lead the Blue Alliance to victory against the Red Barbarian Horde. Master high-ground ballistic archery, line-drawn shield walls, and 5.0x cavalry shock flanking maneuvers.
        </p>
      </div>

      {/* Feature Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-w-4xl w-full my-3">
        <div className="bg-white/95 border-2 border-blue-400 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg">
          <div className="text-3xl mb-2">🛡️</div>
          <h2 className="font-serif font-black text-blue-900 text-sm mb-1">
            Line-Drawn Phalanx
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Draw defensive lines across defiles. Braced shield wall absorbs 75% arrow damage and physically shoves back charging infantry.
          </p>
        </div>

        <div className="bg-white/95 border-2 border-sky-400 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg">
          <div className="text-3xl mb-2">🏹</div>
          <h2 className="font-serif font-black text-sky-900 text-sm mb-1">
            Highland Ballistics
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Plateau elevation grants +30% range. Parabolic ballistic arrows soar safely over frontline shields with authentic trajectory arcs.
          </p>
        </div>

        <div className="bg-white/95 border-2 border-amber-400 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg">
          <div className="text-3xl mb-2">🐎</div>
          <h2 className="font-serif font-black text-amber-900 text-sm mb-1">
            Momentum & 5.0x Flank
          </h2>
          <p className="text-xs text-stone-600 font-medium">
            Draw freehand gallop routes through corridors. Build 2.5x momentum to shatter enemy flanks locked in combat for 5.0x criticals!
          </p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col items-center space-y-3 mb-2">
        <button
          data-start="true"
          onClick={onStart}
          className="px-10 py-3.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-serif font-black text-lg rounded-2xl border-2 border-amber-300 ring-4 ring-amber-400/40 shadow-2xl transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2.5"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>SOUND THE CALL TO ARMS</span>
        </button>

        <button
          onClick={onOpenGuide}
          className="px-4 py-1.5 text-xs text-amber-900 font-bold hover:text-blue-900 flex items-center space-x-1.5 transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>View Tactical Field Manual</span>
        </button>
      </div>

      {/* Control Hint in bottom safe margin */}
      <div className="text-[11px] text-stone-600 font-mono font-medium tracking-wide text-center">
        Press 1/2/3 to Select Squad · Drag Mouse to Draw Ranks or Cavalry Route · [T] Stance · [V] Volley · [H] Rally Horn · [Space/Enter] Start
      </div>
    </div>
  );
};
