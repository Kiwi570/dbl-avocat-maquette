/* DBL Avocat — maquette « Chemise de dossier » */
import { initBureau } from './gl.js?v=1';

const html = document.documentElement;
const page = html.dataset.page || '';
const calme = html.classList.contains('calme');
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const SplitText = window.SplitText;
const pointeurFin = window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches;
const large = () => window.innerWidth >= 900 && window.innerHeight >= 480;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const borne = (v, a, b) => Math.min(b, Math.max(a, v));

if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
if (gsap && SplitText) gsap.registerPlugin(SplitText);

/* ---------------------------------------------------------
   Mesures : en-tête et barres fixes
   --------------------------------------------------------- */
function mesurer() {
  const entete = $('.entete');
  const barre = $('[data-barre-mobile]');
  const eh = entete ? Math.round(entete.getBoundingClientRect().height) : 64;
  const bh = barre && getComputedStyle(barre).display !== 'none' ? Math.round(barre.getBoundingClientRect().height) : 0;

  html.style.setProperty('--entete-h', eh + 'px');
  html.style.setProperty('--barres-h', bh + 'px');
}
mesurer();
let largeurPrec = window.innerWidth;
window.addEventListener('resize', () => {
  mesurer();
  if (Math.abs(window.innerWidth - largeurPrec) > 40 && ScrollTrigger) {
    largeurPrec = window.innerWidth;
  }
}, { passive: true });

/* ---------------------------------------------------------
   Polices : on attend (court) avant d'ouvrir la page
   --------------------------------------------------------- */
async function polices() {
  if (!document.fonts) return;
  const charges = Promise.all([
    document.fonts.load('400 1em "Newsreader"'),
    document.fonts.load('italic 400 1em "Newsreader"'),
    document.fonts.load('400 1em "Hanken Grotesk"'),
  ]).catch(() => {});
  await Promise.race([charges, new Promise((r) => setTimeout(r, 800))]);
}

/* ---------------------------------------------------------
   Mode calme
   --------------------------------------------------------- */
function sectionCourante() {
  const sections = $$('main > section[id], main > section');
  const milieu = window.innerHeight * 0.4;
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    if (r.top <= milieu && r.bottom > milieu) return s;
  }
  return null;
}
function initCalme() {
  $$('[data-calme]').forEach((b) => {
    b.setAttribute('aria-pressed', calme ? 'true' : 'false');
    b.addEventListener('click', () => {
      const s = sectionCourante();
      try {
        localStorage.setItem('dbl-calme', calme ? '0' : '1');
        if (s && s.id) {
          const r = s.getBoundingClientRect();
          sessionStorage.setItem('dbl-calme-section', s.id);
          sessionStorage.setItem('dbl-calme-part', String(borne(-r.top / Math.max(1, r.height), 0, 1)));
        }
        sessionStorage.setItem('dbl-intro', '1');
      } catch (e) {}
      location.reload();
    });
  });
}
function restaurerSection() {
  let id = null, part = 0;
  try {
    id = sessionStorage.getItem('dbl-calme-section');
    part = parseFloat(sessionStorage.getItem('dbl-calme-part') || '0') || 0;
    sessionStorage.removeItem('dbl-calme-section');
    sessionStorage.removeItem('dbl-calme-part');
  } catch (e) {}
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const r = el.getBoundingClientRect();
  window.scrollTo(0, window.scrollY + r.top + r.height * part - (part === 0 ? parseInt(getComputedStyle(html).getPropertyValue('--entete-h')) || 0 : 0));
  return true;
}

/* ---------------------------------------------------------
   Défilement fluide (le défilement natif reste la référence)
   --------------------------------------------------------- */
const defil = {
  actif: false, cible: 0, actuel: 0, t: 0, lambda: 10,
  init() {
    window.addEventListener('wheel', this.roue, { passive: false });
    window.addEventListener('scroll', () => { if (!this.actif) { this.cible = this.actuel = window.scrollY; } }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) this.actif = false;
    });
    window.addEventListener('pointerdown', () => { this.actif = false; });
    this.cible = this.actuel = window.scrollY;
  },
  defilable(el, dy) {
    while (el && el !== document.body && el !== html) {
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
      }
      el = el.parentElement;
    }
    return false;
  },
  roue: (e) => {
    if (e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (defil.defilable(e.target, e.deltaY)) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= window.innerHeight;
    if (!defil.actif) defil.cible = defil.actuel = window.scrollY;
    defil.lambda = 10;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    defil.cible = borne(defil.cible + d, 0, max);
    defil.demarrer();
  },
  vers(y, lambda = 5.5) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (!this.actif) this.actuel = window.scrollY;
    this.cible = borne(y, 0, max);
    this.lambda = lambda;
    this.demarrer();
  },
  demarrer() {
    if (this.actif) return;
    this.actif = true;
    this.t = performance.now();
    requestAnimationFrame(this.boucle);
  },
  boucle: (t) => {
    if (!defil.actif) return;
    const dt = Math.min(0.064, (t - defil.t) / 1000);
    defil.t = t;
    const k = 1 - Math.exp(-defil.lambda * dt);
    defil.actuel += (defil.cible - defil.actuel) * k;
    if (Math.abs(defil.cible - defil.actuel) < 0.5) defil.actuel = defil.cible;
    window.scrollTo(0, defil.actuel);
    if (defil.actuel !== defil.cible) requestAnimationFrame(defil.boucle);
    else defil.actif = false;
  },
};
const lisse = !calme && pointeurFin;
if (lisse) defil.init();

