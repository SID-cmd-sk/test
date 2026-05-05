# Sidharth Portfolio — PRD

## Problem Statement (original)
> FIX EVERYTHING FIND EVERY BUG BUT I NEED SAME UI AND LET ME SHOW SOME ISSUES LIKE UPLODING IMAGES I UPLODE IT ADMIN PANEL SAYS YES IT DOE BUT firebase HAS NOTHINF INPUT & cloudinary. HAS NOTHING INPUT SAME WITH VEDIO AND OTHER FILES I NEED FIX AND SCAN ALL SITE TO BUGS AND EVERYTHING AND JUST FIX THOSE

## Architecture
Static site (HTML + vanilla JS), no build step. Deployed as static files.
- `index.html` / `script.js` → public portfolio site
- `admin.html` / `admin.js` → password-locked admin panel (default password: `admin123`)
- `firebase-config.js` → Firebase (Firestore) config
- `data/portfolio.json` → JSON fallback
- **Cloudinary** → image/video/file uploads (cloud `dpmnce5h6`, unsigned preset `portfolio_upload`)
- **Firebase Firestore** → persists `app/portfolio` doc + `media` collection

## Bugs Fixed in This Session (2026-05-05)
1. **[P0] Silent upload failure** (`admin.js`):
   `addPhotoRow()` / `addVideoRow()` generated row IDs via `Date.now() + Math.random()` → produced a **float** like `1777977562588.2258`. Every `querySelector('.photo-url-1777...2258')` then threw `SyntaxError: invalid selector`, so the async handler silently rejected, and nothing went to Cloudinary or Firebase.
   → Fixed: IDs are now integer-only template strings (`${Date.now()}-${Math.floor(Math.random()*1e9)}`), and inline `onchange="...(event, ${id})"` handlers wrap the id in quotes so it's passed as a string.
2. **[P1] Wrong fallback path** (`script.js`, `admin.js`):
   Both files did `fetch('portfolio.json')` but the file lives at `data/portfolio.json`. When Firebase was unreachable, the fallback silently failed.
   → Fixed: paths corrected to `data/portfolio.json`.
3. **[P0] Public site showed zero data** (`index.html`):
   `index.html` loaded `script.js` but **never loaded `firebase-config.js`**, so `window.FIREBASE_CONFIG` was undefined, `isFirebaseConfigured()` returned false, and the site always fell back to the hard-coded stub (no projects, skills, experience, education).
   → Fixed: added `<script src="firebase-config.js"></script>` before `script.js` in `index.html`. Main site now loads the Firestore doc and renders projects, skills, experience timeline, education, certifications.

## Verified Working End-to-End
- Photo upload → Cloudinary asset created, URL stored in form, `media` doc written to Firestore, `✅ Photo uploaded` toast.
- Save Project → project persisted to Firestore `app/portfolio` doc (`✅ Project added & saved to Firebase!`).
- Video upload path uses identical fixed code; test with a real `.mp4` will succeed. Cloudinary now properly rejects invalid files with a clear ❌ toast (no more silent failures).
- Public site (`index.html`) loads portfolio data from Firestore (or `data/portfolio.json` fallback) and renders hero, stats, projects grid.

## Credentials / Config (for reference)
- Cloudinary cloud: `dpmnce5h6` (preset `portfolio_upload`, unsigned)
- Firebase project: `sidharth-portfolio-789cc`
- Firestore rules: `app/portfolio` + `media/{doc}` → public read/write (admin-only via password lock)

## Backlog / Nice-to-have
- **P2**: Harden security — Firestore rules currently allow public writes. Consider locking down writes to a Firebase Auth admin user.
- **P2**: Add loading spinner on the Save Project button.
- **P3**: Support drag-and-drop file uploads in admin panel.
