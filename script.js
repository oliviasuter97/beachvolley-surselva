const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentLang = 'de';

// Loader — shown briefly for the ball animation to be visible;
// tie this to real asset readiness once the site has heavier assets.
const loader = document.getElementById('loader');
if (loader) {
  const hide = () => loader.classList.add('hide');
  setTimeout(hide, reduced ? 0 : 1100);
}

// Overlay header — transparent over the hero photo, solid navy once scrolled.
const overlayHeader = document.getElementById('siteHeader');
if (overlayHeader) {
  const updateHeaderScroll = () => overlayHeader.classList.toggle('scrolled', window.scrollY > 40);
  updateHeaderScroll();
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
}

// Language toggle — DE default, EN swaps every [data-de]/[data-en] pair.
const langBtns = document.querySelectorAll('.lang-btn');
const bookMessages = {
  de: 'Hallo, ich möchte gerne einen Platz buchen.',
  en: 'Hi, I would like to book a court.',
};
function updateBookLinks(lang) {
  const defaultMsg = bookMessages[lang] || bookMessages.de;
  document.querySelectorAll('.book-cta').forEach((el) => {
    const custom = el.dataset[lang === 'en' ? 'enMsg' : 'deMsg'];
    el.href = 'https://wa.me/41787464683?text=' + encodeURIComponent(custom || defaultMsg);
  });
}
langBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    langBtns.forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.i18n').forEach((el) => {
      const text = el.dataset[lang];
      if (text) el.textContent = text;
    });
    document.documentElement.lang = lang;
    currentLang = lang;
    updateBookLinks(lang);
  });
});
updateBookLinks('de');