function allerA(hash, instantane = false) {
  const el = hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  if (!el) return false;
  const marge = parseInt(getComputedStyle(el).scrollMarginTop) || (parseInt(getComputedStyle(html).getPropertyValue('--entete-h')) || 64);
  const y = el.getBoundingClientRect().top + window.scrollY - marge;
  if (instantane || calme) window.scrollTo(0, y);
  else if (lisse) defil.vers(y);
  else window.scrollTo({ top: y, behavior: 'smooth' });
  return true;
}

/* ---------------------------------------------------------
   Transitions de page : on tourne la page
   --------------------------------------------------------- */
const normaliser = (p) => (p.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '') || '/');
function initLiens() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== location.origin) return;
    fermerMenu();
    if (normaliser(url.pathname) === normaliser(location.pathname) && url.search === location.search) {
      if (url.hash) {
        e.preventDefault();
        if (allerA(url.hash)) history.pushState(null, '', url.hash);
      } else {
        e.preventDefault();
        if (lisse) defil.vers(0); else window.scrollTo({ top: 0, behavior: calme ? 'auto' : 'smooth' });
      }
      return;
    }
    if (calme || !gsap) return;
    e.preventDefault();
    tournerPage(url.href);
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      const f = $('.tourne__feuille');
      if (f && gsap) gsap.set(f, { xPercent: 105, rotate: 0 });
      const t = $('.tourne');
      if (t) t.style.visibility = 'hidden';
    }
  });
}
function tournerPage(href) {
  const t = $('.tourne');
  const f = $('.tourne__feuille');
  try { sessionStorage.setItem('dbl-tourne', '1'); } catch (e) {}
  t.style.visibility = 'visible';
  gsap.fromTo(f, { xPercent: 105, rotate: 3, transformOrigin: '0% 100%' }, {
    xPercent: 0, rotate: 0, duration: 0.55, ease: 'power3.inOut',
    onComplete: () => { location.href = href; },
  });
}
function arrivee() {
  if (!html.classList.contains('arrivee') || !gsap) { html.classList.remove('arrivee'); return Promise.resolve(); }
  const f = $('.tourne__feuille');
  return new Promise((r) => {
    gsap.fromTo(f, { xPercent: 0, rotate: 0 }, {
      xPercent: -108, rotate: -3, transformOrigin: '100% 100%', duration: 0.65, ease: 'power3.inOut', delay: 0.05,
      onStart: () => setTimeout(r, 220),
      onComplete: () => { html.classList.remove('arrivee'); gsap.set(f, { clearProps: 'transform' }); },
    });
  });
}

/* ---------------------------------------------------------
   Menu mobile
   --------------------------------------------------------- */
function fermerMenu() {
  const m = $('#menu-mobile');
  const b = $('.menu-bouton');
  if (!m || !m.classList.contains('ouvert')) return;
  m.classList.remove('ouvert');
  b && b.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
function initMenu() {
  const b = $('.menu-bouton');
  const m = $('#menu-mobile');
  if (!b || !m) return;
  b.addEventListener('click', () => {
    const ouvert = !m.classList.contains('ouvert');
    m.classList.toggle('ouvert', ouvert);
    b.setAttribute('aria-expanded', String(ouvert));
    b.textContent = ouvert ? 'Fermer' : 'Menu';
    document.body.style.overflow = ouvert ? 'hidden' : '';
    if (ouvert) { const l = m.querySelector('a'); l && l.focus(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fermerMenu(); b.textContent = 'Menu'; } });
}

/* ---------------------------------------------------------
   Curseur plume et boutons magnétiques
   --------------------------------------------------------- */
function initCurseur() {
  if (calme || !pointeurFin || !gsap) return;
  const c = $('.curseur');
  if (!c) return;
  html.classList.add('curseur-actif');
  const point = $('.curseur__point', c);
  const anneau = $('.curseur__anneau', c);
  const label = $('.curseur__label', c);
  const pos = { x: -100, y: -100 }, ann = { x: -100, y: -100 };
  let t0 = 0, visible = false, enCours = false;
  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    if (!visible) { visible = true; ann.x = pos.x; ann.y = pos.y; c.style.opacity = '1'; }
    if (!enCours) { enCours = true; t0 = 0; requestAnimationFrame(boucle); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { visible = false; c.style.opacity = '0'; });
  const boucle = (t) => {
    const dt = Math.min(0.064, t0 ? (t - t0) / 1000 : 0.016);
    t0 = t;
    const k = 1 - Math.exp(-14 * dt);
    ann.x += (pos.x - ann.x) * k; ann.y += (pos.y - ann.y) * k;
    point.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    anneau.style.transform = `translate(${ann.x}px, ${ann.y}px)`;
    label.style.transform = `translate(${ann.x}px, ${ann.y}px)`;
    if (Math.abs(pos.x - ann.x) + Math.abs(pos.y - ann.y) > 0.3) requestAnimationFrame(boucle);
    else enCours = false;
  };
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('a, button, label, select, [data-curseur]');
    if (!el) { c.classList.remove('sur-lien'); return; }
    c.classList.add('sur-lien');
    let txt = el.dataset.curseur || 'ouvrir';
    const href = el.getAttribute('href') || '';
    if (href.startsWith('tel:')) txt = 'appeler';
    else if (href.startsWith('mailto:')) txt = 'écrire';
    else if (el.tagName === 'BUTTON' || el.tagName === 'LABEL' || el.tagName === 'SELECT') txt = 'choisir';
    label.textContent = txt;
  });
}
function initMagnetiques() {
  if (calme || !pointeurFin || !gsap) return;
  $$('.magnetique').forEach((el) => {
    const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * 0.28);
      qy((e.clientY - (r.top + r.height / 2)) * 0.36);
    });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
  $$('[data-incline]').forEach((el) => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 9);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------------------------------------------------------
   Lampe de bureau (WebGL, avec repli CSS)
   --------------------------------------------------------- */
