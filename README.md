# Chores Guide

A small phone-friendly web app for a shared house: each resident picks their name and sees which chore they have this week, ticks it off when done, and keeps a streak going. The house manager can mark anyone's chore as done and advance the rotation.

**Live:** https://chores-guide.vercel.app

## How it works

- `index.html`, `styles.css`, `app.js` — the whole front end; no framework and no build step. The rotation (residents, chores, and exceptions such as who skips the stairs or takes two chores) is defined at the top of `app.js`.
- The current date comes from a public time API (America/New_York) so every phone agrees on which week it is, regardless of its own clock.
- `netlify/functions/chores-state.mjs` — a serverless function that keeps the shared state (rotation, completions, streak) in Netlify Blobs, so every resident sees the same board. Personal preferences such as "remember me" stay in each phone's `localStorage`.
- `manifest.webmanifest` lets residents add it to their home screen.

## Local setup

Requires Node 18+ and the Netlify CLI (the function and Blobs store only run under `netlify dev`).

```bash
npm install
npm run dev     # netlify dev
npm run check   # syntax-check app.js and the function
```

## Environment variables

Names only — set values in the hosting provider's settings, never in the repo.

| Variable | Purpose |
|---|---|
| `JEFF_ADMIN_PASSWORD` | Password that lets the house manager update other residents' chores |

## Deploying

`netlify.toml` publishes the repo root and the `netlify/functions` folder; functions responses are marked `no-store` so nobody sees a stale board. Pushes to `main` deploy to production.
