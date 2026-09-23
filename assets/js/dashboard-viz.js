/* ============================================================
   ДАШБОРД — графики
   Источник данных у каждого графика — <table> внутри
   <figure class="viz">. Скрипт читает таблицу и рисует рядом
   HTML-график в процентных координатах. Таблица остаётся:
   это текстовый двойник для скринридера и режим «Таблица».
   Если скрипт не загрузился — видна таблица, данные не теряются.

   Формы:
     data-viz="scale"   — строки на шкале Индекса −100…+100
                          с зонами; ряды — столбцы таблицы
     data-viz="likert"  — доли ответов от центральной оси:
                          столбцы «плохо / затруднились / хорошо»
     data-viz="stack"   — одна диверджентная полоса из нескольких
                          градаций (сводная шкала)

   Ряды описываются на <th> заголовка таблицы:
     data-mark="accent|muted|neg|mid|pos|neu"  — цвет (токен)
     data-hollow                               — полый маркер
                                                 (контекст, Россия)
     data-focus                                — подпись значения
                                                 жирнее: ряд, ради
                                                 которого график
   ============================================================ */
(function dashboardViz() {
  const NBSP = " ";
  const MINUS = "−";

  /* Пороги зон Индекса — те же, что в подписях шкалы на главной:
     «Низкий ≤ 19 · Средний 20–45 · Высокий > 45». */
  const ZONES = [
    { from: -100, to: 19, cls: "neg", name: "Низкий", range: "≤" + NBSP + "19" },
    { from: 19, to: 45, cls: "mid", name: "Средний", range: "20–45" },
    { from: 45, to: 100, cls: "pos", name: "Высокий", range: ">" + NBSP + "45" },
  ];
  const TICKS = [-100, -50, 0, 50, 100];

  /* ---------- числа ---------- */
  // «−19,4», «17.1», «+5», «44 %» → число
  const parse = (s) => {
    const t = String(s).replace(/[\s %+]/g, "").replace(MINUS, "-").replace(",", ".");
    return t === "" ? NaN : parseFloat(t);
  };
  // сколько знаков после запятой в исходной записи — точность источника
  const decimals = (s) => {
    const m = String(s).match(/[.,](\d+)/);
    return m ? m[1].length : 0;
  };
  // по-русски: запятая, настоящий минус, знак «+» у положительных
  // значений шкалы, неразрывный пробел перед %
  const fmt = (v, { dec = 0, sign = false, pct = false } = {}) => {
    let s = Math.abs(v).toFixed(dec).replace(".", ",");
    if (v < 0 && Number(s.replace(",", ".")) !== 0) s = MINUS + s;
    else if (sign && v > 0) s = "+" + s;
    return pct ? s + NBSP + "%" : s;
  };
  const pos = (v) => ((v + 100) / 200) * 100; // −100…+100 → 0…100 %

  /* ---------- чтение таблицы ---------- */
  function readTable(table) {
    const head = Array.from(table.tHead.rows[0].cells).slice(1);
    const series = head.map((th) => ({
      name: th.textContent.trim(),
      mark: th.dataset.mark || "accent",
      hollow: th.hasAttribute("data-hollow"),
      focus: th.hasAttribute("data-focus"),
    }));
    const rows = Array.from(table.tBodies[0].rows).map((tr) => {
      const [th, ...tds] = tr.cells;
      return {
        label: th.textContent.trim(),
        values: tds.map((td) => {
          const raw = td.textContent.trim();
          return { raw, v: parse(raw), dec: decimals(raw) };
        }),
      };
    });
    return { series, rows };
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ---------- 1. шкала Индекса ---------- */
  // фон дорожки: зоны + линии делений + ось нуля, одним градиентом
  function trackBackground() {
    const layers = [];
    TICKS.slice(1, -1).forEach((t) => {
      const p = pos(t);
      const c = t === 0 ? "var(--viz-axis)" : "var(--viz-grid)";
      layers.push(`linear-gradient(90deg, transparent calc(${p}% - .5px), ${c} calc(${p}% - .5px), ${c} calc(${p}% + .5px), transparent calc(${p}% + .5px))`);
    });
    const stops = ZONES.map((z) => `var(--viz-${z.cls}-surface) ${pos(z.from)}% ${pos(z.to)}%`).join(", ");
    layers.push(`linear-gradient(90deg, ${stops})`);
    return layers.join(", ");
  }

  function renderScale(fig, data) {
    const plot = el("div", "viz__plot viz-scale");
    plot.setAttribute("role", "group");
    fig.style.setProperty("--track-bg", trackBackground());

    let row = 1;
    const axis = el("div", "viz-scale__axis");
    axis.setAttribute("aria-hidden", "true");
    axis.style.gridRow = row++;
    TICKS.forEach((t) => {
      const tick = el("span", "viz-scale__tick", fmt(t, { sign: true }));
      tick.style.left = pos(t) + "%";
      axis.append(tick);
    });
    plot.append(axis);

    data.rows.forEach((r) => {
      const label = el("div", "viz-row__label", r.label);
      label.style.gridRow = row;
      const track = el("div", "viz-row__track");
      track.style.gridRow = row++;
      track.tabIndex = 0;

      const present = r.values
        .map((val, i) => ({ ...val, s: data.series[i] }))
        .filter((x) => !Number.isNaN(x.v));
      const text = present.map((x) => `${x.s.name} ${fmt(x.v, { dec: x.dec, sign: true })}`).join(", ");
      track.setAttribute("aria-label", `${r.label}: ${text}`);
      track.dataset.tipTitle = r.label;
      track.dataset.tip = JSON.stringify(
        present.map((x) => ({ name: x.s.name, mark: x.s.mark, value: fmt(x.v, { dec: x.dec, sign: true }) }))
      );

      // связка = разрыв между рядами
      if (present.length === 2) {
        const [a, b] = present.map((x) => pos(x.v)).sort((m, n) => m - n);
        const link = el("span", "viz-link");
        link.style.left = a + "%";
        link.style.width = b - a + "%";
        track.append(link);
      }

      // подписи — снаружи связки: левая точка подписана слева, правая справа
      const ordered = [...present].sort((m, n) => m.v - n.v);
      ordered.forEach((x, i) => {
        const dot = el("span", `viz-dot mark--${x.s.mark}${x.s.hollow ? " viz-dot--hollow" : ""}`);
        dot.style.left = pos(x.v) + "%";
        track.append(dot);

        let side = ordered.length === 1 ? "right" : i === 0 ? "left" : "right";
        if (side === "left" && pos(x.v) < 7) side = "right";
        if (side === "right" && pos(x.v) > 93) side = "left";
        const val = el("span", `viz-val viz-val--${side}${x.s.focus ? " viz-val--focus" : ""}`,
          fmt(x.v, { dec: x.dec, sign: true }));
        val.setAttribute("aria-hidden", "true");
        val.style.left = pos(x.v) + "%";
        track.append(val);
      });

      plot.append(label, track);
    });

    if (fig.hasAttribute("data-zones")) {
      const cap = el("div", "viz-scale__zones-caption");
      cap.setAttribute("aria-hidden", "true");
      cap.style.gridRow = row++;
      ZONES.forEach((z) => {
        const c = el("span", "viz-zone-cap");
        c.style.left = (pos(z.from) + pos(z.to)) / 2 + "%";
        c.append(el("b", null, z.name), document.createTextNode(z.range));
        cap.append(c);
      });
      plot.append(cap);
    }
    return plot;
  }

  /* ---------- 2. доли ответов от центральной оси ----------
     Столбцы: плохо / затруднились / хорошо (в %). «Затруднились»
     делится пополам по обе стороны оси. Домен −100…+100 % —
     одна шкала на все блоки, поэтому полосы сравнимы между
     вопросами и страницами. */
  function renderLikert(fig, data) {
    const plot = el("div", "viz__plot viz-likert");
    plot.setAttribute("role", "group");
    const [sNeg, sNeu, sPos] = data.series;

    let row = 1;
    const axis = el("div", "viz-likert__axis");
    axis.setAttribute("aria-hidden", "true");
    axis.style.gridRow = row++;
    [[-100, "100" + NBSP + "%"], [-50, "50"], [0, "0"], [50, "50"], [100, "100" + NBSP + "%"]].forEach(([v, t]) => {
      const s = el("span", null, t);
      s.style.left = pos(v) + "%";
      if (v === -100) s.style.transform = "none";
      if (v === 100) s.style.transform = "translateX(-100%)";
      axis.append(s);
    });
    plot.append(axis);

    data.rows.forEach((r) => {
      const [neg, neu, good] = r.values.map((x) => (Number.isNaN(x.v) ? 0 : x.v));
      const label = el("div", "viz-row__label", r.label);
      label.style.gridRow = row;
      const track = el("div", "viz-row__track");
      track.style.gridRow = row++;
      track.tabIndex = 0;

      const f = (v) => fmt(v, { pct: true });
      track.setAttribute("aria-label",
        `${r.label}: ${sPos.name} ${f(good)}, ${sNeu.name} ${f(neu)}, ${sNeg.name} ${f(neg)}`);
      track.dataset.tipTitle = r.label;
      track.dataset.tip = JSON.stringify([
        { name: sPos.name, mark: "pos", value: f(good) },
        { name: sNeu.name, mark: "neu", value: f(neu) },
        { name: sNeg.name, mark: "neg", value: f(neg) },
      ]);

      const half = neu / 2;
      const segs = [
        { cls: "neg", from: -half - neg, to: -half },
        { cls: "neu", from: -half, to: half },
        { cls: "pos", from: half, to: half + good },
      ].filter((s) => s.to - s.from > 0.01);
      segs.forEach((s, i) => {
        const seg = el("span", `viz-seg viz-seg--${s.cls} mark--${s.cls}`);
        seg.style.left = pos(s.from) + "%";
        seg.style.width = pos(s.to) - pos(s.from) + "%";
        // скругляем только внешние концы полосы
        if (s.cls === "neu" || (s.cls === "neg" && i !== 0) || (s.cls === "pos" && i !== segs.length - 1)) {
          seg.classList.add("is-inner");
        }
        track.append(seg);
      });

      // подписи снаружи: «плохо» у левого конца, «хорошо» у правого
      if (neg > 0) {
        const v = el("span", "viz-val viz-val--left", f(neg));
        v.style.left = pos(-half - neg) + "%";
        v.setAttribute("aria-hidden", "true");
        track.append(v);
      }
      if (good > 0) {
        const v = el("span", "viz-val viz-val--right", f(good));
        v.style.left = pos(half + good) + "%";
        v.setAttribute("aria-hidden", "true");
        track.append(v);
      }
      plot.append(label, track);
    });
    return plot;
  }

  /* ---------- 3. одна диверджентная полоса из нескольких градаций ----------
     Столбцы идут от самой плохой градации к самой хорошей; тот,
     что с data-mark="neu", — середина, делится пополам по оси.
     Значения — в ключе под полосой, не внутри сегментов. */
  function renderStack(fig, data) {
    const plot = el("div", "viz__plot viz-likert viz-likert--single");
    plot.setAttribute("role", "group");
    const r = data.rows[0];
    const vals = r.values.map((x) => (Number.isNaN(x.v) ? 0 : x.v));
    const iNeu = data.series.findIndex((s) => s.mark === "neu");
    const negSum = vals.slice(0, iNeu).reduce((a, b) => a + b, 0);
    let cursor = -(negSum + vals[iNeu] / 2);
    const f = (v) => fmt(v, { pct: true });

    const track = el("div", "viz-row__track");
    track.style.gridRow = 1;
    track.tabIndex = 0;
    track.setAttribute("aria-label", `${r.label}: ` + data.series.map((s, i) => `${s.name} ${f(vals[i])}`).join(", "));
    track.dataset.tipTitle = r.label;
    track.dataset.tip = JSON.stringify(data.series.map((s, i) => ({ name: s.name, mark: s.mark, value: f(vals[i]) })));

    vals.forEach((v, i) => {
      const s = data.series[i];
      const seg = el("span", `viz-seg mark--${s.mark}`);
      seg.style.left = pos(cursor) + "%";
      seg.style.width = pos(cursor + v) - pos(cursor) + "%";
      if (i === 0) seg.classList.add("viz-seg--neg");
      else if (i === vals.length - 1) seg.classList.add("viz-seg--pos");
      else seg.classList.add("is-inner");
      track.append(seg);
      cursor += v;
    });
    plot.append(track);

    // ключ в том же порядке, что сегменты: от «плохо» к «хорошо»
    const key = el("ul", "viz-key viz-stack-key");
    key.setAttribute("aria-hidden", "true");
    data.series.forEach((s, i) => {
      const li = el("li");
      li.append(el("span", `viz-key__mark viz-key__mark--bar mark--${s.mark}`), el("b", null, f(vals[i])), document.createTextNode(s.name));
      key.append(li);
    });
    plot.append(key);
    return plot;
  }

  /* ---------- сборка фигуры ---------- */
  const RENDER = { scale: renderScale, likert: renderLikert, stack: renderStack };

  function build(fig) {
    const table = fig.querySelector("table.viz__data");
    const render = RENDER[fig.dataset.viz];
    if (!table || !render || fig.dataset.ready) return;
    const data = readTable(table);
    const plot = render(fig, data);
    const title = fig.querySelector(".viz__title");
    if (title) {
      title.id = title.id || "viz-title-" + Math.random().toString(36).slice(2, 8);
      plot.setAttribute("aria-labelledby", title.id);
    }
    table.classList.add("visually-hidden");
    table.before(plot);
    fig.dataset.ready = "1";

    const toggle = fig.querySelector(".viz__table-toggle");
    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener("click", () => {
        const on = !fig.classList.contains("is-table");
        fig.classList.toggle("is-table", on);
        toggle.setAttribute("aria-pressed", String(on));
        if (on) table.classList.remove("visually-hidden");
        else table.classList.add("visually-hidden");
      });
    }
  }

  /* ---------- подсказка: одна на весь дашборд ----------
     Наведение, фокус с клавиатуры, тап. Текст — только через
     textContent. Значение ведёт, название ряда — вторично. */
  const tip = el("div", "viz-tip");
  tip.setAttribute("role", "tooltip");
  tip.id = "viz-tip";
  let current = null;

  function showTip(target) {
    let rows;
    try { rows = JSON.parse(target.dataset.tip); } catch (e) { return; }
    tip.textContent = "";
    tip.append(el("span", "viz-tip__title", target.dataset.tipTitle || ""));
    rows.forEach((r) => {
      const line = el("span", "viz-tip__row");
      const key = el("span", `viz-tip__key mark--${r.mark}`);
      line.append(key, el("span", "viz-tip__val", r.value), el("span", null, r.name));
      tip.append(line);
    });
    const box = target.getBoundingClientRect();
    const x = Math.min(Math.max(box.left + box.width / 2, 150), window.innerWidth - 150);
    tip.style.left = x + "px";
    tip.style.top = box.top + "px";
    tip.classList.add("is-visible");
    target.setAttribute("aria-describedby", tip.id);
    current = target;
  }
  function hideTip() {
    tip.classList.remove("is-visible");
    if (current) current.removeAttribute("aria-describedby");
    current = null;
  }
  const tipTarget = (node) => node && node.closest && node.closest("[data-tip]");

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const t = tipTarget(e.target);
    if (t && t !== current) showTip(t);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.pointerType === "touch") return;
    const t = tipTarget(e.target);
    if (t && !t.contains(e.relatedTarget)) hideTip();
  });
  // тап: показать / спрятать повторным тапом или тапом мимо
  document.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch") return;
    const t = tipTarget(e.target);
    if (t && t !== current) showTip(t);
    else hideTip();
  });
  document.addEventListener("focusin", (e) => { const t = tipTarget(e.target); if (t) showTip(t); });
  document.addEventListener("focusout", (e) => { if (tipTarget(e.target)) hideTip(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true, capture: true });

  function init() {
    document.body.append(tip);
    document.querySelectorAll("figure.viz[data-viz]").forEach(build);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