let lampe = null;
function initLampe() {
  const fond = $('.bureau-fond');
  if (!fond) return;
  const repli = $('.bureau-fond__repli', fond);
  const mobile = !pointeurFin || window.innerWidth < 760;
  const parametres = new URLSearchParams(location.search);
  if (!calme && parametres.get('webgl') !== '0') {
    lampe = initBureau(fond, { mobile });
    if (lampe) fond.classList.add('gl-actif');
  }
  const poser = (x, y) => {
    if (lampe) lampe.lumiere(x, 1 - y);
    else if (!calme) { repli.style.setProperty('--lx', (x * 100).toFixed(1) + '%'); repli.style.setProperty('--ly', (y * 100).toFixed(1) + '%'); }
  };
  if (calme) return;
  if (pointeurFin) {
    window.addEventListener('pointermove', (e) => poser(e.clientX / window.innerWidth, e.clientY / window.innerHeight), { passive: true });
  } else {
    const derive = () => {
      const p = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      poser(0.5 + 0.32 * Math.sin(p * Math.PI * 3), 0.32 + 0.12 * Math.cos(p * Math.PI * 2));
    };
    window.addEventListener('scroll', derive, { passive: true });
    derive();
  }
  if (lampe) {
    const nuits = $$('.s-nuit, .pied, .onglets');
    const visibles = new Set();
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => { if (en.isIntersecting) visibles.add(en.target); else visibles.delete(en.target); });
      lampe.visibilite(visibles.size > 0);
    }, { rootMargin: '0px' });
    nuits.forEach((n) => io.observe(n));
  }
}

/* ---------------------------------------------------------
   Folio et barre mobile
   --------------------------------------------------------- */
function initFolio() {
  const f = $('[data-folio-affiche]');
  const sections = $$('[data-folio]');
  if (!f || !sections.length) return;
  const total = String(sections.length).padStart(2, '0');
  const maj = () => {
    const milieu = window.innerHeight * 0.45;
    let i = 0;
    sections.forEach((s, k) => { if (s.getBoundingClientRect().top <= milieu) i = k; });
    const txt = `p. ${String(i + 1).padStart(2, '0')} / ${total}   ${sections[i].dataset.folio}`;
    if (f.textContent !== txt) f.textContent = txt;
  };
  window.addEventListener('scroll', maj, { passive: true });
  maj();
  const pied = $('.pied');
  if (pied) new IntersectionObserver(([en]) => { f.style.opacity = en.isIntersecting ? '0' : ''; }).observe(pied);
}
function initBarreMobile() {
  const b = $('[data-barre-mobile]');
  if (!b) return;
  const cibles = $$('.pied, #rendez-vous, .formulaire');
  const actives = new Set();
  const io = new IntersectionObserver((entrees) => {
    entrees.forEach((en) => { if (en.isIntersecting) actives.add(en.target); else actives.delete(en.target); });
    b.classList.toggle('masquee', actives.size > 0);
  });
  cibles.forEach((c) => io.observe(c));
}

/* ---------------------------------------------------------
   Briques d'animation réutilisables
   --------------------------------------------------------- */
