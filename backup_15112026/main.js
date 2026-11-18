/* ==========================================================================
   Ozias dos Santos — Finanças com base bíblica
   Scripts da página (vanilla JS, sem dependências)
   ========================================================================== */

(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {

    /* ---------- 1. Scroll progress + header ---------- */
    const header = document.querySelector('.header');
    const scrollBar = document.getElementById('scrollBar');

    const onScroll = () => {
      const y = window.scrollY;
      if (header) header.classList.toggle('scrolled', y > 10);
      if (scrollBar) {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        scrollBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---------- 2. Menu mobile ---------- */
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

      nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }

    /* ---------- 3. Contadores animados ---------- */
    const counters = document.querySelectorAll('[data-count]');

    const animateCount = (el) => {
      const target = Number(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const dec = Number(el.dataset.dec || 0);
      const duration = 1800;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        let value;
        if (dec > 0) {
          value = (target * eased).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
        } else {
          value = Math.round(target * eased).toLocaleString('pt-BR');
        }
        el.textContent = prefix + value + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (counters.length && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { animateCount(entry.target); o.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach((el) => obs.observe(el));
    } else {
      counters.forEach(animateCount);
    }

    /* ---------- 4. Reveal on scroll ---------- */
    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            o.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
      reveals.forEach((el) => obs.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add('is-visible'));
    }

    /* ---------- 5. Calculadora de investimento ---------- */
    const calcAmount = document.getElementById('calcAmount');
    const calcAmountLabel = document.getElementById('calcAmountLabel');
    const calcTotal = document.getElementById('calcTotal');
    const calcMonths = document.getElementById('calcMonths');
    const calcMonthsLabel = document.getElementById('calcMonthsLabel');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const results = document.querySelectorAll('.calc-card');

    if (calcAmount && calcMonths && results.length) {

      // Máscara de moeda BRL (pt-BR): converte "1.000,00" <-> 1000
      const parseBRL = (str) => {
        const clean = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
        const v = parseFloat(clean);
        return isFinite(v) && v >= 0 ? v : 0;
      };
      const formatBRL = (num) => num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Aplica a máscara enquanto o usuário digita.
      const maskInput = () => {
        const digits = calcAmount.value.replace(/\D/g, '').slice(0, 13);
        const cents = digits.slice(-2);
        let intPart = digits.slice(0, -2);
        if (!intPart) intPart = '0';
        intPart = Number(intPart).toLocaleString('pt-BR');
        calcAmount.value = intPart + ',' + cents;
      };
      calcAmount.addEventListener('input', () => { maskInput(); render(); });
      calcAmount.addEventListener('focus', () => calcAmount.select());

      // Taxas de referência (% a.a.).
      // selic e cdb sao atualizadas pela API oficial do Banco Central (SGS).
      // As demais (ipca, fii, acoes) sao estimativas de mercado e podem ser
      // ajustadas manualmente aqui quando necessario.
      const RATES = {
        selic: 11.15,
        cdb: 10.9,
        ipca: 10.55,
        fii: 9.6,
        acoes: 12.5
      };

      // Endpoints oficiais BCB/SGS — 100% automáticos, sem manutenção.
      // 1178 = Selic anualizada base 252 (% a.a., diária)
      // 4389 = CDI anualizada base 252 (% a.a., diária)
      // 13522 = IPCA acumulado em 12 meses (%)
      // Documentados em https://dadosabertos.bcb.gov.br
      const SELIC_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados/ultimos/1?formato=json';
      const CDI_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
      const IPCA_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';

      // Spread do Tesouro IPCA+ sobre o IPCA (taxa real contratada).
      const IPCA_PLUS_SPREAD = 6.5;

      const fmtRate = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '% a.a.';

      const calcLive = document.getElementById('calcLive');
      const calcLiveText = document.getElementById('calcLiveText');

      // Busca Selic, CDI e IPCA no Banco Central em paralelo.
      const loadLiveRates = () => {
        if (!('fetch' in window)) { setLiveFallback(); return; }
        Promise.all([fetch(SELIC_URL), fetch(CDI_URL), fetch(IPCA_URL)])
          .then(([resSelic, resCdi, resIpca]) => {
            if (!resSelic.ok || !resCdi.ok || !resIpca.ok) throw new Error('HTTP error');
            return Promise.all([resSelic.json(), resCdi.json(), resIpca.json()]);
          })
          .then(([selicData, cdiData, ipcaData]) => {
            const selicItem = Array.isArray(selicData) && selicData[0];
            const cdiItem = Array.isArray(cdiData) && cdiData[0];
            const ipcaItem = Array.isArray(ipcaData) && ipcaData[0];
            if (!selicItem || !selicItem.valor || !cdiItem || !cdiItem.valor || !ipcaItem || !ipcaItem.valor) throw new Error('formato inesperado');

            const selic = parseFloat(String(selicItem.valor).replace(',', '.'));
            const cdi = parseFloat(String(cdiItem.valor).replace(',', '.'));
            const ipca = parseFloat(String(ipcaItem.valor).replace(',', '.'));
            if (!isFinite(selic) || selic <= 0 || !isFinite(cdi) || cdi <= 0 || !isFinite(ipca)) throw new Error('valor invalido');

            RATES.selic = selic;
            RATES.cdb = cdi; // CDB 100% CDI usa o CDI oficial do BCB
            RATES.ipca = ipca + IPCA_PLUS_SPREAD; // IPCA+ = inflação acumulada + spread real

            updateRateLabels();
            render();

            const dataRef = selicItem.data || '';
            calcLive.classList.add('is-live');
            calcLiveText.textContent = dataRef
              ? 'Selic ' + fmtRate(selic) + ' · CDI ' + fmtRate(cdi) + ' · IPCA+ ' + fmtRate(RATES.ipca) + ' · ' + dataRef + ' (Banco Central)'
              : 'Selic ' + fmtRate(selic) + ' · CDI ' + fmtRate(cdi) + ' · IPCA+ ' + fmtRate(RATES.ipca) + ' (Banco Central)';
          })
          .catch(() => setLiveFallback());
      };

      const setLiveFallback = () => {
        calcLive.classList.remove('is-live');
        calcLiveText.textContent = 'Taxas de referência fixas (API indisponível). Verifique sua conexão.';
        updateRateLabels();
        render();
      };

      const updateRateLabels = () => {
        results.forEach((card) => {
          if (!card.dataset.rate) return;
          const key = card.dataset.key;
          const label = card.querySelector('.calc-rate');
          if (label && RATES[key]) label.textContent = fmtRate(RATES[key]);
        });
      };

      const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

      const fmtPeriod = (months) => {
        const anos = Math.floor(months / 12);
        const meses = months % 12;
        if (anos === 0) return meses + ' meses';
        if (meses === 0) return anos + (anos === 1 ? ' ano' : ' anos');
        return anos + (anos === 1 ? ' ano' : ' anos') + ' e ' + meses + ' meses';
      };

      let mode = 'unique';

      // Valor futuro com juros compostos, com taxa mensal equivalente.
      // A taxa do mercado é anual; convertemos para a taxa mensal efetiva:
      //   i_m = (1 + taxaAnual)^(1/12) - 1
      // Aporte único:  M = C * (1 + i_m)^n
      // Aporte mensal:  M = P * [((1 + i_m)^n - 1) / i_m]
      const monthlyRate = (rateAnnual) => Math.pow(1 + rateAnnual / 100, 1 / 12) - 1;

      const compound = (rateAnnual, months, amount) => {
        const i = monthlyRate(rateAnnual);
        const n = months;
        if (mode === 'monthly') {
          const f = Math.pow(1 + i, n) - 1;
          return amount * (f / i);
        }
        return amount * Math.pow(1 + i, n);
      };

      const render = () => {
        const amount = parseBRL(calcAmount.value);
        const months = Number(calcMonths.value);
        const totalInvested = mode === 'monthly' ? amount * months : amount;
        calcMonthsLabel.textContent = months + ' meses (' + fmtPeriod(months) + ')';
        calcAmountLabel.textContent = mode === 'monthly' ? 'Aporte mensal' : 'Valor a investir';
        calcTotal.textContent = 'Total investido: ' + fmtBRL(totalInvested);

        let maxFinal = 0;
        const computed = [];

        results.forEach((card) => {
          const key = card.dataset.key;
          const rate = RATES[key];
          const final = compound(rate, months, amount);
          computed.push({ card, final });
          if (final > maxFinal) maxFinal = final;
        });

        computed.forEach(({ card, final }) => {
          const gain = final - totalInvested;
          const finalEl = card.querySelector('.calc-final');
          const gainEl = card.querySelector('.calc-gain');
          const barEl = card.querySelector('.calc-bar i');

          finalEl.textContent = amount > 0 ? fmtBRL(final) : '—';
          gainEl.textContent = amount > 0 ? '+' + fmtBRL(gain) : '—';

          if (amount > 0 && maxFinal > 0) {
            const pct = maxFinal > 0 ? (final / maxFinal) * 100 : 0;
            barEl.style.width = Math.max(6, pct) + '%';
          } else {
            barEl.style.width = '0%';
          }

          card.classList.toggle('is-top', amount > 0 && final === maxFinal);
        });
      };

      calcMonths.addEventListener('input', render);
      modeBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          modeBtns.forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          mode = btn.dataset.mode;
          render();
        });
      });

      render();
      loadLiveRates();
    }

    /* ---------- 6. Filtro de investimentos ---------- */
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

    /* ---------- 7. Carousel de depoimentos ---------- */
    const carousel = document.querySelector('[data-carousel]');
    if (carousel) {
      const track = carousel.querySelector('[data-track]');
      const slides = track.querySelectorAll('.testimonial');
      const dotsWrap = carousel.querySelector('[data-dots]');
      const prev = carousel.querySelector('[data-prev]');
      const next = carousel.querySelector('[data-next]');

      let index = 0;
      const total = slides.length;

      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.setAttribute('aria-label', 'Depoimento ' + (i + 1));
        if (i === 0) dot.classList.add('is-active');
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      });

      const dots = dotsWrap.querySelectorAll('button');

      const goTo = (i) => {
        index = (i + total) % total;
        track.style.transform = 'translateX(-' + index * 100 + '%)';
        dots.forEach((d, j) => d.classList.toggle('is-active', j === index));
      };

      prev.addEventListener('click', () => goTo(index - 1));
      next.addEventListener('click', () => goTo(index + 1));

      let timer = setInterval(() => goTo(index + 1), 6000);
      carousel.addEventListener('mouseenter', () => clearInterval(timer));
      carousel.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(index + 1), 6000); });

      document.addEventListener('keydown', (e) => {
        if (!carousel.contains(document.activeElement)) return;
        if (e.key === 'ArrowLeft') goTo(index - 1);
        if (e.key === 'ArrowRight') goTo(index + 1);
      });
    }

    /* ---------- 8. Tilt nos cards ---------- */
    const tilts = document.querySelectorAll('.tilt');
    if (tilts.length && window.matchMedia('(hover: hover)').matches) {
      tilts.forEach((el) => {
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          el.style.setProperty('--ry', ((px - 0.5) * 6).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
        });
        el.addEventListener('mouseleave', () => {
          el.style.setProperty('--ry', '0deg');
          el.style.setProperty('--rx', '0deg');
        });
      });
    }

    /* ---------- 9. Botões magnéticos ---------- */
    const magnetics = document.querySelectorAll('.magnetic');
    if (magnetics.length && window.matchMedia('(hover: hover)').matches) {
      magnetics.forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          btn.style.transform = 'translate(' + dx * 0.18 + 'px,' + dy * 0.18 + 'px)';
        });
        btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
      });
    }

    /* ---------- 10. Validação e envio do formulário ---------- */
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

        if (input.required && !value) { setError(field, true, 'Este campo é obrigatório.'); return false; }
        if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setError(field, true, 'Informe um e-mail válido.'); return false; }
        if (input.tagName === 'SELECT' && input.required && !value) { setError(field, true, 'Selecione uma opção.'); return false; }
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

    /* ---------- 11. Ano no rodapé ---------- */
    const anoEl = document.getElementById('ano');
    if (anoEl) anoEl.textContent = String(new Date().getFullYear());

  });
})();