// Mobile drawer
const drawerToggle = document.getElementById('drawerToggle');
const drawer = document.getElementById('drawer');
if (drawerToggle && drawer) {
  drawerToggle.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    drawerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  drawer.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      drawerToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Hero ball — follows the cursor around the hero, standing in for the
// pointer itself (the hero sets cursor:none). Eased with lerp so it
// trails smoothly rather than snapping to the raw mouse position.
// Disabled on touch (no real cursor there) and under reduced motion.
const ball = document.getElementById('hero-ball');
const courtArea = document.getElementById('courtArea');
if (ball && courtArea) {
  let targetX = courtArea.clientWidth / 2;
  let targetY = courtArea.clientHeight / 2;
  let ballX = targetX;
  let ballY = targetY;
  let raf = null;
  let spinDeg = 0;
  ball.style.transform = `translate(${ballX - 26}px, ${ballY - 26}px)`;

  courtArea.addEventListener('mousemove', (e) => {
    const rect = courtArea.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    ball.classList.add('following');
    if (!raf) raf = requestAnimationFrame(tick);
  });
  courtArea.addEventListener('mouseleave', () => {
    ball.classList.remove('following');
  });

  function tick() {
    const dx = targetX - ballX;
    const dy = targetY - ballY;
    ballX += dx * 0.16;
    ballY += dy * 0.16;
    spinDeg += Math.hypot(dx, dy) * 0.06;
    ball.style.transform = `translate(${ballX - 26}px, ${ballY - 26}px) rotate(${spinDeg}deg)`;
    if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }
}

// Beach hero video — the source file is ~60MB, far too heavy for mobile
// data. Only autoplay on wide viewports where a hover-capable pointer
// signals a desktop/laptop; phones and tablets keep the poster photo.
const beachVideo = document.getElementById('beachVideo');
if (beachVideo) {
  const canAutoplayVideo = !reduced && window.matchMedia('(min-width: 901px) and (hover: hover)').matches;
  if (canAutoplayVideo) {
    beachVideo.setAttribute('preload', 'auto');
    beachVideo.play().catch(() => {});
  } else {
    beachVideo.removeAttribute('autoplay');
  }
}

// Serve sound — a short synthesized "thwok", no audio file needed.
// Plays on the hero ball and on primary buttons. Needs a user gesture
// to unlock audio in most browsers, which a click already provides.
let audioCtx = null;
function playServeSound() {
  if (reduced) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  // Impact: short filtered noise burst
  const bufferSize = audioCtx.sampleRate * 0.12;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 900;
  noiseFilter.Q.value = 0.7;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  noise.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
  noise.start(now);

  // Body: quick downward pitch thump
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);
  const oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.35, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(oscGain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}
document.querySelectorAll('#hero-ball, .btn-primary').forEach((el) => {
  el.addEventListener('click', playServeSound);
});

// Press photo lightbox — the grayscale news rings go full-color and large.
const pressModal = document.getElementById('pressModal');
const pressModalPhoto = document.getElementById('pressModalPhoto');
const pressModalCaption = document.getElementById('pressModalCaption');
const pressModalClose = document.getElementById('pressModalClose');
document.querySelectorAll('.press-ring[data-photo]').forEach((btn) => {
  btn.addEventListener('click', () => {
    pressModalPhoto.style.backgroundImage = `url('${btn.dataset.photo}')`;
    const source = btn.querySelector('.press-ring-source').textContent;
    const date = btn.querySelector('.press-ring-date').textContent;
    pressModalCaption.textContent = `${source}, ${date}`;
    pressModal.classList.add('open');
    pressModal.setAttribute('aria-hidden', 'false');
  });
});
function closePressModal() {
  if (!pressModal) return;
  pressModal.classList.remove('open');
  pressModal.setAttribute('aria-hidden', 'true');
}
if (pressModalClose) pressModalClose.addEventListener('click', closePressModal);
if (pressModal) pressModal.addEventListener('click', (e) => { if (e.target === pressModal) closePressModal(); });

// Event detail modal — clicking a program tag opens a short info panel
// with a WhatsApp link to ask about that specific event.
const eventDetails = {
  'camp-junior': {
    emoji: '🏐',
    de: { title: 'Junior Beachvolleyball-Camp', desc: '5-tägiges Trainingscamp für Jugendliche (Jg. 10–18, mind. 10 Trainings vorausgesetzt). Täglich 4–5 Stunden Beachvolleyball: Technik, Taktik, Athletik, plus Abschlussturnier. Übernachtung im Zelt möglich, Verpflegung wählbar.', msg: 'Hallo, ich interessiere mich für das Junior Beachvolleyball-Camp.' },
    en: { title: 'Junior Beachvolleyball Camp', desc: 'A 5-day training camp for teens (born 2008–2016, at least 10 prior trainings required). 4–5 hours of beach volleyball daily: technique, tactics, athletics, plus a final tournament. Tent accommodation available, meals optional.', msg: "Hi, I'm interested in the Junior Beachvolleyball Camp." },
  },
  'camp-auffahrt': {
    emoji: '☀️',
    de: { title: 'Beach-Camp Auffahrt', desc: 'Trainingscamp für Erwachsene (ab 18) über Auffahrt. Geleitete Trainings auf allen Niveaus, max. 8 Teilnehmende pro Feld. Camping vor Ort oder eigene Anreise möglich, Verpflegung durch den Camp-Koch.', msg: 'Hallo, ich interessiere mich für das Beach-Camp Auffahrt.' },
    en: { title: 'Beach Camp Auffahrt', desc: 'A training camp for adults (18+) over the Ascension weekend. Guided training at all levels, max. 8 participants per court. On-site camping or commute, meals by the camp cook.', msg: "Hi, I'm interested in the Beach Camp Auffahrt." },
  },
  'weihnachtsturnier': {
    emoji: '🎄',
    de: { title: 'Weihnachtsturnier', desc: 'Traditionelles Hallenturnier kurz vor Weihnachten, mit zwei Kategorien: Freaks (Spieler:innen mit Lizenz bis NLA B) und Plausch (max. 1 lizenzierter Mann oder 2 lizenzierte Frauen pro Team).', msg: 'Hallo, ich interessiere mich für das Weihnachtsturnier.' },
    en: { title: 'Christmas Tournament', desc: "A traditional indoor tournament just before Christmas, with two categories: Freaks (licensed players up to NLA B) and Plausch (max. 1 licensed man or 2 licensed women per team).", msg: "Hi, I'm interested in the Christmas Tournament." },
  },
  'a2-turnier': {
    emoji: '🏆',
    de: { title: 'A2 Beachturnier', desc: 'Seit 2014 organisiert der Beachsportclub Surselva jährlich ein A2-Beachturnier auf vier Feldern in Ilanz — zwei Tage Beachvolleyball auf A2-Niveau mit Schweizer Teams.', msg: 'Hallo, ich interessiere mich für das A2 Beachturnier.' },
    en: { title: 'A2 Beach Tournament', desc: 'Since 2014, Beachsportclub Surselva has run an annual A2-level beach tournament on four courts in Ilanz — two days of beach volleyball with Swiss teams.', msg: "Hi, I'm interested in the A2 Beach Tournament." },
  },
};
const eventModal = document.getElementById('eventModal');
const eventModalClose = document.getElementById('eventModalClose');
function openEventModal(key) {
  const data = eventDetails[key];
  if (!data || !eventModal) return;
  const lang = data[currentLang] || data.de;
  document.getElementById('eventModalEmoji').textContent = data.emoji;
  document.getElementById('eventModalTitle').textContent = lang.title;
  document.getElementById('eventModalDesc').textContent = lang.desc;
  document.getElementById('eventModalCta').href = 'https://wa.me/41787464683?text=' + encodeURIComponent(lang.msg);
  eventModal.classList.add('open');
  eventModal.setAttribute('aria-hidden', 'false');
}
function closeEventModal() {
  if (!eventModal) return;
  eventModal.classList.remove('open');
  eventModal.setAttribute('aria-hidden', 'true');
}
document.querySelectorAll('.event-card').forEach((btn) => {
  btn.addEventListener('click', () => openEventModal(btn.dataset.event));
});
if (eventModalClose) eventModalClose.addEventListener('click', closeEventModal);
if (eventModal) eventModal.addEventListener('click', (e) => { if (e.target === eventModal) closeEventModal(); });

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeEventModal(); closePressModal(); } });

