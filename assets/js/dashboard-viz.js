/* ============================================================
   Дашборд: переключатель «Таблица» у каждого графика,
   доли ответов от центральной оси, полоса поддержки.

   Разметка графиков — в dashboard.html; таблица к строкам-гантелям
   собирается из тех же подписей data-tip, что показывает
   подсказка, — отдельной копии данных нет.
   ============================================================ */
(function () {
  'use strict';

  const MINUS = '−';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const num = (s) => s.trim().replace(/^-/, MINUS);

  /* ── Переключатель ─────────────────────────────────────────── */
  // Подпись кнопки — то, что откроется по нажатию: на графике «Таблица»,
  // на таблице — «График» (или «Диаграмма» в блоке поддержки).
  function makeToggle(label, back) {
    const btn = el('button', 'chart-toggle', label);
    btn.type = 'button';
    btn.dataset.labelBack = back;
    return btn;
  }

  function wire(btn, sw) {
    const alt = sw.querySelector(':scope > [data-alt]');
    if (alt) {
      if (!alt.id) alt.id = 'chart-alt-' + (++uid);
      btn.setAttribute('aria-controls', alt.id);
    }
    const label = btn.textContent;
    const back = btn.dataset.labelBack || label;
    btn.addEventListener('click', () => {
      const on = !sw.classList.contains('is-alt');
      sw.classList.toggle('is-alt', on);
      btn.textContent = on ? back : label;
      // Легенда графика в таблице ничего не обозначает — прячем её.
      const tools = btn.closest('.chart-tools');
      const legend = tools && tools.querySelector(':scope > .legend');
      if (legend) legend.hidden = on;
      if (on) redraw(sw);
    });
  }

  // Куда поставить кнопку: рядом с легендой над графиком (общей строкой
  // .chart-tools), иначе — в строку с заголовком.
  function withLegend(legend, btn) {
    const tools = el('div', 'chart-tools');
    tools.style.marginBottom = getComputedStyle(legend).marginBottom;
    legend.replaceWith(tools);
    tools.append(legend, btn);
  }

  function placeToggle(anchor, btn) {
    const prev = anchor.previousElementSibling;
    const legend = prev && (prev.matches('.legend') ? prev : prev.querySelector('.legend'));
    if (legend) { withLegend(legend, btn); return; }
    if (prev && prev.matches('.metric-block__title')) {
      const bar = el('div', 'chart-bar');
      bar.style.marginBottom = getComputedStyle(prev).marginBottom;
      prev.replaceWith(bar);
      bar.append(prev, btn);
      return;
    }
    const bar = el('div', 'chart-bar chart-bar--solo');
    bar.appendChild(btn);
    anchor.before(bar);
  }

  function wrap(node) {
    const sw = el('div', 'chart-switch');
    node.replaceWith(sw);
    sw.appendChild(node);
    return sw;
  }

  function tableFrom(caption, head, rows) {
    const box = el('div', 'chart-table-wrap');
    box.setAttribute('data-alt', '');
    const t = el('table', 'chart-table');
    const cap = el('caption', 'visually-hidden', caption);
    const thead = el('thead');
    const hr = el('tr');
    head.forEach((h) => { const th = el('th', null, h); th.scope = 'col'; hr.appendChild(th); });
    thead.appendChild(hr);
    const tbody = el('tbody');
    rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((c, i) => {
        const cell = el(i ? 'td' : 'th', null, c);
        if (!i) cell.scope = 'row';
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    t.append(cap, thead, tbody);
    box.appendChild(t);
    return box;
  }

  function captionFor(node) {
    const section = node.closest('section, .metric-block');
    const t = section && section.querySelector('.metric-block__title, .section-eyebrow, .subsection-title');
    if (t) return t.textContent.trim();
    const screen = node.closest('.screen');
    const title = screen && screen.querySelector('.sp-title, .subsection-title');
    return title ? title.textContent.trim() : 'Данные графика';
  }

  /* ── Строки-гантели: в таблице строки — показатели, столбцы — серии ──
     data-tip: «Серия · Показатель: значение»; в показателе
     самом тоже бывает « · », поэтому режем по первому. */
  function dumbbells() {
    document.querySelectorAll('.db').forEach((chart) => {
      const tips = [...chart.querySelectorAll('[data-tip]')].map((n) => n.getAttribute('data-tip'));
      if (!tips.length) return;
      const series = [];
      const rows = new Map();
      tips.forEach((tip) => {
        const colon = tip.lastIndexOf(':');
        const dot = tip.indexOf(' · ');
        if (colon < 0 || dot < 0) return;
        const s = tip.slice(0, dot).trim();
        const cat = tip.slice(dot + 3, colon).trim();
        if (!series.includes(s)) series.push(s);
        if (!rows.has(cat)) rows.set(cat, {});
        // та же подпись строки, что на графике: «А1 Стресс-статус» → «А1 · Стресс-статус»
        rows.get(cat)[s] = num(tip.slice(colon + 1));
      });
      const order = series.slice().sort((a, b) => (a === 'Компания' ? -1 : b === 'Компания' ? 1 : 0));
      const anchor = chart;
      const btn = makeToggle('Таблица', 'График');
      placeToggle(anchor, btn);             // до обёртки — чтобы найти легенду над графиком
      const sw = wrap(anchor);
      sw.appendChild(tableFrom(captionFor(sw), ['Показатель', ...order],
        [...rows].map(([cat, v]) => [cat.includes(' · ') ? cat : cat.replace(/^(\S+) /, '$1 · '), ...order.map((s) => v[s] || '—')])));
      wire(btn, sw);
    });
  }

  /* ── Шкала Индекса на главной ──────────────────────────────── */
  function indexScale() {
    const chart = document.querySelector('.index-scale-chart');
    if (!chart) return;
    const zone = (v) => (v <= 19 ? 'низкий (≤19)' : v <= 45 ? 'средний (20–45)' : 'высокий (>45)');
    const rows = [...chart.querySelectorAll('.scale-marker[aria-label]')].map((m) => {
      const [name, value] = m.getAttribute('aria-label').split(':');
      return [name.trim(), num(value), zone(parseFloat(value))];
    });
    if (!rows.length) return;
    const btn = makeToggle('Таблица', 'График');
    const key = document.querySelector('.result-heading .legend');
    if (key) withLegend(key, btn); else placeToggle(chart, btn);
    const sw = wrap(chart);
    sw.appendChild(tableFrom('Индекс: компания и Россия', ['', 'Индекс', 'Зона'], rows));
    wire(btn, sw);
  }

  /* ── Доли ответов: таблица уже в разметке, ставим кнопку ────── */
  function likerts() {
    document.querySelectorAll('.chart-switch > .likert').forEach((chart) => {
      const sw = chart.parentElement;
      const btn = makeToggle('Таблица', 'График');
      // Кнопка — в строке с названием и значением субиндекса.
      const head = sw.closest('.metric-block') && sw.closest('.metric-block').firstElementChild;
      if (head && head !== sw) { head.classList.add('metric-block__head'); head.appendChild(btn); }
      else placeToggle(sw, btn);
      wire(btn, sw);
    });
  }

  // Значение внутри полосы, а если не помещается — у внешнего конца.
  function fit(chart) {
    chart.querySelectorAll('.likert__seg').forEach((seg) => {
      const val = seg.querySelector('.likert__val');
      if (!val || !seg.clientWidth) return;
      seg.classList.remove('is-out');
      seg.classList.toggle('is-out', val.offsetWidth > seg.clientWidth);
    });
  }

  /* ── Поддержка: по кнопке — полоса из пяти кусочков ────────── */
  function support() {
    const btn = document.querySelector('.chart-toggle[data-toggle-for="support"]');
    const sw = document.querySelector('.chart-switch--support');
    if (btn && sw) wire(btn, sw);
    // Подсказка у каждого куска — подпись и доля из ключа под полосой.
    document.querySelectorAll('.support-stack').forEach((box) => {
      const items = box.querySelectorAll('.stack__key li');
      box.querySelectorAll('.stack__seg').forEach((seg, i) => {
        const li = items[i];
        if (li) seg.dataset.tip = li.textContent.replace(/(\d+%)$/, ' — $1').trim();
      });
    });
  }

  /* ── Подсказки у кусков долей: вопрос не нужен, он в строке ─── */
  function likertTips() {
    document.querySelectorAll('.likert__track').forEach((track) => {
      const parts = {};
      (track.getAttribute('aria-label') || '').split(': ').slice(1).join(': ')
        .split(', ').forEach((p) => { const m = p.match(/^(.+) (\d+%)$/); if (m) parts[m[1]] = m[2]; });
      const names = { neg: 'негативный', neu: 'затруднились', pos: 'позитивный' };
      track.querySelectorAll('.likert__seg').forEach((seg) => {
        const k = Object.keys(names).find((n) => seg.classList.contains('likert__seg--' + n));
        if (k && parts[names[k]]) seg.dataset.tip = `${names[k]} — ${parts[names[k]]}`;
      });
    });
  }

  /* ── Подсказка: одна на весь дашборд ─────────────────────────── */
  function tooltip() {
    const tip = el('div', 'chart-tip');
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
    const SEL = '.db [data-tip], .likert [data-tip], .stack [data-tip], .analytics-card th[data-tip]';
    const show = (node) => {
      tip.textContent = node.dataset.tip.replace(/: (-)/, ': ' + MINUS);
      const r = node.getBoundingClientRect();
      tip.style.left = (r.left + r.width / 2) + 'px';
      tip.style.top = r.top + 'px';
      tip.classList.add('is-visible');
    };
    const hide = () => tip.classList.remove('is-visible');
    document.addEventListener('pointerover', (e) => {
      const n = e.target.closest && e.target.closest(SEL);
      if (n) show(n);
    });
    document.addEventListener('pointerout', (e) => {
      const n = e.target.closest && e.target.closest(SEL);
      if (n && !n.contains(e.relatedTarget)) hide();
    });
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  }

  /* ── Появление и перерисовка ───────────────────────────────── */
  function draw(node) {
    if (reduceMotion) { node.classList.add('is-drawn'); return; }
    node.classList.remove('is-drawn');
    void node.offsetWidth;                       // сбросить переход, чтобы проиграть заново
    requestAnimationFrame(() => node.classList.add('is-drawn'));
  }

  function redraw(sw) {
    sw.querySelectorAll('.stack').forEach(draw);
  }

  function motion() {
    const likertList = [...document.querySelectorAll('.likert')];
    const dbs = [...document.querySelectorAll('.db')];
    const stacks = [...document.querySelectorAll('.stack')];
    likertList.forEach((n) => n.classList.add('likert--anim'));
    dbs.forEach((n) => n.classList.add('db--anim'));
    stacks.forEach((n) => n.classList.add('stack--anim'));
    if (reduceMotion || !('IntersectionObserver' in window)) {
      [...likertList, ...dbs, ...stacks].forEach((n) => n.classList.add('is-drawn'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-drawn');
          io.unobserve(e.target);
        });
      }, { threshold: 0.2 });
      [...likertList, ...dbs].forEach((n) => io.observe(n));
    }
    // Экраны дашборда скрыты через display:none — ширина появляется
    // только при показе, поэтому подгонка подписей — по ResizeObserver.
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
      likertList.forEach((n) => ro.observe(n));
    } else {
      likertList.forEach(fit);
      window.addEventListener('resize', () => likertList.forEach(fit));
    }
  }

  function init() {
    indexScale();
    dumbbells();
    likerts();
    likertTips();
    support();
    tooltip();
    motion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
