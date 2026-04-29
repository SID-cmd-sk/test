/* ============================================================
   ADMIN JS v2 — Password Lock + Magnetic Cursor + Media
   ============================================================ */

/* ═══════════════════════════════════════════════════════════
   PASSWORD LOCK SYSTEM
   ═══════════════════════════════════════════════════════════ */
const LOCK_KEY    = 'pf_admin_pwd';
const SESSION_KEY = 'pf_admin_session';
const DEFAULT_PWD = atob('YWRtaW4xMjM='); // base64 encoded — change via admin panel immediately
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINS = 5;

let attempts = 0;
let isLocked = false;

function getPassword()   { return localStorage.getItem(LOCK_KEY) || DEFAULT_PWD; }
function isSessionValid(){ return sessionStorage.getItem(SESSION_KEY) === 'ok'; }
function startSession()  { sessionStorage.setItem(SESSION_KEY, 'ok'); }
function endSession()    { sessionStorage.removeItem(SESSION_KEY); }

function checkLockout() {
  const lockoutUntil = parseInt(localStorage.getItem('pf_lockout') || '0');
  if (Date.now() < lockoutUntil) {
    const mins = Math.ceil((lockoutUntil - Date.now()) / 60000);
    setLockError(`Too many attempts. Locked for ${mins} min.`);
    document.getElementById('lock-btn') && (document.querySelector('.lock-btn').disabled = true);
    return true;
  }
  return false;
}

function tryUnlock() {
  if (checkLockout()) return;
  const input = document.getElementById('lock-pwd').value;
  if (input === getPassword()) {
    // Success
    attempts = 0;
    localStorage.removeItem('pf_lockout');
    startSession();
    unlockAdmin();
  } else {
    attempts++;
    renderAttemptDots();
    document.getElementById('lock-pwd').classList.add('error');
    setTimeout(() => document.getElementById('lock-pwd').classList.remove('error'), 500);
    document.getElementById('lock-pwd').value = '';

    if (attempts >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_MINS * 60000;
      localStorage.setItem('pf_lockout', until);
      setLockError(`Too many attempts. Locked for ${LOCKOUT_MINS} min.`);
      document.querySelector('.lock-btn').disabled = true;
    } else {
      setLockError(`Incorrect password. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining.`);
    }
  }
}

function setLockError(msg) {
  document.getElementById('lock-error').textContent = msg;
}

function renderAttemptDots() {
  const container = document.getElementById('lock-attempts');
  container.innerHTML = Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
    `<div class="lock-attempt-dot${i < attempts ? ' used' : ''}"></div>`
  ).join('');
}

function togglePwd() {
  const inp = document.getElementById('lock-pwd');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  document.getElementById('eye-btn').textContent = inp.type === 'password' ? '👁' : '🙈';
}

function unlockAdmin() {
  const lock = document.getElementById('lock-screen');
  const ui   = document.getElementById('admin-ui');
  lock.classList.add('hidden');
  setTimeout(() => {
    ui.style.display = 'flex';
    loadData();
  }, 600);
}

function lockAdmin() {
  endSession();
  const ui   = document.getElementById('admin-ui');
  const lock = document.getElementById('lock-screen');
  ui.style.display = 'none';
  lock.classList.remove('hidden');
  document.getElementById('lock-pwd').value = '';
  setLockError('');
  renderAttemptDots();
  attempts = 0;
}

function changePassword() {
  const cur     = document.getElementById('pwd-current').value;
  const newPwd  = document.getElementById('pwd-new').value;
  const confirm = document.getElementById('pwd-confirm').value;

  if (cur !== getPassword()) { showToast('Current password is incorrect.'); return; }
  if (newPwd.length < 6)     { showToast('New password must be at least 6 characters.'); return; }
  if (newPwd !== confirm)    { showToast('Passwords do not match.'); return; }

  localStorage.setItem(LOCK_KEY, newPwd);
  ['pwd-current','pwd-new','pwd-confirm'].forEach(id => document.getElementById(id).value = '');
  showToast('✅ Password changed! Remember your new password.');
}

function resetPassword() {
  showConfirm('Reset password to default?', () => {
    localStorage.removeItem(LOCK_KEY);
    showToast('Password reset to default. Please change it immediately.');
  });
}

/* ═══════════════════════════════════════════════════════════
   ADMIN CURSOR — free dot + lagging ring, no magnetic pull
   ═══════════════════════════════════════════════════════════ */
