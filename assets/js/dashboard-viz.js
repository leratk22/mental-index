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
  // Десятичная запятая и настоящий минус — как в текстах дашборда.
  const num = (s) => s.trim().replace(/^-/, MINUS).replace(/(\d)\.(\d)/g, '$1,$2');

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
    // Заголовок графика над легендой — в одну строку с кнопкой.
    const title = tools.previousElementSibling;
    if (title && title.matches('.metric-block__title') && !title.parentElement.matches('.chart-head')) {
      const head = el('div', 'chart-head');
      title.replaceWith(head);
      head.append(title, tools);
      tools.style.marginBottom = '';
    }
    if (tools.parentElement.matches('.chart-head')) tools.style.marginBottom = '';
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

  /* ── Шкала Индекса ментального благополучия на главной ───────── */
  function indexScale() {
    const chart = document.querySelector('.index-scale-chart');
    if (!chart) return;
    const zone = (v) => (v <= 19 ? 'низкое (≤19)' : v <= 45 ? 'среднее (20–45)' : 'высокое (>45)');
    const rows = [...chart.querySelectorAll('.scale-marker[aria-label]')].map((m) => {
      const [name, value] = m.getAttribute('aria-label').split(':');
      return [name.trim(), num(value), zone(parseFloat(value))];
    });
    if (!rows.length) return;
    const btn = makeToggle('Таблица', 'График');
    const key = document.querySelector('.result-heading .legend');
    if (key) withLegend(key, btn); else placeToggle(chart, btn);
    const sw = wrap(chart);
    sw.appendChild(tableFrom('Индекс ментального благополучия: компания и Россия', ['', 'Значение', 'Категория'], rows));
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
    // Кнопки «Таблица / Диаграмма» с data-toggle-for: «support» — блок поддержки,
    // остальные — .chart-switch[data-switch=…].
    document.querySelectorAll('.chart-toggle[data-toggle-for]').forEach((btn) => {
      const id = btn.dataset.toggleFor;
      const sw = id === 'support' ? document.querySelector('.chart-switch--support') : document.querySelector(`.chart-switch[data-switch="${id}"]`);
      if (sw) wire(btn, sw);
    });
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
    const SEL = '.db [data-tip], .likert [data-tip], .sk [data-tip], .stack [data-tip], .chart-table th[data-tip], .analytics-card th [data-tip], .analytics-card th[data-tip]';
    // На шкале к значению добавляем категорию — чтобы «+8» не читалось как «хорошо».
    const zone = (v) => (v <= 19 ? 'низкое значение' : v <= 45 ? 'среднее значение' : 'высокое значение');
    const show = (node) => {
      let text = num(node.dataset.tip.replace(/: (-)/, ': ' + MINUS));
      if (node.matches('.db--zones .db__dot')) {
        const v = parseFloat(node.dataset.tip.slice(node.dataset.tip.lastIndexOf(':') + 1));
        if (!Number.isNaN(v)) text += ` · ${zone(v)}`;
      }
      tip.textContent = text;
      tip.classList.add('is-visible');
    };
    const hide = () => { tip.classList.remove('is-visible'); current = null; };
    let current = null;
    const place = () => {
      // Подсказка не выходит за край экрана: сдвигаем центр, если она шире свободного места.
      const w = tip.offsetWidth, vw = document.documentElement.clientWidth;
      const r = current.getBoundingClientRect();
      const center = Math.min(Math.max(r.left + r.width / 2, w / 2 + 8), vw - w / 2 - 8);
      tip.style.left = center + 'px';
      tip.style.top = r.top + 'px';
    };
    let showFor = (n) => { current = n; show(n); place(); };
    // Мышь: наведение. Касание: нажатие показывает подсказку и она остаётся,
    // пока не нажмёшь в другом месте или не прокрутишь (на тач-экране pointerout
    // приходит сразу после касания и раньше гасил подсказку за долю секунды).
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const n = e.target.closest && e.target.closest(SEL);
      if (n) showFor(n);
    });
    document.addEventListener('pointerout', (e) => {
      if (e.pointerType === 'touch') return;
      const n = e.target.closest && e.target.closest(SEL);
      if (n && !n.contains(e.relatedTarget)) hide();
    });
    // Касание обрабатываем через pointerdown/pointerup, а не click: iOS Safari не отправляет click
    // на неинтерактивные элементы при делегировании на document, и подсказка не появлялась.
    // Тап — это отпускание почти там же, где коснулись, и быстро; прокрутка отменяет pointer-события.
    let down = null;
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      down = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    document.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' || !down) return;
      const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && Date.now() - down.t < 600;
      down = null;
      if (!tap) return;
      const n = e.target.closest && e.target.closest(SEL);
      if (n && n !== current) showFor(n); else hide();
    });
    document.addEventListener('pointercancel', () => { down = null; });
    // Прокрутка страницы убирает подсказку, но не сразу после показа и не от мелких сдвигов
    // (на телефоне при касании может «дрогнуть» адресная строка).
    let shownAt = 0, shownY = 0;
    const baseShow = showFor;
    showFor = (n) => { shownAt = Date.now(); shownY = window.scrollY; baseShow(n); };
    document.addEventListener('scroll', () => {
      if (current && Date.now() - shownAt > 250 && Math.abs(window.scrollY - shownY) > 10) hide();
    }, true);
    window.addEventListener('resize', hide);
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
    const likertList = [...document.querySelectorAll('.likert, .sk')];
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

  /* ── Раскрывающееся описание по кнопке: подпись называет следующее действие ── */
  function expanders() {
    document.querySelectorAll('.chart-toggle[data-expand]').forEach((btn) => {
      const target = document.getElementById(btn.dataset.expand);
      if (!target) return;
      const label = btn.textContent, back = btn.dataset.labelBack || label;
      btn.addEventListener('click', () => {
        const open = target.hidden;
        target.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? back : label;
      });
    });
  }

  /* ── Подстановка переменных шаблона {Name} из window.DASHBOARD_VARS ── */
  function fillVars() {
    const vars = window.DASHBOARD_VARS || {};
    const re = /\{([A-Za-z][A-Za-z ]*)\}/g;
    const sub = (str) => str.replace(re, (m, k) => (k in vars ? vars[k] : m));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : (re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)),
    });
    re.lastIndex = 0;
    const nodes = [];
    while (walker.nextNode()) { nodes.push(walker.currentNode); re.lastIndex = 0; }
    nodes.forEach((n) => { n.nodeValue = sub(n.nodeValue); });
    document.querySelectorAll('[aria-label],[data-tip],[title]').forEach((el) => {
      ['aria-label', 'data-tip', 'title'].forEach((a) => { const v = el.getAttribute(a); if (v && v.includes('{')) el.setAttribute(a, sub(v)); });
    });
  }

  /* ── Сортировка столбцов в «Анализе по группам» ─────────────────
     Нажатие на заголовок: по убыванию → по возрастанию → исходный порядок.
     Строка «Все опрошенные» остаётся сверху; во вкладке «Все срезы» группы
     сортируются внутри своего среза; прочерки уходят вниз при любом порядке. */
  function sortTables() {
    const touch = window.matchMedia('(hover: none)').matches;
    if (touch) {
      document.querySelectorAll('.legend-note').forEach((n) => {
        if (n.textContent.indexOf('заголовок столбца') !== -1) n.textContent += '; пояснение к названию — по значку «i»';
      });
    }
    document.querySelectorAll('.analytics-card table[data-sortable]').forEach((table) => {
      const tbody = table.tBodies[0];
      const heads = Array.from(table.tHead.rows[0].cells);
      const starts = [];
      let col = 0;
      heads.forEach((th) => { starts.push(col); col += th.colSpan || 1; });
      Array.from(tbody.rows).forEach((r, i) => { r.dataset.order = i; });
      const state = { col: -1, dir: 0 };
      const value = (row, c) => {
        const cell = row.cells[c];
        const n = parseFloat(((cell && cell.textContent) || '').replace(/\u2212/g, '-').replace(',', '.').replace(/[^\d.\-]/g, ''));
        return Number.isNaN(n) ? null : n;
      };
      const sortSection = (rows, c, dir) => rows.sort((a, b) => {
        if (dir === 0) return a.dataset.order - b.dataset.order;
        const x = value(a, c), y = value(b, c);
        if (x === null || y === null) return x === y ? a.dataset.order - b.dataset.order : (x === null ? 1 : -1);
        return (dir === 1 ? y - x : x - y) || a.dataset.order - b.dataset.order;
      });
      const apply = (hi) => {
        state.dir = state.col === hi ? (state.dir + 1) % 3 : 1;
        state.col = hi;
        heads.forEach((th, i) => th.setAttribute('aria-sort', i === hi && state.dir ? (state.dir === 1 ? 'descending' : 'ascending') : 'none'));
        const rows = Array.from(tbody.rows);
        const total = rows.shift();
        const out = [total];
        let current = [];
        const flush = () => { out.push(...sortSection(current, starts[hi], state.dir)); current = []; };
        rows.forEach((r) => {
          if (r.querySelector('td.analytics-subhead')) { flush(); out.push(r); } else current.push(r);
        });
        flush();
        out.forEach((r) => tbody.appendChild(r));
      };
      heads.forEach((th, hi) => {
        if (hi === 0) return;
        // На сенсорном экране у заголовка две разные зоны нажатия: название сортирует столбец,
        // значок «i» рядом показывает пояснение. С мышью пояснение остаётся по наведению.
        const holder = touch ? (th.hasAttribute('data-tip') ? th : th.querySelector('[data-tip]')) : null;
        const tipText = holder ? holder.dataset.tip : '';
        if (holder) holder.removeAttribute('data-tip');
        const btn = el('button', 'th-sort');
        btn.type = 'button';
        while (th.firstChild) btn.appendChild(th.firstChild);
        th.appendChild(btn);
        if (tipText) {
          const info = el('button', 'th-info', 'i');
          info.type = 'button';
          info.dataset.tip = tipText;
          info.setAttribute('aria-label', 'Пояснение: ' + tipText);
          th.appendChild(info);
        }
        th.setAttribute('aria-sort', 'none');
        btn.addEventListener('click', () => apply(hi));
      });
    });
  }

  function init() {
    fillVars();
    indexScale();
    dumbbells();
    likerts();
    likertTips();
    support();
    expanders();
    sortTables();
    tooltip();
    motion();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
