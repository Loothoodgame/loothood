(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LoothoodRewardChoiceReadability = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const TEXT_SELECTOR = [
    ".hb-card__rarity",
    ".hb-card__name",
    ".hb-card__ingredients",
    ".hb-card__effect",
    ".hb-card__value",
    ".hb-card__button",
    ".upgrade-card__rarity",
    ".upgrade-card__name",
    ".upgrade-card__desc",
    ".upgrade-card__hint",
    ".upgrade-card__confirm",
  ].join(",");

  function evaluateMeasurements(cards) {
    const failures = [];
    for (const card of cards) {
      if (card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1) {
        failures.push({ card: card.key, reason: "card-overflow" });
      }
      for (const text of card.text) {
        if (text.textOverflow === "ellipsis") failures.push({ card: card.key, element: text.element, reason: "ellipsis" });
        if (text.lineClamp && text.lineClamp !== "none" && text.lineClamp !== "auto") {
          failures.push({ card: card.key, element: text.element, reason: "line-clamp" });
        }
        if (text.scrollHeight > text.clientHeight + 1 || text.scrollWidth > text.clientWidth + 1) {
          failures.push({ card: card.key, element: text.element, reason: "text-overflow" });
        }
        if (
          text.rect.left < card.rect.left - 1 ||
          text.rect.right > card.rect.right + 1 ||
          text.rect.top < card.rect.top - 1 ||
          text.rect.bottom > card.rect.bottom + 1
        ) {
          failures.push({ card: card.key, element: text.element, reason: "outside-card" });
        }
      }
    }
    return failures;
  }

  function audit(rootElement) {
    if (!rootElement) return [{ card: "", reason: "missing-root" }];
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.closest("[hidden]") && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const rectValue = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    const cards = [...rootElement.querySelectorAll("[data-reward-card-key], .upgrade-card")]
      .filter(visible)
      .map((card, index) => ({
        key: card.dataset.rewardCardKey || card.dataset.upgradeChoiceKey || String(index),
        rect: rectValue(card),
        scrollHeight: card.scrollHeight,
        clientHeight: card.clientHeight,
        scrollWidth: card.scrollWidth,
        clientWidth: card.clientWidth,
        text: [...card.querySelectorAll(TEXT_SELECTOR)].filter(visible).map((element) => {
          const style = getComputedStyle(element);
          return {
            element: element.className || element.tagName,
            rect: rectValue(element),
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            textOverflow: style.textOverflow,
            lineClamp: style.webkitLineClamp,
          };
        }),
      }));
    return evaluateMeasurements(cards);
  }

  function auditFrame(rootElement) {
    if (!rootElement) return [{ element: "", reason: "missing-root" }];
    const frameRect = rootElement.getBoundingClientRect();
    const selectors = [".hb-reward__title", ".hb-reward__meta span"];
    const failures = [];
    for (const element of rootElement.querySelectorAll(selectors.join(","))) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (element.closest("[hidden]") || style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) continue;
      const key = element.className || element.tagName;
      if (element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) {
        failures.push({ element: key, reason: "text-overflow" });
      }
      if (
        rect.left < frameRect.left - 1 ||
        rect.right > frameRect.right + 1 ||
        rect.top < frameRect.top - 1 ||
        rect.bottom > frameRect.bottom + 1
      ) {
        failures.push({ element: key, reason: "outside-reward-frame" });
      }
    }
    return failures;
  }

  return Object.freeze({ TEXT_SELECTOR, evaluateMeasurements, audit, auditFrame });
});
