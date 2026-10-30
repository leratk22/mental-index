/* Multi-select demographic slices in the combined tables. */
(() => {
  const root = document.getElementById('screen-analytics');
  if (!root) return;
  const chips = root.querySelector('.slice-chips');
  const buttons = [...chips.querySelectorAll('[data-slice]')];
  const choices = buttons.filter(b => b.dataset.slice !== 'all');
  const selected = new Set();
  let allSelected = true;
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const keys = new Map(choices.map(b => [normalize(b.textContent), b.dataset.slice]));
  const combined = root.querySelector('#slice-all');
  const collapsed = new WeakMap();
  combined.querySelectorAll('tbody').forEach(body => {
    let key = '';
    [...body.rows].forEach(row => {
      const heading = row.querySelector('.analytics-subhead');
      if (heading) key = keys.get(normalize(heading.textContent)) || '';
      if (key) row.dataset.sliceGroup = key;
    });
  });
  combined.querySelectorAll('.analytics-subhead').forEach(heading => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slice-group-toggle';
    button.textContent = heading.textContent;
    heading.replaceChildren(button);
    button.addEventListener('click', () => {
      const body = heading.closest('tbody');
      const groups = collapsed.get(body) || new Set();
      const key = heading.parentElement.dataset.sliceGroup;
      if (groups.has(key)) groups.delete(key); else groups.add(key);
      collapsed.set(body, groups);
      render();
    });
  });
  const columnObserver = new ResizeObserver(entries => {
    entries.forEach(({ target }) => {
      const width = target.getBoundingClientRect().width;
      if (width) target.closest('table').style.setProperty('--group-column-width', `${width}px`);
    });
  });
  combined.querySelectorAll('table thead th:first-child[colspan="2"]').forEach(header => columnObserver.observe(header));
  const status = document.createElement('p');
  status.className = 'slice-selection-status';
  status.setAttribute('role', 'status');
  chips.after(status);
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Выберите срезы для сравнения');
  function render() {
    buttons.forEach(button => {
      const on = button.dataset.slice === 'all'
        ? allSelected
        : !allSelected && selected.has(button.dataset.slice);
      button.classList.toggle('active-slice', on);
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
      button.style.removeProperty('background');
      button.style.removeProperty('color');
    });
    root.querySelectorAll('.slice-panel').forEach(panel => {
      panel.style.display = panel === combined && (allSelected || selected.size) ? 'block' : 'none';
    });
    combined.querySelectorAll('[data-slice-group]').forEach(row => {
      const closed = collapsed.get(row.closest('tbody'))?.has(row.dataset.sliceGroup);
      const toggle = row.querySelector('.slice-group-toggle');
      if (toggle) {
        toggle.disabled = false;
        toggle.setAttribute('aria-expanded', String(!closed));
      }
      row.hidden = !(allSelected || selected.has(row.dataset.sliceGroup)) || Boolean(closed && !toggle);
    });
    const comparison = 'Выберите признак — возраст, пол, характер занятости или другой — и сравните результаты групп со строкой «Все опрошенные». Так можно увидеть, чем группы отличаются от общей картины.';
    status.textContent = !allSelected && selected.size
      ? `Выбрано срезов: ${selected.size} из ${choices.length}. ${comparison}`
      : comparison;
  }
  chips.addEventListener('click', event => {
    const button = event.target.closest('[data-slice]');
    if (!button) return;
    const key = button.dataset.slice;
    if (key === 'all') {
      allSelected = !allSelected;
      selected.clear();
    } else {
      if (allSelected) { allSelected = false; selected.clear(); }
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      if (selected.size === choices.length) { allSelected = true; selected.clear(); }
    }
    render();
  });
  window.updateSliceSelection = render;
  render();
})();