function titresImprimes() {
  $$('[data-titre]').forEach((el) => {
    if (!SplitText) return;
    SplitText.create(el, {
      type: 'lines', linesClass: 'ligne-titre', autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(self.lines, { clipPath: 'inset(-10% 100% -20% 0%)' }, {
          clipPath: 'inset(-10% 0% -20% 0%)', duration: 0.9, ease: 'power3.inOut', stagger: 0.14,
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        });
      },
    });
  });
}
function lignesImprimees() {
  $$('[data-lignes]').forEach((el) => {
    if (!SplitText) return;
    SplitText.create(el, {
      type: 'lines', autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(self.lines, { opacity: 0, x: -14 }, {
          opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      },
    });
  });
}
function surligneurs() {
  $$('.surligne').forEach((el, i) => {
    gsap.fromTo(el, { '--hl': 0 }, {
      '--hl': 1, duration: 0.8, ease: 'power2.inOut', delay: 0.6,
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
  });
}
function traces(scope = document) {
  $$('[data-trace]', scope).forEach((p) => {
    const l = p.getTotalLength ? p.getTotalLength() : 600;
    gsap.set(p, { strokeDasharray: l, strokeDashoffset: l });
  });
}
function parallaxes() {
  $$('[data-parallaxe-img] img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  $$('[data-parallaxe-fond]').forEach((img) => {
    gsap.fromTo(img, { scale: 1.18 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom bottom', scrub: true },
    });
  });
}
function cachetTombe(el, opts = {}) {
  return gsap.fromTo(el, { scale: 2.2, opacity: 0, rotate: (opts.rot || 0) + 28 }, {
    scale: 1, opacity: opts.opacite ?? 1, rotate: opts.rot || 0, duration: 0.42, ease: 'back.out(2.2)', delay: opts.delay || 0,
  });
}

/* compteur mécanique */
function compteurs() {
  $$('[data-compteur]').forEach((el) => {
    const texte = el.textContent.trim();
    el.setAttribute('aria-label', texte);
    const frag = document.createElement('span');
    frag.setAttribute('aria-hidden', 'true');
    frag.style.display = 'inline-flex';
    frag.style.alignItems = 'baseline';
    const pistes = [];
    for (const ch of texte) {
      if (/\d/.test(ch)) {
        const rouleau = document.createElement('span');
        rouleau.className = 'compteur__rouleau';
        const piste = document.createElement('span');
        piste.className = 'compteur__piste';
        const cible = parseInt(ch, 10);
        const tours = 10 + cible;
        for (let n = 0; n <= tours; n++) {
          const s = document.createElement('span');
          s.textContent = String(n % 10);
          piste.appendChild(s);
        }
        rouleau.appendChild(piste);
        frag.appendChild(rouleau);
        pistes.push({ piste, tours });
      } else {
        const s = document.createElement('span');
        s.textContent = ch === ' ' ? ' ' : ch;
        frag.appendChild(s);
      }
    }
    el.textContent = '';
    el.appendChild(frag);
    pistes.forEach(({ piste, tours }, i) => {
      gsap.fromTo(piste, { yPercent: 0 }, {
        yPercent: -(tours / (tours + 1)) * 100, duration: 1.4 + i * 0.12, ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });
  });
}

/* ---------------------------------------------------------
   ACCUEIL
   --------------------------------------------------------- */
function introEtUne() {
  const tl = gsap.timeline();
  const intro = html.classList.contains('intro');
  const mots = $$('.une__titre span');
  const qui = $('.une__qui');
  const actions = $('.une__actions');
  const chemise = $('.chemise-une');
  const dos = $('.chemise-une__dos');
  const photo = $('.chemise-une__photo');
  const trombone = $('.chemise-une .trombone');
  const cachet = $('.chemise-une .cachet');
  const couverture = $('.chemise-une__couverture');

  gsap.set(mots, { opacity: 0 });
  gsap.set([qui, actions], { opacity: 0, y: 18 });
  gsap.set(dos, { opacity: 0, y: 60, rotate: -6 });
  gsap.set(photo, { opacity: 0, y: 30, rotate: 2 });
  gsap.set(trombone, { opacity: 0, y: -30 });
  gsap.set(cachet, { opacity: 0 });

  let debut = 0;
  if (intro) {
    const ecran = $('.intro-ecran');
    const couv = $('.intro-ecran__couverture');
    const texte = $('.intro-dbl text');
    const ligne = $('.intro-ecran__ligne');
    const c = $('.intro-ecran .cachet');
    tl.to(texte, { strokeDashoffset: 0, duration: 0.75, ease: 'power2.inOut' }, 0)
      .to(texte, { fillOpacity: 1, duration: 0.35, ease: 'power1.out' }, 0.5)
      .to(ligne, { opacity: 1, duration: 0.35 }, 0.3)
      .fromTo(c, { scale: 2.1, opacity: 0, rotate: 18 }, { scale: 1, opacity: 1, rotate: -12, duration: 0.32, ease: 'back.out(2.4)' }, 0.62)
      .to(couv, { y: 3, duration: 0.05, yoyo: true, repeat: 1 }, 0.9)
      .to(couv, { rotateX: 96, opacity: 0.2, duration: 0.7, ease: 'power3.in' }, 1.0)
      .add(() => {
        ecran.style.display = 'none';
        html.classList.remove('intro');
        try { sessionStorage.setItem('dbl-intro', '1'); } catch (e) {}
      }, 1.7);
    debut = 1.0;
  }
  tl.to(mots, { keyframes: { opacity: [0, 1, 1], scale: [1.18, 0.98, 1] }, duration: 0.42, ease: 'power3.out', stagger: 0.14, transformOrigin: '0% 70%' }, debut + 0.05)
    .to(dos, { opacity: 1, y: 0, rotate: -1.5, duration: 0.8, ease: 'power3.out' }, debut + 0.05)
    .to(photo, { opacity: 1, y: 0, rotate: -2.2, duration: 0.7, ease: 'power3.out' }, debut + 0.22)
    .to(trombone, { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(2)' }, debut + 0.5)
    .add(cachetTombe(cachet, { rot: -12, opacite: 0.95 }), debut + 0.62)
    .to([qui, actions], { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }, debut + 0.4);
  if (couverture) {
    gsap.set(couverture, { opacity: 0 });
  }
  // défilement : la chemise remonte, la photo bascule légèrement
  gsap.to(chemise, {
    yPercent: -12, rotate: 2, ease: 'none',
    scrollTrigger: { trigger: '.une', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.une__titre', {
    yPercent: -16, ease: 'none',
    scrollTrigger: { trigger: '.une', start: 'top top', end: 'bottom top', scrub: true },
  });
  return tl;
}

function matieresAccueil() {
  const section = $('.matieres');
  if (!section) return;
  const piste = $('.matieres__piste', section);
  const cartes = $$('.chemise', piste);
  const couvertures = cartes.map((c) => $('.chemise__couverture', c));
  const compteur = $('[data-compteur-matiere]', section);
  const ANGLE = -74;
  const setters = couvertures.map((c) => gsap.quickSetter(c, 'rotationX', 'deg'));
  const contenus = cartes.map((c) => $('.chemise__contenu', c));
  couvertures.forEach((c) => gsap.set(c, { transformPerspective: 1500, transformOrigin: '50% 0%' }));

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 480px)', () => {
    section.classList.add('horizontal');
    const distance = () => {
      const derniere = cartes[cartes.length - 1];
      return Math.max(0, derniere.offsetLeft + derniere.offsetWidth / 2 - window.innerWidth / 2);
    };
    const maj = () => {
      const centre = window.innerWidth * 0.5;
      let meilleur = 0, meilleurP = -1;
      cartes.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const p = 1 - borne(Math.abs(cx - centre) / (r.width * 1.15), 0, 1);
        const e = p * p * (3 - 2 * p);
        setters[i](ANGLE * e);
        if (contenus[i]) contenus[i].style.opacity = borne((p - 0.45) / 0.35, 0, 1).toFixed(3);
        if (p > meilleurP) { meilleurP = p; meilleur = i; }
      });
      if (compteur) compteur.textContent = String(meilleur + 1).padStart(2, '0');
    };
    const tween = gsap.to(piste, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.8,
        invalidateOnRefresh: true, onUpdate: maj, onRefresh: maj, anticipatePin: 1,
      },
    });
    gsap.ticker.add(maj);
    return () => {
      gsap.ticker.remove(maj);
      contenus.forEach((c) => c && (c.style.opacity = ''));
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
      gsap.set(piste, { clearProps: 'transform' });
      section.classList.remove('horizontal');
    };
  });
  mm.add('(max-width: 899px), (max-height: 479px)', () => {
    const tweens = cartes.map((c, i) => gsap.fromTo(couvertures[i], { rotationX: 0 }, {
      rotationX: ANGLE, ease: 'power1.inOut',
      scrollTrigger: { trigger: c, start: 'top 72%', end: 'top 22%', scrub: true },
    }));
    return () => tweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  });
}

