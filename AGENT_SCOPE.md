# Jetson Agent Scope

This repository contains the public Mini Games website.

## Live Game workspace

The autonomous Jetson game-development agent may modify only:

- `mooslicht/**`

`Mooslicht` is the current Live Game. It is shown separately at the top of the normal Mini Games start page, but it keeps its existing URL and remains part of the same website.

## Forbidden for the autonomous agent

The agent must not modify, delete, rename, or overwrite files outside `mooslicht/**` unless a human explicitly authorizes that specific change.

In particular, the agent must not autonomously change:

- the other normal games
- `index.html`
- `src/**`
- `public/**`
- `.github/**`
- `package.json` or lock files
- deployment configuration
- repository secrets or credentials

## Git workflow

Preferred autonomous workflow:

1. Work only in `mooslicht/**`.
2. Run local tests before committing.
3. Commit small, reviewable changes.
4. Push autonomous work to the `agent-live` branch.
5. Do not push directly to `main`.
6. Merge to `main` only after the configured review/safety gate approves the changes.

## Important

GitHub permissions are repository-level, not directory-level. This file documents the policy; the Jetson sandbox and Git wrapper must enforce the `mooslicht/**` path restriction locally as well. A later CI check should reject agent changes outside that path.
