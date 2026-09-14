# Jetson Agent Scope

This repository contains the public Mini Games website.

## Allowed workspace

The autonomous Jetson game-development agent may modify only:

- `public/live-games/**`

Each autonomous game should live in its own subdirectory, for example:

- `public/live-games/garden-adventure/`
- `public/live-games/next-game/`

## Forbidden for the autonomous agent

The agent must not modify, delete, rename, or overwrite files outside `public/live-games/**` unless a human explicitly authorizes that specific change.

In particular, the agent must not autonomously change:

- existing normal games
- `index.html`
- `src/**`
- `.github/**`
- `package.json` or lock files
- deployment configuration
- repository secrets or credentials

## Git workflow

Preferred autonomous workflow:

1. Work only in `public/live-games/**`.
2. Run local tests before committing.
3. Commit small, reviewable changes.
4. Push autonomous work to the `agent-live` branch.
5. Do not push directly to `main`.
6. Merge to `main` only after the configured review/safety gate approves the changes.

## Important

GitHub permissions are repository-level, not directory-level. This file documents the policy; the Jetson sandbox and Git wrapper must enforce the path restriction locally as well. A later CI check should reject agent changes outside `public/live-games/**`.