function inventaire() {
  const section = $('.inventaire');
  if (!section) return;
  const pieces = $$('.piece', section);
  const fil = $('.inventaire__fil-encre', section);
  const etapes = $$('.inventaire__fil li', section);
  const trombone = $('.inventaire__pile .trombone', section);
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (min-height: 480px)', () => {
    section.classList.add('epingle');
    const rot = [-1.2, 1.6, -2, 1.1, -0.6];
    pieces.forEach((p, i) => gsap.set(p, { zIndex: i + 1, rotate: i === 0 ? rot[0] : 0, y: i === 0 ? 0 : window.innerHeight }));
    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: {
        trigger: section, start: 'top top', end: () => '+=' + window.innerHeight * 0.75 * (pieces.length - 1), pin: true, scrub: 0.7,
        invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (st) => {
          const i = Math.round(st.progress * (pieces.length - 1));
          etapes.forEach((e, k) => e.classList.toggle('actif', k === i));
        },
      },
    });
    tl.fromTo(fil, { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: pieces.length - 1 }, 0);
    pieces.forEach((p, i) => {
      if (i === 0) return;
      tl.fromTo(p, { y: () => window.innerHeight * 0.9, rotate: rot[i] * 4 }, { y: () => -i * 7, rotate: rot[i], duration: 0.85 }, i - 1);
      tl.to(pieces.slice(0, i), { scale: '-=0.018', duration: 0.85 }, i - 1);
      if (trombone) tl.fromTo(trombone, { y: -10 }, { y: 0, duration: 0.2, ease: 'back.out(3)' }, i - 0.2);
    });
    return () => { section.classList.remove('epingle'); gsap.set(pieces, { clearProps: 'all' }); gsap.set(fil, { clearProps: 'all' }); };
  });
  mm.add('(max-width: 899px), (max-height: 479px)', () => {
    gsap.set(fil, { scaleY: 1 });
    pieces.forEach((p, i) => gsap.fromTo(p, { y: 40, rotate: i % 2 ? 2 : -2, opacity: 0 }, {
      y: 0, rotate: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: p, start: 'top 88%', once: true },
    }));
  });
}