/* Keep both chart representations visible in each view selector. */
(() => {
  document.querySelectorAll('.chart-toggle[aria-controls]:not([data-expand])').forEach(controller => {
    const alternate = document.getElementById(controller.getAttribute('aria-controls'));
    const chart = alternate && alternate.closest('.chart-switch');
    if (!chart) return;
    if (chart.querySelector('.index-scale-chart')) {
      const bar = controller.closest('.chart-bar');
      if (bar) bar.remove(); else controller.remove();
      return;
    }
    const group = document.createElement('div');
    group.className = 'chart-view-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Представление данных');
    const options = ['График', 'Таблица'].map((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chart-view-option';
      button.textContent = label;
      button.setAttribute('aria-controls', alternate.id);
      button.addEventListener('click', () => {
        if (chart.classList.contains('is-alt') !== Boolean(index)) controller.click();
        sync();
      });
      group.append(button);
      return button;
    });
    function sync() {
      options.forEach((button, index) => button.setAttribute('aria-pressed', String(chart.classList.contains('is-alt') === Boolean(index))));
    }
    controller.before(group);
    controller.classList.add('chart-toggle-controller');
    controller.tabIndex = -1;
    controller.setAttribute('aria-hidden', 'true');
    sync();
  });
})();

(() => {
  const section = document.querySelector('section[aria-labelledby="section-skills-title"]');
  if (!section) return;
  const legend = section.querySelector('.chart-tools .legend');
  const chart = section.querySelector('.chart-switch[data-switch="skills"]');
  if (legend && chart) {
    legend.classList.add('skills-color-legend');
    chart.after(legend);
    const syncLegend = () => { legend.hidden = chart.classList.contains('is-alt'); };
    new MutationObserver(syncLegend).observe(chart, { attributes: true, attributeFilter: ['class'] });
    syncLegend();
  }
})();

/* Place explanations next to the data they describe. */
(() => {
  const analytics = document.getElementById('screen-analytics');
  const source = document.getElementById('slices-legend');
  const colorKey = source && source.querySelector('.analytics-legend');
  analytics.querySelectorAll('.analytics-card').forEach(card => {
    const tables = [...card.querySelectorAll('table')];
    const scale = card.querySelector('.analytics-scale');
    tables.forEach((table, index) => {
      const wrapper = table.parentElement;
      const footer = document.createElement('div');
      footer.className = 'analytics-table-footer';
      if (index === 0 && scale) footer.append(scale);
      if ((index === 1 || index === 2) && colorKey) {
        const key = document.createElement('div');
        key.className = 'legend';
        [...colorKey.querySelectorAll('.legend-item:not(.legend-note)')].forEach(item => key.append(item.cloneNode(true)));
        footer.append(key);
      }
      const note = document.createElement('p');
      note.className = 'analytics-table-note';
      const common = 'Все результаты взвешены. Для групп меньше 10 человек значения ориентировочные; для групп меньше 5 человек значения не показаны.';
      const explanations = [
        'Срез — результаты части опрошенных, например одного пола или возраста. Цвет ячейки соответствует значению Индекса по шкале выше. ',
        'Цвет ячейки — по сравнению с другими группами в том же столбце. Для «Справляются и остаются» благоприятнее большее значение, для остальных секторов — меньшее. ',
        'Цвет ячейки — по сравнению с другими группами в том же столбце. Для «К психологу» и «Работодатель: достаточно» благоприятнее большее значение, для остальных показателей — меньшее. ',
        'Показана доля группы с низким уровнем навыка. '
      ];
      note.textContent = (explanations[index] || '') + common;
      footer.append(note);
      wrapper.after(footer);
      let above = wrapper.previousElementSibling;
      if (above && above.matches('.analytics-table-note')) {
        above.textContent = above.textContent.replace('шкала справа от заголовка', 'шкала под таблицей');
      }
      table.querySelectorAll('tbody td:first-child').forEach(cell => {
        if (cell.textContent.trim() === '·') cell.textContent = '';
      });
    });
  });
  analytics.querySelector('.analytics-head')?.remove();
  document.querySelectorAll('.chart-toggle-controller').forEach(controller => {
    const alternate = document.getElementById(controller.getAttribute('aria-controls'));
    const chart = alternate?.closest('.chart-switch');
    if (!chart || chart.dataset.switch === 'skills') return;
    const block = controller.closest('.metric-block');
    const legend = controller.parentElement.querySelector('.legend') || block?.querySelector('.legend');
    if (!legend || chart.contains(legend)) return;
    legend.classList.add('chart-bottom-legend');
    chart.after(legend);
    const sync = () => { legend.hidden = chart.classList.contains('is-alt'); };
    new MutationObserver(sync).observe(chart, { attributes: true, attributeFilter: ['class'] });
    sync();
  });
})();

