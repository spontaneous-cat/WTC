# Changelog

## 0.1.3 - 2026-09-11

- Add lobby and dashboard menus with settings, game rules, and history navigation (#8).
- Add explicit back controls and browser/native nested-screen back handling (#8).
- Add generic MVP game-rules reference content without exposing hidden game state (#8).

## 0.1.2 - 2026-09-11

- Replace fake-player tiles with separator-based list rows and short, accessible actions; prevent long-name overflow (#11).
- Make row refresh target only that fake player and show its latest successful refresh result (#11).
- Restore actual-role assertions and verify list density, touch targets, and non-admin guardrails at phone widths (#11).

## 0.1.1 - 2026-09-11

- Convert fake-player controls from large tiles to a compact list layout (#11).

## 0.1.0 - 2026-09-11

- Add an emulator-only fake-player developer harness for local lobby/start testing (#7).
- Document the computer-plus-phone fake-player setup and production guardrails (#7).
- Add automated coverage for the dev-mode gate and fake-player UI flow (#7).
- Tighten issue-writer skill guidance to keep issues concise and split only necessary sub-issues.
