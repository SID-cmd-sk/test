# Test Credentials

## Admin Panel
- URL: `/admin.html`
- Default password: `admin123` (base64-encoded in `admin.js` — user is advised to change it via Security tab after first login)
- Change password: Admin → **Security** panel
- Lockout: 5 failed attempts → 5 min lockout (stored in localStorage `pf_lockout`)
- Reset password: removes custom password, reverts to `admin123`

## Third-party services
- Cloudinary: cloud `dpmnce5h6`, preset `portfolio_upload` (unsigned)
- Firebase: project `sidharth-portfolio-789cc` (public Firestore rules)
