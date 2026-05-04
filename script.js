
gsap.registerPlugin(ScrollTrigger);
let DATA = {};
let viewer3D = null;
let currentProject = null;
let mediaKeyHandler = null;

/* ─── SANITIZE HELPER (XSS prevention) ──────────────────── */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function mediaUrl(url) {
  if (!url) return '';
  // data: URLs (base64), absolute URLs, and explicit paths pass through unchanged
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || url.startsWith('data:')) return url;
  return `data/media/${url}`;
}

/* ─── DATA LOAD ──────────────────────────────────────────── */
async function loadData() {
  try {
    const saved = localStorage.getItem('portfolio_data');
    if (saved) {
      DATA = JSON.parse(saved);
    } else {
      const res = await fetch('data/portfolio.json');
      if (!res.ok) throw new Error('portfolio.json not found: ' + res.status);
      DATA = await res.json();
    }
  } catch(e) {
    console.error('loadData failed:', e);
    // Fallback — loader always dismisses, page never gets stuck
    DATA = {
      meta:{ name:'Sidharth', email:'sidharthkr1859@gmail.com', phone:'7042071859',
             location:'Badarpur, South Delhi, Delhi – 110044',
             mapLink:'https://maps.app.goo.gl/LqedMJfe462tszBo8',
             socialLinks:{ linkedin:'https://www.linkedin.com/in/sidharth-kumar-6a4610333', github:'https://github.com/sid-cmd-sk' }},
      about:'Application Engineer with hands-on expertise in SolidWorks, SolidCAM, and DraftSight.',
      skills:[], experience:[], education:[], projects:[], certifications:[]
    };
  }
  init(); // Always runs — loader can never get stuck
}

/* ─── INIT ───────────────────────────────────────────────── */
function init() {
  initLoader();
  initMagneticCursor();
  initParticles();
  initNavbar();
  renderHero();
  renderAbout();
  renderTimeline();
  renderEducation();
  renderProjects();
  renderCertifications();
  renderContact();
  initScrollProgress();
  initScrollAnimations();
  initContactForm();
  document.getElementById('yr').textContent = new Date().getFullYear();
}

/* ─── LOADER ─────────────────────────────────────────────── */
function initLoader() {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    triggerHeroAnimation();
  }, 1600);
}

/* ═══════════════════════════════════════════════════════════
   CURSOR — skip entirely on touch devices
   ═══════════════════════════════════════════════════════════ */
const cursor = { x: innerWidth / 2, y: innerHeight / 2 };

function initMagneticCursor() {
  // Skip on touch/mobile — no wasted RAF loop
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  document.documentElement.style.cursor = 'none';

  let ringX = cursor.x, ringY = cursor.y;

  document.addEventListener('mousemove', e => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  });

  function animate() {
    dot.style.left = cursor.x + 'px';
    dot.style.top  = cursor.y + 'px';
    ringX += (cursor.x - ringX) * 0.13;
    ringY += (cursor.y - ringY) * 0.13;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animate);
  }
  animate();

  document.addEventListener('mousedown', () => {
    gsap.to(ring, { scale: 0.6, duration: 0.12, ease: 'power2.out', overwrite: true });
    gsap.to(dot,  { scale: 2.2, duration: 0.12, ease: 'power2.out', overwrite: true });
  });
  document.addEventListener('mouseup', () => {
    gsap.to(ring, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)', overwrite: true });
    gsap.to(dot,  { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
  });

  const HOVER_ELS = 'a, button, .project-card, .filter-btn, .cert-card';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(HOVER_ELS)) {
      gsap.to(ring, { width: 54, height: 54, borderColor: 'rgba(0,200,255,0.9)', duration: 0.25, overwrite: true });
      gsap.to(dot,  { opacity: 0.35, scale: 0.5, duration: 0.2, overwrite: true });
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(HOVER_ELS)) {
      gsap.to(ring, { width: 36, height: 36, borderColor: 'rgba(0,200,255,0.45)', duration: 0.3, overwrite: true });
      gsap.to(dot,  { opacity: 1, scale: 1, duration: 0.25, overwrite: true });
    }
  });

  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
}

/* ═══════════════════════════════════════════════════════════
   PARTICLES — pauses when tab hidden to save CPU/battery
   ═══════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('bg-particles');
  const ctx    = canvas.getContext('2d');
  let W = canvas.width  = innerWidth;
  let H = canvas.height = innerHeight;

  const CONNECT_DIST = 160;
  const REPEL_DIST   = 80;
  const REPEL_FORCE  = 0.6;

  const pts = Array.from({ length: 70 }, () => ({
    x:  Math.random() * W,
    y:  Math.random() * H,
    r:  Math.random() * 1.3 + 0.3,
    vx: (Math.random() - 0.5) * 0.22,
    vy: (Math.random() - 0.5) * 0.22,
    a:  Math.random() * 0.35 + 0.08,
  }));

  let raf;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const mx = cursor.x, my = cursor.y;

    pts.forEach(p => {
      const cdx = p.x - mx, cdy = p.y - my;
      const cdist = Math.hypot(cdx, cdy);
      if (cdist < REPEL_DIST && cdist > 0) {
        const force = (1 - cdist / REPEL_DIST) * REPEL_FORCE;
        p.vx += (cdx / cdist) * force * 0.08;
        p.vy += (cdy / cdist) * force * 0.08;
      }
      p.vx *= 0.99; p.vy *= 0.99;
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,200,255,${p.a})`;
      ctx.fill();
    });

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 110) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(0,200,255,${0.07 * (1 - d / 110)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    pts.forEach(p => {
      const dx = p.x - mx, dy = p.y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < CONNECT_DIST) {
        const alpha = (1 - dist / CONNECT_DIST);
        const grad = ctx.createLinearGradient(p.x, p.y, mx, my);
        grad.addColorStop(0, `rgba(0,200,255,${alpha * 0.3 * 0.55})`);
        grad.addColorStop(1, `rgba(0,200,255,${alpha * 0.55})`);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mx, my);
        ctx.strokeStyle = grad;
        ctx.lineWidth = alpha * 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + alpha * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,255,${p.a + alpha * 0.4})`;
        ctx.fill();
      }
    });

    const glowGrad = ctx.createRadialGradient(mx, my, 0, mx, my, CONNECT_DIST * 0.4);
    glowGrad.addColorStop(0, 'rgba(0,200,255,0.06)');
    glowGrad.addColorStop(1, 'rgba(0,200,255,0)');
    ctx.beginPath();
    ctx.arc(mx, my, CONNECT_DIST * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    raf = requestAnimationFrame(draw);
  }
  draw();

  // Pause when tab is hidden — saves CPU/battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else draw();
  });

  window.addEventListener('resize', () => {
    W = canvas.width  = innerWidth;
    H = canvas.height = innerHeight;
  });
}

/* ─── NAVBAR ─────────────────────────────────────────────── */
function initNavbar() {
  window.addEventListener('scroll', () =>
    document.getElementById('navbar').classList.toggle('scrolled', scrollY > 50));
  document.getElementById('hamburger')?.addEventListener('click', () =>
    document.getElementById('nav-links').classList.toggle('open'));
}