(() => {
  document.querySelectorAll('.likert > .legend').forEach(legend => {
    const chart = legend.closest('.chart-switch');
    if (!chart) return;
    legend.classList.remove('likert__legend');
    legend.classList.add('chart-bottom-legend');
    chart.after(legend);
    const sync = () => { legend.hidden = chart.classList.contains('is-alt'); };
    new MutationObserver(sync).observe(chart, { attributes: true, attributeFilter: ['class'] });
    sync();
  });
  document.querySelectorAll('.analytics-table-note').forEach(note => {
    note.textContent = note.textContent.replace(/шкала\s+справа\s+от\s+заголовка/g, 'шкала под таблицей');
  });
})();

(() => {
  document.querySelectorAll('.slice-skills-table').forEach(table => {
    const wrapper = table.parentElement;
    const above = wrapper.previousElementSibling;
    if (above?.matches('.analytics-table-note')) {
      above.textContent = 'Доля группы с низким уровнем навыка (оценка 0–4), %.';
    }
    const footer = wrapper.nextElementSibling;
    if (footer?.matches('.analytics-table-footer')) {
      const legend = document.createElement('div');
      legend.className = 'legend skills-threshold-legend';
      [['#BACFA2', 'меньше 10%'], ['#FFF4D4', 'от 10% до 20%'], ['#F7A6A2', '20% и выше']].forEach(([color, text]) => {
        const item = document.createElement('span');
        item.className = 'legend-item';
        const dot = document.createElement('span');
        dot.className = 'legend-dot';
        dot.style.background = color;
        item.append(dot, document.createTextNode(text));
        legend.append(item);
      });
      footer.prepend(legend);
    }
  });
  document.querySelectorAll('.analytics-card tbody tr').forEach(row => {
    const first = row.cells[0];
    if (first && !first.textContent.trim() && row.cells.length > 1) {
      const next = row.cells[1];
      first.classList.add('analytics-spacer-cell');
      next.style.paddingLeft = '10px';
    }
  });
  document.querySelectorAll('.db.db--zones').forEach(graph => {
    const chart = graph.closest('.chart-switch');
    const note = graph.querySelector('.db__note');
    const legend = chart?.nextElementSibling;
    if (!chart || !note || !legend?.matches('.chart-bottom-legend')) return;
    const items = [...note.querySelectorAll('.legend-item')];
    const merged = document.createElement('div');
    merged.className = 'legend compact-index-legend';
    ['Низкое ≤19', 'Среднее 20–45', 'Высокое >45'].forEach((label, index) => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.background = ['var(--red)', 'var(--yel)', 'var(--grn)'][index];
      item.append(dot, document.createTextNode(label));
      merged.append(item);
    });
    const caveat = note.querySelector('.db__note-text');
    legend.replaceChildren(merged);
    if (caveat) {
      const text = document.createElement('p');
      text.className = 'compact-index-caveat';
      text.textContent = caveat.textContent;
      legend.append(text);
    }
    note.remove();
  });
})();

(() => {
  document.querySelectorAll('.analytics-card table').forEach(table => {
    const wrapper = table.parentElement;
    const note = wrapper.previousElementSibling;
    const footer = wrapper.nextElementSibling;
    if (note?.matches('.analytics-table-note') && footer?.matches('.analytics-table-footer')) {
      const explanation = footer.querySelector('.analytics-table-note');
      if (explanation) explanation.textContent = note.textContent.trim() + ' ' + explanation.textContent;
      else footer.append(note.cloneNode(true));
      note.remove();
    }
    const total = table.tBodies[0]?.rows[0];
    if (total) total.classList.add('analytics-total-row');
    const indexHeader = [...(table.tHead?.rows[0]?.cells || [])].find(th => th.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === 'индекс');
    indexHeader?.querySelector('.th-sort')?.click();
  });
})();

