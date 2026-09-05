# 「Modulo: Life」

A browser-based 3D life simulation set in **Hoshizaki**, an invented Japanese
neighbourhood in spring. Pick one of eight residents, and the other seven carry
on living around you — working shifts, training, shopping, arguing about arcade
scores, and going home when it gets dark.

Everything you can see is generated from code at runtime. There are no
third-party models, textures, fonts or audio files in this repository.

---

## What is actually in the game

- **An explorable neighbourhood.** A road grid with kerbs, crossings, utility
  poles and sagging power lines; a clock-tower roundabout; sakura-lined main
  street; a park with a carp pond and a jogging loop; a riverside with a bridge;
  a shrine up eleven stone steps; and a construction site with a working crane.
- **Sixteen enterable interiors.** Convenience store, supermarket, café, ramen
  counter, gym, office floor, arcade, a basement games room, and eight homes —
  all built on demand from data, with their own collision and interaction points.
- **Eight characters** with distinct silhouettes, stats, personalities, daily
  schedules, gift tastes and dialogue. Whichever you pick becomes the player;
  the rest become NPCs from the same records.
- **Living NPCs** that path around the streets on a schedule, go indoors, earn
  and spend their own money, and change mood and energy while you are elsewhere.
- **A real economy.** Four shops with markup and buyback, five jobs with
  interactive shifts, item effects, an inventory with weight of consequence, and
  a home storage chest.
- **Relationships** on two axes — friendship and respect — with tiers, gift
  preferences you discover by giving gifts, diminishing returns within a day,
  and a per-character interaction history.
- **Twelve tasks** given by the neighbours, tracked against live game state.
- **Nine minigames** plus five job shifts: dice, high/low, card duel, coin flip,
  fortune wheel, reflex rush, park loop, power meter and fishing.
- **Arcade combat** driven by your actual stats, with attack, heavy, block,
  dodge, retreat, stamina management, guard breaks and knockdowns.
- **A day that passes.** Accelerated clock, four-phase lighting, weather that
  rolls each morning, needs that decay, and a save you can come back to.

---

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
```

Other scripts:

```bash
npm run build     # typecheck + production bundle into dist/
npm run preview   # serve the production build
npm run lint      # eslint
npm run test      # vitest (105 unit tests)
```

Node 20+ is required.

---

## Deploying

The project is a static single-page app and deploys to Vercel with no
configuration beyond the committed `vercel.json`:

- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrites are already declared, so deep links resolve to `index.html`

There is no backend, no database and no environment variables. Nothing leaves
the browser — saves live in `localStorage` under `modulo-life:save`.

---

## Controls

### Desktop

| Action | Key |
| --- | --- |
| Move | `W` `A` `S` `D` or arrow keys |
| Look | Drag with the mouse |
| Sprint | `Shift` |
| Jump | `Space` |
| Interact | `E` |
| Pause | `Esc` **or** `P` |
| Bag | `I` |
| Character | `C` |
| Neighbours | `R` |
| Map | `M` |
| Tasks | `Q` |
| Combat | `J` attack · `K` heavy · `L` block · `Space` dodge |

### Touch (iPad and tablets)

The virtual stick sits bottom-left, sprint/jump/interact bottom-right, and the
right side of the screen is a look-drag area that deliberately stops short of
the HUD so every button stays tappable. **Pause is on `P` as well as `Esc`**,
and the `☰` button in the HUD opens the same menu without a keyboard.

### Gamepad

A connected controller is picked up automatically: left stick moves, right stick
looks, and face and shoulder buttons map to jump, interact, cancel, menu, map,
sprint and the three combat actions.

---

## Architecture

```
src/
  data/           Pure content: characters, items, jobs, shops, locations,
                  interiors, dialogue, quests, random events, world layout
  game/
    core/         Renderer wrapper, input, materials/texture cache, settings
    world/        World builder, buildings, props, interiors, atmosphere,
                  collision, static-geometry merger
    characters/   Procedural humanoid model and its animation set
    player/       Third-person controller and camera rig
    npc/          NPC agents, schedules, pathfinding, LOD simulation
    systems/      Pure simulation: stats, needs, economy, inventory,
                  relationships, time, combat, jobs, quests, minigames, rng
    save/         Versioned save with validation and migrations
    audio/        Web Audio synthesis: SFX, ambience, generative music
    Game.ts       The orchestrator that ties the above to the stores
  stores/         Zustand stores for game state, settings and UI
  ui/             React screens, HUD, menus and overlays
  minigames/      Minigame components
