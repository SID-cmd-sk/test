# Portfolio PRD — Sidharth (CAD/CAM Engineer)

**Type**: Static HTML Portfolio (index.html + script.js + admin.js + data/portfolio.json)  
**Last Updated**: May 2026

---

## Architecture
- **Frontend**: Pure HTML/CSS/JS (no framework)
- **Storage**: localStorage (admin edits) + `data/portfolio.json` (defaults/repo)
- **Animations**: GSAP + ScrollTrigger + CSS custom animations
- **3D Viewer**: Three.js (loaded on demand from CDN)
- **Served**: Python HTTP server on port 3000 from `/app/`

---

## Core Requirements (Static)
1. Portfolio showcases CAD/CAM projects with media (photos, videos, 3D models)
2. Admin panel (`/admin.html`) with password protection for content management
3. Certifications displayed with optional clickable certificate images
4. Contact form with WhatsApp/Email/LinkedIn
5. 3D model viewer supporting STL, OBJ, GLTF/GLB (SolidWorks exports)

---

## What's Been Implemented

### May 2026 — Major Bug Fixes & Enhancements
1. **CRITICAL BUG FIX**: `mediaUrl()` - data: URLs (base64 from admin uploads) were incorrectly getting `data/media/` prepended. Now pass-through as-is. This was the root cause of "photos/videos not visible in project" issue.
2. **Media Slider Rewrite** (`buildModalMedia()`):
   - Videos autoplay (muted) when their slide is shown
   - Multiple photos AND videos all accessible in sequential slides
   - 3D model displayed at 500px height (maximum available)
   - Slide dot navigation (clickable)
   - Keyboard arrow navigation (← →)
   - Touch swipe support
   - Fade+slide transition between slides
3. **Close Modal Fix**: Now properly stops video playback, disposes 3D viewer, removes keyboard handlers
4. **STL Loader Fix**: Now supports both Binary AND ASCII STL formats (SolidWorks exports ASCII by default)
5. **Error Display**: 3D model load failures now show a clear error with supported formats — no fake "demo model"
6. **YouTube Thumbnails**: Project cards now show YouTube video thumbnail as preview image
7. **Counter Animation**: Hero stats (10+ certs, 2+ years, 6+ projects) count up on page reveal with easing
8. **3D Card Tilt**: Project cards tilt in 3D based on mouse position (perspective effect)
9. **Shimmer Sweep**: Light sweep animation on project card hover
10. **Mobile Layout**: Better responsive CSS at 900px and 600px breakpoints
11. **Admin: Cert Image Preview**: Preview shows immediately after uploading certificate image
12. **Admin: File Size Warnings**: Warns if photos > 3MB, videos > 20MB, 3D files > 10MB
13. **Admin: SolidWorks Guidance**: Clear guide for exporting from SolidWorks (STL/OBJ recommended)
14. **Admin: Media Storage Guide**: Link to `data/media/README.md` with folder structure docs
15. **Cert Visual Indicator**: Cards with images show "CLICK TO VIEW" label and left border glow
16. **Hero Visual Float**: Avatar ring has floating + glow pulse animation
17. **Created `data/media/` folder structure**: photos/, videos/, models/, certs/ subdirs + README

---

## Data
- `data/portfolio.json`: 10 certifications, 6 projects, 2 experiences, 8 skills
- Projects currently have empty photos/videos arrays — user will upload via admin
- Certifications currently have no images — user will upload via admin

---

## Prioritized Backlog
### P0 (Blocking)
- None currently

### P1 (Important)
- Add actual project photos/videos/3D models via admin panel
- Add certificate images via admin panel
- Download JSON and commit to repo to make changes permanent

### P2 (Enhancement)
- Add a "Download Resume" button in hero section
- Add image lightbox/zoom for project photos
- Add GitHub/project links to project cards
- Video thumbnail for direct .mp4 videos (not just YouTube)
- Drag-to-reorder projects in admin panel

### Future/Backlog
- PWA support (offline access)
- Dark/light theme toggle
- Contact form email sending (backend needed)
- Multiple language support
