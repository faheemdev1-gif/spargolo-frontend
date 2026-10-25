# Spargolo — React frontend

A genuine React + Vite application, converted from the latest Spargolo design. There is no iframe, embedded legacy application, or plain-JavaScript page hidden behind React. The header, cinematic opening, menu, wine discovery, selection, and reservation flow are React components.

The design uses warm ivory, burgundy accents, generous space, and venue photography. The old solid-green opening is not included.

## 1. Run on your Mac

Use Node.js 24 LTS. The project requires Node.js 22.12 or later.

```bash
cd spargolo-react
npm ci
npm run dev
```

Open the local URL printed by Vite. To check the production build:

```bash
npm run build
npm run preview
```

## 2. Push to GitHub

Create an empty GitHub repository. Run these commands **inside `spargolo-react`**, where `package.json` is located. Replace the example URL with your repository URL.

```bash
git init
git add .
git commit -m "Add Spargolo React frontend"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/spargolo-frontend.git
git push -u origin main
```

The ZIP excludes `.git`, `node_modules`, compiled output, and credentials. The included lockfile makes installation reproducible. `node_modules` and `dist` are ignored by Git.

## 3. Deploy on Vercel

1. Import the GitHub repository in Vercel.
2. Select the **Vite** framework preset.
3. Use the repository root as the Root Directory. `package.json` must be at that root.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Use Node.js 24 in the project settings.
7. Deploy.

`vercel.json` already supplies the framework, build command, and output directory. This version needs no database, credentials, or environment variables. Once GitHub is connected, later pushes trigger new deployments.

This is a one-page site with section anchors and dialogs, so no SPA route rewrite is needed. Assets and fonts are included locally; the exported application does not require ChatGPT sign-in.

Official references: [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite), [Vite deployment guide](https://vite.dev/guide/static-deploy).

## 4. What works now

- Food video with pause control and switches for food, venue, and wine scenes.
- Responsive desktop and mobile layouts; persistent mobile menu/booking actions.
- Menu categories, full-menu dialog, quantities, and selection totals.
- A selection enquiry preview. This is not paid checkout or an accepted restaurant order.
- Reservation preview with date, party size, preferred time, contact details, notes, menu preferences, and review.
- Wine discovery with four taste moods.
- An editorial reviews section with attributed excerpts, star ratings, matching photography, manual navigation, and a booking link.
- Keyboard-accessible dialogs and tabs, reduced-motion support, and offscreen video pausing.

## 5. Important current boundary

The default mode is **demo**. Menu names, compositions, prices, time slots, and booking rules are illustrative and marked accordingly. The owner must supply the final menu, allergen information, current hours, and booking policy.

In demo mode, guest details exist only in React memory while a dialog is open. They are not saved, emailed, sent to a server, or restored after reload. Completing a preview does not reserve a table, submit an order, or charge a payment. Order and booking administration is the next phase; no admin panel or database is claimed in this ZIP.

## 6. Edit the content

Edit `src/data/site.js` for the brand, contact details, hours, hero scenes, story, family content, menu categories/items, prices, wine moods, and review excerpts. Prices use integer cents (`450` means €4.50). Media is in `public/assets/`. Keep menu item IDs stable when editing items.

React components are in `src/components/`. Styles are in `src/styles/site.css`. Booking, cart, and request data rules are in `src/lib/domain.js`.

See `ASSETS.md` for media provenance and `BACKEND_PLAN.md` for the next phase.

## 7. Connect the future backend

Only after a compatible backend exists, set these variables in Vercel and redeploy:

```dotenv
VITE_DATA_MODE=api
VITE_API_BASE_URL=https://YOUR-BACKEND.example/api/v1
```

The frontend will request `GET /public/content` and use the public submission endpoints documented in `BACKEND_PLAN.md`. Content must match the versioned structure of `demoSite`. Set `preview: false` **only when the owner-approved content and real booking/order services are ready**.

API mode fails visibly if the service is unavailable; it does not silently show a fake success or substitute demo content. Mutations require a real server response containing a record ID. Requests include idempotency keys so a backend can deduplicate retries. No admin secret belongs in a `VITE_` variable because these variables are public browser configuration.

## 8. Checks

```bash
npm test
npm run build
```

Domain tests cover quantities and totals, venue-local dates around daylight-saving changes, closed dates and lead times, booking payloads, and order requests that leave final pricing to the server. The final production build is also checked in a browser before delivery.