(function initAdminCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const dot  = document.getElementById('adm-cursor-dot');
  const ring = document.getElementById('adm-cursor-ring');
  if (!dot || !ring) return;

  let mX = innerWidth/2, mY = innerHeight/2;
  let rX = mX, rY = mY;

  document.addEventListener('mousemove', e => { mX = e.clientX; mY = e.clientY; });

  function frame() {
    dot.style.left = mX + 'px';
    dot.style.top  = mY + 'px';
    rX += (mX - rX) * 0.13;
    rY += (mY - rY) * 0.13;
    ring.style.left = rX + 'px';
    ring.style.top  = rY + 'px';
    requestAnimationFrame(frame);
  }
  frame();

  // Visual ring feedback on interactive elements — cursor stays free
  const HOVER = 'a, button, input, select, textarea, .nav-item, .stat-card';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(HOVER)) {
      ring.style.width = '50px'; ring.style.height = '50px';
      ring.style.borderColor = 'rgba(0,200,255,0.9)';
      dot.style.opacity = '0.35';
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(HOVER)) {
      ring.style.width = '36px'; ring.style.height = '36px';
      ring.style.borderColor = 'rgba(0,200,255,0.45)';
      dot.style.opacity = '1';
    }
  });

  document.addEventListener('mousedown', () => {
    ring.style.transform = 'translate(-50%,-50%) scale(0.65)';
    setTimeout(() => ring.style.transform = 'translate(-50%,-50%) scale(1)', 300);
  });
  document.addEventListener('mouseleave', () => { dot.style.opacity='0'; ring.style.opacity='0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity='1'; ring.style.opacity='1'; });
})();

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */
let DATA = {};

async function loadData() {
  try {
    const saved = localStorage.getItem('portfolio_data');
    DATA = saved ? JSON.parse(saved) : await (await fetch('data/portfolio.json')).json();
  } catch {
    try { DATA = await (await fetch('data/portfolio.json')).json(); } catch { DATA = { meta:{}, projects:[], skills:[], experience:[], certifications:[], about:'' }; }
  }
  // Ensure arrays exist
  ['projects','skills','experience','certifications'].forEach(k => { if (!DATA[k]) DATA[k] = []; });
  DATA.projects.forEach(p => {
    if (!p.photos)   p.photos   = [];
    if (!p.videos)   p.videos   = [];
    if (!p.model3d)  p.model3d  = null;
  });
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderProjectsTable();
  renderSkillsList();
  renderExpList();
  renderCertsList();
  renderMetaForm();
  refreshJSON();
}

/* ─── PANEL NAV ──────────────────────────────────────────── */
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(name)) n.classList.add('active');
  });
}

