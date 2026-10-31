# KuArte · clickable prototype

A static website: 24 mobile screens and 24 desktop pages, with a start page at `index.html`.
No build step and no dependencies. Fonts load from Google Fonts.

## Deploy to Vercel

**Option 1: GitHub (no terminal needed)**
1. On github.com, create a new repository, for example `kuarte-prototype`.
2. Click "uploading an existing file" and drag in everything inside this folder (not the folder itself).
3. On vercel.com, choose Add New → Project → import that repository.
4. Leave Framework Preset as "Other" and leave the build settings empty. Click Deploy.
Every later upload to the repo redeploys automatically.

**Option 2: Vercel CLI**
1. Install Node.js, then run `npm i -g vercel`.
2. In this folder, run `vercel` and answer the prompts (no build command, output directory `.`).
3. Run `vercel --prod` to publish the live link.

## What's inside

| File | What it does |
| --- | --- |
| `index.html` | Start page: open the mobile app, the desktop site, or any screen |
| `Main.dc.html`, `m02…m24` | Mobile screens (full screen on phones, a phone frame on laptops) |
| `d01…d24` | Desktop pages |
| `kuarte.css` | Brand tokens and components |
| `site.css` | Phone sizing, scrolling and the "Prototype" pill |
| `support.js` | Small runtime that renders each screen and its tap logic |
| `assets/` | Placeholder nail illustrations and the favicon |

## Editing

- Text and layout: edit the screen's `.dc.html` file, inside `<template id="dc-tpl">`.
- Tap behaviour: the `<script type="text/x-dc">` block at the bottom of each screen.
- Photos: replace the files in `assets/` with your own, keeping the same file names.

All names, prices and numbers are sample data. Nothing takes real bookings or payments.