function secret() {
  const section = $('.secret');
  if (!section) return;
  const caches = $$('.cav', section);
  const gardes = $$('.garde', section);
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.doc-caviarde', start: 'top 75%', end: 'center 38%', scrub: 0.6 } });
  caches.forEach((c, i) => tl.fromTo(c, { '--cav': 0 }, { '--cav': 1, duration: 1, ease: 'power1.inOut' }, i * 0.55));
  tl.fromTo(gardes, { '--hl': 0 }, { '--hl': 1, duration: 0.6, stagger: 0.25 }, 0.8);
  const items = $$('.principes li', section);
  gsap.fromTo(items, { opacity: 0, scale: 1.35, rotate: -3 }, {
    opacity: 1, scale: 1, rotate: 0, duration: 0.36, ease: 'back.out(2.6)', stagger: 0.13, transformOrigin: '0% 50%',
    scrollTrigger: { trigger: '.principes', start: 'top 80%', once: true },
  });
}

function honorairesAccueil() {
  const sig = $('.tarifs [data-trace]');
  if (sig) {
    gsap.to(sig, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: sig.closest('.signature'), start: 'top 85%', once: true } });
  }
}

function acces() {
  const plan = $('.plan');
  if (!plan) return;
  const rues = $$('[data-trace]', plan);
  const epingle = $('[data-epingle]', plan);
  const tl = gsap.timeline({ scrollTrigger: { trigger: plan, start: 'top 78%', once: true } });
  tl.to(rues, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.035 })
    .fromTo(epingle, { y: -70, scale: 1.8, opacity: 0, svgOrigin: '0 0' }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' }, '-=0.3');
  const halo = epingle && epingle.querySelector('circle');
  if (halo) gsap.fromTo(halo, { attr: { r: 10 }, opacity: 0.35 }, { attr: { r: 40 }, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out', delay: 2 });
}

function finalAccueil() {
  const c = $('[data-cachet-final]');
  if (!c) return;
  gsap.set(c, { opacity: 0 });
  ScrollTrigger.create({ trigger: '.final', start: 'top 55%', once: true, onEnter: () => cachetTombe(c, { rot: 9, opacite: 0.92 }) });
}

/* ---------------------------------------------------------
   MATIÈRES
   --------------------------------------------------------- */
function pageMatieres() {
  const chemises = $$('.pile__chemise');
  const tl = gsap.timeline();
  tl.fromTo('.pile__fond', { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }, 0)
    .fromTo(chemises, { y: 120, rotate: 0, opacity: 0 }, { y: (i) => -(chemises.length - 1 - i) * 26, rotate: (i, el) => parseFloat(el.dataset.r || 0), opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.09 }, 0.15)
    .fromTo('.m-une__titre', { clipPath: 'inset(-10% 100% -20% 0%)' }, { clipPath: 'inset(-10% 0% -20% 0%)', duration: 0.9, ease: 'power3.inOut' }, 0.1)
    .fromTo('.m-une .chapeau, .m-une .postit', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.5);

  $$('.dossier__couverture').forEach((c) => {
    gsap.set(c, { transformPerspective: 2200, transformOrigin: '0% 50%' });
    gsap.fromTo(c, { rotationY: 0 }, {
      rotationY: -168, ease: 'power2.inOut',
      scrollTrigger: { trigger: c.closest('.dossier'), start: 'top 78%', end: 'top 28%', scrub: 0.6 },
    });
  });

  const frise = $('.frise');
  if (frise) {
    gsap.fromTo(frise, { x: () => window.innerWidth * 0.15 }, {
      x: () => -(frise.scrollWidth - window.innerWidth * 0.85), ease: 'none',
      scrollTrigger: { trigger: '.juridictions', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
    gsap.fromTo('.tampon', { scale: 1.4, opacity: 0 }, {
      scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.4)', stagger: 0.1,
      scrollTrigger: { trigger: '.juridictions', start: 'top 70%', once: true },
    });
  }
}
function onglets() {
  const liens = $$('.onglets a');
  if (!liens.length) return;
  const sections = liens.map((a) => document.getElementById(a.getAttribute('href').split('#')[1])).filter(Boolean);
  const maj = () => {
    const ligne = (parseInt(getComputedStyle(html).getPropertyValue('--entete-h')) || 64) + 90;
    let actif = -1;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= ligne + 40) actif = i; });
    const liste = liens[0].parentElement;
    if (actif >= 0 && liste.scrollWidth > liste.clientWidth && !liens[actif].classList.contains('actif')) {
      const l = liens[actif];
      liste.scrollTo({ left: l.offsetLeft - (liste.clientWidth - l.offsetWidth) / 2, behavior: calme ? 'auto' : 'smooth' });
    }
    liens.forEach((a, i) => {
      a.classList.toggle('actif', i === actif);
      if (i === actif) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', maj, { passive: true });
  maj();
}

/* ---------------------------------------------------------
   HONORAIRES ET RENDEZ-VOUS
   --------------------------------------------------------- */
function pageHonoraires() {
  const tl = gsap.timeline();
  tl.fromTo('.h-une__titre', { clipPath: 'inset(-10% 100% -20% 0%)' }, { clipPath: 'inset(-10% 0% -20% 0%)', duration: 0.9, ease: 'power3.inOut' }, 0.05)
    .fromTo('.convention__img', { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }, 0)
    .fromTo('.convention__feuille', { y: 80, rotate: 6, opacity: 0 }, { y: 0, rotate: -3, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0.35)
    .fromTo('.h-une .chapeau, .h-une .une__actions', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.45);
  const sig = $('.convention [data-trace]');
  if (sig) tl.to(sig, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 0.95);
  $$('.tableau-tarifs tbody tr').forEach((tr, i) => {
    gsap.fromTo(tr, { clipPath: 'inset(0% 100% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut', delay: (i % 4) * 0.12,
      scrollTrigger: { trigger: tr.closest('table'), start: 'top 82%', once: true },
    });
  });
  gsap.fromTo('.fiche', { y: 50, rotate: (i) => [-3, 1.5, -1][i] || 0, opacity: 0 }, {
    y: 0, rotate: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.modalites', start: 'top 82%', once: true },
  });
}
function fiches() {
  $$('.fiche').forEach((f) => {
    const b = $('.fiche__bouton', f);
    if (!b) return;
    b.addEventListener('click', () => {
      const r = f.classList.toggle('retournee');
      b.setAttribute('aria-pressed', String(r));
    });
  });
}
const FORFAITS = {
  consultation: { montant: '150 €', detail: 'Première consultation de 45 minutes pour évaluer votre dossier.' },
  horaire: { montant: '180 € / heure', detail: 'Facturation au temps passé sur votre dossier.' },
  paix: { montant: '800 € à 1 000 €', detail: 'Forfait indicatif pour une procédure devant la justice de paix.' },
  police: { montant: '850 € à 1 200 €', detail: 'Forfait indicatif pour une procédure devant le tribunal de police.' },
  licenciement: { montant: '2 600 € à 3 000 €', detail: 'Forfait indicatif pour un licenciement devant le tribunal du travail.' },
  autre: { montant: 'Sur devis', detail: 'Chaque situation étant particulière, le cabinet vous informe lors du premier entretien.' },
};
function estimateur() {
  const s = $('#estimateur-choix');
  const m = $('[data-estimateur-montant]');
  const d = $('[data-estimateur-detail]');
  if (!s || !m || !d) return;
  const maj = () => {
    const f = FORFAITS[s.value] || FORFAITS.autre;
    m.textContent = f.montant;
    d.textContent = f.detail;
    if (gsap && !calme) gsap.fromTo(m, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
  };
  s.addEventListener('change', maj);
  maj();
}

/* rendez-vous simulé */
const MATIERES = {
  etrangers: 'Droit des étrangers', affaires: 'Droit des affaires', immobilier: 'Droit immobilier',
  travail: 'Droit du travail', famille: 'Droit de la famille', autre: 'Autre question',
};
function joursOuvres(n) {
  const jours = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (jours.length < n) {
    d.setDate(d.getDate() + 1);
    const j = d.getDay();
    if (j !== 0 && j !== 6) jours.push(new Date(d));
  }
  return jours;
}
function rendezVous() {
  const form = $('#formulaire-rdv');
  if (!form) return;
  const etapes = $$('.etape', form);
  const barre = $$('.etapes-barre span', form);
  const prec = $('[data-prec]', form);
  const suiv = $('[data-suiv]', form);
  const envoyer = $('[data-envoyer]', form);
  const confirmation = $('.confirmation');
  const annonce = $('[data-annonce]');
  let i = 0;

  const creneaux = $('[data-creneaux]', form);
  if (creneaux) {
    const fmt = new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
    joursOuvres(8).forEach((d, k) => {
      const valeur = d.toISOString().slice(0, 10);
      const parts = fmt.format(d).split(' ');
      const lab = document.createElement('label');
      lab.innerHTML = `<input type="radio" name="jour" value="${valeur}" ${k === 0 ? '' : ''}><span><b>${parts[0]}</b><small>${parts.slice(1).join(' ')}</small></span>`;
      lab.querySelector('input').dataset.libelle = fmt.format(d);
      creneaux.appendChild(lab);
    });
  }
  const param = new URLSearchParams(location.search).get('matiere');
  if (param && MATIERES[param]) {
    const r = form.querySelector(`input[name="matiere"][value="${param}"]`);
    if (r) r.checked = true;
  }

  const afficher = (n, focus = true) => {
    i = n;
    etapes.forEach((e, k) => { e.hidden = k !== i; });
    barre.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : k === i ? 0.5 : 0));
    prec.hidden = i === 0;
    suiv.hidden = i === etapes.length - 1;
    envoyer.hidden = i !== etapes.length - 1;
    if (annonce) annonce.textContent = `Étape ${i + 1} sur ${etapes.length}`;
    if (focus) { const l = etapes[i].querySelector('legend'); if (l) { l.setAttribute('tabindex', '-1'); l.focus({ preventScroll: true }); } }
    if (gsap && !calme) gsap.fromTo(etapes[i], { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' });
  };
  const erreur = (etape, msg) => {
    const e = $('.erreur', etape);
    if (e) e.textContent = msg || '';
  };
  const valider = () => {
    const e = etapes[i];
    erreur(e, '');
    if (i === 0 && !form.querySelector('input[name="matiere"]:checked')) { erreur(e, 'Choisissez une matière, ou « Autre question ».'); return false; }
    if (i === 1 && !form.querySelector('input[name="profil"]:checked')) { erreur(e, 'Indiquez si vous êtes particulier, indépendant ou entreprise.'); return false; }
    if (i === 2 && !form.querySelector('input[name="jour"]:checked')) { erreur(e, 'Choisissez un jour souhaité ; le cabinet confirmera l’heure.'); return false; }
    if (i === 3) {
      let ok = true;
      const nom = $('#rdv-nom'), mail = $('#rdv-mail'), cons = $('#rdv-consentement');
      [nom, mail].forEach((c) => c.setAttribute('aria-invalid', 'false'));
      if (!nom.value.trim()) { nom.setAttribute('aria-invalid', 'true'); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim())) { mail.setAttribute('aria-invalid', 'true'); ok = false; }
      if (!cons.checked) ok = false;
      if (!ok) { erreur(e, 'Indiquez votre nom, une adresse e-mail valide et cochez l’accord sur l’usage de vos données.'); return false; }
    }
    return true;
  };
  suiv.addEventListener('click', () => { if (valider()) afficher(i + 1); });
  prec.addEventListener('click', () => afficher(i - 1));
  form.addEventListener('change', () => erreur(etapes[i], ''));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!valider()) return;
    const v = (n) => { const x = form.querySelector(`input[name="${n}"]:checked`); return x ? x : null; };
    const dl = $('[data-recap]', confirmation);
    const jour = v('jour');
    const moment = v('moment');
    const lignes = [
      ['Matière', MATIERES[v('matiere').value]],
      ['Vous êtes', v('profil').value],
      ['Jour souhaité', `${jour.dataset.libelle}${moment ? ', ' + moment.value : ''}`],
      ['Nom', $('#rdv-nom').value.trim()],
      ['E-mail', $('#rdv-mail').value.trim()],
    ];
    if ($('#rdv-tel').value.trim()) lignes.push(['Téléphone', $('#rdv-tel').value.trim()]);
    dl.innerHTML = '';
    lignes.forEach(([k, val]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = val;
      dl.append(dt, dd);
    });
    form.hidden = true;
    confirmation.hidden = false;
    barre.forEach((b) => b.style.setProperty('--p', 1));
    const t = confirmation.querySelector('h3');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
    const c = $('.cachet', confirmation);
    if (c && gsap && !calme) cachetTombe(c, { rot: -10 });
  });
  const recommencer = $('[data-recommencer]');
  if (recommencer) recommencer.addEventListener('click', () => {
    form.reset(); form.hidden = false; confirmation.hidden = true; afficher(0);
  });
  afficher(0, false);
}

/* ---------------------------------------------------------
   404 et pages simples
   --------------------------------------------------------- */
function pageSimple() {
  const c = $('.p404 .cachet');
  if (c) cachetTombe(c, { rot: -8, delay: 0.4 });
  const t = $('.p404 h1, .legal h1');
  if (t) gsap.fromTo(t, { clipPath: 'inset(-10% 100% -20% 0%)' }, { clipPath: 'inset(-10% 0% -20% 0%)', duration: 0.9, ease: 'power3.inOut' });
  const img = $('.p404 .cadre-photo');
  if (img) gsap.fromTo(img, { opacity: 0, rotate: 4, y: 40 }, { opacity: 1, rotate: -1.5, y: 0, duration: 0.9, ease: 'power3.out' });
}

/* ---------------------------------------------------------
   Démarrage
   --------------------------------------------------------- */
async function demarrer() {
  initCalme();
  initMenu();
  initLiens();
  initFolio();
  initBarreMobile();
  fiches();
  estimateur();
  rendezVous();

  await polices();
  html.classList.remove('fonts-pending');
  mesurer();

  if (calme || !gsap || !ScrollTrigger) {
    $$('[data-compteur]').forEach((el) => el.setAttribute('aria-label', el.textContent.trim()));
    if (page === 'matieres') onglets();
    if (!restaurerSection() && location.hash) allerA(location.hash, true);
    initLampe();
    return;
  }

  initLampe();
  initCurseur();
  initMagnetiques();
  const arrive = arrivee();

  if (page === 'accueil') {
    traces();
    const tl = introEtUne();
    if (lampe) {
      if (html.classList.contains('intro')) gsap.delayedCall(1.05, () => lampe.demarrer());
      else lampe.demarrer();
    }
    matieresAccueil();
    inventaire();
    secret();
    compteurs();
    honorairesAccueil();
    acces();
    finalAccueil();
    void tl;
  } else {
    traces();
    if (lampe) lampe.demarrer();
    await arrive;
    if (page === 'matieres') { pageMatieres(); onglets(); }
    if (page === 'honoraires') pageHonoraires();
    if (page === 'simple') pageSimple();
  }
  titresImprimes();
  lignesImprimees();
  surligneurs();
  parallaxes();

  ScrollTrigger.refresh();
  if (!restaurerSection() && location.hash) {
    requestAnimationFrame(() => allerA(location.hash, true));
  }
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

demarrer();