/* ─── SCROLL PROGRESS ────────────────────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () =>
    bar.style.width = (scrollY / (document.body.scrollHeight - innerHeight) * 100) + '%');
}

/* ─── HERO ───────────────────────────────────────────────── */
function renderHero() {
  document.getElementById('hero-desc').textContent = DATA.about;
  // Dynamic stats — auto-updates as you add more data
  const certCount = DATA.certifications?.length || 10;
  const projCount = DATA.projects?.length || 5;
  const nums = document.querySelectorAll('.stat-num');
  // Initialize stats at 0 — animateCounter will count up during reveal animation
  if (nums[0]) nums[0].textContent = '0+';
  if (nums[2]) nums[2].textContent = '0+';
}
function triggerHeroAnimation() {
  gsap.set(['#hero-badge','#hero-name','#hero-title','#hero-desc','#hero-btns','#hero-stats'], { y: 30 });
  gsap.set('#hero-visual', { x: 50 });
  const tl = gsap.timeline();
  tl.to('#hero-badge',  { opacity:1, y:0, duration:.6, ease:'power3.out' }, .1)
    .to('#hero-name',   { opacity:1, y:0, duration:.7, ease:'power3.out' }, .25)
    .to('#hero-title',  { opacity:1, y:0, duration:.6, ease:'power3.out' }, .4)
    .to('#hero-desc',   { opacity:1, y:0, duration:.6, ease:'power3.out' }, .52)
    .to('#hero-btns',   { opacity:1, y:0, duration:.6, ease:'power3.out' }, .62)
    .to('#hero-stats',  { opacity:1, y:0, duration:.6, ease:'power3.out',
      onStart: () => {
        // Animate counters simultaneously with the stats reveal
        const nums = document.querySelectorAll('.stat-num');
        const targets = [DATA.certifications?.length || 10, 2, DATA.projects?.length || 5];
        nums.forEach((el, i) => { if (targets[i]) animateCounter(el, targets[i]); });
      }
    }, .72)
    .to('#hero-visual', { opacity:1, x:0, duration:.9, ease:'power3.out' }, .3);
}

