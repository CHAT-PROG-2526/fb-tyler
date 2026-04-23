# Flappy Bird Project Plan

## Goal
Build a browser-based, mobile-responsive Flappy Bird game using plain HTML, CSS, and JavaScript. The game should feel polished with pixel-art style, local score persistence, audio controls, and a clean state flow.

## Branch / Task Backlog
Each branch should follow the same game flow and storage conventions, even if developed independently.

### Branch 1: Core Gameplay & Physics
- Implement game states: `TITLE`, `READY`, `PLAYING`, `GAME_OVER`
- Bird physics: gravity, flap impulse, vertical movement
- Input handling: tap/click, `Space`, `ArrowUp`
- Pipe obstacle generation and movement
- Collision detection with pipes, floor, and ceiling
- Score tracking when bird passes pipes
- Gradual speed increase based on score
- Restart logic from `GAME_OVER`

### Branch 2: Rendering & UI
- Responsive canvas or layout for desktop + mobile
- Pixel-art styling for sprites and UI text
- Render title screen with game title, best score, instructions, and leaderboard summary
- Render `Get Ready` screen while bird hovers before first flap
- Render live score during play
- Render `GAME_OVER` overlay with current score, best score, and restart prompt/button
- Add on-screen mute toggle

### Branch 3: Audio & Controls
- Looping background music
- Flap sound effect
- Point scored sound effect
- Crash sound effect
- On-screen mute/unmute control
- Optional sound state persistence in `localStorage`
- Ensure audio works with tap/click and keyboard actions

### Branch 4: Persistence & Leaderboard
- Store best score and top 10 scores in `localStorage`
- Use a consistent key such as `flappyLeaderboard`
- Persist entries as score + date
- Keep best score separately or derive from leaderboard
- Load persistence data on startup
- Display leaderboard on title screen and/or game over screen
- Maintain top 10 sorted descending
- Add fallback behavior if `localStorage` is unavailable

## Recommended branch mapping
- `feature/core-gameplay`
- `feature/render-ui`
- `feature/audio`
- `feature/persistence`

> If the team prefers more branches, split UI into `feature/title-menu` and `feature/gameplay-screen`, or split persistence into `feature/leaderboard` and `feature/storage`.

## Implementation plan
1. Agree on the shared architecture and conventions
   - Single game loop
   - Consistent game states
   - Same input actions: tap/click, `Space`, `ArrowUp`
   - Same `localStorage` key names
   - Pixel-art style with nearest-neighbor scaling
2. Build the first minimal playable version
   - `TITLE` → `READY` → `PLAYING` → `GAME_OVER`
   - Bird can flap and collide with pipes
   - Score increments correctly
3. Add UI polish and responsive layout
   - Mobile-friendly canvas or fixed aspect ratio
   - Animations for title and game over overlays
   - On-screen controls and mute button
4. Add audio and persistence
   - Background music and SFX
   - Best score and top 10 leaderboard saved locally
5. Test across browser and mobile viewport sizes
   - Tap/click and keyboard input
   - Restart flow and persistent leaderboard
   - `localStorage` restore after refresh

## Team coordination notes
- Each branch should keep the same feature list as the spec, even if they focus on one area.
- Avoid breaking changes by agreeing on a simple shared state model first.
- Use placeholder pixel-art assets at first, then refine later.
- If branches need to merge, use the same base game loop and state names to reduce conflicts.

## Quick decision checklist
- Do we want leaderboard on title screen, game over screen, or both?
- Should mute state also persist to `localStorage`?
- Should `localStorage` save only score+date, or include device/branch metadata?
- Do we want fullscreen canvas scaling or a fixed viewport with letterboxing?
- Should restart accept any tap/click anywhere, plus key press?
