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
import {
  GameStateStats,
  MetaProgressionState,
  MetaUpgradeId,
  SquadType,
  SquadSpecialization,
} from '../game/types.ts';
import { AVAILABLE_PERKS } from '../game/engine.ts';
import {
  getBattleAccolades,
  META_UPGRADES,
  getMetaUpgradeCost,
  SQUAD_SPECIALIZATIONS,
} from '../game/rules.ts';

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
  onContinueEndless?: () => void;
  onOpenArmory?: () => void;
}> = ({ stats, onRestart, onContinueEndless, onOpenArmory }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-amber-50 to-amber-100 border-2 border-amber-400 rounded-3xl max-w-md w-full p-5 sm:p-6 text-stone-900 shadow-2xl text-center ring-4 ring-amber-300/50">
        <div className="w-14 h-14 rounded-full bg-amber-300 border-2 border-amber-400 flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-amber-400/40">
          <Trophy className="w-7 h-7 text-amber-900 animate-pulse" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-900 to-yellow-800 mb-1">
          DECISIVE VICTORY!
        </h2>
        <p className="text-xs text-stone-600 font-medium mb-4">
          The barbarian horde has broken upon the defile. Push into Endless Crusade or upgrade your Royal Armory!
        </p>

        {/* Mastery Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-3 text-left">
          <div className="bg-white p-2.5 rounded-2xl border-2 border-amber-300 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-black tracking-wider">War Gold Earned</div>
            <div className="text-lg font-black font-mono text-amber-900">
              🪙 +{stats.goldEarned ?? 0}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border-2 border-blue-300 shadow-sm">
            <div className="text-[10px] text-blue-800 uppercase font-black tracking-wider">Total Score</div>
            <div className="text-lg font-black font-mono text-blue-900">
              {stats.score} PTS
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border-2 border-amber-300 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-black tracking-wider">Flanking Crits</div>
            <div className="text-lg font-black font-mono text-amber-950">
              {stats.flankingCrits}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border-2 border-sky-300 shadow-sm">
            <div className="text-[10px] text-sky-800 uppercase font-black tracking-wider">Arrows Deflected</div>
            <div className="text-lg font-black font-mono text-sky-900">
              {stats.arrowsDeflected}
            </div>
          </div>
        </div>

        {/* Honorary Battle Accolades */}
        {(() => {
          const accolades = getBattleAccolades(stats);
          return (
            <div className="mb-3 text-left bg-white/80 p-2.5 rounded-2xl border border-amber-300">
              <div className="text-[10px] text-amber-900 font-black uppercase tracking-wider mb-1 flex items-center space-x-1">
                <span>🏅 Field Accolades Earned</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {accolades.map((acc, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 shadow-xs"
                  >
                    {acc}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Squad Performance Breakdown */}
        <div className="mb-4 grid grid-cols-3 gap-1.5 text-center text-xs">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-1.5">
            <div className="text-[10px] font-bold text-blue-800">🛡️ Shields</div>
            <div className="font-mono font-black text-blue-950">{stats.shieldKills ?? 0} Kills</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-1.5">
            <div className="text-[10px] font-bold text-indigo-800">🏹 Archers</div>
            <div className="font-mono font-black text-indigo-950">{stats.archerKills ?? 0} Kills</div>
          </div>
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-1.5">
            <div className="text-[10px] font-bold text-sky-800">🐎 Cavalry</div>
            <div className="font-mono font-black text-sky-950">{stats.cavalryKills ?? 0} Kills</div>
          </div>
        </div>

        <div className="space-y-2">
          {onContinueEndless && (
            <button
              type="button"
              onClick={onContinueEndless}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-serif font-black text-sm sm:text-base rounded-2xl border-2 border-yellow-200 shadow-xl ring-2 ring-amber-400/50 transition transform hover:scale-102 active:scale-98 cursor-pointer"
            >
              ⚔️ CONTINUE ENDLESS CRUSADE (WAVE 6+)
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {onOpenArmory && (
              <button
                type="button"
                onClick={onOpenArmory}
                className="py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-serif font-black text-xs sm:text-sm rounded-2xl border-2 border-amber-400 shadow-md transition cursor-pointer"
              >
                🏰 ROYAL ARMORY
              </button>
            )}
            <button
              data-start="true"
              onClick={onRestart}
              className={`${onOpenArmory ? '' : 'col-span-2'} py-2.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-serif font-black text-xs sm:text-sm rounded-2xl border-2 border-amber-300 shadow-md transition cursor-pointer`}
            >
              NEW CAMPAIGN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. GAME OVER MODAL (Defeat)
export const GameOverModal: React.FC<{
  stats: GameStateStats;
  onRestart: () => void;
  onOpenArmory?: () => void;
}> = ({ stats, onRestart, onOpenArmory }) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-rose-50 to-amber-50 border-2 border-rose-400 rounded-3xl max-w-md w-full p-6 text-stone-900 shadow-2xl text-center ring-4 ring-rose-300/40">
        <div className="w-16 h-16 rounded-full bg-rose-200 border-2 border-rose-400 flex items-center justify-center mx-auto mb-4 shadow">
          <Skull className="w-8 h-8 text-rose-700" />
        </div>

        <h2 className="text-3xl font-serif font-black text-rose-950 mb-1">
          THE DEFILE HAS FALLEN
        </h2>
        <p className="text-xs text-stone-600 font-medium mb-5">
          Your defense was breached. Spend your earned War Gold in the Royal Armory to return stronger!
        </p>

        {/* Progress Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 text-left">
          <div className="bg-white p-2.5 rounded-2xl border-2 border-amber-300 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-bold">Wave Reached</div>
            <div className="text-lg font-black font-mono text-amber-950">
              Wave {stats.wave}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border-2 border-rose-300 shadow-sm">
            <div className="text-[10px] text-rose-800 uppercase font-bold">Slain</div>
            <div className="text-lg font-black font-mono text-rose-700">
              {stats.enemiesDefeated}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-2xl border-2 border-yellow-400 shadow-sm">
            <div className="text-[10px] text-amber-800 uppercase font-bold">War Gold</div>
            <div className="text-lg font-black font-mono text-amber-900">
              🪙 +{stats.goldEarned ?? 0}
            </div>
          </div>
        </div>

        {/* Accolades */}
        {(() => {
          const accolades = getBattleAccolades(stats);
          return (
            <div className="mb-4 text-left bg-white/80 p-2.5 rounded-2xl border border-rose-200">
              <div className="text-[10px] text-rose-900 font-black uppercase tracking-wider mb-1 flex items-center space-x-1">
                <span>🏅 Field Accolades Earned</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {accolades.map((acc, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-950 border border-rose-300"
                  >
                    {acc}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-2.5">
          {onOpenArmory && (
            <button
              type="button"
              onClick={onOpenArmory}
              className="py-3 bg-amber-100 hover:bg-amber-200 text-amber-950 font-serif font-black text-sm rounded-2xl border-2 border-amber-400 shadow-md transition cursor-pointer"
            >
              🏰 ROYAL ARMORY
            </button>
          )}
          <button
            data-start="true"
            onClick={onRestart}
            className={`${onOpenArmory ? '' : 'col-span-2'} py-3 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-serif font-black text-sm rounded-2xl border-2 border-amber-300 shadow-xl transition cursor-pointer flex items-center justify-center space-x-1.5`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
        </div>
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
              <span>🌾</span>
              <span>Open Flat-Ground Plain & Planted Bonus</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">100% Walkable Grassy Plain:</strong> Wide-open battlefield with a central dirt road where massive armies clash in multi-rank formations.</li>
              <li><strong className="text-stone-950">Planted Formation Bonus:</strong> When Archers are stationary in their drawn formation, they automatically gain <span className="text-blue-700 font-bold">+30% range and pinpoint accuracy</span>.</li>
              <li><strong className="text-stone-950">Wide Swarm Battle Lines:</strong> Red Barbarian Horde waves (180–295+ units) advance in wide multi-group battle lines across the eastern plain.</li>
            </ul>
          </div>

          {/* Section 2: Formations & Line Drawing */}
          <div className="bg-white p-4 rounded-2xl border-2 border-blue-300 shadow-sm">
            <h3 className="font-serif font-black text-blue-900 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>🛡️</span>
              <span>Multi-Rank Micro-Formations & Line Drawing</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">Draw Line for Shields:</strong> Drag cursor on battlefield to form a tight 3-row deep rectangular phalanx facing east.</li>
              <li><strong className="text-stone-950">Braced Stance:</strong> Takes <span className="text-blue-700 font-bold">75% reduced damage</span> from enemy arrows with silver-white sparks, and shoves regular infantry backward.</li>
              <li><strong className="text-stone-950">Draw Line for Archers:</strong> Arranges archers in multi-rank blocks behind your frontline for Planted Formation Bonus volleys.</li>
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

          {/* Section 4: Ultimates, War Hounds & Siege Engines */}
          <div className="bg-white p-4 rounded-2xl border-2 border-amber-300 shadow-sm">
            <h3 className="font-serif font-black text-amber-900 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>🎺</span>
              <span>Rally Horn, War Hounds, Siege Rams & 💀 Red Brute</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">Rally Horn [4 / H]:</strong> Restores 25% Max HP to all blue soldiers, triggers 4s combat frenzy (+40% atk speed), and makes frontline or weakened barbarians flee in panic!</li>
              <li><strong className="text-stone-950">Barbarian War Hounds:</strong> Fast pack runners on the north & south flanks that prioritize hunting down unguarded Blue Archers.</li>
              <li><strong className="text-stone-950">Siege Battering Ram & 💀 Red Brute:</strong> Heavy armored siege wagons crush barricades and shatter Braced shield stances; Red Brutes unleash telegraphed 680 HP cleave smashes!</li>
            </ul>
          </div>

          {/* Section 5: Tier 3 Class Evolutions & Advanced Tactics */}
          <div className="bg-white p-4 rounded-2xl border-2 border-orange-300 shadow-sm">
            <h3 className="font-serif font-black text-orange-950 text-sm mb-1.5 flex items-center space-x-1.5">
              <span>👑</span>
              <span>Tier 3 Elite Class Evolutions & Field Engineering</span>
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-stone-700">
              <li><strong className="text-stone-950">Branching Tier 3 Evolutions (⌃⌃):</strong> At 250 XP, evolve Shields into <span className="text-amber-900 font-bold">🔱 Phalanx Halberdiers</span> or <span className="text-blue-800 font-bold">🛡️ Tower Pavise Guard</span>; Archers into <span className="text-indigo-800 font-bold">🎯 Longbow Snipers</span> or <span className="text-orange-700 font-bold">💥 Alchemist Crossbows</span>; Cavalry into <span className="text-amber-800 font-bold">👑 Royal Cataphracts</span> or <span className="text-sky-800 font-bold">⚡ Outrider Lancers</span>.</li>
              <li><strong className="text-stone-950">Flame Arrows [F] & Spike Barricades [B]:</strong> Ignite arrows with damage-over-time pitch and plant wooden spike barricades to impale charging raiders.</li>
              <li><strong className="text-stone-950">Tactical Focus [Space]:</strong> Enter 0.25x cinematic slow motion with live 3-rank ghost formation slot previews.</li>
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

// 6. ROYAL ARMORY META-PROGRESSION MODAL (Grindable Permanent Upgrades Lv 0..10 + Squad Specialist Doctrine)
export const RoyalArmoryModal: React.FC<{
  meta: MetaProgressionState;
  onUpgrade: (id: MetaUpgradeId) => void;
  onSelectSpecialist?: (squad: SquadType, spec: SquadSpecialization | null) => void;
  activeSpecialists?: Partial<Record<SquadType, SquadSpecialization | null>>;
  onClose: () => void;
}> = ({ meta, onUpgrade, onSelectSpecialist, activeSpecialists, onClose }) => {
  const currentArcherSpec =
    activeSpecialists?.archer ?? meta.selectedSpecialists?.archer ?? null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-gradient-to-b from-white via-amber-50 to-amber-100 border-2 border-amber-400 rounded-3xl max-w-3xl w-full p-5 sm:p-6 text-stone-900 shadow-2xl relative max-h-[92vh] overflow-y-auto ring-4 ring-amber-300/50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-500 hover:text-stone-900 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl transition cursor-pointer shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & War Chest Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pr-10">
          <div>
            <h2 className="text-2xl font-serif font-black text-amber-950 flex items-center gap-2">
              <span>🏰 ROYAL ARMORY & SQUAD SPECIALISTS</span>
            </h2>
            <p className="text-xs text-stone-600 font-medium">
              Equip dynamic Squad Specialist doctrines and spend War Gold on permanent army upgrades.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="bg-gradient-to-r from-amber-400 to-yellow-300 border-2 border-amber-600 rounded-2xl px-3.5 py-1.5 shadow-md flex items-center gap-1.5">
              <span className="text-base">🪙</span>
              <span className="font-mono font-black text-base text-amber-950">
                {meta.warGold}
              </span>
              <span className="text-[10px] font-black uppercase text-amber-900">GOLD</span>
            </div>
          </div>
        </div>

        {/* Career Lifetime Grind Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-white/90 border border-amber-300 rounded-xl py-1.5 px-2 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-amber-800">🏆 Best Wave Reached</div>
            <div className="font-mono font-black text-sm text-amber-950">Wave {meta.highestWave}</div>
          </div>
          <div className="bg-white/90 border border-amber-300 rounded-xl py-1.5 px-2 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-amber-800">💀 Lifetime Slain</div>
            <div className="font-mono font-black text-sm text-rose-700">{meta.totalKills}</div>
          </div>
          <div className="bg-white/90 border border-amber-300 rounded-xl py-1.5 px-2 shadow-xs">
            <div className="text-[10px] font-bold uppercase text-amber-800">👑 Campaigns Won</div>
            <div className="font-mono font-black text-sm text-blue-800">{meta.victories}</div>
          </div>
        </div>

        {/* DYNAMIC SQUAD SPECIALIST SYSTEM: ALCHEMIST VS LONGBOW */}
        <div className="mb-5 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                  SQUAD SPECIALIST
                </span>
                <h3 className="font-serif font-black text-sm sm:text-base text-amber-300">
                  Archer Corps Doctrine · Visual & Mechanical Specialization
                </h3>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pick a specialist upgrade to equip unique battlefield gear models and trade-off mechanics:
              </p>
            </div>
            {currentArcherSpec && onSelectSpecialist && (
              <button
                type="button"
                onClick={() => onSelectSpecialist('archer', null)}
                className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[10px] font-mono font-bold transition cursor-pointer"
              >
                Reset to Standard Rangers
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SQUAD_SPECIALIZATIONS.archer.map((spec) => {
              const isSelected = currentArcherSpec === spec.id;
              const isAlchemist = spec.id === 'alchemist';

              return (
                <div
                  key={spec.id}
                  onClick={() =>
                    onSelectSpecialist?.('archer', isSelected ? null : spec.id)
                  }
                  className={`rounded-xl p-3 border-2 transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? isAlchemist
                        ? 'bg-gradient-to-b from-emerald-950/90 to-slate-900 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_16px_rgba(74,222,128,0.35)]'
                        : 'bg-gradient-to-b from-indigo-950/90 to-slate-900 border-amber-300 ring-2 ring-amber-300/50 shadow-[0_0_16px_rgba(250,204,21,0.35)]'
                      : 'bg-slate-800/75 hover:bg-slate-800 border-slate-700 hover:border-amber-400/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        {/* Custom Visual Preview Miniature SVG */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                            isAlchemist
                              ? 'bg-emerald-950 border-emerald-400/70 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                              : 'bg-indigo-950 border-amber-400/70 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                          }`}
                        >
                          {isAlchemist ? (
                            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                              <circle cx="16" cy="18" r="9" fill="rgba(74,222,128,0.25)" />
                              <rect x="13.5" y="5" width="5" height="4" rx="1" fill="#a16207" stroke="#fde047" strokeWidth="0.8" />
                              <path d="M13 9 L19 9 L23 16 C24.5 20 21.5 25 16 25 C10.5 25 7.5 20 9 16 Z" fill="#16a34a" stroke="#dcfce7" strokeWidth="1.3" />
                              <circle cx="16" cy="18.5" r="4.5" fill="#4ade80" />
                              <circle cx="14.5" cy="17" r="1.8" fill="#bef264" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                              <rect x="6" y="8" width="6.5" height="19" rx="1.5" fill="#78350f" stroke="#facc15" strokeWidth="1.1" />
                              <line x1="8" y1="8" x2="7" y2="2" stroke="#f8fafc" strokeWidth="1.6" />
                              <line x1="10.5" y1="8" x2="11" y2="1.5" stroke="#fde047" strokeWidth="1.6" />
                              <path d="M20 2 C26 8 26 24 20 30" stroke="#facc15" strokeWidth="2.4" strokeLinecap="round" />
                              <line x1="20" y1="2" x2="20" y2="30" stroke="#f8fafc" strokeWidth="1" />
                              <line x1="16" y1="16" x2="29" y2="16" stroke="#fef08a" strokeWidth="1.8" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-serif font-black text-sm text-white">
                              {spec.title}
                            </span>
                          </div>
                          <span
                            className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                              isAlchemist
                                ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/40'
                                : 'bg-indigo-900/80 text-amber-200 border border-amber-400/40'
                            }`}
                          >
                            {isAlchemist ? '🧪 ' : '🏹 '}
                            {spec.visualGear}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? isAlchemist
                              ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                              : 'bg-amber-400 text-slate-950 border-yellow-200'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ EQUIPPED' : 'EQUIP'}
                      </span>
                    </div>

                    {/* Mechanical Pros & Cons */}
                    <div className="space-y-1 text-[11px] mt-2">
                      {spec.pros.map((pro, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-emerald-300 font-medium">
                          <span className="font-black text-emerald-400">+</span>
                          <span>{pro}</span>
                        </div>
                      ))}
                      {spec.cons.map((con, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-rose-300 font-medium">
                          <span className="font-black text-rose-400">−</span>
                          <span>{con}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSpecialist?.('archer', isSelected ? null : spec.id);
                    }}
                    className={`w-full mt-3 py-1.5 rounded-lg font-mono font-black text-xs border transition cursor-pointer ${
                      isSelected
                        ? isAlchemist
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 border-emerald-200'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-yellow-200'
                        : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500'
                    }`}
                  >
                    {isSelected
                      ? `✓ ${spec.shortTag} SPECIALIST ACTIVE`
                      : `PICK ${spec.shortTag} SPECIALIST`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6 Permanent Upgrade Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {META_UPGRADES.map((cfg) => {
            const lv = meta.upgrades[cfg.id] ?? 0;
            const isMax = lv >= cfg.maxLevel;
            const cost = getMetaUpgradeCost(cfg, lv);
            const canAfford = !isMax && meta.warGold >= cost;
            const pct = Math.min(100, (lv / cfg.maxLevel) * 100);

            return (
              <div
                key={cfg.id}
                className="bg-white border-2 border-amber-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl p-1.5 bg-amber-100 rounded-xl border border-amber-300">
                        {cfg.icon}
                      </span>
                      <div>
                        <h3 className="font-serif font-black text-sm text-amber-950 leading-tight">
                          {cfg.title}
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-amber-700">
                          Level {lv} / {cfg.maxLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-1 mb-2.5">
                    {cfg.descriptionPerLevel}
                  </p>
                </div>

                <div>
                  {/* Level Progress Bar */}
                  <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden mb-2 border border-amber-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onUpgrade(cfg.id)}
                    className={`w-full py-2 rounded-xl font-mono font-black text-xs border transition flex items-center justify-center gap-1.5 ${
                      isMax
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 cursor-default'
                        : canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-amber-950 border-amber-600 shadow-sm cursor-pointer transform active:scale-95'
                        : 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? (
                      <span>✨ MAX LEVEL</span>
                    ) : (
                      <>
                        <span>UPGRADE</span>
                        <span>·</span>
                        <span>🪙 {cost}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-serif font-black text-sm rounded-2xl border-2 border-amber-300 transition cursor-pointer shadow-md"
        >
          Done · Return to Command
        </button>
      </div>
    </div>
  );
};

