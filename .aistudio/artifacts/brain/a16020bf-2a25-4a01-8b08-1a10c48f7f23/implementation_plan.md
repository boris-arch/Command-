# Tactical AI Stalemate, Reinforcement, & UI Collision Fixes

This update resolves the end-of-wave AI stalemates, top-left hill clumping and idle cavalry behavior, the `+25 Shield Soldiers` reinforcement cap bug, and the `Rally Horn [4]` fear targeting and floating label overlaps across Waves 1–5.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following tactical behaviors were confirmed during clarification and govern the implementation:

- **Automatic Mop-Up Behavior**: When surviving Red enemies drop below 15% of the wave total (or fewer than 20 units) or 4 seconds elapse without combat damage, Blue Melee (`Shields`) and `Cavalry` automatically charge remaining stragglers while `Archers` advance until enemies are comfortably within firing range, then return to their home formation slots for the next wave.
- **Cavalry Wave-Start Autonomy**: At the start of each wave, `Cavalry [3]` automatically executes a top-and-bottom flank sweep toward the enemy rear/archers unless overridden by a player-drawn path, and actively engages any enemies entering its acquisition zone.
- **Rally Horn Frontline Fear**: Triggering `Morale - Rally [4]` centers the shockwave on the frontline engagement and causes all frontline enemies (within `260px` of Blue frontline units or locked in melee) as well as any weakened rear units (`HP <= 75%`) to flee in panic.

---

## 1. Overview & Core Concept

- **What It Does**: Guarantees continuous, decisive wave progression from Wave 1 through Wave 5 by eliminating deadlocks where distant Red units or passive Blue formations stop engaging, ensuring full `+25 Shield Soldiers` reinforcements spawn on the center road, making `Rally Horn [4]` reliably rout frontline attackers, and keeping all on-map tactical labels legible without overlap.
- **Target Audience / Persona**: Tactical RTS players commanding 100+ micro-unit formations against 185–295 unit barbarian waves.
- **Key Value**: Eliminates unwinnable end-of-wave stalemates, wasted reinforcement picks, idle flank squads, and overlapping HUD/canvas badges.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Active Wave & Flank Sweep**: When a wave begins, North and South Cavalry wings automatically sweep along the outer grass flanks to strike enemy archers and rear cohorts, while players can redraw any squad's formation (clamped safely to `x >= 80px` so units never bunch against the left screen edge).
  2. **End-of-Wave Mop-Up**: Once Red forces are reduced to `< 15%` (or `< 20` stragglers) or 4 seconds pass without combat hits, an on-screen tactical banner announces the mop-up charge as Blue Shields and Cavalry hunt down remaining enemies and Archers step forward into range. Upon wave completion, squads reform at their formation coordinates.
  3. **Wave Reinforcements**: Choosing `+25 Shield Soldiers` between waves spawns all 25 heavy shield infantry directly on the central dirt road behind the main shield line (`x: 260–295, y: 270–400`), immediately increasing both current and maximum squad counts by `+25`.
  4. **Frontline Rally Horn & Clean Labels**: Pressing `[4]` emits the golden Rally Horn shockwave from the active frontline centroid, routing frontline barbarians and displaying the exact flee count. The `DEPLOYMENT ZONE` label sits cleanly at the bottom-left of the deployment box, and floating squad banners dynamically separate vertically so they never collide.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp miniature tabletop wargame readability with high-contrast vector badges and zero overlapping text.
  - *Color Palette & Mood*: Warm meadow greens and road ochres paired with cobalt/cyan Alliance indicators (`#38bdf8`), veteran gold chevrons (`#facc15`), and crimson Horde accents (`#ef4444`).
  - *Typography & Hierarchy*: Bold tabular numerals (`tabular-nums`) for troop counts and timers; compact 8px–9px canvas tactical labels with dark contrast strokes and vertical collision spacing.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Two-Tier Stalemate Prevention (True 2D Enemy Pathing + Automatic Mop-Up State)**
  - *Chosen Approach*: Fix Red Archer movement to use full 2D vector pathing toward the nearest living Blue unit (and allow Red units to attack blocking barricades) while pairing it with a `isMopUpMode` state triggered at `< 15%` enemies, `< 20` enemies, or `4.0s` of zero combat damage.
  - *Why*: Fixing enemy pathing ensures Red archers never walk horizontally past Blue units on a different Y lane, while automatic Mop-Up guarantees that even slow or stunned stragglers in mud patches are swiftly eliminated without requiring manual redrawing.
