/* ============================================================
   ЛИД-ФОРМЫ

   ⚠️ ДЕМО. Форма ничего никуда не отправляет и нигде не хранит:
   приёмник (Apps Script → Google Sheets, ТЗ §6.2) не на нашей
   стороне. Валидация, состояние отправки и экран благодарности
   работают по-настоящему — чтобы включить приём, достаточно
   дописать fetch в send(). Пока этого нет, в модалке видна
   пометка, что данные не уходят: посетитель не должен думать,
   что он подписался.

   ⚠️ Публиковать формы нельзя, пока юрист не даст текст политики
   (privacy.html) — ТЗ §6.1.

   Схема полей — конфиг, а не вёрстка (ТЗ §6.1). Добавить поле =
   добавить объект в массив; HTML и CSS не трогаются.
   ============================================================ */
(function leadForms() {
  const NBSP = " ";

  /* ------------------------------------------------------------
     Стартовый набор полей — заглушка из дока 2. Продажи и CRM
     свой список ещё не прислали (ТЗ §6.1).
     ------------------------------------------------------------ */
  const NAME = { name: "name", label: "Имя", type: "text", required: true, autocomplete: "name" };
  const EMAIL = { name: "email", label: "Рабочая почта", type: "email", required: true, autocomplete: "email" };
  const COMPANY = { name: "company", label: "Компания", type: "text", required: true, autocomplete: "organization" };
  const ROLE = {
    name: "role",
    label: "Роль",
    type: "select",
    required: true,
    options: ["GR/PR", "HR/HRD", "Бизнес", "Другое"],
  };

  const FIELDS = {
    report: [NAME, EMAIL, COMPANY, ROLE],
    team_index: [
      NAME,
      EMAIL,
      COMPANY,
      { name: "industry", label: "Отрасль", type: "text", required: true },
      {
        name: "team_size",
        label: "Размер команды",
        type: "select",
        required: true,
        options: ["до 50", "50–200", "200–1000", "больше 1000"],
      },
    ],
    index_2027: [
      NAME,
      EMAIL,
      COMPANY,
      ROLE,
      { name: "site", label: "Сайт компании", type: "text", required: false, hint: "необязательно" },
    ],
  };

  /* Тексты модалки под каждую цель. */
  const GOALS = {
    report: {
      eyebrow: "Доклад",
      title: `Заберите доклад${NBSP}целиком`,
      lead: `Исследование ФОМ и${NBSP}Просебя: методика Индекса, три${NBSP}состояния и${NBSP}что${NBSP}с${NBSP}ними делать.`,
      submit: "Получить доклад",
      thanksTitle: `Доклад${NBSP}— ваш`,
      thanksText: `Ссылку продублировали на${NBSP}почту.`,
    },
    team_index: {
      eyebrow: "Индекс команды",
      title: `Посчитать индекс своей${NBSP}команды`,
      lead: `Расскажем, как${NBSP}устроен замер, сколько занимает и${NBSP}что${NBSP}вы${NBSP}получите на${NBSP}выходе.`,
      submit: "Отправить запрос",
      thanksTitle: "Запрос принят",
      thanksText: `Свяжемся в${NBSP}течение двух рабочих дней.`,
    },
    index_2027: {
      eyebrow: "Индекс 2027",
      title: `Участвовать в${NBSP}Индексе${NBSP}2027`,
      lead: `Новая волна исследования. Расскажем про${NBSP}условия участия и${NBSP}сроки.`,
      submit: "Оставить заявку",
      thanksTitle: "Заявка принята",
      thanksText: `Напишем, когда откроем набор участников.`,
    },
  };

  const triggers = document.querySelectorAll("[data-lead]");
  if (!triggers.length) return;

  /* ------------------------------------------------------------
     Разметка модалки. Собирается один раз, контент переписывается
     при каждом открытии.
     ------------------------------------------------------------ */
  const modal = document.createElement("dialog");
  modal.className = "lead";
  modal.innerHTML = `
    <div class="lead__panel">
      <button class="lead__close" type="button" aria-label="Закрыть">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>

      <form class="lead__form" novalidate>
        <p class="lead__eyebrow t-label-s"></p>
        <h2 class="lead__title t-display-s"></h2>
        <p class="lead__lead t-body-m t-secondary"></p>

        <div class="lead__fields"></div>

        <label class="lead__consent">
          <input class="lead__checkbox" type="checkbox" name="consent" required>
          <span class="t-body-s t-secondary">Согласен на${NBSP}обработку персональных данных&nbsp;— <a href="privacy.html">политика</a></span>
        </label>
        <p class="lead__error lead__error--consent" hidden></p>

        <button class="btn btn--primary lead__submit" type="submit"></button>

        <p class="lead__demo t-body-s">
          Демо-форма: данные никуда не${NBSP}отправляются и${NBSP}не${NBSP}сохраняются.
        </p>
      </form>

      <div class="lead__thanks" hidden>
        <p class="lead__eyebrow t-label-s">Готово</p>
        <h2 class="lead__title t-display-s"></h2>
        <p class="lead__lead t-body-m t-secondary"></p>
        <div class="lead__thanks-actions">
          <span class="pending">Ссылка на${NBSP}PDF появится, когда доклад будет свёрстан</span>
          <a class="btn btn--secondary" href="dashboard.html" target="_blank" rel="noopener">Открыть демо дашборда</a>
        </div>
        <p class="lead__demo t-body-s">
          Демо-форма: письмо не${NBSP}уходит, контакт нигде не${NBSP}сохранён.
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const panel = modal.querySelector(".lead__panel");
  const form = modal.querySelector(".lead__form");
  const fieldsBox = modal.querySelector(".lead__fields");
  const consentBox = modal.querySelector(".lead__checkbox");
  const consentError = modal.querySelector(".lead__error--consent");
  const thanks = modal.querySelector(".lead__thanks");
  let lastTrigger = null;

  const field = (f) => {
    const id = `lead-${f.name}`;
    const control =
      f.type === "select"
        ? `<select class="lead__control" id="${id}" name="${f.name}"${f.required ? " required" : ""}>
             <option value="" selected disabled>Выберите</option>
             ${f.options.map((o) => `<option>${o}</option>`).join("")}
           </select>`
        : `<input class="lead__control" id="${id}" type="${f.type}" name="${f.name}"${
            f.required ? " required" : ""
          }${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ""}>`;

    return `<div class="lead__field" data-field="${f.name}">
      <label class="lead__label t-label-s" for="${id}">${f.label}${
        f.hint ? ` <span class="lead__hint">${f.hint}</span>` : ""
      }</label>
      ${control}
      <p class="lead__error" hidden></p>
    </div>`;
  };

  const fill = (goal) => {
    const copy = GOALS[goal] || GOALS.report;
    const list = FIELDS[goal] || FIELDS.report;

    form.hidden = false;
    thanks.hidden = true;
    form.reset();
    form.dataset.goal = goal;
    form.querySelector(".lead__eyebrow").textContent = copy.eyebrow;
    form.querySelector(".lead__title").textContent = copy.title;
    form.querySelector(".lead__lead").textContent = copy.lead;
    form.querySelector(".lead__submit").textContent = copy.submit;
    fieldsBox.innerHTML = list.map(field).join("");
    clearErrors();
  };

  function clearErrors() {
    modal.querySelectorAll(".lead__field").forEach((f) => f.classList.remove("is-invalid"));
    modal.querySelectorAll(".lead__error").forEach((e) => {
      e.hidden = true;
      e.textContent = "";
    });
    consentBox.closest(".lead__consent").classList.remove("is-invalid");
  }

  function setError(control, message) {
    const wrap = control.closest(".lead__field");
    wrap.classList.add("is-invalid");
    const box = wrap.querySelector(".lead__error");
    box.textContent = message;
    box.hidden = false;
  }

  /* Свои сообщения вместо браузерных: они приходят на языке
     интерфейса браузера, а не страницы. */
  function validate() {
    clearErrors();
    let firstBad = null;

    form.querySelectorAll(".lead__control").forEach((control) => {
      const value = control.value.trim();
      if (control.required && !value) {
        setError(control, "Заполните поле");
      } else if (control.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        setError(control, "Проверьте адрес почты");
      } else {
        return;
      }
      if (!firstBad) firstBad = control;
    });

    if (!consentBox.checked) {
      consentBox.closest(".lead__consent").classList.add("is-invalid");
      consentError.textContent = "Без согласия мы не можем принять контакт";
      consentError.hidden = false;
      if (!firstBad) firstBad = consentBox;
    }

    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* Здесь появится отправка в приёмник. Пока — только пауза,
     чтобы состояние кнопки было видно. */
  function send() {
    return new Promise((resolve) => setTimeout(resolve, 600));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const submit = form.querySelector(".lead__submit");
    submit.disabled = true;
    submit.dataset.label = submit.textContent;
    submit.textContent = "Отправляем…";

    await send();

    const copy = GOALS[form.dataset.goal] || GOALS.report;
    thanks.querySelector(".lead__title").textContent = copy.thanksTitle;
    thanks.querySelector(".lead__lead").textContent = copy.thanksText;
    form.hidden = true;
    thanks.hidden = false;
    submit.disabled = false;
    submit.textContent = submit.dataset.label;
    thanks.querySelector(".btn").focus();
  });

  const open = (goal, trigger) => {
    lastTrigger = trigger;
    fill(goal);
    modal.showModal();
  };

  const close = () => {
    modal.close();
  };

  triggers.forEach((btn) => {
    btn.addEventListener("click", () => open(btn.dataset.lead, btn));
  });

  modal.querySelector(".lead__close").addEventListener("click", close);

  /* Escape у showModal() работает сам, но в проекте уже есть
     глобальный обработчик Escape (мобильное меню) — дублируем
     явно, чтобы поведение не зависело от порядка слушателей. */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.open) close();
  });

  /* Клик мимо панели закрывает: у dialog сам ::backdrop не ловит
     события, поэтому ловим на самом элементе и отсекаем клики
     внутри панели. */
  modal.addEventListener("click", (e) => {
    if (!panel.contains(e.target)) close();
  });

  modal.addEventListener("close", () => {
    if (lastTrigger) lastTrigger.focus();
    lastTrigger = null;
  });
})();