function animateCounter(el, target, duration = 1400) {
  const start = Date.now();
  const update = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.floor(eased * target) + '+';
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ─── ABOUT ──────────────────────────────────────────────── */
function renderAbout() {
  document.getElementById('about-text').textContent = DATA.about;
  const m = DATA.meta;

  // Phone as clickable tel: link
  const phoneLink = m.phone
    ? `<a href="tel:+91${m.phone}" style="color:inherit">${m.phone}</a>`
    : '—';

  document.getElementById('info-list').innerHTML = [
    { icon:'📧', v:`<a href="mailto:${esc(m.email)}" style="color:var(--neon)">${esc(m.email)}</a>` },
    { icon:'📱', v:`<a href="https://wa.me/91${esc(m.phone)}?text=Hi" target="_blank" rel="noopener noreferrer" style="color:var(--neon3)">+91 ${esc(m.phone)} (WhatsApp)</a>` },
    { icon:'📍', v:`<a href="${esc(m.mapLink||'https://maps.app.goo.gl/LqedMJfe462tszBo8')}" target="_blank" rel="noopener noreferrer" style="color:var(--neon)">${esc(m.location)}</a>` },
    { icon:'💼', v:`<a href="${esc(m.socialLinks?.linkedin||'#')}" target="_blank" rel="noopener noreferrer" style="color:var(--neon)">LinkedIn Profile →</a>` },
  ].map(i=>`<div class="info-item"><div class="info-item-icon">${i.icon}</div><span>${i.v}</span></div>`).join('');

  document.getElementById('skills-panel').innerHTML = DATA.skills.slice(0, 6).map(s => `
    <div class="skill-item">
      <div class="skill-header">
        <span class="skill-name">${esc(s.name)}</span>
        <span class="skill-pct">${esc(String(s.level))}%</span>
      </div>
      <div class="skill-bar"><div class="skill-fill" data-level="${esc(String(s.level))}"></div></div>
    </div>`).join('');

  // Render skill tags
  const tagsEl = document.getElementById('skill-tags');
  if (tagsEl) {
    tagsEl.innerHTML = DATA.skills.map(s =>
      `<span class="skill-tag cat-${esc(s.category.toLowerCase())}">${esc(s.name)}</span>`
    ).join('');
  }
}

/* ─── TIMELINE ───────────────────────────────────────────── */
function renderTimeline() {
  document.getElementById('timeline').innerHTML = DATA.experience.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-meta">
        <span class="timeline-period">${esc(e.period)}</span>
        <span class="timeline-badge">${esc(e.type)}</span>
      </div>
      <div class="timeline-role">${esc(e.role)}</div>
      <div class="timeline-company">${esc(e.company)}</div>
      <p class="timeline-desc">${esc(e.description)}</p>
      <div class="timeline-pills">${e.highlights.map(h=>`<span class="pill">${esc(h)}</span>`).join('')}</div>
    </div>`).join('');
}

/* ─── EDUCATION ──────────────────────────────────────────── */
function renderEducation() {
  const container = document.getElementById('education-list');
  if (!container || !DATA.education?.length) return;
  container.innerHTML = DATA.education.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:var(--neon2);box-shadow:0 0 12px var(--neon2)"></div>
      <div class="timeline-meta">
        <span class="timeline-period" style="color:var(--neon2)">${esc(e.board)}</span>
      </div>
      <div class="timeline-role">${esc(e.degree)}</div>
      <div class="timeline-company" style="color:var(--neon)">${esc(e.institution)}</div>
      <p class="timeline-desc">${esc(e.description)}</p>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════
   PROJECTS — XSS-safe, fixed description truncation
   ═══════════════════════════════════════════════════════════ */
const CAT_ICON = {CAD:'🔷',CAM:'⚙️',CNC:'🔩',Programming:'💻',Training:'📚',Design:'✏️'};

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  const fg   = document.getElementById('filter-group');

  [...new Set(DATA.projects.map(p => p.category))].forEach(c => {
    const b = document.createElement('button');
    b.className = 'filter-btn';
    b.dataset.filter = c;
    b.textContent = c;
    b.setAttribute('aria-pressed', 'false');
    fg.appendChild(b);
  });

  grid.innerHTML = DATA.projects.map(p => {
    const has3D    = !!p.model3d;
    const hasPhoto = p.photos?.length > 0;
    const hasVideo = p.videos?.length > 0;
    const badges = [
      has3D    ? '<span class="media-badge badge-3d">3D</span>' : '',
      hasPhoto ? `<span class="media-badge badge-photo">📷 ${p.photos.length}</span>` : '',
      hasVideo ? `<span class="media-badge badge-video">▶ ${p.videos.length}</span>` : '',
    ].filter(Boolean).join('');

    const thumb = hasPhoto
      ? `<img src="${esc(mediaUrl(p.photos[0].url))}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;opacity:.75;" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.project-thumb-icon').style.display='flex'"/>
         <div class="project-thumb-icon" style="display:none;">${CAT_ICON[p.category] || '🔧'}</div>`
      : hasVideo && p.videos[0]?.type === 'youtube'
        ? `<img src="https://img.youtube.com/vi/${esc(p.videos[0].id)}/mqdefault.jpg" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;opacity:.7;" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.project-thumb-icon').style.display='flex'"/>
           <div class="project-thumb-icon" style="display:none;">▶</div>`
        : hasVideo
          ? `<div class="project-thumb-icon" style="font-size:2.5rem;opacity:0.5;">▶</div>`
          : `<div class="project-thumb-icon">${CAT_ICON[p.category] || '🔧'}</div>`;

    // Fixed: no orphan ellipsis on short descriptions
    const shortDesc = p.description.length > 100
      ? p.description.slice(0, 100).trim() + '…'
      : p.description;

    return `
    <div class="project-card" data-id="${esc(p.id)}" data-category="${esc(p.category)}" data-tools="${esc(p.tools.join(','))}" data-title="${esc(p.title)}">
      <div class="project-thumb">
        ${thumb}
        <div class="project-thumb-label">${esc(p.category)}</div>
        ${p.featured ? '<div class="project-featured">Featured</div>' : ''}
        ${badges ? `<div class="project-media-badges">${badges}</div>` : ''}
      </div>
      <div class="project-body">
        <div class="project-tools">${p.tools.map(t=>`<span class="project-tool">${esc(t)}</span>`).join('')}</div>
        <div class="project-title">${esc(p.title)}</div>
        <p class="project-desc">${esc(shortDesc)}</p>
      </div>
      <div class="project-arrow">→</div>
    </div>`;
  }).join('');

  // Safe event delegation — no inline onclick
  grid.addEventListener('click', e => {
    const card = e.target.closest('.project-card');
    if (card) openModal(card.dataset.id);
  });

  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    filterProjects();
  }));

  document.getElementById('search-input').addEventListener('input', filterProjects);

  // 3D card tilt effect
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const tx = ((e.clientY - cy) / (rect.height / 2)) * 7;
      const ty = -((e.clientX - cx) / (rect.width / 2)) * 7;
      card.style.transition = 'border-color 0.3s, box-shadow 0.3s, opacity 0.6s';
      card.style.transform = `translateY(-6px) scale(1.01) perspective(700px) rotateX(${tx}deg) rotateY(${ty}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), border-color 0.4s, box-shadow 0.4s, opacity 0.6s';
      card.style.transform = 'translateY(0px) scale(1) perspective(700px) rotateX(0deg) rotateY(0deg)';
    });
  });
}

