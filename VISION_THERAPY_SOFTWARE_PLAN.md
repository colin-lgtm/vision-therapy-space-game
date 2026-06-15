# Nate-O-Vision Software Plan

Date: 2026-06-15

## Purpose

Build a private, game-first Surface app that feels like a space adventure while exercising the exact visual skills called out in Nathanael Hurd's optometric vision therapy report. The child-facing experience should be fun, fast, tactile, reward-driven, and level-based. The therapy alignment should live underneath the game mechanics, scoring, and progression system rather than making the app feel clinical.

The app is for private family use and should not be marketed as a dyslexia treatment, reading-cure product, diagnostic tool, or substitute for in-office optometric care.

## Inputs Reviewed

- `C:\Users\colin\.codex\attachments\079e57fe-6225-4c4c-ba55-36f3db3ebe78\pasted-text.txt`
- `C:\Users\colin\Downloads\N Hurd VT Report.pdf`

## Clinical Findings To Support

From the June 2, 2026 binocular vision exam:

- Diagnoses:
  - Convergence insufficiency, ICD-10-CM H51.11
  - Paresis of accommodation, bilateral, H52.523
  - Deficient smooth pursuit eye movements, H55.82
- Relevant findings:
  - Moderate to severe limitation with pursuit eye movements on eye tracking.
  - King Devick results indicated significant difficulty with oculomotor control, despite the RightEye summary also listing normal saccadic eye movements.
  - Difficulty shifting accommodation from distance to near and sustaining near focus.
  - Keystone Fusion Amplitude score 0%, expected 70%.
  - Near point of convergence 4 inches with accommodative target and 3 inches with red target; report states this should be to the nose.
  - VO Star showed convergence insufficiency and disorganization of binocularity.
- Recommended therapy emphasis:
  - Monocular activities to equalize focusing, tracking, and pointing of each eye.
  - Binocular work to improve eye-teaming efficiency.
  - Visual-spatial tasks for sequential and directional concepts.
  - Form training: visual discrimination, spatial relationships, form constancy, figure-ground, visual closure.
  - Visual-motor tasks for body awareness, control, and visually directed fine motor skills.
- Environmental recommendations:
  - Slanted work surface and 15-inch near target distance.
  - Frequent "look up and out" breaks.
  - Shorter near-work periods.
  - Screen sessions limited to 15-20 minutes.
  - No screen use during the last 1-2 hours before bed.
  - Blue-blocking anti-glare lenses were recommended by the report when using screens.

## Research Summary

- Evidence is strongest for symptomatic convergence insufficiency, particularly office-based vergence/accommodative therapy with home reinforcement.
- The NEI-funded CITT-ART results support a careful claims boundary: therapy can improve clinical signs of convergence insufficiency, but did not outperform placebo on standardized reading outcomes. The software should track visual task performance and adherence, not promise reading improvement.
- Pediatric ophthalmology guidance recognizes home computer programs as one possible treatment mode for convergence insufficiency, but treatment should be directed and monitored by an eye care professional.
- Accommodative insufficiency management commonly combines optical correction when needed, structured therapy, near-far focusing activities, ergonomic habits, and regular breaks.
- Screen-safety guidance consistently emphasizes breaks, distance, posture, lighting, glare reduction, and avoiding screens near bedtime. Blue-light claims are mixed; because the report specifically recommends blue-blocking anti-glare lenses, the app can remind the parent about that instruction, but should not make a broad claim that blue light is the cause of symptoms.
- If this remains a private family tool used under clinician direction, regulatory risk is lower. If it is distributed or marketed with treatment claims, it may become device software and should be reviewed for FDA/software-as-a-medical-device obligations before release.

## Product Scope

### Game Direction

Working title: `Nate-O-Vision: Space Academy`.

Core fantasy: Nate is a cadet training with a friendly ship AI. Each activity is a short mission on a star map. Performance earns stars, ship parts, planet unlocks, badges, and cosmetic upgrades. The app should never feel like worksheets or a medical dashboard.

Primary child loop:

1. Pick a planet/mission.
2. Play a 60-180 second round.
3. Earn stars, unlock a badge, repair the ship, or reveal a new map node.
4. Advance through levels with clear visual progress.
5. End with a celebratory mission summary.

