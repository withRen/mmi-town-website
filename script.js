(() => {
  'use strict';

  // --- Configuration ---
  const SERVER_IP = 'mmitown.xyz';
  const DISCORD_URL = ''; // ex. 'https://discord.gg/xxxxxxx' (le bouton reste cache tant que c'est vide)

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // --- Pictogrammes pixel (10x10) : '#' = couleur du metier, 'o' = reflet ---
  const ICONS = {
    pickaxe: ['..######..', '.#..oo..#.', '#...oo...#', '....oo....', '....oo....', '....oo....', '....oo....', '....oo....', '....oo....', '..........'],
    axe: ['....####..', '...######.', '...######.', '....####o.', '.......o..', '......o...', '.....o....', '....o.....', '...o......', '..........'],
    wheat: ['....#.....', '...###....', '..#.#.#...', '...###....', '..#.#.#...', '...###....', '....o.....', '....o.....', '....o.....', '....o.....'],
    sword: ['........##', '.......#o#', '......#o#.', '.....#o#..', '....#o#...', '#..#o#....', '.##o#.....', '..##......', '.#.##.....', '#.........'],
    fish: ['..........', '..........', '..####...#', '.######.##', '#o######.#', '.######.##', '..####...#', '..........', '..........', '..........'],
    check: ['..........', '..........', '.........#', '........##', '#......##.', '.#....##..', '..#..##...', '...###....', '....#.....', '..........'],
  };
  function renderIcons(root) {
    root.querySelectorAll('[data-px]').forEach((svg) => {
      const rows = ICONS[svg.dataset.px];
      if (!rows || svg.childElementCount) return;
      svg.setAttribute('viewBox', '0 0 10 10');
      let out = '';
      rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          if (ch === '#') out += `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`;
          else if (ch === 'o') out += `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/><rect x="${x}" y="${y}" width="1" height="1" fill="#fff" fill-opacity=".4"/>`;
        });
      });
      svg.innerHTML = out;
    });
  }
  renderIcons(document);

  // --- Ciel de la cover : etoiles qui scintillent, eclats, fenetres qui s'allument et s'eteignent ---
  const skyCanvas = document.getElementById('sky');
  const SKY = window.COVER_SKY;
  if (skyCanvas && SKY) {
    const ctx = skyCanvas.getContext('2d');
    skyCanvas.width = SKY.w;
    skyCanvas.height = SKY.h;
    const rand = (a, b) => a + Math.random() * (b - a);
    const stars = SKY.stars.map(([x, y, b]) => ({ x, y, base: b / 255, p: rand(0, 6.28), sp: rand(0.5, 1.6), glint: 0 }));
    const big = SKY.big.map(([x, y]) => ({ x, y, p: rand(0, 6.28), sp: rand(0.6, 1.1), glint: 0 }));
    // Fenetres : etat cible (allumee ou non) et opacite courante qui glisse vers la cible
    const windows = SKY.windows.map(([x, y, kind]) => {
      const on = Math.random() < (kind ? 0.9 : 0.8);
      return { x, y, kind, on, a: on ? 1 : 0, next: rand(2, 18) };
    });
    const COLORS = [[150, 86, 70], [255, 176, 84]];
    let last = 0;
    let nextGlint = 0;

    function cross(x, y, arm, alpha) {
      ctx.fillStyle = `rgba(255, 244, 214, ${alpha.toFixed(2)})`;
      ctx.fillRect(x, y, 1, 1);
      for (let i = 1; i <= arm; i++) {
        const a = alpha * (1 - (i - 1) / (arm + 1));
        ctx.fillStyle = `rgba(255, 244, 214, ${a.toFixed(2)})`;
        ctx.fillRect(x - i, y, 1, 1);
        ctx.fillRect(x + i, y, 1, 1);
        ctx.fillRect(x, y - i, 1, 1);
        ctx.fillRect(x, y + i, 1, 1);
      }
    }

    function drawSky(t, dt, animate) {
      ctx.clearRect(0, 0, SKY.w, SKY.h);
      // etoiles : scintillement doux
      for (const s of stars) {
        const tw = animate ? 0.55 + 0.45 * Math.sin(t * s.sp + s.p) : 1;
        ctx.fillStyle = `rgba(${Math.round(255 * s.base)}, ${Math.round(255 * s.base)}, ${Math.min(255, Math.round(255 * s.base) + 20)}, ${(s.base * tw).toFixed(2)})`;
        ctx.fillRect(s.x, s.y, 1, 1);
        if (s.glint > 0) {
          const k = Math.sin((1 - s.glint) * Math.PI);
          cross(s.x, s.y, 1 + Math.round(2 * k), 0.95 * k);
          s.glint = Math.max(0, s.glint - dt / 1.3);
        }
      }
      // grandes etoiles : croix permanente qui respire
      for (const s of big) {
        const k = animate ? 0.5 + 0.5 * Math.sin(t * s.sp + s.p) : 0.7;
        cross(s.x, s.y, 1 + (k > 0.8 ? 1 : 0), 0.55 + 0.4 * k);
        if (s.glint > 0) {
          const g = Math.sin((1 - s.glint) * Math.PI);
          cross(s.x, s.y, 2 + Math.round(3 * g), g);
          s.glint = Math.max(0, s.glint - dt / 1.6);
        }
      }
      // fenetres
      for (const w of windows) {
        if (animate) {
          w.next -= dt;
          if (w.next <= 0) { w.on = !w.on; w.next = w.on ? rand(8, 30) : rand(2, 9); }
          w.a += ((w.on ? 1 : 0) - w.a) * Math.min(1, dt * 3.5);
        }
        if (w.a < 0.03) continue;
        const [r, g, b] = COLORS[w.kind];
        const flick = animate && w.on ? 0.92 + 0.08 * Math.sin(t * 3 + w.x * 1.7 + w.y) : 1;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(w.a * flick).toFixed(2)})`;
        ctx.fillRect(w.x, w.y, 2, 3);
      }
    }

    let running = false;
    let frame = 0;
    function loop(now) {
      const t = now / 1000;
      const dt = Math.min(0.1, last ? t - last : 0.016);
      last = t;
      if (t > nextGlint) {
        // un eclat sur une etoile au hasard, parfois sur une grande
        const pool = Math.random() < 0.35 ? big : stars;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick && pick.glint <= 0) pick.glint = 1;
        nextGlint = t + rand(0.25, 0.9);
      }
      drawSky(t, dt, true);
      if (running) frame = requestAnimationFrame(loop);
    }
    function setRunning(on) {
      if (on === running) return;
      running = on;
      last = 0;
      if (on) frame = requestAnimationFrame(loop); else cancelAnimationFrame(frame);
    }
    if (reduceMotion) {
      drawSky(0, 0, false);
    } else {
      new IntersectionObserver((entries) => setRunning(entries[0].isIntersecting && !document.hidden)).observe(skyCanvas);
      document.addEventListener('visibilitychange', () => setRunning(!document.hidden));
    }
  }

  // --- Copier l'IP (avec etat d'erreur) ---
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      area.remove();
      return ok;
    }
  }
  const copyError = document.querySelector('[data-copy-error]');
  document.querySelectorAll('[data-copy]').forEach((el) => {
    const label = el.querySelector('[data-copy-label]');
    const isButton = el.tagName === 'BUTTON';
    const original = isButton ? el.textContent : label && label.textContent;
    const setText = (text) => { if (isButton) el.textContent = text; else if (label) label.textContent = text; };
    const run = async () => {
      const ok = await copyText(el.dataset.copy);
      if (copyError) copyError.hidden = ok;
      if (ok) {
        el.classList.add('copied');
        setText(isButton ? 'IP copiée' : 'COPIÉ');
        setTimeout(() => { el.classList.remove('copied'); setText(original); }, 1800);
      }
    };
    el.addEventListener('click', run);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
    });
  });

  // --- Joueurs en ligne (API publique mcsrvstat.us) : loading / on / off / error ---
  const onlineBoxes = document.querySelectorAll('.online');
  const playersEls = document.querySelectorAll('[data-players]');
  const pingEls = document.querySelectorAll('[data-ping]');
  function setStatus(state, text, players) {
    onlineBoxes.forEach((box) => {
      box.dataset.state = state;
      const label = box.querySelector('[data-online]');
      if (label) label.textContent = text;
    });
    playersEls.forEach((el) => { el.textContent = players || (state === 'loading' ? '…' : '—'); });
    pingEls.forEach((el) => { el.classList.toggle('on', state === 'on'); el.classList.toggle('error', state === 'error'); });
  }
  async function loadStatus() {
    try {
      const res = await fetch(`https://api.mcsrvstat.us/3/${SERVER_IP}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      if (data.online) {
        const n = data.players ? data.players.online : 0;
        const max = data.players && data.players.max ? data.players.max : '';
        setStatus('on', `${n} joueur${n > 1 ? 's' : ''} en ligne`, `${n}${max ? '/' + max : ''}`);
      } else {
        setStatus('off', 'serveur hors ligne', 'hors ligne');
      }
    } catch {
      setStatus('error', 'statut indisponible', 'indisponible');
    }
  }
  loadStatus();
  setInterval(loadStatus, 60000);

  // --- Discord (bouton cache sans lien) ---
  const discord = document.getElementById('discord-btn');
  if (DISCORD_URL) {
    discord.href = DISCORD_URL;
    discord.hidden = false;
  }

  // --- Compte a rebours avant les nouvelles quetes (minuit) ---
  const timer = document.getElementById('reset-timer');
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const s = Math.floor((next - now) / 1000);
    timer.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
  }
  tick();
  setInterval(tick, 1000);

  // --- Metiers : hotbar + panneau d'infos (survol, clic, clavier) ---
  const JOBS = {
    mineur: {
      name: 'Mineur', icon: 'pickaxe', color: '#9FB4C7',
      desc: 'Creuse les profondeurs à la recherche de minerais.',
      xp: ['Minerais : charbon, fer, or, diamant…', 'Plus le minerai est rare, plus il rapporte', 'Débris antiques : le meilleur gain'],
      perk: 'Chance de doubler les minerais',
      steps: [[10, '8 lanternes'], [20, '2 diamants'], [30, 'Pioche en diamant Efficacité III'], [40, '5 diamants'], [50, 'Lingot de netherite']],
    },
    bucheron: {
      name: 'Bûcheron', icon: 'axe', color: '#C08A52',
      desc: 'Abat les arbres de toutes les forêts du monde.',
      xp: ['Bûches de tous les arbres', 'Tiges du Nether'],
      perk: 'Chance de doubler les bûches',
      steps: [[10, '8 pommes'], [20, '2 pommes dorées'], [30, 'Hache en diamant Efficacité III'], [40, '4 pommes dorées'], [50, 'Pomme dorée enchantée']],
    },
    fermier: {
      name: 'Fermier', icon: 'wheat', color: '#E6C35C',
      desc: 'Cultive les champs et élève les animaux.',
      xp: ['Récoltes arrivées à maturité', 'Faire se reproduire des animaux'],
      perk: 'Chance de doubler les récoltes',
      note: 'Niveau 15 : replantation automatique des cultures.',
      steps: [[10, '32 poudres d\'os'], [20, '16 carottes dorées'], [30, 'Houe en diamant Fortune II'], [40, '32 carottes dorées'], [50, 'Œuf de renifleur']],
    },
    chasseur: {
      name: 'Chasseur', icon: 'sword', color: '#E8412C',
      desc: 'Protège le monde des créatures de la nuit.',
      xp: ['Tuer des monstres hostiles', 'Les boss rapportent énormément'],
      perk: 'Chance de doubler le butin et l\'XP',
      steps: [[10, '32 flèches'], [20, 'Arc Puissance III'], [30, 'Épée en diamant Tranchant III'], [40, 'Totem d\'immortalité'], [50, 'Lingot de netherite']],
    },
    pecheur: {
      name: 'Pêcheur', icon: 'fish', color: '#4A9FD8',
      desc: 'Patient, il tire des eaux poissons et trésors.',
      xp: ['Poissons pêchés', 'Trésors : livres, selles…'],
      perk: 'Chance d\'une prise supplémentaire',
      note: 'Niveau 25 : petite chance de trésors bonus.',
      steps: [[10, '16 saumons cuits'], [20, 'Canne à pêche Chance de la mer II'], [30, '4 coquillages nautile'], [40, 'Canne à pêche Appât III'], [50, 'Cœur de l\'océan']],
    },
  };
  const RANKS = 'Apprenti → Compagnon (10) → Artisan (25) → Maître (40) → Légende (50)';
  const hotbar = document.getElementById('hotbar');
  const panel = document.getElementById('job-panel');
  const slots = [...hotbar.querySelectorAll('.slot')];

  function iconSvg(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'px');
    svg.setAttribute('aria-hidden', 'true');
    svg.dataset.px = name;
    return svg;
  }
  let currentJob = '';
  function selectJob(id, focus) {
    const job = JOBS[id];
    if (!job || id === currentJob) return;
    currentJob = id;
    slots.forEach((slot) => {
      const on = slot.dataset.job === id;
      slot.setAttribute('aria-selected', on ? 'true' : 'false');
      slot.tabIndex = on ? 0 : -1;
      if (on && focus) slot.focus();
    });
    panel.style.setProperty('--c', job.color);
    panel.setAttribute('aria-label', job.name);
    const list = (items) => `<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
    panel.innerHTML = `
      <div class="job-body">
        <div>
          <div class="job-head"><span data-slot-icon></span><div><h3>${job.name}</h3><small>Niveau max 50</small></div></div>
          <p class="job-desc">${job.desc}</p>
          <div class="job-block"><h5>GAGNER DE L'XP</h5>${list(job.xp)}</div>
          <div class="job-block"><h5>BONUS</h5>${list([`${job.perk} : 0,5 % par niveau, 25 % au niveau 50`])}</div>
          ${job.note ? `<p class="job-note">${job.note}</p>` : ''}
        </div>
        <div class="milestones">
          <h5>RÉCOMPENSES DE PALIER</h5>
          <ul>${job.steps.map(([lvl, reward]) => `<li><b>Niv. ${lvl}</b><span>${reward}</span></li>`).join('')}</ul>
          <p class="job-note">Des émeraudes à chaque niveau. ${RANKS}.</p>
        </div>
      </div>`;
    const holder = panel.querySelector('[data-slot-icon]');
    const svg = iconSvg(job.icon);
    holder.replaceWith(svg);
    renderIcons(svg.parentElement);
  }
  slots.forEach((slot) => {
    slot.addEventListener('click', () => selectJob(slot.dataset.job));
    if (canHover) slot.addEventListener('pointerenter', () => selectJob(slot.dataset.job));
    slot.addEventListener('focus', () => selectJob(slot.dataset.job));
  });
  hotbar.addEventListener('keydown', (e) => {
    const i = slots.findIndex((s) => s.dataset.job === currentJob);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % slots.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + slots.length) % slots.length;
    else if (/^[1-5]$/.test(e.key)) next = Number(e.key) - 1;
    if (next >= 0) { e.preventDefault(); selectJob(slots[next].dataset.job, true); }
  });
  selectJob('mineur');

  // --- Cascade a l'apparition : delai selon la position parmi les freres ---
  document.querySelectorAll('.reveal').forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--i', Math.min(siblings.indexOf(el), 6));
  });

  document.querySelectorAll('[data-grow]').forEach((bar) => {
    bar.dataset.target = bar.style.width;
    bar.style.width = '0%';
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      el.querySelectorAll('[data-grow]').forEach((bar) => { bar.style.width = bar.dataset.target; });
      io.unobserve(el);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // --- Bouton magnetique (CTA principal) : aucun etat React, uniquement des variables CSS ---
  if (canHover && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      let frame = 0;
      btn.addEventListener('pointermove', (e) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
          btn.style.setProperty('--mx', `${dx.toFixed(1)}px`);
          btn.style.setProperty('--my', `${dy.toFixed(1)}px`);
        });
      });
      btn.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }
})();
