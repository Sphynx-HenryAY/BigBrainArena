import { el } from "../core/utils.js";
import { getGames, getCategories } from "../core/registry.js";
import { store } from "../core/store.js";
import { sound } from "../core/audio.js";

function dailyGame(games) {
  const dayNumber = Math.floor(Date.now() / 86400000);
  return games[dayNumber % games.length];
}

function statCard(icon, value, label) {
  return el(
    "div",
    { class: "stat-card" },
    el("span", { class: "stat-icon", "aria-hidden": "true", text: icon }),
    el("div", {}, el("div", { class: "stat-value" }, value), el("div", { class: "stat-label", text: label }))
  );
}

function gameCard(game) {
  const record = store.getRecord(game.id);
  const best = record && record.best ? record.best : 0;
  const card = el("a", { class: "game-card", href: `#/play/${game.id}` });
  card.style.setProperty("--game-color", game.color);

  card.append(
    el("div", { class: "game-icon", "aria-hidden": "true", text: game.icon }),
    el(
      "div",
      { class: "game-body" },
      el("h3", { class: "game-name", text: game.title }),
      el("p", { class: "game-desc", text: game.description }),
      el(
        "div",
        { class: "tags" },
        ...game.tags.map((tag) => el("span", { class: "tag", text: tag }))
      )
    ),
    el(
      "div",
      { class: "game-foot" },
      el(
        "span",
        { class: "game-best" },
        best ? ["最佳 ", el("strong", { text: String(best) }), " 分"] : "尚未訓練"
      ),
      el("span", { class: "game-go", text: "開始 →" })
    )
  );
  return card;
}

export function renderHome(root) {
  const games = getGames();
  const categories = getCategories();
  const power = store.getBrainPower();
  const age = store.getBrainAge();
  const streak = store.getStreak();
  const played = store.getPlayedCount();
  const totalPlays = store.getTotalPlays();
  const todayDone = store.hasPlayedToday();
  const daily = dailyGame(games);
  const percent = Math.max(0, Math.min(100, power / 10));

  const randomButton = el("button", { class: "btn btn-ghost", type: "button" }, "🎲 隨機挑戰");
  randomButton.addEventListener("click", () => {
    sound.unlock();
    const game = games[Math.floor(Math.random() * games.length)];
    window.location.hash = `#/play/${game.id}`;
  });

  const ring = el(
    "div",
    { class: "ring" },
    el(
      "div",
      { class: "ring-inner" },
      el("span", { class: "ring-label", text: "腦年齡" }),
      el(
        "div",
        { class: "ring-age" },
        String(age ?? "—"),
        age ? el("small", { text: "歲" }) : null
      ),
      el("span", { class: "ring-caption", text: `腦力 ${power} / 1000` })
    )
  );
  ring.style.setProperty("--p", `${percent}%`);

  const hero = el(
    "section",
    { class: "hero" },
    el(
      "div",
      { class: "hero-main" },
      el("div", { class: "hero-eyebrow" }, "🧠 每天 5 分鐘，讓大腦保持靈活"),
      el(
        "h1",
        { class: "hero-title" },
        "今天也來",
        el("br"),
        el("span", { class: "grad-text", text: "動動腦吧" })
      ),
      el("p", {
        class: "hero-desc",
        text: `${games.length} 款腦力小遊戲，訓練心算、記憶、反應與專注。完成每日訓練，收集最佳成績，看看你的腦年齡有多年輕。`,
      }),
      el(
        "div",
        { class: "hero-actions" },
        el(
          "a",
          { class: "btn btn-primary btn-lg", href: `#/play/${daily.id}` },
          todayDone ? "再練一次今日訓練" : "開始今日訓練"
        ),
        randomButton
      ),
      el(
        "div",
        { class: "hero-note" },
        el("span", { text: todayDone ? "✅ 今日訓練已完成" : "🎯 今日訓練尚未完成" }),
        el("span", { text: `已解鎖 ${played} / ${games.length} 款訓練` })
      )
    ),
    el("div", { class: "hero-side" }, ring)
  );

  const stats = el(
    "div",
    { class: "stats-row" },
    statCard("🧠", [String(power), el("small", { text: "/ 1000" })], "腦力總分"),
    statCard("🎂", [String(age ?? "—"), age ? el("small", { text: "歲" }) : null], "腦年齡"),
    statCard("🔥", [String(streak), el("small", { text: "天" })], "連續訓練"),
    statCard("🎯", [String(totalPlays), el("small", { text: "次" })], "累計訓練")
  );

  let query = "";
  let category = "全部";

  const grid = el("div", { class: "game-grid" });
  const searchInput = el("input", {
    type: "search",
    placeholder: "搜尋遊戲、分類或標籤…",
    "aria-label": "搜尋遊戲",
  });
  const chips = el("div", { class: "chips" });

  const chipButtons = categories.map((name) => {
    const chip = el("button", {
      class: `chip${name === "全部" ? " active" : ""}`,
      type: "button",
      text: name,
    });
    chip.addEventListener("click", () => {
      category = name;
      chipButtons.forEach((button) => button.classList.toggle("active", button === chip));
      paintGrid();
    });
    chips.append(chip);
    return chip;
  });

  function paintGrid() {
    const needle = query.trim().toLowerCase();
    const filtered = games.filter((game) => {
      const matchesCategory = category === "全部" || game.category === category;
      if (!matchesCategory) return false;
      if (!needle) return true;
      return [game.title, game.description, game.category, ...game.tags]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    grid.replaceChildren(...filtered.map(gameCard));
    if (!filtered.length) {
      grid.append(
        el(
          "div",
          { class: "empty-state" },
          el("strong", { text: "找不到符合的訓練" }),
          "換個關鍵字或分類試試看吧。"
        )
      );
    }
  }

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    paintGrid();
  });
  paintGrid();

  const section = el(
    "section",
    { class: "section" },
    el(
      "div",
      { class: "section-head" },
      el(
        "div",
        {},
        el("h2", { class: "section-title", text: "選擇訓練" }),
        el("p", {
          class: "section-sub",
          text: "每次只需幾十秒，挑一個現在最想鍛鍊的能力。",
        })
      ),
      el("label", { class: "search" }, el("span", { "aria-hidden": "true", text: "🔍" }), searchInput)
    ),
    chips,
    grid
  );

  root.replaceChildren(hero, stats, section);
}
