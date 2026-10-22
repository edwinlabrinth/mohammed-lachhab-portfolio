// Lightweight FR/EN switch. Text lives in the DOM (good for SEO); translations
// only replace content of elements marked with data-i18n.
const translations = {
  fr: {
    'meta.title': 'Mohammed Lachhab — Portfolio',
    'meta.desc': 'Étudiant en génie informatique (ENSA Tanger) et mathématiques appliquées. Sécurité applicative, web, mobile.',
    'meta.ogdesc': 'Génie informatique · Mathématiques appliquées · Sécurité applicative. Applications web et mobile conçues et protégées.',

    'nav.ground': 'Sol',
    'nav.profile': 'Profil',
    'nav.projects': 'Projets',
    'nav.skills': 'Compétences',
    'nav.contact': 'Contact',

    'hero.kicker': 'Tanger, 35.77°N — départ',
    'hero.lead': 'Je construis des applications web et mobile, et je les protège. Faites défiler : on monte dans les nuages.',
    'hero.cv': 'Télécharger mon CV',
    'hero.projects': 'Voir les projets',

    'profile.title': 'Profil',
    'profile.p1': 'Étudiant en génie informatique à l’ENSA Tanger et en mathématiques appliquées à la Faculté des Sciences de Tétouan. Je combine rigueur mathématique et bonnes pratiques de développement pour concevoir des applications performantes, structurées et sécurisées.',
    'profile.p2': 'Je m’intéresse aux architectures web modernes, au développement logiciel, à l’intelligence artificielle et au machine learning.',
    'profile.edu1': '<b>ENSA Tanger</b> — 2ème année, cycle ingénieur, génie informatique (2026–2027)',
    'profile.edu2': '<b>FS Tétouan</b> — 3ème année, licence mathématiques et applications (2026–2027)',

    'projects.title': 'Projets',
    'project1.title': 'Plateforme de Portfolios Numériques',
    'project1.meta': 'Projet d’intégration, ENSA Tanger · 2025–2026 · Rôle : sécurité applicative',
    'project1.b1': 'Défense multi-couches : reverse proxy Nginx non privilégié, TLS, limitation de débit (Leaky Bucket) contre brute-force et déni de service.',
    'project1.b2': 'Double jeton JWT en cookies durcis (httpOnly, secure, sameSite), rotation des refresh tokens et détection de vol de session.',
    'project1.b3': 'RBAC complété par de l’ABAC ; audits SAST (SonarQube Cloud) et DAST (OWASP ZAP) dans un pipeline GitLab CI/CD.',
    'project2.title': 'BookTinder',
    'project2.meta': 'Application mobile · Janvier 2026',
    'project2.b1': 'Découverte de livres par balayage (swipe).',
    'project2.b2': 'Interface orientée performance, animations personnalisées fluides.',
    'project2.b3': 'Gestion d’état robuste sur tout le parcours.',
    'project3.title': 'Sezart',
    'project3.meta': 'Cofondateur, technique et e-commerce · depuis avril 2026',
    'project3.b1': 'Marque de streetwear et boutique en ligne avec gestion des commandes et des stocks.',
    'project3.b2': 'Du design à l’expédition, plus de 1 000 clients.',
    'project3.b3': 'Présence digitale et acquisition sur les réseaux sociaux.',

    'skills.title': 'Compétences',
    'skills.langs': 'Langages',
    'skills.frameworks': 'Frameworks et outils',
    'skills.security': 'Sécurité et DevOps',
    'skills.db': 'Bases de données',
    'skills.spoken': 'Langues',
    'skills.spokenList': 'Arabe (maternelle), anglais (avancé), français (avancé), espagnol (notions)',

    'contact.title': 'On se parle ?',
    'contact.lead': 'Stage, projet, collaboration : écrivez-moi.',
    'contact.cv': 'Télécharger mon CV (PDF)',
  },

  en: {
    'meta.title': 'Mohammed Lachhab — Portfolio',
    'meta.desc': 'Computer engineering student (ENSA Tangier) and applied mathematics. Application security, web and mobile.',
    'meta.ogdesc': 'Computer engineering · Applied mathematics · Application security. Web and mobile applications, built and secured.',

    'nav.ground': 'Ground',
    'nav.profile': 'Profile',
    'nav.projects': 'Projects',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',

    'hero.kicker': 'Tangier, 35.77°N — departure',
    'hero.lead': 'I build web and mobile applications, and I keep them safe. Scroll down: we’re climbing into the clouds.',
    'hero.cv': 'Download my CV',
    'hero.projects': 'View projects',

    'profile.title': 'Profile',
    'profile.p1': 'Computer engineering student at ENSA Tangier and applied mathematics student at the Faculty of Sciences of Tétouan. I combine mathematical rigor with software engineering best practices to design performant, well-structured and secure applications.',
    'profile.p2': 'I’m interested in modern web architectures, software development, artificial intelligence and machine learning.',
    'profile.edu1': '<b>ENSA Tangier</b> — 2nd year, engineering cycle, computer engineering (2026–2027)',
    'profile.edu2': '<b>FS Tétouan</b> — 3rd year, bachelor’s in mathematics and applications (2026–2027)',

    'projects.title': 'Projects',
    'project1.title': 'Digital Portfolio Platform',
    'project1.meta': 'Integration project, ENSA Tangier · 2025–2026 · Role: application security',
    'project1.b1': 'Multi-layer defense: unprivileged Nginx reverse proxy, TLS and rate limiting (Leaky Bucket) against brute-force and denial of service.',
    'project1.b2': 'Dual JWT tokens in hardened cookies (httpOnly, secure, sameSite), refresh token rotation and session theft detection.',
    'project1.b3': 'RBAC complemented with ABAC logic; SAST (SonarQube Cloud) and DAST (OWASP ZAP) audits in a GitLab CI/CD pipeline.',
    'project2.title': 'BookTinder',
    'project2.meta': 'Mobile application · January 2026',
    'project2.b1': 'Book discovery through a swipe interaction.',
    'project2.b2': 'Performance-focused interface with smooth custom animations.',
    'project2.b3': 'Robust state management across the whole user journey.',
    'project3.title': 'Sezart',
    'project3.meta': 'Co-founder, tech & e-commerce · since April 2026',
    'project3.b1': 'Streetwear brand and online store with order and inventory management.',
    'project3.b2': 'From design to shipping, over 1,000 customers served.',
    'project3.b3': 'Digital presence and social media acquisition strategy.',

    'skills.title': 'Skills',
    'skills.langs': 'Languages',
    'skills.frameworks': 'Frameworks & tools',
    'skills.security': 'Security & DevOps',
    'skills.db': 'Databases',
    'skills.spoken': 'Languages spoken',
    'skills.spokenList': 'Arabic (native), English (advanced), French (advanced), Spanish (basic)',

    'contact.title': 'Let’s talk?',
    'contact.lead': 'Internship, project, collaboration: get in touch.',
    'contact.cv': 'Download my CV (PDF)',
  },
};

const STORAGE_KEY = 'portfolio-lang';
const nodes = document.querySelectorAll('[data-i18n]');

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* storage blocked, fall through */ }
  const browser = (navigator.language || 'fr').toLowerCase();
  return browser.startsWith('fr') ? 'fr' : 'en';
}

let lang = detectLang();

function applyLang(next) {
  const dict = translations[next];
  document.documentElement.lang = next;

  for (const el of nodes) {
    const value = dict[el.dataset.i18n];
    if (value === undefined) continue;
    const attr = el.dataset.i18nAttr;
    if (attr) el.setAttribute(attr, value);
    else el.innerHTML = value;
  }

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    const other = next === 'fr' ? 'en' : 'fr';
    toggle.textContent = other.toUpperCase();
    toggle.lang = other;
    toggle.setAttribute('aria-label',
      next === 'fr' ? 'Switch to English' : 'Passer en français');
  }

  document.title = dict['meta.title'];
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
}

applyLang(lang);

document.getElementById('lang-toggle')?.addEventListener('click', () => {
  lang = lang === 'fr' ? 'en' : 'fr';
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  applyLang(lang);
});
