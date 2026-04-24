# Agent Handoff

## Project Structure

- `client/`
  - `src/App.jsx`: main game state, modal/shop flow, placement, selling, expansion logic
  - `src/FarmScene.jsx`: Three.js scene, camera, land tiles, river, buildings, animals, products, expansion nodes
  - `src/gameData.js`: gameplay constants and geometry helpers
  - `src/App.css`: HUD, modals, shop, scene overlay styles
  - `src/MainMenu.jsx`: start menu and leaderboard screen
- `server/`
  - `index.js`: Express API and static serving
  - `database.js`: SQLite access
  - `farm.db`: live game database on server only, ignored in git
  - `ecosystem.config.cjs`: PM2 app config
- `ops/deploy_from_repo.sh`
  - server-side release script used by GitHub deploy flow
- `.github/workflows/deploy.yml`
  - SSH-based deployment workflow

## Deployment Model

- GitHub repo: `https://github.com/admn404/happyfarmtelegram.git`
- Production server:
  - live app: `/opt/farm`
  - repo clone: `/opt/farm/repo`
  - release script: `/opt/farm/deploy_from_repo.sh`
- Runtime data preserved outside git updates:
  - `/opt/farm/server/.env`
  - `/opt/farm/server/farm.db`
  - `/opt/farm/server/uploads`

## Current Gameplay Model

- Farm is no longer based on a fixed background image.
- World uses expandable land tiles:
  - initial owned land is one rectangular tile
  - side `+` nodes buy adjacent tiles
  - each expansion currently costs `5000`
- Placeables:
  - `plot`
  - `coop`
  - `pigsty`
  - `warehouse`
- Animals require matching buildings:
  - chickens need a coop
  - pigs need a pigsty
- Products can only be collected if at least one warehouse exists.

## Recent Changes

### Earlier pass

- Replaced old flat DOM scene with a Three.js-based stylized isometric scene.
- Added GitHub-based deployment flow and PM2 config.

### Current pass

- Fixed shop runtime path so modal uses in-app UI instead of failing on open.
- Reworked map from flat ground to owned 3D land tiles.
- Added side expansion purchase nodes for land growth.
- Added animated side river instead of a river crossing the whole map.
- Added handoff document for future agents.

### Latest pass

- Land tile proportions adjusted so one tile is the main gameplay unit.
- Placement now snaps to tile logic:
  - one tile can hold `4` plots
  - or `1` building
- Labels in the scene were switched to face the camera.
- Zoom range was lowered so a single tile can fit entirely on screen.
- Tile top surface was simplified to read as one solid field block, not a field resting on a separate pad.

## Known Risks / Next Work

- Bundle size is still large (`~1.2 MB` minified JS).
- Land expansion is currently horizontal only.
- Object collision / move / delete tools are still missing.
- River is stylized and animated, but still a first-pass effect rather than final art quality.
- Server Node version is `20.20.2`; one Three.js-related dependency warns it prefers Node `22+`, though builds currently succeed.
