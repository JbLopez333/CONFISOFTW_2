/**
 * CONFICOMPUTOS — JavaScript Página Web (Landing)
 * landing.js
 */
'use strict';

/* Navbar scroll shadow */
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 20);
});

/* Hamburger menu */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    const [s1,s2,s3] = hamburger.querySelectorAll('span');
    const open = mobileMenu.classList.contains('open');
    if (open) {
      s1.style.cssText = 'transform:rotate(45deg) translate(5px,5px)';
      s2.style.opacity = '0';
      s3.style.cssText = 'transform:rotate(-45deg) translate(5px,-5px)';
    } else {
      s1.style.cssText = s2.style.cssText = s3.style.cssText = '';
    }
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    [hamburger.querySelectorAll('span')].flat().forEach(s => s.style.cssText = '');
  }));
}

/* Scroll suave para anclas */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
});

/* Animación al hacer scroll (Intersection Observer) */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity    = '1';
      entry.target.style.transform  = 'translateY(0)';
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.servicio-card, .porque-item, .hito').forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  observer.observe(el);
});

/* Contadores animados */
function animateCounter(el, target, prefix = '', suffix = '') {
  let current = 0;
  const step  = Math.ceil(target / 50);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = prefix + current.toLocaleString('es-CO') + suffix;
    if (current >= target) clearInterval(timer);
  }, 30);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target || '0');
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, prefix, suffix);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

/* Año actual en footer */
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();