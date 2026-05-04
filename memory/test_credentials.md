# Test Credentials

## Admin Panel
- URL: http://localhost:3000/admin.html (or preview URL /admin.html)
- Password: `admin123`
- How to login: Enter password in the input field and click "UNLOCK" button
- The password is base64 encoded as `YWRtaW4xMjM=` in admin.js

## Portfolio (Public)
- URL: http://localhost:3000/index.html (or preview URL)
- No login required for viewing
- Data loaded from localStorage (if exists) OR data/portfolio.json (default)

## Notes
- All changes made in admin are saved to localStorage
- To make changes permanent, use "Download JSON" and replace data/portfolio.json
- Admin session stays active until browser cache is cleared or "Lock Panel" is clicked