// Contact form — submits via FormSubmit.co (no server of our own needed),
// which forwards it straight to Roman's inbox. Shows an inline confirmation
// instead of leaving the page.
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const contactBtn = contactForm.querySelector('button[type="submit"]');
  const contactNote = contactForm.querySelector('.fine');
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    contactBtn.disabled = true;
    contactBtn.textContent = currentLang === 'en' ? 'Sending …' : 'Wird gesendet …';
    fetch('https://formsubmit.co/ajax/roman.cantieni@hotmail.com', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(contactForm),
    })
      .then((res) => { if (!res.ok) throw new Error('send failed'); return res.json(); })
      .then(() => {
        contactForm.hidden = true;
        const success = document.getElementById('contactSuccess');
        if (success) success.hidden = false;
      })
      .catch(() => {
        contactBtn.disabled = false;
        contactBtn.textContent = currentLang === 'en' ? 'Send message' : 'Nachricht senden';
        if (contactNote) {
          contactNote.textContent = currentLang === 'en'
            ? 'That did not work — please email roman.cantieni@hotmail.com directly instead.'
            : 'Das hat leider nicht geklappt. Schreib stattdessen direkt an roman.cantieni@hotmail.com.';
          contactNote.style.color = '#c0392b';
        }
      });
  });
}

// Gallery — endless loop. The track's own photos are duplicated once so a
// 50%-width translate wraps seamlessly back to the start.
const galleryTrack = document.getElementById('galleryTrack');
if (galleryTrack && !reduced) {
  const originals = Array.from(galleryTrack.children);
  originals.forEach((img) => {
    const clone = img.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    galleryTrack.appendChild(clone);
  });
}

// Sponsor strip — same seamless-loop trick as the gallery, just horizontal
// and slower so the logos stay readable as they drift past.
const sponsorTrack = document.getElementById('sponsorTrack');
if (sponsorTrack && !reduced) {
  const originals = Array.from(sponsorTrack.children);
  originals.forEach((img) => {
    const clone = img.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    sponsorTrack.appendChild(clone);
  });
}

// Scroll reveal
if (!reduced) {
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
}

// Camp/retreat promo — surfaces once per session when the visitor reaches
// the "Unser Programm" camps section, since that's when the offer is relevant.
const campPromo = document.getElementById('campPromo');
const eventsSection = document.getElementById('events');
if (campPromo && eventsSection) {
  const dismissed = sessionStorage.getItem('campPromoDismissed');
  const hidePromo = () => {
    campPromo.classList.remove('show');
    sessionStorage.setItem('campPromoDismissed', '1');
  };
  document.getElementById('campPromoClose').addEventListener('click', hidePromo);
  document.getElementById('campPromoCta').addEventListener('click', hidePromo);
  if (!dismissed) {
    const promoIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          campPromo.hidden = false;
          requestAnimationFrame(() => campPromo.classList.add('show'));
          promoIo.disconnect();
        }
      });
    }, { threshold: 0.4 });
    promoIo.observe(eventsSection);
  }
}

