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

### Latest Pass - UI Polish & UX

- **Contextual Land Expansion**:
    - Removed the "Expand" button from the main toolbar and the separate expansion modal.
    - Expansion buttons (`+`) now appear directly in the 3D scene around the selected land tile.
- **Premium Main Menu**:
    - Added a stylized background with floating animated blobs.
    - Implemented smooth transitions and animations using `framer-motion`.
- **Placement Preview (Ghosting)**:
    - Added a semi-transparent "ghost" object that follows the cursor during placement mode.
- **Stability Fixes**:
    - Resolved critical React render crashes and missing imports.
    - Standardized linter rules to prevent future production failures.

## Known Risks / Next Work

- **Animal Pens & Wells**: Need to implement larger 1-tile buildings for animal pens and wells for resources.
- **Object Manipulation**: Need to implement moving and deleting existing buildings/plots.
- **Placement Logic**: Building placement needs grid-snapping similar to plots.
- **Animal AI**: Animals need to stay within fenced areas (pens).
