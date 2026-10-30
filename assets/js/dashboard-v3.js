/* Multi-select demographic slices in the combined tables. */
(() => {
  const root = document.getElementById('screen-analytics');
  if (!root) return;
  const chips = root.querySelector('.slice-chips');
  const buttons = [...chips.querySelectorAll('[data-slice]')];
  const choices = buttons.filter(b => b.dataset.slice !== 'all');
  const selected = new Set(['gender']);
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const keys = new Map(choices.map(b => [normalize(b.textContent), b.dataset.slice]));
  const combined = root.querySelector('#slice-all');
  combined.querySelectorAll('tbody').forEach(body => {
    let key = '';
    [...body.rows].forEach(row => {
      const heading = row.querySelector('.analytics-subhead');
      if (heading) key = keys.get(normalize(heading.textContent)) || '';
      if (key) row.dataset.sliceGroup = key;
    });
  });
  const status = document.createElement('p');
  status.className = 'slice-selection-status';
  status.setAttribute('role', 'status');
  chips.after(status);
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Выберите срезы для сравнения');
  function render() {
    buttons.forEach(button => {
      const on = button.dataset.slice === 'all'
        ? selected.size === choices.length
        : selected.has(button.dataset.slice);
      button.classList.toggle('active-slice', on);
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
      button.style.removeProperty('background');
      button.style.removeProperty('color');
    });
    root.querySelectorAll('.slice-panel').forEach(panel => {
      panel.style.display = panel === combined && selected.size ? 'block' : 'none';
    });
    combined.querySelectorAll('[data-slice-group]').forEach(row => {
      row.hidden = !selected.has(row.dataset.sliceGroup);
    });
    status.textContent = selected.size
      ? `Выбрано срезов: ${selected.size} из ${choices.length}`
      : 'Выберите хотя бы один срез, чтобы увидеть результаты.';
  }
  chips.addEventListener('click', event => {
    const button = event.target.closest('[data-slice]');
    if (!button) return;
    const key = button.dataset.slice;
    if (key === 'all') {
      if (selected.size === choices.length) selected.clear();
      else choices.forEach(b => selected.add(b.dataset.slice));
    } else if (selected.has(key)) selected.delete(key);
    else selected.add(key);
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

(() => {
  document.querySelectorAll('section[aria-labelledby="section-skills-title"] .chart-table tbody th').forEach(label => {
    label.removeAttribute('data-tip');
    label.removeAttribute('title');
    label.querySelectorAll('[data-tip], [title]').forEach(child => {
      child.removeAttribute('data-tip');
      child.removeAttribute('title');
    });
  });
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
      const common = 'Все результаты взвешены. Для групп меньше 10 человек значения ориентировочные; для групп меньше 5 человек значения не показаны. Сортировка по заголовку столбца: по убыванию → по возрастанию → исходный порядок.';
      const explanations = [
        'Срез — результаты части опрошенных, например одного пола или возраста. Цвет ячейки соответствует значению Индекса по шкале выше. ',
        'Цвет ячейки — по сравнению с другими группами в том же столбце. Для «Ресурса производительности» благоприятнее большее значение, для остальных секторов — меньшее. ',
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
    const firstNumeric = table.tHead?.rows[0]?.cells[1];
    firstNumeric?.querySelector('.th-sort')?.click();
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