function filterProjects() {
  const af = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const q  = document.getElementById('search-input').value.toLowerCase();
  document.querySelectorAll('.project-card').forEach(card => {
    const ok = (af === 'all' || card.dataset.category === af) &&
               (!q || card.dataset.title.toLowerCase().includes(q) || card.dataset.tools.toLowerCase().includes(q));
    if (ok) {
      card.classList.remove('hidden');
      gsap.fromTo(card, { opacity:0, scale:.93, y:20 }, { opacity:1, scale:1, y:0, duration:.4, ease:'power3.out' });
    } else {
      gsap.to(card, { opacity:0, scale:.93, y:20, duration:.22, onComplete: () => card.classList.add('hidden') });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════ */
function openModal(id) {
  currentProject = DATA.projects.find(p => p.id === id);
  if (!currentProject) return;
  const p = currentProject;
  document.getElementById('modal-cat').textContent   = p.category;
  document.getElementById('modal-title').textContent = p.title;
  document.getElementById('modal-desc').textContent  = p.description;
  document.getElementById('modal-tools').innerHTML   = p.tools.map(t=>`<span class="project-tool" style="padding:.3rem .8rem;font-size:.75rem;">${esc(t)}</span>`).join('');
  document.getElementById('modal-highlights').innerHTML = p.highlights.map(h=>`
    <li style="color:var(--text-dim);font-size:.9rem;padding-left:1.2rem;position:relative;margin-bottom:.4rem;">
      <span style="position:absolute;left:0;color:var(--neon);">▸</span>${esc(h)}</li>`).join('');
  buildModalMedia(p);
  document.getElementById('modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function buildModalMedia(p) {
  const wrap = document.getElementById('modal-media');
  wrap.innerHTML = '';
  const has3D    = !!p.model3d;
  const hasPhoto = p.photos?.length > 0;
  const hasVideo = p.videos?.length > 0;

  if (!has3D && !hasPhoto && !hasVideo) {
    wrap.innerHTML = '<p style="color:var(--text-dim);font-size:.85rem;margin-top:1.5rem;font-style:italic;text-align:center;padding:2rem 0;">No media attached yet.</p>';
    return;
  }

  // Order: videos (autoplay) → photos → 3D model
  const slides = [];
  (p.videos || []).forEach(v => slides.push({ kind: 'video', data: v }));
  (p.photos || []).forEach(ph => slides.push({ kind: 'photo', data: ph }));
  if (p.model3d) slides.push({ kind: '3d', data: p.model3d });

  let idx = 0;
  const kindLabel = { video: '▶ VIDEO', photo: '📷 PHOTO', '3d': '🔷 3D MODEL' };

  function stopMediaInSlide() {
    const video = wrap.querySelector('video');
    if (video) { try { video.pause(); video.currentTime = 0; } catch(e) {} }
  }

  function showSlide(i) {
    stopMediaInSlide();
    if (viewer3D && slides[idx]?.kind !== '3d') { viewer3D.dispose(); viewer3D = null; }
    idx = i;
    const s = slides[i];
    const counterEl = wrap.querySelector('#media-counter');
    if (counterEl) counterEl.textContent = `${i + 1} / ${slides.length}  ·  ${kindLabel[s.kind] || s.kind.toUpperCase()}`;
    wrap.querySelectorAll('.slide-dot').forEach((dot, di) => {
      dot.style.background = di === i ? 'var(--neon)' : 'rgba(255,255,255,0.2)';
      dot.style.boxShadow  = di === i ? '0 0 8px var(--neon)' : 'none';
      dot.style.transform  = di === i ? 'scale(1.35)' : 'scale(1)';
    });
    const slideWrap = wrap.querySelector('#media-slide-wrap');
    slideWrap.style.opacity = '0';
    slideWrap.style.transform = 'translateY(6px)';
    requestAnimationFrame(() => {
      if (s.kind === 'photo') {
        slideWrap.innerHTML = `
          <div style="border-radius:10px;overflow:hidden;background:#070b14;border:1px solid var(--border);">
            <img src="${esc(mediaUrl(s.data.url))}" alt="${esc(s.data.caption||'Project photo')}"
              style="width:100%;max-height:440px;object-fit:contain;display:block;background:#070b14;"
              loading="lazy"
              onerror="this.parentElement.innerHTML='<div style=&quot;display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-dim);font-family:var(--font-mono);font-size:.8rem;letter-spacing:1px;&quot;>Image could not be loaded</div>'" />
            ${s.data.caption ? `<div style="font-size:.78rem;color:var(--text-dim);text-align:center;padding:.6rem 1rem;">${esc(s.data.caption)}</div>` : ''}
          </div>`;
      } else if (s.kind === 'video') {
        if (s.data.type === 'youtube') {
          slideWrap.innerHTML = `
            <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:10px;overflow:hidden;background:#070b14;">
              <iframe src="https://www.youtube.com/embed/${esc(s.data.id)}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${esc(s.data.id)}"
                style="position:absolute;inset:0;width:100%;height:100%;border:0;"
                allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>
            </div>
            ${s.data.caption ? `<p style="font-size:.78rem;color:var(--text-dim);margin-top:.5rem;text-align:center;">${esc(s.data.caption)}</p>` : ''}`;
        } else {
          slideWrap.innerHTML = `
            <div style="border-radius:10px;overflow:hidden;background:#070b14;border:1px solid var(--border);">
              <video autoplay muted loop playsinline controls
                style="width:100%;max-height:440px;display:block;background:#070b14;"
                onerror="this.parentElement.innerHTML='<div style=&quot;display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-dim);font-family:var(--font-mono);font-size:.8rem;&quot;>Video could not be loaded</div>'">
                <source src="${esc(mediaUrl(s.data.url))}" />
                Your browser does not support video.
              </video>
            </div>
            ${s.data.caption ? `<p style="font-size:.78rem;color:var(--text-dim);margin-top:.5rem;text-align:center;">${esc(s.data.caption)}</p>` : ''}`;
          const vid = slideWrap.querySelector('video');
          if (vid) { vid.load(); vid.play().catch(() => {}); }
        }
      } else { // 3d model
        slideWrap.innerHTML = `
          <div id="viewer3d-container"
            style="width:100%;height:500px;border-radius:10px;overflow:hidden;background:#070b14;border:1px solid var(--border);position:relative;"></div>
          <p style="font-size:.7rem;color:var(--text-dim);margin-top:.6rem;text-align:center;letter-spacing:1px;font-family:var(--font-mono);">
            DRAG · ROTATE &nbsp;|&nbsp; SCROLL · ZOOM &nbsp;|&nbsp; RIGHT-DRAG · PAN
          </p>`;
        setTimeout(() => init3DViewer(s.data), 80);
      }
      slideWrap.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      requestAnimationFrame(() => {
        slideWrap.style.opacity = '1';
        slideWrap.style.transform = 'translateY(0)';
      });
    });
  }

  const dotsHTML = slides.length > 1
    ? `<div style="display:flex;gap:.6rem;justify-content:center;margin-top:1rem;">
        ${slides.map((s, i) => `<div class="slide-dot" data-idx="${i}" style="width:8px;height:8px;border-radius:50%;cursor:pointer;transition:all .3s;background:rgba(255,255,255,0.2);flex-shrink:0;"></div>`).join('')}
      </div>` : '';

  wrap.innerHTML = `
    <div style="margin-top:1.5rem;">
      ${slides.length > 1 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;gap:.5rem;">
          <button class="media-tab" id="media-prev" style="padding:.4rem 1rem;min-width:72px;">← Prev</button>
          <div id="media-counter" style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-dim);letter-spacing:1px;text-align:center;"></div>
          <button class="media-tab" id="media-next" style="padding:.4rem 1rem;min-width:72px;">Next →</button>
        </div>` : `
        <div id="media-counter" style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-dim);letter-spacing:1px;text-align:center;margin-bottom:.8rem;"></div>`}
      <div id="media-slide-wrap"></div>
      ${dotsHTML}
    </div>`;

  if (slides.length > 1) {
    wrap.querySelector('#media-prev').onclick = () => showSlide((idx - 1 + slides.length) % slides.length);
    wrap.querySelector('#media-next').onclick = () => showSlide((idx + 1) % slides.length);
    wrap.querySelectorAll('.slide-dot').forEach(dot =>
      dot.addEventListener('click', () => showSlide(parseInt(dot.dataset.idx))));
    // Touch swipe
    let touchStartX = 0;
    const sw = wrap.querySelector('#media-slide-wrap');
    sw.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    sw.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) showSlide(dx < 0 ? (idx + 1) % slides.length : (idx - 1 + slides.length) % slides.length);
    });
    // Keyboard arrow navigation
    if (mediaKeyHandler) document.removeEventListener('keydown', mediaKeyHandler);
    mediaKeyHandler = e => {
      if (!document.getElementById('modal-overlay').classList.contains('active')) return;
      if (e.key === 'ArrowLeft')  showSlide((idx - 1 + slides.length) % slides.length);
      else if (e.key === 'ArrowRight') showSlide((idx + 1) % slides.length);
    };
    document.addEventListener('keydown', mediaKeyHandler);
  }
  showSlide(0);
}

function switchTab(id) {
  document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.media-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.media-tab[data-tab="${id}"]`)?.classList.add('active');
  document.getElementById(`mpanel-${id}`)?.classList.add('active');
  if (id === '3d' && currentProject?.model3d) setTimeout(() => init3DViewer(currentProject.model3d), 50);
}

function buildPhotoGallery(photos) {
  return `<div class="photo-gallery">
    <div class="photo-main"><img src="${esc(photos[0].url)}" alt="" id="photo-main-img" style="width:100%;height:240px;object-fit:contain;border-radius:8px;background:#070b14;" loading="lazy"/>
      <div class="photo-caption" id="photo-caption">${esc(photos[0].caption||'')}</div></div>
    ${photos.length>1?`<div class="photo-thumbs">${photos.map((ph,i)=>`
      <div class="photo-thumb${i===0?' active':''}" data-url="${esc(ph.url)}" data-cap="${esc(ph.caption||'')}" data-idx="${i}">
        <img src="${esc(ph.url)}" alt="" loading="lazy" style="width:100%;height:60px;object-fit:cover;border-radius:5px;" /></div>`).join('')}</div>`:''}
  </div>`;
}

// Safe thumb click via delegation
document.addEventListener('click', e => {
  const thumb = e.target.closest('.photo-thumb');
  if (!thumb) return;
  const { url, cap, idx } = thumb.dataset;
  const img = document.getElementById('photo-main-img');
  const capEl = document.getElementById('photo-caption');
  gsap.to(img, { opacity:0, duration:.18, onComplete: () => {
    img.src = url;
    if (capEl) capEl.textContent = cap;
    gsap.to(img, { opacity:1, duration:.25 });
  }});
  document.querySelectorAll('.photo-thumb').forEach((t,i) => t.classList.toggle('active', String(i) === idx));
});

function buildVideoGallery(videos) {
  return `<div class="video-gallery">${videos.map(v => `
    <div class="video-item" style="margin-bottom:1.2rem;">
      ${v.type==='youtube'
        ? `<div style="position:relative;padding-bottom:56.25%;height:0;"><iframe src="https://www.youtube.com/embed/${esc(v.id)}" style="position:absolute;inset:0;width:100%;height:100%;border-radius:8px;border:0;" allowfullscreen loading="lazy"></iframe></div>`
        : `<video controls preload="metadata" style="width:100%;border-radius:8px;"><source src="${esc(v.url)}" /></video>`}
      ${v.caption?`<p style="font-size:.75rem;color:var(--text-dim);margin-top:.4rem;">${esc(v.caption)}</p>`:''}
    </div>`).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════════════
   3D VIEWER
   ═══════════════════════════════════════════════════════════ */
function init3DViewer(modelData) {
  const container = document.getElementById('viewer3d-container');
  if (!container) return;
  if (viewer3D) { viewer3D.dispose(); viewer3D = null; }
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:.8rem;">
    <div class="loader-spin"></div>
    <span style="color:var(--text-dim);font-family:var(--font-mono);font-size:.7rem;letter-spacing:2px;">LOADING 3D MODEL…</span></div>`;
  if (!window.THREE) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload  = () => setupScene(container, modelData);
    s.onerror = () => { container.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:.85rem;">Three.js unavailable</div>'; };
    document.head.appendChild(s);
  } else {
    setupScene(container, modelData);
  }
}

function setupScene(container, modelData) {
  const THREE = window.THREE;
  if (!THREE) return;
  container.innerHTML = '';
  const W = container.clientWidth, H = container.clientHeight || 360;
  const scene    = new THREE.Scene(); scene.background = new THREE.Color(0x070b14);
  const camera   = new THREE.PerspectiveCamera(45, W/H, .01, 1000); camera.position.set(0, 1.5, 4);
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setSize(W, H); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x445566, 1.4));
  const d1 = new THREE.DirectionalLight(0x00c8ff, 1.6); d1.position.set(5,10,5); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x7b2fff, .9); d2.position.set(-5,-3,-5); scene.add(d2);
  const pt = new THREE.PointLight(0x00ff9d, .7, 20); pt.position.set(0,5,0); scene.add(pt);
  const grid = new THREE.GridHelper(8, 24, 0x00c8ff, 0x112233); grid.position.y = -1.5; scene.add(grid);

  let phi=Math.PI/3, theta=Math.PI/4, radius=4, panX=0, panY=0;
  let isDragging=false, isRight=false, lastX=0, lastY=0;

  renderer.domElement.addEventListener('mousedown', e => {
    isDragging=true; isRight=e.button===2; lastX=e.clientX; lastY=e.clientY; e.preventDefault();
  });
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

  // Store handlers so we can remove them on dispose
  const onMouseMove = e => {
    if (!isDragging) return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
    if (isRight) { panX+=dx*.005; panY-=dy*.005; }
    else { theta-=dx*.009; phi=Math.max(.05, Math.min(Math.PI-.05, phi+dy*.009)); }
  };
  const onMouseUp = () => isDragging = false;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  renderer.domElement.addEventListener('wheel', e => {
    radius = Math.max(.5, Math.min(30, radius+e.deltaY*.012)); e.preventDefault();
  }, { passive:false });

  let touches = [];
  renderer.domElement.addEventListener('touchstart', e => { touches=[...e.touches]; }, { passive:true });
  renderer.domElement.addEventListener('touchmove', e => {
    if (e.touches.length===1) {
      const dx=e.touches[0].clientX-touches[0].clientX, dy=e.touches[0].clientY-touches[0].clientY;
      theta-=dx*.012; phi=Math.max(.1, Math.min(Math.PI-.1, phi+dy*.012));
    } else if (e.touches.length===2) {
      const d0=Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
      const d1=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      radius=Math.max(.5, Math.min(30, radius-(d1-d0)*.02));
    }
    touches=[...e.touches]; e.preventDefault();
  }, { passive:false });

  const fmt = (modelData?.format||'').toLowerCase();
  const url = mediaUrl(modelData?.url||'');
  if      (url.match(/\.stl$/i)||fmt==='stl')              loadSTL(scene,url,THREE,m=>centerModel(m,camera));
  else if (url.match(/\.obj$/i)||fmt==='obj')              loadOBJ(scene,url,THREE,m=>centerModel(m,camera));
  else if (url.match(/\.(gltf|glb)$/i)||fmt==='gltf'||fmt==='glb') loadGLTF(scene,url,THREE,m=>centerModel(m.scene||m,camera));
  else buildDemoModel(scene, THREE);

  let raf;
  function render() {
    raf = requestAnimationFrame(render);
    camera.position.x = radius*Math.sin(phi)*Math.sin(theta)+panX;
    camera.position.y = radius*Math.cos(phi)+panY;
    camera.position.z = radius*Math.sin(phi)*Math.cos(theta);
    camera.lookAt(panX, panY, 0);
    if (!isDragging) theta += .004;
    renderer.render(scene, camera);
  }
  render();

  const ro = new ResizeObserver(() => {
    const w=container.clientWidth, h=container.clientHeight||360;
    renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix();
  });
  ro.observe(container);

  viewer3D = {
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      // Remove global listeners — fixes the memory leak
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      container.innerHTML = '';
    }
  };
}

