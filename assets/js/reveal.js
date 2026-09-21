/* ============================================================
   ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ

   Два способа разметки:
     .reveal              — одиночный элемент
     .reveal-group        — контейнер: прямые дети получают
                            .reveal и лесенку задержек сами,
                            вручную ничего проставлять не нужно

   Правило, которое здесь соблюдается: контент никогда не зависит
   от JS, чтобы стать видимым. Прятать что-либо можно только после
   того, как скрипт точно работает и готов показать обратно.

   Поэтому:
   1. Класс .has-reveal ставится скриптом на <html>. Без JS (или
      если файл не загрузился) правило opacity: 0 не применяется
      вовсе и страница видна целиком.
   2. Всё, что уже попало в первый экран, показывается сразу —
      не дожидаясь IntersectionObserver. В фоновой вкладке браузер
      сильно режет частоту кадров, и колбэк observer'а может
      приехать через секунды; первый экран ждать не должен.
   3. Страховка по таймеру: что бы ни случилось, через 3 секунды
      показываем всё.
   ============================================================ */

(function reveal() {
  const STAGGER = 90; // мс между соседями в группе

  // Разворачиваем группы в обычные .reveal с задержками.
  // .reveal-group--cards — тот же механизм, но детям достаётся
  // ещё и карточный вариант анимации.
  document.querySelectorAll(".reveal-group").forEach((group) => {
    const asCards = group.classList.contains("reveal-group--cards");
    Array.from(group.children).forEach((child, i) => {
      child.classList.add("reveal");
      if (asCards) child.classList.add("reveal--card");
      if (i) child.dataset.revealDelay = i * STAGGER;
    });
  });

  const items = Array.from(document.querySelectorAll(".reveal"));
  if (!items.length) return;

  const show = (el) => el.classList.add("is-visible");
  const showWithDelay = (el) => {
    const delay = Number(el.dataset.revealDelay || 0);
    if (delay) setTimeout(() => show(el), delay);
    else show(el);
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach(show);
    return;
  }

  // С этого момента CSS имеет право прятать .reveal
  document.documentElement.classList.add("has-reveal");

  // Первый экран — сразу, без observer'а
  const pending = items.filter((el) => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight) {
      showWithDelay(el);
      return false;
    }
    return true;
  });

  if (pending.length) {
    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          showWithDelay(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    pending.forEach((el) => io.observe(el));
  }

  /* Страховка от застревания.
     Раньше здесь был setTimeout на 3 секунды, показывавший ВСЁ
     разом. Это защищало от невидимого контента, но заодно убивало
     весь эффект: пользователь, задержавшийся на первом экране,
     через три секунды получал страницу, где всё нижнее уже
     проявилось, и при прокрутке не видел ни одной анимации.

     Теперь проверка периодическая и адресная: раз в 2 секунды
     показываем только то, что уже попало на экран, но почему-то
     не проявилось. Остальное продолжает ждать своей очереди. */
  const safety = setInterval(() => {
    const stuck = items.filter(
      (el) =>
        !el.classList.contains("is-visible") &&
        el.getBoundingClientRect().top < window.innerHeight
    );
    stuck.forEach(show);
    if (items.every((el) => el.classList.contains("is-visible"))) {
      clearInterval(safety);
    }
  }, 2000);
})();