Input model:

- Must support Surface touch, Surface Pen/stylus, trackpad, and mouse.
- Use Pointer Events everywhere so the same game logic works for touch, pen, and mouse.
- Targets must be finger-friendly on a Surface screen, with difficulty changing target size gradually.
- Drag, tap, trace, hold, and quick-tap interactions should all be supported across modules.

Progression:

- Each game has levels 1-30.
- Levels unlock through repeated success, not one lucky run.
- Difficulty changes one variable at a time: speed, target size, distractors, path complexity, visual clutter, or response window.
- Failure should feel like "try the mission again" rather than punishment.
- Parent dashboard tracks actual metrics, but the child sees stars, ranks, collectibles, streaks, and map progress.

### Build For MVP

1. Space Academy shell
   - Full-screen child game experience optimized for Surface.
   - Star map home screen with planets/missions.
   - Player profile with rank, stars, badges, ship upgrades, and streaks.
   - Hidden grown-up area behind a long-press or PIN, not prominent in the child flow.
   - Fast launch: no clinical checklist blocking every play session.

2. Mission controller
   - Short rounds by default, usually 60-180 seconds.
   - A "fuel meter" replaces clinical session timing.
   - End-of-session cap is still present in settings, but presented as "the ship is out of fuel for now."
   - Pause and quit are always available, but visually styled as game controls.
   - Comfort break prompts are framed as mission intermissions.

3. Game A: Orbit Tracker
   - Smooth-pursuit exercise using Canvas and `requestAnimationFrame`.
   - Player pilots a tractor beam, shield, or repair drone that must stay locked onto a moving ship/comet.
   - Target follows circle, horizontal, vertical, diagonal, figure-8, spiral, zigzag, and rectangle paths.
   - Touch/pen/mouse support: drag to keep the beam inside the target.
   - Level goals: maintain lock, collect energy rings, avoid space debris, survive pattern changes.
   - Metrics: lock percentage, average distance from target center, path type, speed, misses, round level, input type.
   - Modes: both eyes, left-eye monocular prompt, right-eye monocular prompt. Monocular setup must be parent/clinician-directed; the app only prompts, it cannot verify eye use.

4. Game B: Star Jumper
   - Saccadic localization and visual-motor clicking task.
   - Player taps jump gates, rescue pods, asteroids, or signal beacons as they appear.
   - Targets appear at randomized positions with controlled amplitude and direction.
   - Touch/pen/mouse support: quick tap/click response.
   - Level goals: hit the correct target, ignore decoys, follow color/shape rules, chain combos.
   - Metrics: reaction time, tap accuracy, quadrant transitions, misses, false taps, input type.

5. Game C: Focus Portal
   - Near-far accommodative practice.
   - Player scans a tiny alien glyph, ship code, or rune on screen.
   - Then a portal opens and the game tells him to find/read a real-world wall target before returning.
   - The screen can dim or show a "portal tunnel" during the far-look interval.
   - Level goals: solve near code, switch to far target, return and match the symbol.
   - Metrics: cycle count, completed switches, response accuracy, round level.
   - Avoid pretending the software can measure accommodation directly without hardware.

6. Game D: Dual-Signal Decoder
   - Binocular teaming/fusion-inspired game using red/cyan or split-channel targets only when enabled by a grown-up.
   - Player decodes two alien signals, one from each color channel, and enters both symbols.
   - Game feel: hacking, decoding, matching, shield calibration.
   - Metrics: symbols reported, completion, level, response time.
   - Keep difficulty conservative until the exact red/cyan setup is confirmed.

7. Grown-up dashboard
   - Calendar of sessions.
   - Session duration, module mix, completion, levels unlocked.
   - Pursuit and saccade metrics.
   - Stars/rank progression.
   - Export CSV/JSON for Dr. Larson.
   - Optional notes field.

### Add After MVP

- Visual-spatial and form-training modules:
  - Nebula Search: figure-ground search.
  - Broken Constellations: visual closure.
  - Astro Directions: direction sequencing.
  - Cargo Sorter: spatial relationship matching.
  - Shape Shifter: form constancy matching.