```

The dividing line that matters: **`src/game/systems` and `src/data` never import
three.js or React.** All the rules of the game live there as pure functions, so
they are unit-testable in a plain Node environment, and the renderer and the
interface are both consumers rather than owners of the simulation.

Content is data-driven throughout. Adding a ninth character means appending one
record to `src/data/characters.ts` — appearance, stats, schedule and gift
preferences — and nothing else.

---

## Performance

The neighbourhood is authored as thousands of small primitives because that is
pleasant to write, then **merged by material at load time**, which takes it from
~2,300 meshes to under 300 draw batches. That single pass is the biggest reason
this runs on a laptop at all.

Beyond that:

- NPC simulation runs on a fixed low-rate tick, separate from rendering
- NPC animation only runs for characters within 45m, at half cadence to 95m,
  and not at all past that
- Bloom is faked with additive sprites rather than a post-processing pass
- Textures are generated once into a cache and shared by every user of a colour
- Interiors are built on entry and torn down on exit
- Water and particles are skipped entirely when effects are off

### Battery saver

The toggle in Settings → Performance is a genuine workload reduction, not a
label. It switches shadows and effects off, caps render resolution at 65%,
shortens draw distance to 110m, cuts particle counts by two thirds, targets
30fps with real frame pacing, and slows NPC simulation from 10Hz to 4Hz.

---

## Accessibility

- Text size and interface scale sliders
- Reduced motion (also honoured from the OS preference)
- Screen shake toggle
- High-contrast interface theme
- Every status bar carries a number and an icon as well as a colour, so nothing
  depends on distinguishing red from green
- All controls documented in-game under Settings → Data

---

## Assets and licensing

**There are no third-party assets in this repository.** Every building,
character, prop and texture is generated procedurally from code at runtime, all
sound is synthesised with the Web Audio API, and typography uses the reader's
own system fonts. Nothing here carries an unclear licence.

The neighbourhood, its residents, the shop names and all the writing are
original to this project.

---

## A note on the gambling

The basement games use in-game yen only. There are no purchases, no real
currency, and no links to real gambling services. Each game states its odds
before you commit, and every one is tuned to a house edge — verified by tests
that run tens of thousands of rounds and assert the player ends down:

| Game | Return to player |
| --- | --- |
| Dice (high/low) | ~91.7% |
| Dice (exactly 7) | ~83.3% |
| Coin flip | ~97.5% |
| Fortune wheel | ~91.7% |
| High/Low | ties go to the house |
| Card duel | dealer stands on 17 |

---

## Testing

`npm run test` runs 105 unit tests over the simulation layer: money handling,
inventory edge cases, stat growth curves, needs decay, the clock, relationship
diminishing returns, combat maths, job pay, save validation and migration,
minigame odds, and geometric assertions that no building overlaps another or
blocks a road.

The game has also been driven end to end in a real browser — new game, character
selection, walking, every panel, a minigame, a full fight, saving, reloading and
continuing — with zero console errors.

---

## Known limitations

- Only spring is implemented. The season is part of the save format and the
  atmosphere system is written around a palette table, so the other three are an
  additive change rather than a rewrite.
- NPCs path along the road graph and steer around obstacles, but do not avoid
  each other; they will occasionally clip shoulders on a narrow pavement.
- Interiors are single rooms. The office is "floor 2" and the tower above it is
  scenery.
- Combat is one-on-one only, and stages where the two characters happen to be
  standing rather than in a dedicated arena.
- Home decoration places furniture into a list that grants its bonus; it does not
  yet let you position items in the room.

## Roadmap

1. Summer, autumn and winter palettes, plus seasonal produce and festivals
2. NPC-to-NPC relationships that change without the player involved
3. Home layout editing with placeable furniture
4. More jobs, and promotion tracks within existing ones
5. Local NPC avoidance and shared pavement etiquette
6. A second neighbourhood block reachable by the bridge