/* ─── DASHBOARD ──────────────────────────────────────────── */
function renderDashboard() {
  const stats = [
    { num: DATA.projects.length,       label: 'Projects' },
    { num: DATA.certifications.length, label: 'Certifications' },
    { num: DATA.skills.length,         label: 'Skills' },
    { num: DATA.experience.length,     label: 'Experiences' },
    { num: DATA.projects.filter(p=>p.model3d).length,  label: '3D Models' },
    { num: DATA.projects.filter(p=>p.photos?.length>0).length, label: 'With Photos' },
  ];
  document.getElementById('stats-row').innerHTML = stats.map(s => `
    <div class="stat-card"><div class="stat-card-num">${s.num}</div><div class="stat-card-label">${s.label}</div></div>`).join('');

  document.getElementById('dash-recent').innerHTML = DATA.projects.slice(0, 4).map(p => {
    const mIcons = [p.model3d?'🔷':'', p.photos?.length?'📷':'', p.videos?.length?'▶':''].filter(Boolean).join(' ');
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.8rem 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <div><div style="color:var(--text);font-size:.9rem;font-weight:500;">${p.title}</div>
        <div style="font-size:.72rem;color:var(--text-dim);">${p.category} · ${p.tools.join(', ')} ${mIcons?'·':''} ${mIcons}</div></div>
      ${p.featured?'<span class="badge badge-featured">Featured</span>':''}
    </div>`;
  }).join('');
}

/* ─── PROJECTS ───────────────────────────────────────────── */
function renderProjectsTable() {
  document.getElementById('projects-table').innerHTML = DATA.projects.map((p, i) => {
    const mediaIcons = [p.model3d?'🔷':'', p.photos?.length?`📷${p.photos.length}`:'', p.videos?.length?`▶${p.videos.length}`:''].filter(Boolean).join(' ');
    return `<tr>
      <td style="color:var(--text);font-weight:500;">${p.title}</td>
      <td><span class="badge badge-cat">${p.category}</span></td>
      <td style="font-size:.72rem;letter-spacing:1px;">${mediaIcons||'—'}</td>
      <td>${p.featured?'<span class="badge badge-featured">Yes</span>':'<span style="color:var(--text-dim);font-size:.72rem;">No</span>'}</td>
      <td><div style="display:flex;gap:.35rem;">
        <button class="btn btn-ghost btn-sm" onclick="editProject(${i})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteItem('projects',${i})">Del</button>
      </div></td>
    </tr>`;
  }).join('');
}

/* Photo rows */
let photoRows = [], videoRows = [];

function addPhotoRow(url='', caption='') {
  const id = Date.now() + Math.random();
  photoRows.push(id);
  const div = document.createElement('div');
  div.className = 'media-row'; div.id = `photo-row-${id}`;
  div.innerHTML = `
    <span class="media-row-label">URL</span>
    <input type="text" value="${url}" placeholder="https://... (image URL)" class="photo-url-${id}" style="flex:2;" />
    <input type="text" value="${caption}" placeholder="Caption (optional)" class="photo-cap-${id}" style="flex:1;" />
    <button class="btn btn-danger btn-sm" onclick="removeRow('photo-row-${id}')">✕</button>`;
  document.getElementById('photos-container').appendChild(div);
}

function addVideoRow(type='youtube', id='', url='', caption='') {
  const rid = Date.now() + Math.random();
  videoRows.push(rid);
  const div = document.createElement('div');
  div.className = 'media-row'; div.id = `video-row-${rid}`;
  div.innerHTML = `
    <span class="media-row-label">Type</span>
    <select class="vtype-${rid}" onchange="toggleVideoFields(${rid})">
      <option value="youtube"${type==='youtube'?' selected':''}>YouTube</option>
      <option value="direct"${type==='direct'?' selected':''}>Direct URL</option>
    </select>
    <input type="text" value="${type==='youtube'?id:url}" placeholder="${type==='youtube'?'YouTube video ID (e.g. dQw4w9WgXcQ)':'Direct video URL (.mp4)'}" class="vval-${rid}" style="flex:2;" />
    <input type="text" value="${caption}" placeholder="Caption" class="vcap-${rid}" style="flex:1;" />
    <button class="btn btn-danger btn-sm" onclick="removeRow('video-row-${rid}')">✕</button>`;
  document.getElementById('videos-container').appendChild(div);
}

function toggleVideoFields(rid) {
  const sel = document.querySelector(`.vtype-${rid}`);
  const inp = document.querySelector(`.vval-${rid}`);
  inp.placeholder = sel.value==='youtube' ? 'YouTube video ID (e.g. dQw4w9WgXcQ)' : 'Direct video URL (.mp4)';
}

function removeRow(id) { document.getElementById(id)?.remove(); }

function collectPhotos() {
  const rows = document.querySelectorAll('#photos-container .media-row');
  const photos = [];
  rows.forEach(row => {
    const urlEl  = row.querySelector('[class*="photo-url-"]');
    const capEl  = row.querySelector('[class*="photo-cap-"]');
    const url    = urlEl?.value.trim();
    if (url) photos.push({ url, caption: capEl?.value.trim() || '' });
  });
  return photos;
}

function collectVideos() {
  const rows = document.querySelectorAll('#videos-container .media-row');
  const videos = [];
  rows.forEach(row => {
    const typeEl = row.querySelector('[class*="vtype-"]');
    const valEl  = row.querySelector('[class*="vval-"]');
    const capEl  = row.querySelector('[class*="vcap-"]');
    const type   = typeEl?.value || 'youtube';
    const val    = valEl?.value.trim();
    const cap    = capEl?.value.trim() || '';
    if (val) {
      if (type === 'youtube') videos.push({ type:'youtube', id: val, caption: cap });
      else                    videos.push({ type:'direct',  url: val, caption: cap });
    }
  });
  return videos;
}

function collect3DModel() {
  const url = document.getElementById('model-url').value.trim();
  const fmt = document.getElementById('model-format').value;
  if (!url) return null;
  return { url, format: fmt || guessFormat(url) };
}
function guessFormat(url) {
  const ext = url.split('.').pop().toLowerCase().split('?')[0];
  return ['stl','obj','gltf','glb'].includes(ext) ? ext : 'stl';
}

function saveProject() {
  const title = document.getElementById('proj-title').value.trim();
  const desc  = document.getElementById('proj-desc').value.trim();
  if (!title || !desc) { showToast('Title and description are required.'); return; }

  const editId = document.getElementById('proj-edit-id').value;
  const project = {
    id:         editId || 'p' + Date.now(),
    title,
    category:   document.getElementById('proj-cat').value,
    tools:      document.getElementById('proj-tools').value.split(',').map(t=>t.trim()).filter(Boolean),
    description: desc,
    highlights: document.getElementById('proj-highlights').value.split('\n').map(h=>h.trim()).filter(Boolean),
    image:      '',
    featured:   document.getElementById('proj-featured').value === 'true',
    photos:     collectPhotos(),
    videos:     collectVideos(),
    model3d:    collect3DModel(),
  };

  if (editId) {
    const idx = DATA.projects.findIndex(p => p.id === editId);
    if (idx !== -1) DATA.projects[idx] = project;
    else DATA.projects.push(project);
  } else {
    DATA.projects.push(project);
  }

  saveToStorage();
  renderProjectsTable();
  renderDashboard();
  clearProjectForm();
  showToast(editId ? '✅ Project updated!' : '✅ Project added!');
}

function clearProjectForm() {
  document.getElementById('proj-edit-id').value = '';
  ['proj-title','proj-desc','proj-tools','proj-highlights','model-url'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('proj-cat').value     = 'CAD';
  document.getElementById('proj-featured').value = 'false';
  document.getElementById('model-format').value  = '';
  document.getElementById('photos-container').innerHTML = '';
  document.getElementById('videos-container').innerHTML = '';
  photoRows = []; videoRows = [];
}

function editProject(i) {
  const p = DATA.projects[i];
  document.getElementById('proj-edit-id').value      = p.id;
  document.getElementById('proj-title').value        = p.title;
  document.getElementById('proj-desc').value         = p.description;
  document.getElementById('proj-tools').value        = p.tools.join(', ');
  document.getElementById('proj-highlights').value   = p.highlights.join('\n');
  document.getElementById('proj-cat').value          = p.category;
  document.getElementById('proj-featured').value     = p.featured ? 'true' : 'false';
  document.getElementById('model-url').value         = p.model3d?.url  || '';
  document.getElementById('model-format').value      = p.model3d?.format || '';

  // Clear and repopulate media rows
  document.getElementById('photos-container').innerHTML = '';
  document.getElementById('videos-container').innerHTML = '';
  photoRows = []; videoRows = [];
  (p.photos  || []).forEach(ph => addPhotoRow(ph.url, ph.caption));
  (p.videos  || []).forEach(v  => addVideoRow(v.type, v.id||'', v.url||'', v.caption));

  showPanel('projects');
  // Scroll to form
  document.querySelector('#panel-projects .card')?.scrollIntoView({ behavior:'smooth', block:'start' });
  showToast('Project loaded for editing.');
}

/* ─── SKILLS ─────────────────────────────────────────────── */
function renderSkillsList() {
  document.getElementById('skills-list').innerHTML = DATA.skills.map((s, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.7rem 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <div>
        <span style="color:var(--text);font-size:.9rem;">${s.name}</span>
        <span style="margin-left:.8rem;font-family:var(--font-mono);font-size:.7rem;color:var(--neon);">${s.level}%</span>
        <span class="badge badge-cat" style="margin-left:.5rem;">${s.category}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteItem('skills',${i})">Remove</button>
    </div>`).join('');
}

function addSkill() {
  const name  = document.getElementById('skill-name').value.trim();
  const level = parseInt(document.getElementById('skill-level').value);
  if (!name || isNaN(level)) { showToast('Name and level required.'); return; }
  DATA.skills.push({ name, level: Math.min(100, Math.max(0, level)), category: document.getElementById('skill-cat').value });
  saveToStorage(); renderSkillsList();
  document.getElementById('skill-name').value = ''; document.getElementById('skill-level').value = '';
  showToast('✅ Skill added!');
}

/* ─── EXPERIENCE ─────────────────────────────────────────── */
function renderExpList() {
  document.getElementById('exp-list').innerHTML = DATA.experience.map((e, i) => `
    <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;margin-bottom:.8rem;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="color:var(--text-bright);font-size:.9rem;font-weight:600;">${e.role}</div>
          <div style="color:var(--neon2);font-size:.8rem;">${e.company}</div>
          <div style="font-family:var(--font-mono);font-size:.68rem;color:var(--text-dim);margin-top:.2rem;">${e.period}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteItem('experience',${i})">Remove</button>
      </div>
    </div>`).join('');
}

function addExperience() {
  const company = document.getElementById('exp-company').value.trim();
  const role    = document.getElementById('exp-role').value.trim();
  if (!company || !role) { showToast('Company and role required.'); return; }
  DATA.experience.unshift({
    id: 'exp'+Date.now(), company, role,
    period:     document.getElementById('exp-period').value,
    type:       document.getElementById('exp-type').value,
    description:document.getElementById('exp-desc').value,
    highlights: document.getElementById('exp-highlights').value.split('\n').map(h=>h.trim()).filter(Boolean),
  });
  saveToStorage(); renderExpList(); renderDashboard();
  ['exp-company','exp-role','exp-period','exp-desc','exp-highlights'].forEach(id => document.getElementById(id).value='');
  showToast('✅ Experience added!');
}

/* ─── CERTIFICATIONS ─────────────────────────────────────── */
function renderCertsList() {
  document.getElementById('certs-list').innerHTML = DATA.certifications.map((c, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:.7rem 0;border-bottom:1px solid rgba(255,255,255,.05);">
      <div>
        <div style="color:var(--text);font-size:.85rem;">${c.name}</div>
        <div style="color:var(--text-dim);font-size:.72rem;">${c.issuer} · <span style="color:var(--neon);">${c.level}</span></div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteItem('certifications',${i})">Remove</button>
    </div>`).join('');
}

function addCert() {
  const name = document.getElementById('cert-name').value.trim();
  if (!name) { showToast('Name required.'); return; }
  DATA.certifications.push({ id:'c'+Date.now(), name, issuer: document.getElementById('cert-issuer').value.trim(), level: document.getElementById('cert-level').value });
  saveToStorage(); renderCertsList(); renderDashboard();
  document.getElementById('cert-name').value = ''; document.getElementById('cert-issuer').value = '';
  showToast('✅ Certification added!');
}

/* ─── META ───────────────────────────────────────────────── */
function renderMetaForm() {
  const m = DATA.meta || {};
  const map = { 'meta-name':m.name,'meta-title':m.title,'meta-email':m.email,'meta-phone':m.phone,'meta-location':m.location,'meta-about':DATA.about,'meta-ga':DATA.analytics?.googleAnalyticsId };
  Object.entries(map).forEach(([id,val]) => { const el=document.getElementById(id); if(el&&val) el.value=val; });
}

function saveMeta() {
  DATA.meta = DATA.meta||{};
  DATA.meta.name     = document.getElementById('meta-name').value;
  DATA.meta.title    = document.getElementById('meta-title').value;
  DATA.meta.email    = document.getElementById('meta-email').value;
  DATA.meta.phone    = document.getElementById('meta-phone').value;
  DATA.meta.location = document.getElementById('meta-location').value;
  DATA.about         = document.getElementById('meta-about').value;
  DATA.analytics     = DATA.analytics || {};
  DATA.analytics.googleAnalyticsId = document.getElementById('meta-ga').value;
  saveToStorage(); showToast('✅ Profile saved!');
}

/* ─── JSON EDITOR ────────────────────────────────────────── */
function refreshJSON() {
  const el = document.getElementById('json-editor');
  if (el) el.value = JSON.stringify(DATA, null, 2);
}
function applyJSON() {
  try {
    DATA = JSON.parse(document.getElementById('json-editor').value);
    saveToStorage(); renderAll(); showToast('✅ JSON applied!');
  } catch(e) { showToast('❌ Invalid JSON: ' + e.message); }
}

/* ─── STORAGE / DOWNLOAD ─────────────────────────────────── */
function saveToStorage() {
  localStorage.setItem('portfolio_data', JSON.stringify(DATA));
  refreshJSON();
}
function downloadJSON() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'portfolio.json';
  a.click();
  showToast('📥 JSON downloaded! Replace data/portfolio.json with this file.');
}
function resetData() {
  showConfirm('Reset all data to defaults from JSON file?', () => {
    localStorage.removeItem('portfolio_data'); location.reload();
  });
}

/* ─── DELETE ─────────────────────────────────────────────── */
function deleteItem(collection, index) {
  showConfirm(`Delete this ${collection.slice(0,-1)}? Cannot be undone.`, () => {
    DATA[collection].splice(index, 1);
    saveToStorage(); renderAll(); showToast('Item deleted.');
  });
}

/* ─── CONFIRM MODAL ──────────────────────────────────────── */
function showConfirm(msg, cb) {
  document.getElementById('confirm-desc').textContent = msg;
  document.getElementById('confirm-modal').classList.add('open');
  document.getElementById('confirm-yes').onclick = () => { cb(); closeConfirm(); };
}
function closeConfirm() { document.getElementById('confirm-modal').classList.remove('open'); }

/* ─── TOAST ──────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ─── BOOT ───────────────────────────────────────────────── */
// Check for lockout on load
checkLockout();
// Render attempt dots
renderAttemptDots();
// If session is valid, skip lock screen
if (isSessionValid()) {
  unlockAdmin();
}
// Allow Enter key on lock screen
document.getElementById('lock-pwd')?.addEventListener('keydown', e => { if(e.key==='Enter') tryUnlock(); });