- Mission builder:
  - Parent selects which game worlds are available.
  - Parent can set max fuel/session time, starting difficulty, and unlock speed.
  - Presets can still map to clinician recommendations, but the UI should say "mission plan."
- Hardware support:
  - Surface touch, Surface Pen, mouse, and trackpad input.
  - Optional haptics/audio cues where available.
  - Optional external eye tracker only if clinically useful and privacy-safe.
- Data package export:
  - Single zipped progress package with anonymized metrics and parent notes.

## Key Corrections To The Pasted Spec

- Do not call the app "clinical-grade" unless it is built under a proper quality/regulatory process.
- Do not imply direct neurological development claims or reading/dyslexia treatment claims.
- The 15-minute limit should be a configurable background fuel/session policy, not a clinical-feeling hard stop in the child UI.
- The anaglyph module should be implemented as a fun decoder game. Color-filter exercises can be useful, but the implementation details matter and wrong demand levels could cause fatigue during the session.
- The report recommends monocular work and visual-spatial/form/visual-motor work; the pasted spec mostly focuses on pursuits, saccades, accommodation, and anaglyph teaming, so the roadmap must include those missing areas.
- Report-specific reminders should live in the grown-up area or brief launch interstitials, not dominate the game.

## Recommended Technical Stack

- Desktop shell: Electron.
  - Reason: fastest reliable Windows build path, mature React/Vite support, no Rust toolchain requirement.
  - Tauri can be revisited later if installer size matters more than development speed.
- Frontend: React + TypeScript + Vite.
- Rendering: Canvas 2D for MVP games; WebGL or PixiJS can be added later if particle effects and animation complexity justify it.
- Input: Pointer Events abstraction for touch, pen, mouse, and trackpad.
- Styling: Tailwind CSS for shell UI, with Canvas handling the game surface.
- State: Zustand or lightweight React context for session state.
- Local data: append-only JSON event log plus derived summary JSON.
  - Keep raw events immutable.
  - Recompute dashboard summaries from event logs.
  - Avoid cloud storage in MVP.
- Testing:
  - Unit tests for timing, randomization bounds, scoring, lockout, and data persistence.
  - Playwright tests for core flows.
  - Manual visual QA for target smoothness and child-safe layout.

## Data Model

Core entities:

- `profile`
  - child nickname, avatar, rank, unlocked worlds, screen/fuel policy.
- `missionPlan`
  - enabled worlds, max fuel/session time, module order, difficulty caps, notes.
- `session`
  - id, start/end time, active seconds, worlds played, stars earned, stop/end reason.
- `moduleRun`
  - world id, mission id, level, input type, started/ended, completion status.
- `event`
  - timestamp, type, moduleRunId, payload.
- `metricSummary`
  - derived from raw events, never hand-edited.

Privacy:

- Store locally only.
- Use a nickname in the UI.
- Export should allow anonymized mode.

## Comfort Guardrails

These should exist, but they should not make the game feel clinical.

- Use a parent PIN or long-press gesture for grown-up settings.
- Always show pause and quit as game controls.
- Audio should be fun, soft, and optional.
- Avoid flashing, strobing, high-speed flicker, and harsh penalty feedback.
- Difficulty increases only after stable success across multiple runs.
- If the player quits early, save progress and treat it as "mission ended," not failure.
- Keep detailed stop/end reasons in the grown-up dashboard, not the child-facing flow.
- Use a quick "fuel empty" or "ship needs recharge" ending when the configured time cap is reached.

## UX Direction

- Theme: colorful space academy adventure with planets, ships, portals, badges, and a friendly AI guide.
- The app should feel like a polished casual game, not a medical app.
- Use dark space backgrounds with vivid targets, animated rewards, and satisfying sound effects.
- Keep game surfaces uncluttered so the visual task stays clear.
- Large touch targets, stable layouts, and no tiny buttons on the child side.
- Child screen shows current mission, stars, combo/progress, pause, and quit.
- Parent dashboard can be denser and data-oriented, but it should still use the game vocabulary.

## Build Phases

### Phase 1: Foundation

