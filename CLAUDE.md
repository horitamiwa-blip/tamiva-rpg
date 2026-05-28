# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A personal productivity RPG dashboard for creator 多神和 (Tami Wa). Daily creative tasks are modeled as ranked quests (S/A/B/C) in a dungeon-crawler aesthetic. The entire app is a single `index.html` file — no build step, no dependencies, no frameworks. Open it directly in a browser.

## Running the App

```bash
# Open directly in browser (no server needed)
open index.html

# Or serve locally if you need a real origin for testing
python3 -m http.server 8080
```

There are no tests, no linter, and no CI. Correctness is verified by opening `index.html` in a browser.

## Architecture

Everything lives in `index.html`:

- **Lines 1–61**: HTML shell + embedded CSS. Retro terminal aesthetic — dark navy `#000820`, yellow `#ffff00`, cyan accents. Key classes: `.win` (bordered window box), `.wt` (window title bar), `.ep` (emoji picker grid), `.sbt` (skill/job button).
- **Lines 65–130**: Two screens — `#sc-char` (character creation) and `#sc-main` (main game). The main screen contains the HP bar, EXP bar, gold counter, quest list, and AI response area.
- **Lines 132–377**: All application logic as vanilla ES6+ JavaScript.

### Key constants (lines 133–143)
| Constant | Contents |
|---|---|
| `EMOJIS` | 24 avatar choices |
| `JOBS` | 5 job classes (`れいかいし`, `えかき`, `ものづくりし`, `けんじゃ`, `たびびと`) |
| `QUESTS` | 8 hardcoded daily tasks with `rank`, `label`, and `cat` (category) |
| `MSGS` | 5 random motivational messages shown on the main screen |

### State & persistence
All state lives in `localStorage`:
- `rpg_char6` — JSON blob with `{name, emoji, job}`
- `rpg_totalexp` — cumulative integer EXP across all days
- `rpg6_YYYY_M_D` — JSON array of boolean completion flags for each quest, keyed by calendar day

### Game logic
- **Leveling**: `Lv = Math.floor(totalEXP / 5) + 1`. Each completed quest awards 1 EXP.
- **HP bar**: 10 segments, color-coded: ≤3 red, ≤6 yellow, >6 green. HP is manually adjusted by the player (no automatic drain).
- **Screen flow**: `showMain()` → renders quest list and stats; `startGame()` → character creation → main; `goChar()` → back to creation.

### Claude AI integration (`askBoader()`, ~line 225)
The "💬" button on each quest calls `askBoader(questIndex)`. It detects the runtime environment:
- **Cowork environment**: calls `window.cowork.askClaude(prompt)` and renders the markdown response into the message area.
- **Plain browser**: redirects to `claude.ai` with a pre-filled prompt.

The AI persona is named "ボーダ" (Boader) and is prompted to give actionable next steps for the selected quest.

### Quest categories
Quests belong to one of three categories (`cat` field):
- `個展` — Personal Exhibition / Showcase work (4 quests)
- `発信` — Content / Broadcasting (2 quests)
- `休息` — Rest / Recovery (2 quests)

## Conventions
- The UI language is Japanese throughout — keep all user-facing strings in Japanese.
- Add new quests by extending the `QUESTS` array; ranks are `S`, `A`, `B`, `C`.
- localStorage keys include a version suffix (`rpg_char6`, `rpg6_...`) to avoid conflicts with old formats — increment this suffix if the data shape changes in a breaking way.
- The "Forbidden Magic" and "Divine Words" flavor-text boxes in `#sc-main` are static motivational content — not interactive.
