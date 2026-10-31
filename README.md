# KuArte · clickable prototype

A static website: 28 mobile screens and 28 desktop pages, with a start page at `index.html`.
No build step and no dependencies. Fonts load from Google Fonts.

## Live demo for the pitch

Open `demo.html` on a laptop. It shows the customer phone and Viper's phone side by side:

- **Booking request:** book on the customer phone, accept on the tech phone, confirm on the customer phone. Each side updates the moment the other acts.
- **Post a design:** post a request, send a quote from the tech side, accept it on the customer side.

The two sides share one demo booking saved in this browser (localStorage). It also syncs across two tabs or windows on the same computer, but not across different devices. Use **Reset demo** before each run.

## Deploy to Vercel

**Option 1: GitHub (no terminal needed)**
1. On github.com, create a new repository, for example `kuarte-prototype`.
2. Click "uploading an existing file" and drag in everything inside this folder (not the folder itself).
3. On vercel.com, choose Add New → Project → import that repository.
4. Leave Framework Preset as "Other" and leave the build settings empty. Click Deploy.
Every later upload to the repo redeploys automatically.

**Option 2: Vercel CLI**
1. Install Node.js.
2. In this folder, run `npx vercel` and answer the prompts (no build command, output directory `.`).
3. Run `npx vercel --prod` to publish the live link.

## What's inside

| File | What it does |
| --- | --- |
| `index.html` | Start page: open the mobile app, the desktop site, the live demo, or any screen |
| `demo.html` | Customer and nail tech phones side by side, sharing one live booking |
| `Main.dc.html`, `m02…m28` | Mobile screens (full screen on phones, a phone frame on laptops) |
| `d01…d28` | Desktop pages |
| `kuarte.css` | Brand tokens, components, and the interaction and motion layer |
| `site.css` | Phone sizing, scrolling, prototype bar, toasts, page transitions |
| `support.js` | Small runtime that renders each screen, patches it in place on every tap, and shows success toasts |
| `assets/` | Placeholder nail illustrations and the favicon |

## Editing

- Text and layout: edit the screen's `.dc.html` file, inside `<template id="dc-tpl">`.
- Tap behaviour: the `<script type="text/x-dc">` block at the bottom of each screen.
- Success messages: add `?toast=Your%20message` to any link; the next screen shows it.
- Photos: replace the files in `assets/` with your own, keeping the same file names.

All names, prices and numbers are sample data. Nothing takes real bookings or payments.
