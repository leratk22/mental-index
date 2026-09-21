/* ============================================================
   ОБЩЕЕ ПОВЕДЕНИЕ СТРАНИЦ
   Липкая шапка, мобильное меню. Всё, что не относится
   к анимациям (reveal.js) и дашборду (dashboard.js).
   ============================================================ */

/* ------------------------------------------------------------
   ПОЛУКРУГЛЫЕ ШКАЛЫ

   Заполнение дуги задано прямо в разметке (--dash), чтобы шкала
   была верной и без JS. Но цифры правятся в content.js, и если
   там поменяют 80% на 74%, дуга без пересчёта останется старой
   и будет молча врать. Поэтому пересчитываем её из того числа,
   которое реально отрисовано.

   Скрипт подключён после content.js — значения к этому моменту
   уже подставлены.
   ------------------------------------------------------------ */
(function gauges() {
  const ARC = 263.894; // длина полудуги при радиусе 84

  document.querySelectorAll(".gauge").forEach((gauge) => {
    const valueEl = gauge.querySelector(".gauge__value");
    const fill = gauge.querySelector(".gauge__fill");
    if (!valueEl || !fill) return;

    const percent = parseFloat(valueEl.textContent.replace(",", "."));
    if (!Number.isFinite(percent)) return;

    const clamped = Math.min(Math.max(percent, 0), 100);
    fill.style.setProperty("--dash", ((ARC * clamped) / 100).toFixed(2));

    // дублируем значение для скринридера: сама svg скрыта
    gauge.setAttribute("role", "img");
    gauge.setAttribute(
      "aria-label",
      `${valueEl.textContent} — ${(gauge.querySelector(".gauge__label")?.textContent || "").trim()}`.trim()
    );
  });
})();

(function header() {
  const el = document.querySelector(".header");
  if (!el) return;

  /* Тонкая граница у шапки появляется, только когда под ней
     есть прокрученный контент — на самом верху шапка «плавает». */
  const onScroll = () => el.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = el.querySelector(".header__burger");
  const menu = el.querySelector(".header__mobile");
  if (!burger || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle("is-open", open);
    /* Пока меню открыто, шапка обязана выглядеть «плотной».
       На главной она прозрачная поверх фотографии и красит текст
       в белый — на белой панели меню надпись логотипа ФОМ
       пропадала полностью. */
    el.classList.toggle("is-menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
  };

  burger.addEventListener("click", () => {
    setOpen(!menu.classList.contains("is-open"));
  });

  // Клик по пункту меню — закрыть
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
})();
