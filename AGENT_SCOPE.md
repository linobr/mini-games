# Jetson Agent Scope

This repository contains the public Mini Games website.

## Protected original

The existing `mooslicht/**` game is the human-maintained original and must not be changed by the autonomous Jetson agent.

The original Mooslicht remains a normal game on the website.

## Autonomous Live Game workspace

The autonomous Jetson game-development agent may modify only:

- `ki-mooslicht/**`

`ki-mooslicht/**` is a separate clone of Mooslicht and is shown as the Live Game at the top of the normal Mini Games start page.

The agent may evolve this clone independently without touching the original game.

## Forbidden for the autonomous agent

The agent must not modify, delete, rename, or overwrite files outside `ki-mooslicht/**` unless a human explicitly authorizes that specific change.

In particular, the agent must not autonomously change:

- `mooslicht/**`
- any other normal game
- `index.html`
- `src/**`
- `public/**`
- `.github/**`
- `scripts/**`
- `package.json` or lock files
- `vite.config.js`
- deployment configuration
- repository secrets or credentials

## Git workflow

Preferred autonomous workflow:

1. Work only in `ki-mooslicht/**`.
2. Run local tests before committing.
3. Verify with `git diff --name-only` that every changed path starts with `ki-mooslicht/`.
4. Commit small, reviewable changes.
5. Push autonomous work only to the `agent-live` branch.
6. Do not push directly to `main`.
7. Merge to `main` only after the configured review/safety gate approves the changes.

## Important

GitHub permissions are repository-level, not directory-level. This file documents the policy; the Jetson sandbox and Git wrapper must enforce the `ki-mooslicht/**` path restriction locally as well. A later CI check should reject agent changes outside that path.