(() => {
  document.querySelectorAll('.chart-switch').forEach(chart => {
    const graph = chart.querySelector('.db, .likert, .sk');
    const table = chart.querySelector('.chart-table');
    if (!graph || !table) return;
    const labels = [...graph.querySelectorAll('.db__label, .likert__label, .sk__label')];
    [...table.tBodies[0].rows].forEach((row, index) => {
      const label = row.querySelector('th');
      if (!label) return;
      if (labels[index]) label.textContent = labels[index].textContent;
      label.removeAttribute('data-tip');
      label.removeAttribute('title');
    });
  });
  document.querySelectorAll('.db').forEach(graph => {
    graph.classList.add('index-band-chart');
    graph.querySelectorAll('.db__hint').forEach(hint => hint.remove());
  });
})();

/* Sector subgroups use the same card hierarchy as the overview. */
(() => {
  function subgroupCard(source, level) {
    const card = document.createElement('article');
    card.className = 'risk-intent-card sector-subgroup-card';
    const head = document.createElement('div');
    head.className = 'risk-intent-head';
    const copy = document.createElement('div');
    copy.className = 'risk-intent-heading';
    const name = document.createElement('h4');
    name.className = 'risk-intent-name';
    name.textContent = source.querySelector('.seg-name').textContent;
    const count = document.createElement('div');
    count.className = 'risk-intent-count';
    count.textContent = source.querySelector('.seg-n').textContent;
    copy.append(name, count);
    const stat = document.createElement('div');
    stat.className = 'risk-intent-stat';
    const percent = document.createElement('div');
    percent.className = 'risk-intent-percent';
    const ring = source.querySelector('.seg-donut').cloneNode(true);
    ring.classList.add('sector-subgroup-donut');
    ring.style.setProperty('--c', source.classList.contains('seg-green') ? 'var(--grn)' : source.classList.contains('seg-red') ? 'var(--red)' : source.classList.contains('seg-yellow') ? 'var(--yel)' : '#98A0AE');
    percent.append(ring, document.createTextNode(source.querySelector('.seg-pct').textContent));
    stat.append(percent);
    head.append(copy, stat);
    card.append(head);
    if (level) {
      const value = document.createElement('p');
      value.className = 'risk-intent-level';
      value.textContent = 'Значение индекса ' + level;
      card.append(value);
    }
    const description = document.createElement('p');
    description.className = 'risk-intent-description';
    description.textContent = source.querySelector('.seg-desc').textContent;
    card.append(description);
    return card;
  }
  document.querySelectorAll('.risk-axis-grid--static').forEach(matrix => {
    const labels = [...matrix.querySelectorAll('.risk-axis-column-label')].map(e => e.textContent);
    const cards = [...matrix.querySelectorAll('.seg-card')];
    const layout = document.createElement('div');
    layout.className = 'sector-subgroups';
    labels.forEach((label, column) => {
      const group = document.createElement('section');
      group.className = 'risk-intent-group';
      const title = document.createElement('h3');
      title.className = 'risk-intent-title';
      title.textContent = label;
      const grid = document.createElement('div');
      grid.className = 'risk-intent-cards';
      cards.forEach((card, index) => {
        if (index % labels.length === column) grid.append(subgroupCard(card, index < labels.length ? 'высокое' : 'среднее'));
      });
      group.append(title, grid);
      layout.append(group);
    });
    const intro = matrix.previousElementSibling;
    if (intro?.matches('.section-intro')) {
      intro.querySelector('.section-eyebrow').textContent = 'Группы сектора';
      intro.querySelector('.subsection-title').textContent = 'Индекс ментального благополучия и удовлетворённость работой';
    }
    matrix.replaceWith(layout);
  });
  document.querySelectorAll('.sd-wrap .seg-card--static').forEach(source => {
    const parent = source.parentElement;
    parent.classList.add('sector-subgroup-grid');
    parent.removeAttribute('style');
    source.replaceWith(subgroupCard(source, 'низкое'));
  });
})();

