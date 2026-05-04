# Media Storage Guide

This folder stores all project media files referenced in the portfolio.

## Folder Structure
```
data/media/
├── photos/      → Project photos (.jpg, .png, .webp)
├── videos/      → Project videos (.mp4, .webm)
├── models/      → 3D model files (.stl, .obj, .gltf, .glb)
└── certs/       → Certification images (.jpg, .png)
```

## How to Reference Files in Admin Panel

When adding media via the Admin Panel, you can either:

1. **Upload file directly** — The file is stored in browser localStorage as base64 (suitable for images < 2MB)

2. **Paste a relative path** (recommended for large files / repo storage):
   - Photos: `photos/my-part.jpg`
   - Videos: `videos/cnc-demo.mp4`
   - Models: `models/bracket.stl`
   - Certs: `certs/cswp-certificate.jpg`

3. **Paste a full URL** — For YouTube videos, Google Drive links, or any hosted URL

## SolidWorks 3D Model Export Guide

SolidWorks cannot be displayed directly in browser. Export your part/assembly using one of:

| SolidWorks Export | Browser Format | Quality |
|-------------------|---------------|---------|
| File > Save As > STL | `.stl` | Good |
| File > Save As > OBJ | `.obj` | Good |
| File > Save As > GLTF (with plugin) | `.glb` | Best |

**Recommended:** Export as STL (binary format, smaller file size)

## File Size Limits

- **Images**: Keep under 2MB for smooth browser loading
- **Videos**: Use YouTube for best performance; or keep local .mp4 under 10MB
- **3D Models**: STL files should be under 5MB for browser rendering. Simplify geometry if needed.

## After Adding Files

After pushing files to the repo, reference them in the Admin Panel using the relative path (e.g., `photos/my-project.jpg`).

Remember to **Download JSON** from Admin Panel and replace `data/portfolio.json` to make changes permanent.