// Team slider — a horizontal, snap-scrolling strip of team photos with
// prev/next arrows and dots. Clicking a slide opens the detail modal below
// with standings and roster for the teams that have them.
const teamData = {
  damen: {
    photo: 'images/teams/damen.jpg',
    name: 'Volley Surselva Damen',
    league: { de: '4. Liga, Gruppe A', en: '4th league, Group A' },
    training: { de: 'Di 19:30–21:15', en: 'Tue 19:30–21:15' },
    signupHref: '#kontakt',
    season: '2025/26',
    standings: [
      ['1', 'VBC Davos', '14', '14', '41'],
      ['2', 'Volley Surselva', '14', '10', '29'],
      ['3', 'VBC Viamala Thusis 2', '14', '8', '27'],
      ['4', 'VBC Bonaduz 2', '14', '9', '26'],
      ['5', 'Volley Untervaz', '14', '9', '25'],
      ['6', 'VBC Galina 3', '14', '4', '13'],
      ['7', 'VBC Chur 3', '14', '2', '7'],
      ['8', 'VBC Galina 4', '14', '0', '0'],
    ],
    roster: [
      ['1', 'Ramona', 'Mitte'], ['5', 'Kayleen', 'Diagonal'], ['7', 'Laura', 'Aussen'], ['8', 'Alina', 'Pass'],
      ['10', 'Binia', 'Mitte'], ['11', 'Iva', 'Aussen'], ['12', 'Hannah', 'Aussen'], ['13', 'Celine', 'Mitte'],
    ],
    coach: 'Roman Cantieni',
  },
  herren1: {
    photo: null,
    name: 'Volley Surselva 1',
    league: { de: '4. Liga', en: '4th league' },
    training: { de: 'Fr 20:15–22:00', en: 'Fri 20:15–22:00' },
    signupHref: '#kontakt',
    season: '2022/23',
    standings: [
      ['1', 'VBC Galina 3', '10', '9', '25'],
      ['2', 'VBC Chur 3', '10', '7', '22'],
      ['3', 'Volley Surselva 1', '10', '6', '17'],
      ['4', 'VBC Galina 2', '10', '5', '16'],
      ['5', 'VBC Chur 4', '10', '2', '6'],
      ['6', 'Volley Surselva 2', '10', '1', '4'],
    ],
    roster: [
      ['3', 'Roman', 'Universal'], ['13', 'Mac', 'Universal'], ['', 'Julien', 'Universal'], ['', 'Stefan', 'Mitte'],
      ['', 'Matia', 'Aussen'], ['', 'Nicolas', 'Mitte'], ['', 'Maksym', 'Mitte'], ['', 'Noah', 'Aussen'],
    ],
    coach: 'Roman Cantieni',
  },
  herren2: {
    photo: 'images/teams/herren-2.jpg',
    name: 'Volley Surselva 2',
    league: { de: '4. Liga, Gruppe A', en: '4th league, Group A' },
    training: { de: 'Do 19:00–21:00', en: 'Thu 19:00–21:00' },
    signupHref: '#kontakt',
    season: '2023/24',
    standings: [
      ['1', 'VBC Galina 3', '10', '9', '25'],
      ['2', 'VBC Chur 3', '10', '7', '22'],
      ['3', 'Volley Surselva 1', '10', '6', '17'],
      ['4', 'VBC Galina 2', '10', '5', '16'],
      ['5', 'VBC Chur 4', '10', '2', '6'],
      ['6', 'Volley Surselva 2', '10', '1', '4'],
    ],
    roster: [
      ['4', 'Philipp', 'Mitte'], ['8', 'Alex', 'Dia/Pass'], ['12', 'Raphael', 'Dia'], ['16', 'Dominik', 'Pass'],
      ['20', 'Ezat', 'Mitte'], ['21', 'Dante', 'Aussen'], ['', 'Amin', 'Dia'], ['', 'Luca', 'Mitte'], ['', 'Sascha', ''],
    ],
    coach: 'Alex Cola',
  },
  minis: {
    photo: null,
    name: 'Minis',
    category: { de: 'Jg. 2009 u. jünger', en: 'Born 2009 or later' },
    training: { de: 'Fr 18:00–19:30', en: 'Fri 18:00–19:30' },
    signupHref: 'anmeldung-jugend.html',
  },
  juniors: {
    photo: null,
    name: 'Juniors',
    category: { de: 'Jg. 2007 u. jünger', en: 'Born 2007 or later' },
    training: { de: 'Fr 19:00–20:15', en: 'Fri 19:00–20:15' },
    signupHref: 'anmeldung-jugend.html',
  },
  u18frauen: {
    photo: null,
    name: 'U18 Frauen',
    category: { de: 'U18', en: 'U18' },
    training: { de: 'Zeit folgt', en: 'Time TBA' },
    signupHref: 'anmeldung-jugend.html',
  },
  plausch: {
    photo: null,
    name: 'Plausch Dienstag',
    category: { de: 'Für alle', en: 'Open to all' },
    training: { de: 'Di, Zeit folgt', en: 'Tue, Time TBA' },
    signupHref: '#kontakt',
  },
};
const standingsHead = { de: ['Rg', 'Team', 'Sp', 'S', 'Pkt'], en: ['Rk', 'Team', 'Pl', 'W', 'Pts'] };
const rosterHead = { de: ['Nr', 'Name', 'Position'], en: ['No', 'Name', 'Position'] };
function renderTeamTable(el, head, rows) {
  el.innerHTML = '';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = row.map((cell) => `<td>${cell}</td>`).join('');
    tbody.appendChild(tr);
  });
  el.appendChild(thead);
  el.appendChild(tbody);
}
const teamSliderTrack = document.getElementById('teamSliderTrack');
if (teamSliderTrack) {
  const slides = Array.from(teamSliderTrack.children);
  const dots = Array.from(document.querySelectorAll('.team-slider-dot'));
  const prevBtn = document.getElementById('teamPrev');
  const nextBtn = document.getElementById('teamNext');

  prevBtn?.addEventListener('click', () => teamSliderTrack.scrollBy({ left: -teamSliderTrack.clientWidth * 0.85, behavior: 'smooth' }));
  nextBtn?.addEventListener('click', () => teamSliderTrack.scrollBy({ left: teamSliderTrack.clientWidth * 0.85, behavior: 'smooth' }));
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const i = Number(dot.dataset.index);
      slides[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
  });
  if (!reduced && slides.length) {
    const slideIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = slides.indexOf(e.target);
          dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        }
      });
    }, { root: teamSliderTrack, threshold: 0.6 });
    slides.forEach((s) => slideIo.observe(s));
  }

  const teamModal = document.getElementById('teamModal');
  const teamModalClose = document.getElementById('teamModalClose');
  function openTeamModal(key) {
    const data = teamData[key];
    if (!data || !teamModal) return;
    const lang = currentLang === 'en' ? 'en' : 'de';
    document.getElementById('teamModalPhoto').style.backgroundImage = data.photo ? `url('${data.photo}')` : 'none';
    document.getElementById('teamModalTitle').textContent = data.name;

    const infoBox = document.getElementById('teamModalInfoBox');
    const info = data.league || data.category;
    if (info) {
      document.getElementById('teamModalInfoLabel').textContent = data.league
        ? (lang === 'en' ? 'League' : 'Liga')
        : (lang === 'en' ? 'Category' : 'Kategorie');
      document.getElementById('teamModalInfoValue').textContent = info[lang];
      infoBox.hidden = false;
    } else {
      infoBox.hidden = true;
    }
    document.getElementById('teamModalTrainingValue').textContent = data.training[lang];
    const coachBox = document.getElementById('teamModalCoachBox');
    if (data.coach) {
      document.getElementById('teamModalCoachValue').textContent = data.coach;
      coachBox.hidden = false;
    } else {
      coachBox.hidden = true;
    }

    const leagueBlock = document.getElementById('teamModalLeagueBlock');
    if (data.standings) {
      renderTeamTable(document.getElementById('teamModalStandings'), standingsHead[lang], data.standings);
      renderTeamTable(document.getElementById('teamModalRoster'), rosterHead[lang], data.roster);
      const standLabel = lang === 'en' ? `As posted for the ${data.season} season.` : `Stand Saison ${data.season}.`;
      document.getElementById('teamModalStand').textContent = standLabel;
      leagueBlock.hidden = false;
    } else {
      leagueBlock.hidden = true;
    }
    document.getElementById('teamModalSignupLink').href = data.signupHref;
    teamModal.classList.add('open');
    teamModal.setAttribute('aria-hidden', 'false');
  }
  function closeTeamModal() {
    if (!teamModal) return;
    teamModal.classList.remove('open');
    teamModal.setAttribute('aria-hidden', 'true');
  }
  slides.forEach((slide) => {
    slide.addEventListener('click', () => openTeamModal(slide.dataset.team));
  });
  if (teamModalClose) teamModalClose.addEventListener('click', closeTeamModal);
  if (teamModal) teamModal.addEventListener('click', (e) => { if (e.target === teamModal) closeTeamModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTeamModal(); });
}