/* Index bands have one presentation; retain only their zero reference. */
(() => {
  document.querySelectorAll('.index-band-chart').forEach(graph => {
    const chart = graph.closest('.chart-switch');
    chart.classList.remove('is-alt');
    const table = chart.querySelector('[id^="chart-alt-"]');
    if (table?.id) {
      document.querySelectorAll('[aria-controls="' + table.id + '"]').forEach(control => {
        const group = control.closest('.chart-view-switch');
        const host = (group || control).parentElement;
        (group || control).remove();
        if (host?.matches('.chart-tools, .chart-bar') && !host.children.length) host.remove();
      });
    }
    graph.querySelectorAll('.db__track').forEach(track => {
      const zero = document.createElement('span');
      zero.className = 'index-band-zero';
      zero.textContent = '0';
      zero.setAttribute('aria-hidden', 'true');
      track.append(zero);
    });
  });
})();

/* Component notation and independent recommendations. */
(() => {
  document.querySelectorAll('.structure-component-card .sc-val, .structure-component-card .sc-sub-row > :last-child').forEach(value => {
    const text = value.textContent.trim();
    if (/^\d+[,.]\d+$/.test(text)) value.textContent = '+' + text;
  });
  const targets = document.querySelectorAll('.sc-label, .db__label, .metric-block__title, .chart-table tbody th, .analytics-card thead th');
  targets.forEach(target => {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const match = node.textContent.match(/^\s*([АБВABV](?:[1-3])?)\s*(?:·\s*|(?=$))/);
      if (!match) continue;
      const code = document.createElement(match[1].length > 1 ? 'strong' : 'span');
      code.className = match[1].length > 1 ? 'subindex-code' : 'component-code';
      code.textContent = match[1];
      node.replaceWith(code, document.createTextNode(' ' + node.textContent.slice(match[0].length)));
      break;
    }
  });
  document.querySelectorAll('.structure-component-card .sc-sub-row > span:first-child').forEach(label => {
    const match = label.textContent.trim().match(/^([АБВABV][1-3])\s*·?\s*(.*)$/);
    if (!match) return;
    const code = document.createElement('strong');
    code.className = 'subindex-code';
    code.textContent = match[1];
    const name = document.createElement('span');
    name.className = 'subindex-label';
    name.textContent = match[2];
    label.replaceChildren(code, name);
  });
  document.querySelectorAll('.subpage .dashboard-section > .insight-card, .sd-wrap .dashboard-section > .insight-card').forEach(insight => {
    const section = insight.parentElement;
    const standalone = document.createElement('section');
    standalone.className = 'dashboard-section standalone-insight';
    standalone.append(...insight.childNodes);
    section.after(standalone);
    insight.remove();
  });
})();