function centerModel(obj, camera) {
  if (!obj) return;
  const box    = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  obj.position.sub(center);
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  camera.position.z = maxSize * 1.8;
  camera.position.y = maxSize * 0.18;
}

function loadSTL(scene,url,THREE,cb){
  fetch(url).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); }).then(buf=>{
    // Detect binary vs ASCII STL
    // Binary: 80-byte header + 4-byte count + N * 50 bytes
    if (buf.byteLength >= 84) {
      const view = new DataView(buf);
      const numTri = view.getUint32(80, true);
      if (84 + numTri * 50 === buf.byteLength && numTri > 0) {
        // Valid binary STL
        parseBinarySTL(buf, scene, THREE, cb); return;
      }
    }
    // Try ASCII STL
    try {
      const text = new TextDecoder().decode(buf);
      if (text.trimStart().toLowerCase().startsWith('solid')) {
        parseASCIISTL(text, scene, THREE, cb); return;
      }
    } catch(e) {}
    // Fallback: try binary anyway
    parseBinarySTL(buf, scene, THREE, cb);
  }).catch(err => {
    const c = document.getElementById('viewer3d-container');
    if (c) showModelError(c, 'Could not load model. Check the URL or file format.');
  });
}

function parseBinarySTL(buf, scene, THREE, cb) {
  const v=new DataView(buf), n=v.getUint32(80,true);
  const pos=new Float32Array(n*9), nor=new Float32Array(n*9);
  for(let i=0;i<n;i++){
    const o=84+i*50, nx=v.getFloat32(o,true), ny=v.getFloat32(o+4,true), nz=v.getFloat32(o+8,true);
    for(let j=0;j<3;j++){
      const vo=o+12+j*12;
      pos[i*9+j*3]=v.getFloat32(vo,true); pos[i*9+j*3+1]=v.getFloat32(vo+4,true); pos[i*9+j*3+2]=v.getFloat32(vo+8,true);
      nor[i*9+j*3]=nx; nor[i*9+j*3+1]=ny; nor[i*9+j*3+2]=nz;
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x00c8ff,metalness:.85,roughness:.2,side:THREE.DoubleSide}));
  scene.add(mesh); cb(mesh);
}

