# Save the Princess — HTML5 Port Development Plan

**Last Updated**: 2026-04-11

---

## Phase 0: Project Setup
- [x] Clone original Save-the-Princess Java source
- [x] Initialize Save-the-Princess-Web repo
- [x] Create index.html, CLAUDE.md, PLAN.md, .gitignore
- [ ] Analyze original Java source to understand full scope
- [ ] Copy assets (art → img/, snd/, data/)
- [ ] Create placeholder JS files for all source modules

---

## Phase 1: Boot & Scaffolding
- [ ] Implement Main.js — Phaser config, scene list, boot
- [ ] Implement Menu.js — title screen
- [ ] Implement SoundManager.js
- [ ] Implement AnimationManager.js skeleton

---

## Phase 2: Core Game Loop
- [ ] Implement STPView.js — main game scene (preload, create, update)
- [ ] Implement Player.js — movement, collision, animation
- [ ] Implement Level.js base class + level loading (TMX parsing)
- [ ] Implement Level1 through Level6

---

## Phase 3: Enemies & Objects
- [ ] Enemy.js base class
- [ ] Guard.js
- [ ] Dog.js
- [ ] Wizard.js + Fireball.js
- [ ] KnightBoss.js
- [ ] Other interactables: Door, Key, Crate, DoorButton, KeyDoor, Exit, Princess, Torch

---

## Phase 4: Cutscenes & End Sequences
- [ ] Animations/ — TitleScreenAnimation, WinAnimation, DeathAnimation, CrushedAnimation
- [ ] FinalCutscene / KnightBossInitAnimation / FinalTowerLedgeActiveAnimation
- [ ] CreditScrollAnimation

---

## Phase 5: Save System & Polish
- [ ] SaveReader.js — localStorage-based save/load (replaces save.dat)
- [ ] TimerCounter.js
- [ ] ListContainer.js
- [ ] Controls — keyboard + touch
- [ ] Final polish pass

---

## Remaining TODOs
*(Populated as analysis of original source progresses)*

---

**Instructions for Claude**:  
Always check this file before starting work. Work on one item at a time. After completing or making progress on a task, update the checkboxes, move items between sections if needed, and keep the phase and milestone accurate.
