/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Trophy,
  Skull,
  RotateCcw,
  Play,
  X,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { GameStateStats, ReinforcementPerk } from '../game/types.ts';
import { AVAILABLE_PERKS } from '../game/engine.ts';

// 1. PAUSE MODAL
export const PauseModal: React.FC<{
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}> = ({ onResume, onRestart, onTitle }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-amber-50 to-amber-100 border-2 border-amber-400 rounded-3xl max-w-sm w-full p-6 text-stone-900 shadow-2xl text-center ring-4 ring-amber-300/40">
        <h2 className="text-2xl font-serif font-black text-amber-950 mb-1">
          BATTLE PAUSED
        </h2>
        <p className="text-xs text-stone-600 mb-6 font-medium">
          The battle lines are frozen. Regroup and review your tactical strategy.
        </p>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-serif font-bold rounded-2xl border-2 border-amber-300 shadow-lg transition transform hover:scale-102 active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Play className="w-4 h-4 text-amber-300" />
            <span>Resume Battle [P / Esc]</span>
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-white hover:bg-amber-100 text-amber-900 font-bold rounded-2xl border-2 border-amber-300 transition flex items-center justify-center space-x-2 cursor-pointer text-sm shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Restart Skirmish</span>
          </button>
          <button
            onClick={onTitle}
            className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-2xl border border-amber-300 transition text-sm cursor-pointer shadow-sm"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. VICTORY MODAL
export const VictoryModal: React.FC<{
  stats: GameStateStats;
  onRestart: () => void;
}> = ({ stats, onRestart }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-amber-50 to-amber-100 border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 text-stone-900 shadow-2xl text-center ring-4 ring-amber-300/50">
        <div className="w-16 h-16 rounded-full bg-amber-300 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-amber-400/40">
          <Trophy className="w-8 h-8 text-amber-900 animate-pulse" />
        </div>

        <h2 className="text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-900 to-yellow-800 mb-1">
          DECISIVE VICTORY!
        </h2>
        <p className="text-xs text-stone-600 font-medium mb-6">
          The barbarian horde has broken upon the defile. The Blue Alliance claims glorious triumph!
        </p>

        {/* Mastery Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-white p-3 rounded-2xl border-2 border-amber-300 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-black tracking-wider">Time Elapsed</div>
            <div className="text-xl font-black font-mono text-amber-950">
              {Math.floor(stats.elapsedTime)}s
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border-2 border-blue-300 shadow-sm">
            <div className="text-[10px] text-blue-800 uppercase font-black tracking-wider">Total Score</div>
            <div className="text-xl font-black font-mono text-blue-900">
              {stats.score} PTS
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border-2 border-amber-300 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-black tracking-wider">Flanking Crits (5.0x)</div>
            <div className="text-xl font-black font-mono text-amber-950">
              {stats.flankingCrits}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border-2 border-sky-300 shadow-sm">
            <div className="text-[10px] text-sky-800 uppercase font-black tracking-wider">Arrows Deflected</div>
            <div className="text-xl font-black font-mono text-sky-900">
              {stats.arrowsDeflected}
            </div>
          </div>
        </div>

        <button
          data-start="true"
          onClick={onRestart}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-serif font-black text-lg rounded-2xl border-2 border-amber-300 shadow-xl ring-4 ring-amber-300/40 transition transform hover:scale-102 active:scale-98 cursor-pointer"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
};

// 3. GAME OVER MODAL (Defeat)
export const GameOverModal: React.FC<{
  stats: GameStateStats;
  onRestart: () => void;
}> = ({ stats, onRestart }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-rose-50 to-amber-50 border-2 border-rose-400 rounded-3xl max-w-md w-full p-6 text-stone-900 shadow-2xl text-center ring-4 ring-rose-300/40">
        <div className="w-16 h-16 rounded-full bg-rose-200 border-2 border-rose-400 flex items-center justify-center mx-auto mb-4 shadow">
          <Skull className="w-8 h-8 text-rose-700" />
        </div>

        <h2 className="text-3xl font-serif font-black text-rose-950 mb-1">
          THE DEFILE HAS FALLEN
        </h2>
        <p className="text-xs text-stone-600 font-medium mb-6">
          Your defense was breached by barbarian fury. Regroup your forces and sound the horn again!
        </p>

        {/* Progress Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-white p-3 rounded-2xl border-2 border-amber-300 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-bold">Wave Reached</div>
            <div className="text-xl font-black font-mono text-amber-950">
              Wave {stats.wave} / {stats.maxWaves}
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border-2 border-rose-300 shadow-sm">
            <div className="text-[10px] text-rose-800 uppercase font-bold">Enemies Slain</div>
            <div className="text-xl font-black font-mono text-rose-700">
              {stats.enemiesDefeated}
            </div>
          </div>
        </div>

        <button
          data-start="true"
          onClick={onRestart}
          className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-serif font-black text-base rounded-2xl border-2 border-amber-300 shadow-xl ring-4 ring-rose-300/40 transition transform hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>TRY AGAIN</span>
        </button>
      </div>
    </div>
  );
};

// 4. BETWEEN-WAVE TACTICAL REINFORCEMENTS MODAL
export const ReinforcementModal: React.FC<{
  waveCleared: number;
  onSelectPerk: (perkId: string) => void;
}> = ({ waveCleared, onSelectPerk }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-amber-50 to-amber-100 border-2 border-amber-400 rounded-3xl max-w-xl w-full p-6 text-stone-900 shadow-2xl ring-4 ring-amber-300/50">
        <div className="text-center mb-6">
          <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-3 py-1 rounded-full border border-amber-400 shadow-sm">
            ✨ WAVE {waveCleared} CONQUERED
          </span>
          <h2 className="text-2xl font-serif font-black text-amber-950 mt-2.5">
            CHOOSE TACTICAL REINFORCEMENT
          </h2>
          <p className="text-xs text-stone-600 font-medium mt-1">
            Dispatch strategic supplies and troop detachments before the next wave attacks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {AVAILABLE_PERKS.map((perk) => (
            <div
              key={perk.id}
              onClick={() => onSelectPerk(perk.id)}
              className="group cursor-pointer bg-white hover:bg-amber-100/80 border-2 border-amber-300 hover:border-amber-500 rounded-2xl p-4 transition-all duration-200 transform hover:-translate-y-0.5 shadow-md flex items-start space-x-3"
            >
              <span className="text-3xl p-2 bg-amber-100 rounded-xl border border-amber-300 group-hover:scale-110 transition-transform shadow-inner">
                {perk.icon}
              </span>
              <div className="flex-1">
                <h3 className="font-serif font-black text-sm text-amber-950 group-hover:text-blue-900 flex items-center justify-between">
                  <span>{perk.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-amber-600" />
                </h3>
                <p className="text-xs text-stone-600 font-medium mt-1 leading-relaxed">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-amber-900 font-mono font-bold">
          ⭐ Surviving squads also receive +25 XP skirmish victory veterancy bonus!
        </div>
      </div>
    </div>
  );
};

// 5. TACTICAL FIELD MANUAL & CONTROLS MODAL
export const TacticalGuideModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-amber-50 to-amber-100 border-2 border-amber-400 rounded-3xl max-w-2xl w-full p-6 text-stone-900 shadow-2xl relative max-h-[90vh] overflow-y-auto ring-4 ring-amber-300/40">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-500 hover:text-stone-900 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl transition cursor-pointer shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-serif font-black text-amber-950 mb-1">
          TACTICAL FIELD MANUAL
        </h2>
        <p className="text-xs text-stone-600 font-medium mb-5">
          Master the physics, topography, and formations of Tactical Medieval Skirmish.
        </p>

        <div className="space-y-4 text-xs leading-relaxed text-stone-700 font-medium">
          {/* Section 1: Topography */}
          <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm">
            <h3 className="font-serif font-black text-amber-900 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>⛰️</span>
              <span>Battlefield Topography</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">High Cliff Plateau (NW):</strong> Elevated grassy bluff reserved for Archers. Grants <span className="text-blue-700 font-bold">+30% range</span> and parabolic clearance over frontline shields.</li>
              <li><strong className="text-stone-950">Vertical Cliff Face (Brown Crags):</strong> Impassable rock barrier separating low-ground and high-ground.</li>
              <li><strong className="text-stone-950">North Ramp Pass:</strong> Wooden-stepped dirt slope connecting lowland to plateau. Flanking route for cavalry and red flankers.</li>
              <li><strong className="text-stone-950">Central Dirt Road & Chokepoint:</strong> The primary clash defile between the cliff base and oak groves.</li>
            </ul>
          </div>

          {/* Section 2: Formations & Line Drawing */}
          <div className="bg-white p-4 rounded-2xl border-2 border-blue-300 shadow-sm">
            <h3 className="font-serif font-black text-blue-900 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>🛡️</span>
              <span>Formations & Line Drawing</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">Draw Line for Shields:</strong> Drag cursor on battlefield to evenly distribute shields along the line, forming a tight unbroken turtle wall facing east.</li>
              <li><strong className="text-stone-950">Braced Stance:</strong> Takes <span className="text-blue-700 font-bold">75% reduced damage</span> from enemy arrows with silver-white sparks, and slowly shoves regular infantry backward.</li>
              <li><strong className="text-stone-950">Draw Line for Archers:</strong> Spaces archers out along the plateau edge to maximize volley coverage.</li>
            </ul>
          </div>

          {/* Section 3: Cavalry Flanking & Momentum */}
          <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm">
            <h3 className="font-serif font-black text-amber-900 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>🐎</span>
              <span>Cavalry Flanking & 5.0x Shock Charge</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">Custom Gallop Route:</strong> Select Cavalry [3] and drag a sweeping route through the north corridor or around trees.</li>
              <li><strong className="text-stone-950">Momentum:</strong> Builds from 1.0x to 2.5x speed as cavalry gallops along the path.</li>
              <li><strong className="text-stone-950">Flanking Critical (5.0x Total Damage):</strong> Hitting enemies already engaged with Blue Shields triggers an automatic 2x flanking multiplier (2.5x × 2 = <span className="text-amber-800 font-bold">5.0x damage</span> + dust shockwave + 1.5s dizzy stun)!</li>
            </ul>
          </div>

          {/* Section 4: Ultimates & Boss */}
          <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm">
            <h3 className="font-serif font-black text-amber-900 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>🎺</span>
              <span>Rally Horn & 💀 Red Brute Boss</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">Rally Horn [H]:</strong> Restores 25% Max HP to all blue soldiers, triggers 4s combat frenzy (+40% atk speed), and makes low-HP barbarians (≤65%) flee in panic!</li>
              <li><strong className="text-stone-950">Red Brute:</strong> Massive 680 HP juggernaut. Watch for the 0.65s telegraphed red ground zone before its devastating cleave smash!</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 bg-white hover:bg-amber-100 text-amber-950 font-black rounded-2xl border-2 border-amber-400 transition cursor-pointer shadow-md"
        >
          Close Field Manual
        </button>
      </div>
    </div>
  );
};