- Scaffold Electron + Vite + React + TypeScript + Tailwind.
- Create routes/screens: animated star map, mission runner, reward summary, grown-up dashboard, grown-up settings.
- Implement local JSON event store.
- Implement fuel/session timer, pause/resume, profile progression, unlocks, and parent PIN/long-press.
- Implement shared Pointer Events input layer for touch, pen, and mouse.
- Add exported CSV/JSON skeleton.

Acceptance:

- App opens locally on Windows/Surface.
- Player can launch from the star map, play a stub mission, earn stars, and see a reward summary.
- Touch, pen, and mouse inputs are detected and logged.
- Session is saved and appears in the grown-up dashboard.

### Phase 2: Orbit Tracker

- Build Canvas engine and pursuit paths.
- Add pointer-inside-target lock scoring.
- Add levels, stars, badges, ship repair rewards, and gradual progression.
- Add data logging and dashboard chart/table.

Acceptance:

- 60 fps target animation on the Surface.
- Touch/pen/mouse all work for beam-lock gameplay.
- Metrics are reproducible and exported.
- No layout overlap at common laptop sizes.

### Phase 3: Star Jumper

- Build randomized target placement with amplitude/direction controls.
- Add jump gates, rescue pods, combo scoring, and distractor mode behind a level gate.
- Log latency, accuracy, false clicks, and transition patterns.

Acceptance:

- Randomization avoids predictable loops.
- Reaction-time metrics exclude pause time and post-tap debounce errors.
- Touch interaction feels immediate on Surface.

### Phase 4: Focus Shift

- Build Focus Portal near-far game loop.
- Add parent-configured far target instructions.
- Add glyph/rune matching and reward flow.

Acceptance:

- The screen clearly transitions during far-focus intervals.
- App does not claim to measure focus directly.

### Phase 5: Fusion/Teaming Prototype

- Implement Dual-Signal Decoder after the red/cyan setup is confirmed.
- Start with perception reporting and anti-suppression-style symbol decoding, not aggressive convergence demand.
- Keep it fun: hacking panels, alien codes, shield calibration.

Acceptance:

- Grown-up must explicitly enable it.
- Exercise parameters are visible in export for clinician review.

### Phase 6: Visual-Spatial/Form Modules

- Build Nebula Search, Broken Constellations, Astro Directions, Cargo Sorter, and Shape Shifter.
- Keep these clearly separated from claims about dyslexia treatment.

Acceptance:

- Metrics show task accuracy and completion only.
- Copy does not promise reading gains.

## Clinician Questions Before Building Fusion/Protocol Logic

1. Which modules should Nathanael use at home now, and which should wait until after in-office instruction?
2. Should monocular activities be done with patching, translucent occlusion, red/green filters, or another setup?
3. What is the desired home frequency and duration: daily 15 minutes, 5 days per week, or another protocol?
4. Are red/cyan anti-suppression tasks appropriate for him now?
5. Are there specific stop symptoms or thresholds Dr. Larson wants tracked?
6. Should the app export metrics before monthly progress visits in a particular format?

## Initial Build Decision

Start with Phase 1 and Phase 2 only, but make Phase 1 visually real enough to feel like a game from day one. Build the star map, profile progression, reward summary, shared Surface input layer, and Orbit Tracker as the first playable world.

## Sources

- National Eye Institute, CITT-ART reading outcome summary: https://www.nei.nih.gov/research-and-training/research-news/treatment-common-vision-disorder-does-not-improve-childrens-reading-skills
- AAPOS convergence insufficiency patient guidance: https://aapos.org/glossary/convergence-insufficiency
- AAPOS screen-time/eye-strain guidance: https://aapos.org/glossary/screen-time-and-online-learning
- FDA device software/mobile medical applications guidance page, current as of 2026-05-27: https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications
- NCBI Bookshelf/StatPearls, accommodative insufficiency: https://www.ncbi.nlm.nih.gov/books/NBK587363/
- Cochrane/PubMed convergence insufficiency network meta-analysis: https://pubmed.ncbi.nlm.nih.gov/33263359/
- HTS2 product reference for comparable home therapy software features: https://htsvision.com/hts2/