- **Decision 2: Uncapped Reinforcement Spawning on the Central Road**
  - *Chosen Approach*: Remove the `Math.min(25, maxCount - currentShields)` restriction when selecting `+25 Shield Soldiers`, increment `maxCount` alongside `count` by `+25`, and place new soldiers in a 3-rank block on the central road (`x: 260–295, y: 270–400`).
  - *Why*: Previously, `maxCount` was fixed at `45`, silently discarding reinforcement troops if the player had more than 20 shields alive and placing any spawned units near the top-left.
- **Decision 3: Dynamic Bounding-Box Repulsion for Floating Canvas Labels**
  - *Chosen Approach*: Anchor the static `DEPLOYMENT ZONE` label at the bottom-left corner of the zone rectangle and run a vertical overlap-resolution pass across all active squad banners (`Shields`, `Archers`, `Cavalry`, and `Brute Boss`) before rendering.
  - *Why*: Prevents the top-left hill label (`▲ HILL (+20% ARCHER)`), deployment zone header, and squad banners from stacking on top of each other when multiple squads converge.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Combat Loop Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GameEngine Update Loop (dt)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Combat Activity & Mop-Up Detector                                   │
│     ├─ Tracks timeSinceLastCombatDamage & remainingWaveRatio            │
│     └─ Activates isMopUpMode if (<15% | <20 enemies | >=4s no damage)   │
│                                                                         │
│  2. Allied AI (updateAlliedUnit)                                        │
│     ├─ Drawn Formation Clamp: enforces X >= 80px inside UI_SAFE_ZONE    │
│     ├─ Cavalry: auto-generates North/South flank sweep at wave start;   │
│     │           acquires enemies within 260px or middle third (X<=850)  │
│     ├─ Shields: holds formation or engages nearby enemies (<=140px);    │
│     │           charges nearest enemy during isMopUpMode                │
│     └─ Archers: plants for +30% range; advances to 85% range in Mop-Up  │
│                                                                         │
│  3. Enemy AI (updateEnemyUnit)                                          │
│     └─ All Red units (Melee & Archers) use 2D vector pathing toward     │
│        nearest living Blue unit; attacks barricades if obstructed       │
│                                                                         │
│  4. Rally Horn & Reinforcements                                         │
│     ├─ Rally Horn [4]: panics enemies within 260px of frontline OR      │
│     │                  any enemy with HP <= 75%                         │
│     └─ +25 Shields: spawns full 25 units on center road (no cap)        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         GameRenderer Canvas Pass                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ├─ Deployment Zone Label -> Bottom-Left (minX + 10, maxY - 10)         │
│  └─ Squad & Boss Banners  -> Sorted Y collision-avoidance (>=16px gap)  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Changes

- **Unit Home Formation Coordinates (`homeX`, `homeY`)**: Added to `Unit` so units advancing during Mop-Up mode or local melee pursuits automatically return to their assigned formation coordinates at the start of the next wave.
- **Engine Combat Telemetry (`timeSinceLastCombatDamage`, `initialWaveEnemyCount`, `isMopUpMode`)**: Tracks wave total count and resets `timeSinceLastCombatDamage = 0` whenever any unit takes melee, ranged, charge, cleave, burn, or spike damage.
- **Minimum Left Formation Boundary (`MIN_FORMATION_X = 80`)**: Enforced in `distributeMultiRankFormation` and `applyDrawnLineToSquad` so player-drawn lines and unit slots never cluster against the extreme left border (`x < 80px`).