/* Editorial and navigation refinement across V3. */
(() => {
  document.querySelectorAll('.scale-zone, .compact-index-legend .legend-item').forEach(label => {
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      node.textContent = node.textContent.replace(/Низкое/g, 'Низкий').replace(/Среднее/g, 'Средний').replace(/Высокое/g, 'Высокий');
    }
  });
  document.querySelectorAll('.structure-component-description').forEach(e => e.textContent = e.textContent.trim().replace(/\.$/, ''));
  document.querySelectorAll('.metric-block__title .subindex-code').forEach(e => { e.classList.remove('subindex-code'); e.classList.add('component-code'); });
  document.querySelectorAll('table .component-code, table .subindex-code').forEach(e => e.replaceWith(document.createTextNode(e.textContent)));
  document.querySelectorAll('.index-band-chart .db__track').forEach(track => {
    ['−100', '+100'].forEach((text, index) => {
      const edge = document.createElement('span');
      edge.className = 'index-band-zero index-band-edge ' + (index ? 'index-band-edge--end' : 'index-band-edge--start');
      edge.textContent = text;
      edge.setAttribute('aria-hidden', 'true');
      track.append(edge);
    });
    const number = Number(track.querySelector('.db__val').textContent.replace('−', '-').replace(',', '.'));
    const tip = (number <= 19 ? 'Низкий' : number <= 45 ? 'Средний' : 'Высокий') + ' индекс';
    track.querySelectorAll('[data-tip]').forEach(e => e.dataset.tip = tip);
  });
  document.querySelectorAll('.metric-note').forEach(note => {
    if (note.closest('#screen-subA, #screen-subB, #screen-subV')) return;
    const first = note.textContent.split('. ')[0];
    note.textContent = first + '. Позитивный ответ говорит о благополучии, негативный — о трудностях.';
  });
  document.querySelectorAll('.sector-subgroups').forEach(group => {
    if (group.previousElementSibling?.matches('.section-intro')) group.previousElementSibling.remove();
  });
  document.querySelectorAll('.sd-wrap .chart-caveat').forEach(e => e.remove());
  document.querySelectorAll('.standalone-insight .ins-list > li').forEach(li => {
    const first = li.firstElementChild;
    if (first?.matches('strong, b')) first.classList.add('recommendation-title');
    else if (first?.matches('p') && first.firstElementChild?.matches('strong, b')) first.firstElementChild.classList.add('recommendation-title');
  });
  const footers = [
    'Индекс показывает ментальное благополучие группы в целом. Показатели А, Б и В помогают увидеть, какие стороны состояния и жизни оцениваются выше или ниже. Цвет ячейки соответствует значению Индекса. Все результаты взвешены. Для групп меньше 10 человек значения ориентировочные; для групп меньше 5 человек значения не показаны. Сортировка доступна только по столбцу «Индекс».',
    'Какая доля группы попала в каждый сектор карты, %. Цвет ячейки — по сравнению с другими группами в том же столбце. Для «Справляются и остаются» благоприятнее большее значение, для остальных секторов — меньшее. Все результаты взвешены. Для групп меньше 10 человек значения ориентировочные; для групп меньше 5 человек значения не показаны.',
    'Доли группы, %: за последние 12 месяцев обращались к психологу, принимали успокоительные; считают усилия работодателя достаточными или недостаточными. Цвет ячейки — по сравнению с другими группами в том же столбце. Для «Психолог» и «Работодатель: достаточно» благоприятнее большее значение, для остальных показателей — меньшее. Все результаты взвешены. Для групп меньше 10 человек значения ориентировочные; для групп меньше 5 человек значения не показаны.',
    'Таблица показывает долю участников каждой группы, оценивших навык на 0–4 балла. Чем выше процент, тем чаще навык получал низкую оценку. Все результаты взвешены. Для групп меньше 10 человек значения ориентировочные; для групп меньше 5 человек значения не показаны.'
  ];
  document.querySelectorAll('.slice-panel').forEach(panel => {
    panel.querySelectorAll('.analytics-table-footer .analytics-table-note').forEach((note,index) => { if (footers[index]) note.textContent = footers[index]; });
    panel.querySelectorAll('.analytics-table-title, .analytics-table-divider').forEach((title,index) => {
      let head = title.matches('.analytics-table-divider') ? title : title.parentElement;
      if (head === title) head.classList.add('analytics-table-head');
      if (!head.matches('.analytics-table-head')) {
        head = document.createElement('div');
        head.className = 'analytics-table-head';
        title.before(head);
        head.append(title);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'section-detail-link';
      button.textContent = 'Подробнее о разделе →';
      button.addEventListener('click', () => {
        go('home');
        requestAnimationFrame(() => {
          const sections = document.querySelectorAll('#screen-home .home > .dashboard-section');
          sections[[1,2,3,4][index]]?.scrollIntoView({behavior:'instant', block:'start'});
        });
      });
      head.append(button);
    });
  });
  document.querySelectorAll('.analytics-card thead .th-sort').forEach(e => {
    if (e.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === 'к психологу') e.textContent = 'Психолог';
  });
})();