function parseASCIISTL(text, scene, THREE, cb) {
  const posArr = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'vertex' && parts.length >= 4) {
      posArr.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    }
  }
  if (posArr.length === 0) throw new Error('No vertices found');
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posArr), 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x00c8ff,metalness:.85,roughness:.2,side:THREE.DoubleSide}));
  scene.add(mesh); cb(mesh);
}

function showModelError(container, msg) {
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;padding:2rem;">
    <div style="font-size:2.5rem;opacity:0.3;">🔷</div>
    <div style="color:var(--text-dim);font-family:var(--font-mono);font-size:.75rem;letter-spacing:1px;text-align:center;line-height:1.8;">
      ${msg}<br/>
      <span style="color:var(--neon);opacity:.6;font-size:.65rem;">Supported: STL · OBJ · GLTF · GLB</span>
    </div>
  </div>`;
}

function loadOBJ(scene,url,THREE,cb){
  fetch(url).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); }).then(txt=>{
    const verts=[],posArr=[];txt.split('\n').forEach(line=>{const p=line.trim().split(/\s+/);
      if(p[0]==='v')verts.push([+p[1],+p[2],+p[3]]);
      if(p[0]==='f'){const idx=p.slice(1).map(x=>parseInt(x.split('/')[0])-1);
        for(let i=1;i<idx.length-1;i++)[idx[0],idx[i],idx[i+1]].forEach(vi=>posArr.push(...(verts[vi]||[0,0,0])));
      }});
    if(posArr.length===0) throw new Error('No geometry');
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(posArr),3));geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x00c8ff,metalness:.8,roughness:.25,side:THREE.DoubleSide}));
    scene.add(mesh);cb(mesh);
  }).catch(()=>{
    const c=document.getElementById('viewer3d-container');
    if(c) showModelError(c,'Could not load OBJ file.');
  });
}

function loadGLTF(scene,url,THREE,cb){
  if(!window.GLTFLoader){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
    s.onload=()=>_gltf(scene,url,THREE,cb);
    s.onerror=()=>{ const c=document.getElementById('viewer3d-container'); if(c) showModelError(c,'Could not load GLTFLoader.'); };
    document.head.appendChild(s);
  } else _gltf(scene,url,THREE,cb);
}
function _gltf(scene,url,THREE,cb){
  try{ new THREE.GLTFLoader().load(url,g=>{scene.add(g.scene);cb(g);},undefined,()=>{
    const c=document.getElementById('viewer3d-container'); if(c) showModelError(c,'Could not load GLTF/GLB file.');
  }); }
  catch(e){ const c=document.getElementById('viewer3d-container'); if(c) showModelError(c,'GLTF loader error.'); }
}

function buildDemoModel(scene,THREE){
  const g=new THREE.Group();
  const mat1=new THREE.MeshStandardMaterial({color:0x334455,metalness:.92,roughness:.25});
  const mat2=new THREE.MeshStandardMaterial({color:0x00c8ff,metalness:.95,roughness:.1,emissive:0x002233});
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2,.18,1.6),mat1));
  const boss=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.65,32),mat2);boss.position.set(0,.42,0);g.add(boss);
  [[-.75,.12,-.6],[.75,.12,-.6],[-.75,.12,.6],[.75,.12,.6]].forEach(pos=>{
    const h=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.22,14),new THREE.MeshStandardMaterial({color:0x111827,metalness:.5,roughness:.8}));
    h.position.set(...pos);g.add(h);
  });
  [-.55,.55].forEach(x=>{const r=new THREE.Mesh(new THREE.BoxGeometry(.07,.55,1.6),mat1);r.position.set(x,.28,0);g.add(r);});
  scene.add(g);return g;
}

/* ─── CLOSE MODAL ────────────────────────────────────────── */
function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay') && !e.target.classList.contains('modal-close')) return;
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  // Stop any playing video
  document.querySelectorAll('#modal-media video').forEach(v => { try { v.pause(); } catch(e) {} });
  // Dispose 3D viewer
  if (viewer3D) { viewer3D.dispose(); viewer3D = null; }
  // Remove media key handler
  if (mediaKeyHandler) { document.removeEventListener('keydown', mediaKeyHandler); mediaKeyHandler = null; }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ─── CERTIFICATIONS ─────────────────────────────────────── */
function renderCertifications() {
  document.getElementById('certs-grid').innerHTML = DATA.certifications.map(c => `
    <div class="cert-card${c.image ? ' has-image' : ''}" ${c.image ? `onclick="openCertImage('${esc(mediaUrl(c.image))}','${esc(c.name)}')"` : ''} style="${c.image ? 'cursor:pointer;' : ''}">
      <div class="cert-icon">🏆</div>
      <div class="cert-info">
        <div class="cert-level ${c.level==='Professional'?'pro':c.level==='Specialist'?'spec':'assoc'}">${esc(c.level)}</div>
        <div class="cert-name">${esc(c.name)}</div>
        <div class="cert-issuer">${esc(c.issuer)}</div>
        ${c.image ? '<div style="font-size:.65rem;color:var(--neon);opacity:.7;margin-top:.3rem;letter-spacing:1px;">CLICK TO VIEW</div>' : ''}
      </div>
    </div>`).join('');
}

function openCertImage(url, name) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-cat').textContent = 'Certification';
  document.getElementById('modal-title').textContent = name;
  document.getElementById('modal-tools').innerHTML = '';
  document.getElementById('modal-desc').textContent = '';
  document.getElementById('modal-highlights').innerHTML = '';
  document.getElementById('modal-media').innerHTML = `<img src="${url}" alt="${name}" style="width:100%;max-height:70vh;object-fit:contain;background:#070b14;border-radius:10px;border:1px solid var(--border);" />`;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ─── CONTACT ────────────────────────────────────────────── */
function renderContact() {
  const m = DATA.meta;
  document.getElementById('contact-items').innerHTML = [
    { icon:'📧', label:'Email',    v:`<a href="mailto:${esc(m.email)}" style="color:var(--neon)">${esc(m.email)}</a>` },
    { icon:'📱', label:'WhatsApp', v:`<a href="https://wa.me/91${esc(m.phone)}?text=Hi" target="_blank" rel="noopener noreferrer" style="color:var(--neon3)">+91 ${esc(m.phone)} — Tap to WhatsApp</a>` },
    { icon:'📍', label:'Location', v:`<a href="${esc(m.mapLink||'https://maps.app.goo.gl/LqedMJfe462tszBo8')}" target="_blank" rel="noopener noreferrer" style="color:var(--neon)">${esc(m.location)} ↗</a>` },
    { icon:'💼', label:'LinkedIn', v:`<a href="https://www.linkedin.com/in/sidharth-kumar-6a4610333" target="_blank" rel="noopener noreferrer" style="color:var(--neon)">sidharth-kumar-6a4610333 →</a>` },
    { icon:'🐙', label:'GitHub',   v: m.socialLinks?.github && m.socialLinks.github !== '#'
        ? `<a href="${esc(m.socialLinks.github)}" target="_blank" rel="noopener noreferrer" style="color:var(--neon)">View Profile →</a>`
        : '<span style="color:var(--text-dim)">github.com/sid-cmd-sk</span>' },
  ].map(i => `
    <div class="contact-item">
      <div class="contact-item-icon">${i.icon}</div>
      <div>
        <div class="contact-item-label">${i.label}</div>
        <div class="contact-item-value">${i.v}</div>
      </div>
    </div>`).join('');
}

/* ─── CONTACT FORM — fetch + toast, single handler ──────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const orig = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    // GA event (single, correct location)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'contact_form_submit', {
        event_category: 'engagement',
        event_label: 'Contact Form'
      });
    }

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        showToast('✅ Message sent! I\'ll be in touch soon.');
        form.reset();
      } else {
        showToast('❌ Something went wrong. Email me directly.');
      }
    } catch {
      showToast('❌ Network error. Please email me directly.');
    }

    btn.textContent = orig;
    btn.disabled = false;
  });
}

/* ─── TOAST ──────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ─── SCROLL ANIMATIONS ──────────────────────────────────── */
function initScrollAnimations() {
  gsap.utils.toArray('.reveal').forEach(el =>
    gsap.fromTo(el, {opacity:0,y:40}, {opacity:1,y:0,duration:.7,ease:'power3.out',
      scrollTrigger:{trigger:el,start:'top 88%',toggleActions:'play none none none'}}));

  ScrollTrigger.create({ trigger:'#about', start:'top 62%', onEnter: () =>
    document.querySelectorAll('.skill-fill').forEach(b =>
      gsap.to(b, { width:b.dataset.level+'%', duration:1.4, ease:'power3.out', delay:.2 }))});

  ScrollTrigger.create({ trigger:'#projects-grid', start:'top 85%', onEnter: () =>
    gsap.utils.toArray('.project-card').forEach((c,i) =>
      gsap.to(c, { opacity:1, y:0, duration:.6, ease:'power3.out', delay:i*.09 }))});

  gsap.utils.toArray('.timeline-item').forEach((el,i) =>
    gsap.to(el, { opacity:1, x:0, duration:.7, ease:'power3.out',
      scrollTrigger:{trigger:el,start:'top 85%',toggleActions:'play none none none'}, delay:i*.15 }));

  ScrollTrigger.create({ trigger:'#certs-grid', start:'top 85%', onEnter: () =>
    gsap.utils.toArray('.cert-card').forEach((c,i) =>
      gsap.to(c, { opacity:1, y:0, duration:.5, ease:'power3.out', delay:i*.07 }))});
}

/* ─── BOOT ───────────────────────────────────────────────── */
if (document.readyState !== 'loading') {
  loadData();
} else {
  document.addEventListener('DOMContentLoaded', loadData);
}
