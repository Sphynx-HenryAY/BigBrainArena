import { el, starRating } from "../core/utils.js";
import { store } from "../core/store.js";
import { sound } from "../core/audio.js";

export function renderPlay(root, game) {
  let cleanup = null;
  let active = false;
  let finished = false;
  let destroyed = false;
  let stage = null;

  const back = el("a", { class: "back-link", href: "#/" }, "← 返回大廳");
  back.addEventListener("click", (event) => {
    if (active && !window.confirm("要結束這次訓練嗎？")) {
      event.preventDefault();
    }
  });

  const best = store.getRecord(game.id)?.best || 0;
  const headBest = el("strong", { text: best ? String(best) : "—" });
  const head = el(
    "div",
    { class: "play-head" },
    back,
    el(
      "div",
      { class: "play-heading" },
      el("div", { class: "play-game-icon", "aria-hidden": "true", text: game.icon }),
      el(
        "div",
        {},
        el("h1", { text: game.title }),
        el("p", {
          text: [game.category, game.duration ? `約 ${game.duration} 秒` : null]
            .filter(Boolean)
            .join(" · "),
        })
      )
    ),
    el("div", { class: "play-best" }, "最佳 ", headBest, " 分")
  );
  head.style.setProperty("--game-color", game.color);
  stage = el("section", { class: "play-stage" });

  root.replaceChildren(head, stage);
  showIntro();

  function showIntro() {
    active = false;
    finished = false;

    const bestLine = el(
      "div",
      { class: "intro-best" },
      best ? ["目前最佳 ", el("strong", { text: String(best) }), " 分"] : "第一次挑戰，放輕鬆開始吧！"
    );

    const startButton = el(
      "button",
      { class: "btn btn-primary btn-lg btn-block", type: "button" },
      "開始訓練"
    );
    startButton.addEventListener("click", () => {
      sound.unlock();
      startGame();
    });

    const howTo = game.howTo && game.howTo.length ? game.howTo : ["依照畫面指示完成訓練"];

    const intro = el(
      "div",
      { class: "intro-card" },
      el(
        "div",
        { class: "intro-top" },
        el("div", { class: "intro-icon", "aria-hidden": "true", text: game.icon }),
        el("h2", { text: game.title }),
        el("p", { text: game.description }),
        el(
          "div",
          { class: "meta-row" },
          el("span", { class: "meta-chip", text: game.category }),
          game.duration
            ? el("span", { class: "meta-chip", text: `約 ${game.duration} 秒` })
            : null,
          el("span", { class: "meta-chip", text: "分數 0–1000" })
        )
      ),
      el(
        "div",
        { class: "howto" },
        el("h3", { text: "玩法" }),
        el("ol", {}, ...howTo.map((line) => el("li", { text: line })))
      ),
      el("div", { class: "start-row" }, startButton, bestLine)
    );
    intro.style.setProperty("--game-color", game.color);
    stage.replaceChildren(intro);
  }

  function startGame() {
    stopGame();
    finished = false;
    active = true;
    const container = el("div");
    stage.replaceChildren(container);

    const api = {
      game,
      get best() {
        return store.getRecord(game.id)?.best || 0;
      },
      finish(result) {
        handleFinish(result || {});
      },
    };

    try {
      const maybeCleanup = game.mount(container, api);
      cleanup = typeof maybeCleanup === "function" ? maybeCleanup : null;
    } catch (error) {
      console.error(`遊戲「${game.id}」載入失敗：`, error);
      active = false;
      stage.replaceChildren(
        el(
          "div",
          { class: "intro-card" },
          el(
            "div",
            { class: "stage-message" },
            el("h3", { text: "遊戲載入失敗" }),
            el("p", { text: "請重新整理頁面，或回到大廳選擇其他訓練。" }),
            el("a", { class: "btn btn-ghost", href: "#/" }, "返回大廳")
          )
        )
      );
    }
  }

  function stopGame() {
    if (cleanup) {
      try {
        cleanup();
      } catch (error) {
        console.warn(error);
      }
      cleanup = null;
    }
  }

  function handleFinish(result) {
    if (finished || destroyed) return;
    finished = true;
    active = false;
    stopGame();
    const outcome = store.recordResult(game.id, result);
    headBest.textContent = String(outcome.best);
    showResult(result, outcome);
    sound.finish();
  }

  function showResult(result, outcome) {
    const stars = starRating(outcome.score);
    const details = Array.isArray(result.details) ? result.details : [];
    const delta = outcome.powerDelta;

    const replay = el("button", { class: "btn btn-primary", type: "button" }, "再玩一次");
    replay.addEventListener("click", () => startGame());

    const card = el(
      "div",
      { class: "result-card" },
      outcome.isRecord && outcome.score > 0
        ? el("div", { class: "result-badge" }, "🏆 新紀錄！")
        : null,
      el(
        "div",
        { class: "stars", "aria-label": `獲得 ${stars} 顆星` },
        ...[0, 1, 2].map((index) =>
          el("span", {
            class: `star${index < stars ? " on" : ""}`,
            "aria-hidden": "true",
            text: "★",
          })
        )
      ),
      el(
        "div",
        { class: "score-line" },
        el("span", { class: "score-number", text: String(outcome.score) }),
        el("span", { class: "score-max", text: "/ 1000" })
      ),
      el("p", {
        class: "result-summary",
        text: result.summary || "訓練完成，做得很好！",
      }),
      el(
        "div",
        { class: "result-details" },
        ...details.map((detail) =>
          el(
            "div",
            { class: "detail-row" },
            el("span", { text: detail.label }),
            el("strong", { text: String(detail.value) })
          )
        ),
        el(
          "div",
          { class: "detail-row" },
          el("span", { text: "最佳紀錄" }),
          el("strong", { text: `${outcome.best} 分` })
        )
      ),
      el(
        "div",
        { class: "result-power" },
        "腦力總分 ",
        el("strong", { text: `${outcome.power} / 1000` }),
        delta > 0 ? `（+${delta}）` : ""
      ),
      el(
        "div",
        { class: "result-actions" },
        replay,
        el("a", { class: "btn btn-ghost", href: "#/" }, "返回大廳"),
        el("a", { class: "btn btn-ghost", href: "#/stats" }, "查看成績")
      )
    );
    card.style.setProperty("--game-color", game.color);
    stage.replaceChildren(card);
  }

  return () => {
    destroyed = true;
    active = false;
    stopGame();
  };
}