/* Complete chart motion without changing values or geometry. */
(() => {
  document.querySelectorAll('.sd-wrap .section-eyebrow').forEach(e => {
    if (e.textContent.trim() === 'Подгруппы сектора') e.remove();
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.2,.7,.3,1)';
  const svgNS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.seg-donut, .risk-status-donut').forEach(ring => {
    const percent = Math.max(0, Math.min(100, parseFloat(ring.style.getPropertyValue('--p') || getComputedStyle(ring).getPropertyValue('--p')) || 0));
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    ['#DCE3F1', 'var(--c, #98A0AE)'].forEach((color, index) => {
      const circle = document.createElementNS(svgNS, 'circle');
      for (const [key, value] of Object.entries({cx:12, cy:12, r:10, fill:'none', stroke:color, 'stroke-width':3.5, pathLength:100})) circle.setAttribute(key, value);
      if (index) {
        circle.classList.add('v3-ring-fill');
        circle.setAttribute('stroke-dasharray', '100 100');
        circle.setAttribute('stroke-dashoffset', 100 - percent);
        circle.setAttribute('transform', 'rotate(-90 12 12)');
      }
      svg.append(circle);
    });
    ring.classList.add('v3-ring');
    ring.replaceChildren(svg);
  });
  const targets = document.querySelectorAll('.v3-ring, .waffle, .index-scale-chart, .index-band-chart, .stack');
  function play(target) {
    if (reduce.matches) return;
    target.dataset.motionPlayed = 'true';
    const timing = {duration:1000, easing, fill:'both'};
    if (target.matches('.v3-ring')) {
      const fill = target.querySelector('.v3-ring-fill');
      const animation = fill.animate([{strokeDashoffset:'100'}, {strokeDashoffset:fill.getAttribute('stroke-dashoffset')}], timing);
      target.classList.remove('motion-pending');
      animation.onfinish = () => animation.cancel();
    } else if (target.matches('.waffle')) {
      target.querySelectorAll('i.on').forEach((dot, i) => { const animation = dot.animate([{opacity:.12, transform:'scale(.65)'},{opacity:1, transform:'scale(1)'}], {duration:450,delay:i * 18,easing,fill:'both'}); animation.onfinish = () => animation.cancel(); });
      target.classList.remove('motion-pending');
    } else if (target.matches('.index-band-chart')) {
      target.classList.add('v3-motion-playing');
      target.querySelectorAll('.db__dot, .db__val').forEach(e => e.animate([{opacity:0},{opacity:1}], timing));
    } else if (target.matches('.index-scale-chart')) {
      target.querySelectorAll('.scale-bar, .scale-marker, .scale-value-label').forEach(e => e.animate([{opacity:.15},{opacity:1}], timing));
    } else if (target.matches('.stack')) {
      target.classList.add('is-drawn');
    }
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    play(entry.target);
    observer.unobserve(entry.target);
  }), {threshold:0, rootMargin:'0px 0px -10% 0px'}) : null;
  targets.forEach(e => {
    if (!reduce.matches && observer && e.matches('.v3-ring, .waffle')) e.classList.add('motion-pending');
    if (observer) observer.observe(e); else play(e);
  });
  reduce.addEventListener('change', () => {
    if (reduce.matches) targets.forEach(e => {
      e.getAnimations({subtree:true}).forEach(a => a.finish());
      e.classList.remove('motion-pending', 'v3-motion-playing');
      if (e.matches('.stack')) e.classList.add('is-drawn');
    });
  });
})();

/* Mobile answer charts fill the available width as a single 100% band. */
(() => {
  document.querySelectorAll('.likert__track').forEach(track => {
    const segments = [...track.querySelectorAll('.likert__seg')];
    const widths = segments.map(e => parseFloat(e.style.width) || 0);
    const total = widths.reduce((a,b) => a+b, 0);
    let start = 0;
    segments.forEach((segment,index) => {
      const width = total ? widths[index] / total * 100 : 0;
      segment.style.setProperty('--mobile-left', start + '%');
      segment.style.setProperty('--mobile-width', width + '%');
      segment.classList.toggle('mobile-small-segment', width < 8);
      start += width;
    });
  });
  document.querySelectorAll('.chart-table').forEach(table => {
    const labels = [...table.querySelectorAll('thead th')].map(e => e.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => {
      [...row.cells].forEach((cell,index) => {
        if (cell.tagName === 'TD') cell.dataset.mobileLabel = labels[index] || '';
      });
    });
  });
})();
