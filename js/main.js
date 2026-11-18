/* ==========================================================================
   Ozias dos Santos — Educação financeira com base bíblica
   Scripts da página (vanilla JS, sem dependências)
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURAÇÃO — edite aqui
     ------------------------------------------------------------------ */

  // Envio do formulário de contato pelo FormSubmit (formsubmit.co).
  // Coloque em FORM_EMAIL o e-mail que deve RECEBER as mensagens.
  // Na primeira mensagem, o FormSubmit envia um e-mail de ativação para essa
  // caixa: é preciso clicar no link uma única vez.
  // Vazio = abre o aplicativo de e-mail do visitante com a mensagem pronta.
  const FORM_EMAIL = 'oziass.andrade@gmail.com';
  const FORM_ENDPOINT = FORM_EMAIL ? 'https://formsubmit.co/ajax/' + encodeURIComponent(FORM_EMAIL) : '';
  const CONTACT_EMAIL = 'oziass.andrade@gmail.com';

  // WhatsApp: só números, com código do país (55) e DDD.
  const WA_NUMBER = '5511981415814';
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  // Taxas de referência usadas se a API do Banco Central não responder.
  const RATES = {
    selicMeta: 13.75, // % a.a. — meta Selic (SGS 432)
    selic: 13.65,     // % a.a. — Selic efetiva (SGS 1178)
    cdi: 13.65,       // % a.a. — CDI (SGS 4389)
    ipca12: 4.63,     // %      — IPCA acumulado em 12 meses (SGS 13522)
    poupMes: 0.6699,  // % a.m. — rendimento da poupança (SGS 195)
    ref: '13/11/2026',
    live: false
  };

  // Premissas ajustáveis pelo visitante (valores iniciais dos campos).
  // Tesouro Prefixado 2029 e Tesouro IPCA+ 2032 em 13/11/2026.
  const ASSUME_REF = '13/11/2026';
  const TD_CUSTODY = 0.20;        // % a.a. — taxa de custódia B3
  const TD_SELIC_EXEMPT = 10000;  // R$ isentos de custódia no Tesouro Selic

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtNum = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Header + menu mobile ---------- */
  const header = $('.header');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('scrolled', window.scrollY > 10);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const nav = $('#nav');
  const navToggle = $('#navToggle');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- 2. Reveal + contadores ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));

    const animate = (el) => {
      const target = Number(el.dataset.count);
      const dec = Number(el.dataset.dec || 0);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / 1400, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + fmtNum(target * eased, dec) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { animate(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => co.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ==================================================================
     3. DIAGNÓSTICO DE PERFIL FINANCEIRO (8 perguntas, 4 perfis)
     Cada alternativa soma 1 ponto para um perfil:
     A = Planejador · B = Poupador · C = Consumista · D = Desorganizado
     ================================================================== */
  const QUESTIONS = [
    { q: 'Quando você recebe seu salário ou renda, qual costuma ser sua primeira atitude?', o: [
      'Separo o dinheiro das contas e dos objetivos.',
      'Guardo uma parte antes de gastar.',
      'Pago algumas contas e aproveito para comprar o que desejo.',
      'Vou gastando conforme as necessidades aparecem.'] },
    { q: 'Quando surge uma compra que você deseja muito, o que faz?', o: [
      'Avalio se cabe no orçamento e se está nos meus planos.',
      'Penso bastante e geralmente prefiro guardar o dinheiro.',
      'Se gostei, compro. Afinal, também mereço aproveitar.',
      'Tenho dificuldade de decidir e muitas vezes compro sem avaliar o impacto.'] },
    { q: 'Como você lida com o planejamento financeiro familiar?', o: [
      'Tenho metas, orçamento e acompanho os resultados.',
      'Minha prioridade é economizar e evitar gastos desnecessários.',
      'Prefiro viver o presente e resolver as questões financeiras conforme aparecem.',
      'Sei que preciso me organizar, mas acabo deixando para depois.'] },
    { q: 'Quando seu parceiro(a) deseja fazer uma compra que você considera desnecessária:', o: [
      'Converso e avalio junto com ele(a) os impactos no orçamento.',
      'Tento evitar a compra para preservar nossas economias.',
      'Não vejo problema, desde que possamos pagar.',
      'Evito discutir para não gerar conflitos.'] },
    { q: 'Se vocês recebessem um dinheiro inesperado, o que fariam?', o: [
      'Definiria previamente quanto vai para objetivos, investimentos e lazer.',
      'Guardaria a maior parte para aumentar nossa segurança.',
      'Aproveitaria para realizar desejos e comprar algo que queremos.',
      'Provavelmente usaríamos o dinheiro sem um destino definido.'] },
    { q: 'Como vocês conversam sobre dinheiro?', o: [
      'Conversamos frequentemente sobre metas e decisões.',
      'Conversamos principalmente sobre economia e segurança.',
      'Falamos sobre dinheiro quando queremos comprar ou realizar algo.',
      'Evitamos o assunto porque costuma gerar desconforto.'] },
    { q: 'Quando enfrentam uma dificuldade financeira, qual é sua reação?', o: [
      'Reorganizo o orçamento e estabeleço um plano de recuperação.',
      'Corto gastos e preservo o máximo possível das reservas.',
      'Procuro alternativas para manter meu padrão de vida.',
      'Fico preocupado(a), mas tenho dificuldade de tomar decisões.'] },
    { q: 'Qual frase mais representa sua visão sobre o dinheiro?', o: [
      'O dinheiro precisa ter direção para realizar nossos objetivos.',
      'O dinheiro representa segurança e tranquilidade.',
      'O dinheiro foi feito para proporcionar qualidade de vida e experiências.',
      'O dinheiro é uma necessidade, mas administrar tudo isso é complicado.'] }
  ];

  const KEYS = ['A', 'B', 'C', 'D'];
  const PROFILES = {
    A: { name: 'Planejador', subtitle: 'Quem pensa no futuro',
      positive: ['Tem visão de futuro e objetivos definidos.', 'Consegue transformar sonhos em metas financeiras.', 'Valoriza o diálogo e o planejamento.', 'Tem maior facilidade para construir patrimônio com estratégia.'],
      negative: ['Pode ser excessivamente rígido com o orçamento.', 'Pode deixar o presente em segundo plano.', 'Pode gerar cobranças quando o parceiro não acompanha seu ritmo.'],
      action: 'Equilibrar planejamento e qualidade de vida, construindo metas que façam sentido para os dois.' },
    B: { name: 'Poupador', subtitle: 'Quem prioriza segurança',
      positive: ['Valoriza a disciplina e a economia.', 'Tem preocupação com a reserva de emergência.', 'Evita dívidas e compras desnecessárias.', 'Possui potencial para acumular patrimônio ao longo do tempo.'],
      negative: ['Pode ter medo excessivo de gastar.', 'Pode adiar experiências e sonhos por excesso de cautela.', 'Pode confundir economizar com construir riqueza.', 'Pode gerar conflitos com um parceiro mais consumista.'],
      action: 'Aprender a direcionar as economias para investimentos e objetivos, sem abrir mão de aproveitar a vida.' },
    C: { name: 'Consumista', subtitle: 'Quem prioriza o presente',
      positive: ['Valoriza experiências e qualidade de vida.', 'Tem facilidade para identificar desejos e necessidades de consumo.', 'Pode ser generoso e gostar de proporcionar momentos especiais.', 'Enxerga o dinheiro como instrumento para viver experiências.'],
      negative: ['Pode gastar por impulso.', 'Pode comprometer objetivos de longo prazo.', 'Corre maior risco de acumular dívidas.', 'Pode ter dificuldade para formar reservas e investir.'],
      action: 'Desenvolver autocontrole, estabelecer limites de consumo e separar primeiro o dinheiro destinado às metas.' },
    D: { name: 'Desorganizado', subtitle: 'Quem precisa assumir o controle',
      positive: ['Pode reconhecer a necessidade de mudança e buscar orientação.', 'Tem oportunidade de desenvolver hábitos financeiros melhores.', 'Pode aprender a construir uma nova relação com o dinheiro.', 'A organização pode gerar melhorias significativas em sua vida financeira.'],
      negative: ['Pode não saber exatamente para onde o dinheiro está indo.', 'Pode esquecer compromissos e perder prazos.', 'Pode tomar decisões financeiras sem planejamento.', 'Pode adiar conversas importantes sobre dinheiro.'],
      action: 'Começar pelo básico: registrar receitas e despesas, organizar contas e estabelecer uma reunião financeira semanal.' }
  };

  // Leitura do casal para cada combinação de perfis predominantes.
  const PAIRS = {
    AA: 'Vocês dois planejam. A força é a direção clara; o cuidado é não transformar a casa em uma planilha e esquecer de celebrar as conquistas.',
    BB: 'Vocês dois poupam. Segurança não vai faltar; o desafio é dar destino ao dinheiro guardado e se permitirem viver sonhos juntos.',
    CC: 'Vocês dois priorizam o presente. A vida é leve, mas ninguém está segurando o freio: definam um valor fixo para as metas antes de qualquer gasto.',
    DD: 'Nenhum dos dois está com o controle na mão. A boa notícia é que começam juntos do zero: um registro simples de entradas e saídas já muda o jogo.',
    AB: 'Planejador e Poupador formam uma dupla sólida. O risco é o excesso de cautela: incluam lazer e sonhos no orçamento, de propósito.',
    AC: 'Planejador e Consumista se completam quando conversam: um traz a direção, o outro lembra de viver. Combinem um valor livre mensal para cada um.',
    AD: 'O Planejador tende a carregar tudo sozinho. Dividam tarefas simples e façam uma reunião financeira curta toda semana para caminhar no mesmo ritmo.',
    BC: 'Poupador e Consumista é a combinação que mais gera atrito. Um orçamento com metas e uma verba de consumo combinada tira a discussão do campo pessoal.',
    BD: 'O Poupador guarda, mas sem organização o dinheiro perde direção. Juntos, transformem a economia em objetivos com prazo e valor.',
    CD: 'Consumo sem controle é o caminho mais curto para as dívidas. Comecem anotando tudo por 30 dias e definindo um limite de gastos semanal.'
  };

  const quizEl = $('#quiz');
  const quiz = { phase: 'intro', person: 0, step: 0, answers: [], results: [] };

  const scoreOf = (answers) => {
    const scores = KEYS.map((k) => ({ key: k, score: answers.filter((a) => a === k).length }))
      .sort((a, b) => b.score - a.score);
    const winners = scores.filter((s) => s.score === scores[0].score).map((s) => s.key);
    return { scores, winners };
  };
  const labelOf = (r) => r.winners.map((k) => PROFILES[k].name).join(' + ');
  const who = (i) => (i === 0 ? 'Você' : 'Parceiro(a)');

  const proConHTML = (k) => {
    const p = PROFILES[k];
    return `<div class="pc">
      <div class="pc-card pos"><h4>Pontos positivos</h4><ul>${p.positive.map((t) => `<li>${t}</li>`).join('')}</ul></div>
      <div class="pc-card neg"><h4>Pontos de atenção</h4><ul>${p.negative.map((t) => `<li>${t}</li>`).join('')}</ul></div>
    </div>
    <div class="next-step"><strong>Próximo passo</strong>${p.action}</div>`;
  };

  const resultHTML = (r, i) => {
    const mixed = r.winners.length > 1;
    const head = mixed
      ? `<h3 class="result-name">Perfil misto</h3>
         <p class="result-sub">${labelOf(r)}</p>
         <p class="result-mixed">Suas respostas mostram características equilibradas entre esses perfis. Veja os pontos de cada um.</p>`
      : `<h3 class="result-name">${PROFILES[r.winners[0]].name}</h3>
         <p class="result-sub">${PROFILES[r.winners[0]].subtitle}</p>`;
    const bars = r.scores.map((s) => `<div class="score-row${r.winners.includes(s.key) ? ' is-top' : ''}">
        <span>${PROFILES[s.key].name}</span>
        <span class="score-bar"><i style="width:${(s.score / QUESTIONS.length) * 100}%"></i></span>
        <span>${s.score}/${QUESTIONS.length}</span></div>`).join('');
    const body = r.winners.map((k) => (mixed ? `<h4 class="pc-profile">${PROFILES[k].name}</h4>` : '') + proConHTML(k)).join('');
    return `<div class="result-head"><span class="result-kicker">Diagnóstico · ${who(i)}</span>${head}</div>
      <div class="scores">${bars}</div>${body}`;
  };

  const mentorHTML = (couple) => `<div class="mentor">
      <h4>${couple ? 'Transformem o diagnóstico em um plano a dois' : 'Seu perfil é o ponto de partida'}</h4>
      <p>Na mentoria para casais, Ozias usa este diagnóstico para montar com vocês o orçamento, as metas e os três compromissos financeiros dos próximos 30 dias.</p>
      <div class="mentor-actions">
        <button class="btn btn-gold" data-act="mentor">Quero conhecer a mentoria <span aria-hidden="true">→</span></button>
        <button class="btn btn-wa" data-act="wa">Enviar meu resultado no WhatsApp</button>
        ${couple ? '' : '<button class="btn btn-ghost-light" data-act="partner">Agora é a vez do meu parceiro(a)</button>'}
      </div>
    </div>
    <button class="link-btn quiz-again" data-act="restart">Refazer o teste</button>`;

  const renderQuiz = (focus) => {
    let html = '';
    if (quiz.phase === 'intro') {
      html = `<div class="quiz-intro">
        <h3 tabindex="-1">Como funciona</h3>
        <div class="quiz-steps"><span><b>1</b>Responda 8 perguntas</span><span><b>2</b>Receba seu perfil na hora</span><span><b>3</b>Compare com seu parceiro(a)</span></div>
        <p>Cada pessoa responde individualmente, sem consultar as respostas do outro. Leva menos de 2 minutos.</p>
        <button class="btn btn-gold" data-act="start">Começar o diagnóstico <span aria-hidden="true">→</span></button>
      </div>`;
    } else if (quiz.phase === 'questions') {
      const item = QUESTIONS[quiz.step];
      const answered = quiz.answers.filter(Boolean).length;
      html = `<div class="quiz-top"><span class="quiz-who">${who(quiz.person)}</span><span>Pergunta ${quiz.step + 1} de ${QUESTIONS.length}</span></div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${answered}"><i style="width:${(answered / QUESTIONS.length) * 100}%"></i></div>
        <h3 class="quiz-q" tabindex="-1">${item.q}</h3>
        <div class="quiz-opts">${item.o.map((t, i) => `<button class="opt${quiz.answers[quiz.step] === KEYS[i] ? ' is-selected' : ''}" data-opt="${KEYS[i]}"><b>${KEYS[i]}</b><span>${t}</span></button>`).join('')}</div>
        <div class="quiz-nav">
          <button class="link-btn" data-act="back"${quiz.step === 0 ? ' disabled' : ''}>← Voltar</button>
          ${quiz.answers[quiz.step] ? `<button class="link-btn" data-act="next">${quiz.step === QUESTIONS.length - 1 ? 'Ver meu diagnóstico' : 'Avançar'} →</button>` : ''}
        </div>`;
    } else if (quiz.phase === 'result') {
      html = resultHTML(quiz.results[0], 0) + mentorHTML(false);
    } else {
      const [a, b] = quiz.results;
      const same = labelOf(a) === labelOf(b);
      const pairKey = a.winners.length === 1 && b.winners.length === 1 ? [a.winners[0], b.winners[0]].sort().join('') : null;
      const reading = pairKey ? PAIRS[pairKey]
        : 'Com um perfil misto no casal, o mais importante é a conversa: identifiquem em quais situações cada comportamento aparece e combinem regras simples para elas.';
      html = `<div class="result-head"><span class="result-kicker">Comparativo do casal</span>
          <h3 class="result-name" tabindex="-1">${same ? 'Mesmo perfil' : 'Perfis diferentes'}</h3>
          <p class="result-mixed">${reading}</p></div>
        <div class="couple">
          <div><span>Você</span><strong>${labelOf(a)}</strong></div>
          <div><span>Parceiro(a)</span><strong>${labelOf(b)}</strong></div>
        </div>
        <div class="next-step"><strong>Para conversarem juntos</strong>
          <ul class="reflect">
            <li>Como essas ${same ? 'semelhanças' : 'diferenças'} afetam as decisões financeiras da casa?</li>
            <li>Quais hábitos cada um precisa mudar?</li>
            <li>Quais sonhos e metas vocês podem construir juntos?</li>
          </ul>
        </div>
        ${resultHTML(b, 1)}${mentorHTML(true)}`;
    }
    quizEl.innerHTML = html;
    if (focus) {
      const h = $('[tabindex="-1"]', quizEl);
      if (h) h.focus({ preventScroll: true });
      const top = quizEl.getBoundingClientRect().top;
      if (top < 80 || top > window.innerHeight * 0.6) {
        window.scrollTo({ top: window.scrollY + top - 100, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
  };

  const finishPerson = () => {
    quiz.results[quiz.person] = scoreOf(quiz.answers);
    quiz.phase = quiz.person === 0 ? 'result' : 'couple';
    renderQuiz(true);
  };

  const prefillContact = (subject, message) => {
    const sel = $('#assunto');
    const msg = $('#mensagem');
    if (subject) { const opt = Array.from(sel.options).find((o) => o.text === subject); if (opt) sel.value = opt.text; }
    if (message && !msg.value.trim()) msg.value = message;
    $('#contato').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(() => $('#nome').focus({ preventScroll: true }), 600);
  };

  if (quizEl) {
    quizEl.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-opt]');
      if (opt) {
        quiz.answers[quiz.step] = opt.dataset.opt;
        $$('.opt', quizEl).forEach((o) => o.classList.toggle('is-selected', o === opt));
        const step = quiz.step;
        setTimeout(() => {
          if (quiz.phase !== 'questions' || quiz.step !== step) return;
          if (step < QUESTIONS.length - 1) { quiz.step += 1; renderQuiz(true); } else finishPerson();
        }, reduceMotion ? 0 : 260);
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'start') { quiz.phase = 'questions'; quiz.person = 0; quiz.step = 0; quiz.answers = []; quiz.results = []; }
      else if (a === 'partner') { quiz.phase = 'questions'; quiz.person = 1; quiz.step = 0; quiz.answers = []; }
      else if (a === 'back') { quiz.step = Math.max(0, quiz.step - 1); }
      else if (a === 'next') {
        if (quiz.step < QUESTIONS.length - 1) quiz.step += 1; else { finishPerson(); return; }
      }
      else if (a === 'restart') { quiz.phase = 'intro'; quiz.results = []; quiz.answers = []; }
      else if (a === 'wa') {
        const lines = quiz.results.map((r, i) => `${who(i)}: ${labelOf(r)}`);
        window.open(waLink(`Olá, Ozias! Fiz o diagnóstico de perfil financeiro no site.\n${lines.join('\n')}\nQuero saber mais sobre a mentoria para casais.`), '_blank', 'noopener');
        return;
      }
      else if (a === 'mentor') {
        const parts = quiz.results.map((r, i) => `${who(i)}: ${labelOf(r)} (${r.scores.map((s) => `${PROFILES[s.key].name} ${s.score}`).join(', ')})`);
        prefillContact('Mentoria para casais', `Fiz o diagnóstico de perfil financeiro no site.\n${parts.join('\n')}\n\nQuero saber mais sobre a mentoria para casais.`);
        return;
      }
      renderQuiz(true);
    });
    renderQuiz(false);
  }

  /* ==================================================================
     4. CALCULADORA DE APORTES
     ================================================================== */
  const calcForm = $('#calcForm');
  if (calcForm) {
    const elInitial = $('#calcInitial');
    const elMonthly = $('#calcMonthly');
    const elMonths = $('#calcMonths');
    const inputs = { cdb: $('#aCdb'), lci: $('#aLci'), pre: $('#aPre'), ipca: $('#aIpca'), infl: $('#aInfl'), fii: $('#aFii'), acoes: $('#aAcoes') };
    let inflEdited = false;
    $('#assumeRef').textContent = ASSUME_REF;

    const parseBRL = (str) => {
      const v = parseFloat(String(str).replace(/[^\d,]/g, '').replace(',', '.'));
      return isFinite(v) && v >= 0 ? v : 0;
    };
    const mask = (el) => {
      const digits = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11).padStart(3, '0');
      el.value = Number(digits.slice(0, -2)).toLocaleString('pt-BR') + ',' + digits.slice(-2);
    };
    const num = (el, fallback) => { const v = parseFloat(el.value); return isFinite(v) && v >= 0 ? v : fallback; };

    // Taxa anual equivalente de X% do CDI (o percentual incide sobre a taxa diária, base 252).
    const pctOfCdi = (pct) => {
      const daily = Math.pow(1 + RATES.cdi / 100, 1 / 252) - 1;
      return (Math.pow(1 + daily * pct / 100, 252) - 1) * 100;
    };

    const products = () => {
      const cdb = num(inputs.cdb, 100), lci = num(inputs.lci, 90), pre = num(inputs.pre, 14.73);
      const real = num(inputs.ipca, 7.72), infl = num(inputs.infl, RATES.ipca12);
      const poup = (Math.pow(1 + RATES.poupMes / 100, 12) - 1) * 100;
      const ipcaNominal = ((1 + infl / 100) * (1 + real / 100) - 1) * 100;
      return [
        { key: 'poup', name: 'Poupança', rate: poup, label: `${fmtNum(RATES.poupMes)}% a.m. · ${fmtNum(poup)}% a.a.`, note: 'Isenta de IR' },
        { key: 'selic', name: 'Tesouro Selic', rate: RATES.selic, label: `${fmtNum(RATES.selic)}% a.a.`, taxed: true, fee: TD_CUSTODY, feeExempt: TD_SELIC_EXEMPT },
        { key: 'cdb', name: `CDB ${fmtNum(cdb, 0)}% do CDI`, rate: pctOfCdi(cdb), label: `${fmtNum(pctOfCdi(cdb))}% a.a.`, taxed: true },
        { key: 'lci', name: `LCI/LCA ${fmtNum(lci, 0)}% do CDI`, rate: pctOfCdi(lci), label: `${fmtNum(pctOfCdi(lci))}% a.a.`, note: 'Isenta de IR' },
        { key: 'pre', name: 'Tesouro Prefixado', rate: pre, label: `${fmtNum(pre)}% a.a.`, taxed: true, fee: TD_CUSTODY },
        { key: 'ipca', name: 'Tesouro IPCA+', rate: ipcaNominal, label: `IPCA + ${fmtNum(real)}% · ${fmtNum(ipcaNominal)}% a.a.`, taxed: true, fee: TD_CUSTODY },
        { key: 'fii', name: 'Fundos imobiliários', rate: num(inputs.fii, 11), label: `cenário de ${fmtNum(num(inputs.fii, 11), 1)}% a.a.`, variable: true },
        { key: 'acoes', name: 'Ações & ETFs', rate: num(inputs.acoes, 12), label: `cenário de ${fmtNum(num(inputs.acoes, 12), 1)}% a.a.`, variable: true }
      ];
    };

    // Tabela regressiva de IR da renda fixa.
    const irRate = (days) => (days <= 180 ? 0.225 : days <= 360 ? 0.2 : days <= 720 ? 0.175 : 0.15);

    // Simula mês a mês. Aportes no início do mês; IR calculado por aporte,
    // de acordo com o tempo que cada um ficou investido.
    const simulate = (p, n, initial, monthly) => {
      const i = Math.pow(1 + p.rate / 100, 1 / 12) - 1;
      const feeM = (p.fee || 0) / 100 / 12;
      const factorAt = new Float64Array(n + 1);
      let bal = 0, F = 1;
      for (let t = 0; t < n; t++) {
        factorAt[t] = F;
        bal += (t === 0 ? initial : 0) + monthly;
        let g = 1 + i;
        if (feeM && bal > 0) {
          const base = p.feeExempt ? Math.max(0, bal - p.feeExempt) : bal;
          g *= 1 - feeM * (base / bal);
        }
        bal *= g; F *= g;
      }
      let tax = 0;
      if (p.taxed) {
        for (let t = 0; t < n; t++) {
          const amt = (t === 0 ? initial : 0) + monthly;
          if (!amt) continue;
          const gain = amt * (F / factorAt[t] - 1);
          if (gain > 0) tax += gain * irRate(Math.round((n - t) * 365 / 12));
        }
      }
      const invested = initial + monthly * n;
      return { gross: bal, tax, net: bal - tax, invested };
    };

    const fmtPeriod = (m) => {
      const y = Math.floor(m / 12), r = m % 12;
      const ys = y ? y + (y === 1 ? ' ano' : ' anos') : '';
      const ms = r ? r + ' meses' : '';
      return ys && ms ? ys + ' e ' + ms : ys || ms;
    };

    // Cria as linhas de resultado uma única vez; depois só atualiza.
    const rows = {};
    products().forEach((p) => {
      const el = document.createElement('article');
      el.className = 'res' + (p.variable ? ' is-var' : '');
      el.innerHTML = '<div class="res-head"><h4></h4><span class="res-net"></span></div><div class="res-meta"></div><div class="res-bar"><i></i></div>';
      (p.variable ? $('#resVar') : $('#resFixed')).appendChild(el);
      rows[p.key] = { el, h: $('h4', el), net: $('.res-net', el), meta: $('.res-meta', el), bar: $('.res-bar i', el) };
    });

    const drawChart = (best, poup, n, initial, monthly) => {
      const svg = $('#calcChart');
      const W = 640, H = 220, pad = 6;
      const steps = Math.min(n, 40);
      const pts = [];
      for (let s = 0; s <= steps; s++) {
        const m = Math.round((n * s) / steps);
        pts.push({
          m,
          inv: initial + monthly * m,
          best: m ? simulate(best, m, initial, monthly).net : initial,
          poup: m ? simulate(poup, m, initial, monthly).net : initial
        });
      }
      const max = Math.max(...pts.map((p) => Math.max(p.best, p.poup, p.inv)), 1);
      const min = Math.min(pts[0].inv, pts[0].best) * 0.9;
      const x = (m) => pad + (m / n) * (W - pad * 2);
      const y = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
      const path = (k) => pts.map((p, i) => (i ? 'L' : 'M') + x(p.m).toFixed(1) + ' ' + y(p[k]).toFixed(1)).join(' ');
      const area = path('best') + ` L${x(n).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
      svg.innerHTML =
        '<defs><linearGradient id="gBest" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6a443" stop-opacity=".28"/><stop offset="1" stop-color="#d6a443" stop-opacity="0"/></linearGradient></defs>' +
        `<path d="${area}" fill="url(#gBest)"/>` +
        `<path d="${path('inv')}" fill="none" stroke="#9aa2b8" stroke-width="2" stroke-dasharray="5 5" vector-effect="non-scaling-stroke"/>` +
        `<path d="${path('poup')}" fill="none" stroke="#2f5fe0" stroke-width="2" vector-effect="non-scaling-stroke"/>` +
        `<path d="${path('best')}" fill="none" stroke="#d6a443" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    };

    const render = () => {
      const initial = parseBRL(elInitial.value);
      const monthly = parseBRL(elMonthly.value);
      const n = Number(elMonths.value);
      const infl = num(inputs.infl, RATES.ipca12);
      $('#calcMonthsLabel').textContent = fmtPeriod(n);

      const list = products().map((p) => ({ p, r: simulate(p, n, initial, monthly) }));
      const invested = initial + monthly * n;
      const fixed = list.filter((x) => !x.p.variable).sort((a, b) => b.r.net - a.r.net);
      const best = fixed[0];
      const maxNet = Math.max(...list.map((x) => x.r.net), 1);
      const has = invested > 0;

      list.forEach(({ p, r }) => {
        const row = rows[p.key];
        const isTop = has && p.key === best.p.key;
        row.el.classList.toggle('is-top', isTop);
        row.el.style.order = p.variable ? 0 : fixed.findIndex((x) => x.p.key === p.key);
        row.h.innerHTML = p.name + (isTop ? ' <em>Melhor líquido</em>' : '');
        row.net.textContent = has ? fmtBRL(r.net) : '—';
        const bits = [`<span>${p.label}</span>`];
        if (has) {
          bits.push(`<span class="gain">+${fmtBRL(r.net - invested)}${p.variable ? ' brutos' : ''}</span>`);
          if (p.taxed) bits.push(`<span>IR ${fmtBRL(r.tax)}</span>`);
          else if (p.note) bits.push(`<span>${p.note}</span>`);
          else if (p.variable) bits.push('<span>Sem garantia · IR não incluído</span>');
        }
        row.meta.innerHTML = bits.join('');
        row.bar.style.width = has ? Math.max(4, (r.net / maxNet) * 100) + '%' : '0';
      });

      $('#sumInvested').textContent = fmtBRL(invested);
      $('#sumBest').textContent = has ? fmtBRL(best.r.net) : '—';
      $('#sumBestName').textContent = has ? `${best.p.name} · +${fmtBRL(best.r.net - invested)}` : '';
      $('#sumReal').textContent = has ? fmtBRL(best.r.net / Math.pow(1 + infl / 100, n / 12)) : '—';
      $('#sumRealNote').textContent = `com inflação de ${fmtNum(infl)}% a.a.`;
      $('#lgBest').textContent = best.p.name + ' (líquido)';
      drawChart(best.p, list[0].p, n, initial, monthly);
    };

    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };

    [elInitial, elMonthly].forEach((el) => {
      el.addEventListener('input', () => { mask(el); schedule(); });
      el.addEventListener('focus', () => el.select());
    });
    elMonths.addEventListener('input', schedule);
    Object.values(inputs).forEach((el) => el.addEventListener('input', schedule));
    inputs.infl.addEventListener('input', () => { inflEdited = true; });

    /* ----- Taxas ao vivo: Banco Central (SGS + Focus) ----- */
    const paintRates = () => {
      $$('[data-rate]').forEach((el) => { el.textContent = fmtNum(RATES[el.dataset.rate]); });
      const status = $('#rateStatus');
      status.classList.toggle('is-live', RATES.live);
      $('#heroDot').classList.toggle('is-live', RATES.live);
      $('#rateStatusText').textContent = RATES.live
        ? `Banco Central · dados de ${RATES.ref}`
        : `Taxas de referência de ${RATES.ref}`;
    };

    const CACHE_KEY = 'oz_rates_v1';
    const SGS = { selicMeta: 432, selic: 1178, cdi: 4389, ipca12: 13522, poupMes: 195 };
    const LIMITS = { selicMeta: [0.5, 40], selic: [0.5, 40], cdi: [0.5, 40], ipca12: [-5, 40], poupMes: [0.01, 3] };
    const FOCUS_URL = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoInflacao12Meses?$top=1&$filter=Indicador%20eq%20'IPCA'%20and%20Suavizada%20eq%20'S'%20and%20baseCalculo%20eq%200&$orderby=Data%20desc&$format=json&$select=Data,Mediana";

    const applyRates = (data) => {
      const got = {};
      Object.keys(SGS).forEach((k) => {
        const v = data[k];
        if (typeof v === 'number' && isFinite(v) && v >= LIMITS[k][0] && v <= LIMITS[k][1]) { RATES[k] = v; got[k] = true; }
      });
      // Selic efetiva e CDI andam juntos: se uma faltar, usa a outra.
      if (got.cdi && !got.selic) RATES.selic = RATES.cdi;
      // Regra da poupança se o rendimento oficial não vier: com a Selic até 8,5% a.a.
      // ela rende 70% da Selic; acima disso, 0,5% a.m. + TR (mantém a referência).
      if (got.selicMeta && !got.poupMes && RATES.selicMeta <= 8.5) {
        RATES.poupMes = (Math.pow(1 + 0.7 * RATES.selicMeta / 100, 1 / 12) - 1) * 100;
      }
      if (got.selicMeta && got.cdi) { RATES.live = true; RATES.ref = data.ref || RATES.ref; }
      if (!inflEdited && typeof data.focus === 'number' && data.focus > 0 && data.focus < 30) inputs.infl.value = data.focus.toFixed(2);
      paintRates();
      render();
    };

    // A API do BCB às vezes devolve resposta vazia: tenta até 3 vezes.
    const getJSON = (url, tries = 3) => {
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl && setTimeout(() => ctrl.abort(), 8000);
      return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .finally(() => clearTimeout(timer))
        .catch((err) => {
          if (tries <= 1) throw err;
          return new Promise((res) => setTimeout(res, 700)).then(() => getJSON(url, tries - 1));
        });
    };

    const loadRates = () => {
      try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (c && Date.now() - c.t < 6 * 3600 * 1000) { applyRates(c.data); return; }
      } catch (e) { /* sem cache */ }

      const keys = Object.keys(SGS);
      const jobs = keys.map((k) => getJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SGS[k]}/dados/ultimos/1?formato=json`));
      jobs.push(getJSON(FOCUS_URL));
      Promise.allSettled(jobs).then((res) => {
        const data = {};
        keys.forEach((k, i) => {
          const item = res[i].status === 'fulfilled' && Array.isArray(res[i].value) && res[i].value[0];
          if (item) {
            data[k] = parseFloat(String(item.valor).replace(',', '.'));
            if (k === 'cdi') data.ref = item.data;
          }
        });
        const f = res[keys.length];
        if (f.status === 'fulfilled' && f.value && f.value.value && f.value.value[0]) data.focus = Number(f.value.value[0].Mediana);
        applyRates(data);
        if (RATES.live) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* ignora */ } }
      });
    };

    paintRates();
    render();
    if ('fetch' in window && 'allSettled' in Promise) loadRates();
  }

  /* ---------- 5. Filtro de investimentos ---------- */
  const chips = $$('.filters .chip');
  const cards = $$('.invest-card');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-pressed', String(c === chip)); });
      const f = chip.dataset.filter;
      cards.forEach((card) => {
        card.classList.toggle('is-hidden', f !== 'all' && card.dataset.profile !== f);
        card.classList.add('is-visible');
      });
    });
  });

  /* ---------- 6. Botões que pré-selecionam o assunto do contato ---------- */
  $$('[data-subject]').forEach((a) => {
    a.addEventListener('click', () => {
      const sel = $('#assunto');
      const opt = Array.from(sel.options).find((o) => o.text === a.dataset.subject);
      if (opt) sel.value = opt.text;
    });
  });

  /* ---------- 7. Formulário de contato ---------- */
  const form = $('#contactForm');
  if (form) {
    const status = $('#formStatus');
    const fields = $$('.field input, .field select, .field textarea', form);

    const validate = (input) => {
      const field = input.closest('.field');
      const value = input.value.trim();
      let msg = '';
      if (input.required && !value) msg = input.tagName === 'SELECT' ? 'Selecione uma opção.' : 'Este campo é obrigatório.';
      else if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) msg = 'Informe um e-mail válido.';
      field.classList.toggle('is-invalid', !!msg);
      $('.error-msg', field).textContent = msg;
      return !msg;
    };

    fields.forEach((input) => {
      input.addEventListener('blur', () => validate(input));
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) validate(input); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valid = fields.map(validate).every(Boolean);
      if (!valid) {
        status.textContent = 'Revise os campos destacados e tente novamente.';
        status.className = 'form-status error';
        const first = $('.is-invalid input, .is-invalid select, .is-invalid textarea', form);
        if (first) first.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());

      // Plano B: abre o e-mail do visitante com tudo preenchido. Usado quando não há
      // serviço de envio, quando ele falha ou enquanto o FormSubmit não foi ativado.
      const openMail = () => {
        const body = `Nome: ${data.nome}\nE-mail: ${data.email}\nTelefone: ${data.telefone || '-'}\n\n${data.mensagem}`;
        window.location.href = `mailto:${FORM_EMAIL || CONTACT_EMAIL}?subject=${encodeURIComponent(data.assunto + ' — ' + data.nome)}&body=${encodeURIComponent(body)}`;
        status.textContent = 'Abrimos o seu aplicativo de e-mail com a mensagem pronta. É só enviar.';
        status.className = 'form-status success';
      };

      if (!FORM_ENDPOINT) { openMail(); return; }

      const btn = $('button[type="submit"]', form);
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      // Campo-isca preenchido = robô: finge sucesso e não envia nada.
      if (data._honey) { form.reset(); btn.disabled = false; btn.innerHTML = original; return; }
      const payload = {
        Nome: data.nome, 'E-mail': data.email, Telefone: data.telefone || '-',
        Assunto: data.assunto, Mensagem: data.mensagem,
        _subject: `Site · ${data.assunto} — ${data.nome}`, _replyto: data.email, _template: 'table', _captcha: 'false'
      };
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((res) => { if (String(res.success) !== 'true') throw new Error(res.message || 'falha'); })
        .then(() => {
          status.textContent = 'Mensagem enviada! Retornaremos em até 24 horas úteis.';
          status.className = 'form-status success';
          form.reset();
        })
        .catch(openMail)
        .finally(() => { btn.disabled = false; btn.innerHTML = original; });
    });
  }

  /* ---------- Carrossel de depoimentos (dados em js/depoimentos.js) ---------- */
  const depoTrack = $('#depoTrack');
  if (depoTrack) {
    const all = Array.isArray(window.DEPOIMENTOS) ? window.DEPOIMENTOS.filter((d) => d && d.texto && d.nome) : [];
    const min = Number(window.DEPOIMENTOS_MINIMO) || 4;
    const reais = all.filter((d) => d.real === true);
    // Os de exemplo só completam o mínimo: saem sozinhos conforme os reais chegam.
    const exemplos = all.filter((d) => d.real !== true).slice(0, Math.max(0, min - reais.length));
    const list = reais.concat(exemplos);
    const wrap = $('#depoCarousel');

    if (!list.length) {
      $('#depoimentos').hidden = true;
    } else {
      if (!exemplos.length) $('#depoEyebrow').textContent = 'Resultados reais';

      list.forEach((d) => {
        const fig = document.createElement('figure');
        fig.className = 'testimonial';
        if (d.real !== true) {
          const tag = document.createElement('span');
          tag.className = 'testimonial-tag';
          tag.textContent = 'Exemplo ilustrativo';
          fig.appendChild(tag);
        }
        const bq = document.createElement('blockquote');
        bq.textContent = '“' + d.texto + '”';
        const cap = document.createElement('figcaption');
        const nome = document.createElement('strong');
        nome.textContent = d.nome;
        cap.appendChild(nome);
        if (d.detalhe) { const det = document.createElement('span'); det.textContent = d.detalhe; cap.appendChild(det); }
        fig.appendChild(bq);
        fig.appendChild(cap);
        depoTrack.appendChild(fig);
      });

      const slides = $$('.testimonial', depoTrack);
      const dotsEl = $('#depoDots');
      const perView = () => Math.max(1, Math.round(depoTrack.clientWidth / slides[0].offsetWidth));
      const pages = () => Math.max(1, slides.length - perView() + 1);
      let page = 0;

      const goTo = (i, smooth = true) => {
        const n = pages();
        page = ((i % n) + n) % n;
        depoTrack.scrollTo({ left: slides[page].offsetLeft - depoTrack.offsetLeft, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
      };

      const buildDots = () => {
        const n = pages();
        dotsEl.innerHTML = '';
        for (let i = 0; i < n; i++) {
          const b = document.createElement('button');
          b.setAttribute('aria-label', 'Ir para o depoimento ' + (i + 1));
          b.addEventListener('click', () => { goTo(i); restart(); });
          dotsEl.appendChild(b);
        }
        wrap.classList.toggle('is-single', n < 2);
        paint();
      };
      const paint = () => $$('button', dotsEl).forEach((b, i) => b.classList.toggle('is-active', i === page));

      // Mantém as bolinhas em dia quando o visitante arrasta com o dedo.
      let st = 0;
      depoTrack.addEventListener('scroll', () => {
        clearTimeout(st);
        st = setTimeout(() => {
          const x = depoTrack.scrollLeft + depoTrack.offsetLeft;
          let best = 0;
          slides.forEach((s, i) => { if (Math.abs(s.offsetLeft - x) < Math.abs(slides[best].offsetLeft - x)) best = i; });
          page = Math.min(best, pages() - 1);
          paint();
        }, 90);
      }, { passive: true });

      // Avanço automático: pausa com o mouse em cima, com foco ou fora da tela.
      let timer = 0, visible = false;
      const stop = () => clearInterval(timer);
      const start = () => { stop(); if (!reduceMotion && visible && pages() > 1) timer = setInterval(() => goTo(page + 1), 6000); };
      const restart = () => start();
      $('#depoPrev').addEventListener('click', () => { goTo(page - 1); restart(); });
      $('#depoNext').addEventListener('click', () => { goTo(page + 1); restart(); });
      ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => wrap.addEventListener(ev, stop, { passive: true }));
      ['mouseleave', 'focusout'].forEach((ev) => wrap.addEventListener(ev, start));
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.4 }).observe(wrap);
      }

      let rt = 0;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { buildDots(); goTo(Math.min(page, pages() - 1), false); }, 150); });
      buildDots();
    }
  }

  /* ---------- Envio de depoimento (chega por e-mail para aprovação) ---------- */
  const depoForm = $('#depoForm');
  if (depoForm) {
    const dStatus = $('#depoStatus');
    const dFields = $$('.field input, .field textarea', depoForm);
    const dTexto = $('#depoTexto');
    const dCount = $('#depoCount');
    dTexto.addEventListener('input', () => { dCount.textContent = dTexto.value.length + '/400'; });

    const dValidate = (input) => {
      const field = input.closest('.field');
      let msg = '';
      if (input.type === 'checkbox') { if (input.required && !input.checked) msg = 'Marque para autorizar a publicação.'; }
      else if (input.required && !input.value.trim()) msg = 'Este campo é obrigatório.';
      else if (input === dTexto && input.value.trim().length < 20) msg = 'Escreva pelo menos uma frase completa.';
      field.classList.toggle('is-invalid', !!msg);
      $('.error-msg', field).textContent = msg;
      return !msg;
    };
    dFields.forEach((input) => {
      input.addEventListener('change', () => { if (input.closest('.field').classList.contains('is-invalid')) dValidate(input); });
    });

    // Aspas simples e quebras de linha escapadas para o bloco poder ser colado direto no arquivo.
    const esc = (s) => String(s).trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\s*\n\s*/g, ' ');

    depoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!dFields.map(dValidate).every(Boolean)) {
        dStatus.textContent = 'Revise os campos destacados e tente novamente.';
        dStatus.className = 'form-status error';
        const first = $('.is-invalid input, .is-invalid textarea', depoForm);
        if (first) first.focus();
        return;
      }
      const d = Object.fromEntries(new FormData(depoForm).entries());
      if (d._honey) { depoForm.reset(); return; }

      const bloco = `{\n  texto: '${esc(d.texto)}',\n  nome: '${esc(d.nome)}',\n  detalhe: '${esc(d.detalhe || '')}',\n  real: true\n},`;
      const quando = new Date().toLocaleString('pt-BR');

      const openMail = () => {
        const body = `Depoimento de ${d.nome} (${d.detalhe || '-'}):\n\n${d.texto}\n\nAutorizo a publicação do meu nome e deste depoimento no site. (${quando})`;
        window.location.href = `mailto:${FORM_EMAIL || CONTACT_EMAIL}?subject=${encodeURIComponent('Depoimento — ' + d.nome)}&body=${encodeURIComponent(body)}`;
        dStatus.textContent = 'Abrimos o seu aplicativo de e-mail com o depoimento pronto. É só enviar.';
        dStatus.className = 'form-status success';
      };
      if (!FORM_ENDPOINT) { openMail(); return; }

      const btn = $('button[type="submit"]', depoForm);
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      const payload = {
        Nome: d.nome, 'Profissão e cidade': d.detalhe || '-', Depoimento: d.texto,
        'Autorização de publicação': 'Sim, marcada em ' + quando,
        'Para publicar, cole em js/depoimentos.js': bloco,
        _subject: `Site · Novo depoimento — ${d.nome}`, _template: 'box', _captcha: 'false'
      };
      fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((res) => { if (String(res.success) !== 'true') throw new Error(res.message || 'falha'); })
        .then(() => {
          dStatus.textContent = 'Obrigado! Seu depoimento foi enviado e será publicado após a leitura do Ozias.';
          dStatus.className = 'form-status success';
          depoForm.reset();
          dCount.textContent = '0/400';
        })
        .catch(openMail)
        .finally(() => { btn.disabled = false; btn.innerHTML = original; });
    });
  }

  /* ---------- 8. Links de WhatsApp com mensagem pronta ---------- */
  $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });

  /* ---------- 9. Ano no rodapé ---------- */
  const ano = $('#ano');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
