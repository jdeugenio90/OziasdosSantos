/* ==========================================================================
   Ozias dos Santos — Finanças com base bíblica
   Scripts da página (vanilla JS, sem dependências)
   ========================================================================== */

(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {

    /* ---------- 1. Header com sombra ao rolar ---------- */
    const header = document.querySelector('.header');
    const onScroll = () => {
      if (header) header.classList.toggle('scrolled', window.scrollY > 10);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- 2. Cursor glow (desktop, somente mouse fino) ---------- */
    const glow = document.querySelector('.cursor-glow');
    if (glow && window.matchMedia('(pointer: fine)').matches) {
      let raf = null;
      window.addEventListener('mousemove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          glow.style.left = e.clientX + 'px';
          glow.style.top = e.clientY + 'px';
          raf = null;
        });
      }, { passive: true });
    }

    /* ---------- 3. Menu mobile ---------- */
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');

    if (nav && navToggle) {
      const closeMenu = () => {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menu');
        document.body.style.overflow = '';
      };

      navToggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
        navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMenu);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    }

    /* ---------- 4. Reveal on scroll ---------- */
    const reveals = document.querySelectorAll('.reveal');

    if (reveals.length && 'IntersectionObserver' in window) {
      const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
      reveals.forEach((el) => revealObs.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add('is-visible'));
    }

    /* ---------- 5. Filtro de investimentos ---------- */
    const chips = document.querySelectorAll('.filters .chip');
    const rows = document.querySelectorAll('.invest-row');

    if (chips.length && rows.length) {
      const applyFilter = (profile) => {
        rows.forEach((row) => {
          const show = profile === 'all' || row.dataset.profile === profile;
          row.classList.toggle('is-hidden', !show);
        });
      };

      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          chips.forEach((c) => {
            c.classList.remove('is-active');
            c.setAttribute('aria-selected', 'false');
          });
          chip.classList.add('is-active');
          chip.setAttribute('aria-selected', 'true');
          applyFilter(chip.dataset.filter);
        });
      });
    }

    /* ---------- 6. Validação e envio do formulário ---------- */
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    if (form) {
      const setError = (field, show, message) => {
        field.classList.toggle('is-invalid', show);
        const msg = field.querySelector('.error-msg');
        if (msg) msg.textContent = message || '';
      };

      const validateField = (input) => {
        const field = input.closest('.field');
        const value = input.value.trim();

        if (input.required && !value) {
          setError(field, true, 'Este campo é obrigatório.');
          return false;
        }
        if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setError(field, true, 'Informe um e-mail válido.');
          return false;
        }
        if (input.tagName === 'SELECT' && input.required && !value) {
          setError(field, true, 'Selecione uma opção.');
          return false;
        }
        setError(field, false);
        return true;
      };

      form.querySelectorAll('input, select, textarea').forEach((input) => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
          if (input.closest('.field').classList.contains('is-invalid')) validateField(input);
        });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let valid = true;
        form.querySelectorAll('input, select, textarea').forEach((input) => {
          if (!validateField(input)) valid = false;
        });

        if (!valid) {
          status.textContent = 'Revise os campos destacados e tente novamente.';
          status.className = 'form-status error';
          return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Enviando…';

        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = original;
          status.textContent = 'Mensagem enviada com sucesso! Retornaremos em até 24 horas úteis.';
          status.className = 'form-status success';
          form.reset();
        }, 1200);
      });
    }

    /* ---------- 7. Ano no rodapé ---------- */
    const anoEl = document.getElementById('ano');
    if (anoEl) anoEl.textContent = String(new Date().getFullYear());

  });
})();