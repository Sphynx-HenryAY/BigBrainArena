import { el, formatDateTime, toast } from "../core/utils.js";
import { getGames } from "../core/registry.js";
import { store } from "../core/store.js";

function summaryCard(label, value, suffix, note) {
  return el(
    "div",
    { class: "summary-card" },
    el("div", { class: "summary-label", text: label }),
    el(
      "div",
      { class: "summary-value" },
      value,
      suffix ? el("small", { text: ` ${suffix}` }) : null
    ),
    el("div", { class: "summary-note", text: note })
  );
}

export function renderStats(root) {
  function paint() {
    const games = getGames();
    const power = store.getBrainPower();
    const age = store.getBrainAge();
    const streak = store.getStreak();
    const played = store.getPlayedCount();
    const totalPlays = store.getTotalPlays();

    const head = el(
      "div",
      { class: "page-head" },
      el("a", { class: "back-link", href: "#/" }, "← 返回大廳"),
      el("h1", { text: "我的成績" }),
      el("p", {
        text: "所有訓練紀錄都儲存在這個瀏覽器中。持續訓練，腦力總分會越來越接近 1000。",
      })
    );

    const summary = el(
      "div",
      { class: "summary-grid" },
      summaryCard("腦力總分", String(power), "/ 1000", `已訓練 ${played} / ${games.length} 款`),
      summaryCard("腦年齡", String(age ?? "—"), age ? "歲" : "", age ? "分數越高，腦年齡越年輕" : "完成一次訓練即可計算"),
      summaryCard("連續訓練", String(streak), "天", streak ? "保持每天動動腦" : "今天開始建立習慣"),
      summaryCard("累計訓練", String(totalPlays), "次", "每一次練習都算數")
    );

    const rows = games.map((game) => {
      const record = store.getRecord(game.id);
      const best = record?.best || 0;
      const plays = record?.plays || 0;
      const row = el("div", { class: "record-row" });
      row.style.setProperty("--record-color", game.color);

      const fill = el("div", { class: "record-fill" });
      fill.style.width = `${Math.max(best ? 2 : 0, (best / 1000) * 100)}%`;

      row.append(
        el(
          "div",
          { class: "record-main" },
          el("div", { class: "record-icon", "aria-hidden": "true", text: game.icon }),
          el(
            "div",
            {},
            el("div", { class: "record-name", text: game.title }),
            el("div", {
              class: "record-meta",
              text: `${game.category} · ${plays ? `訓練 ${plays} 次 · 最近 ${formatDateTime(record.lastPlayed)}` : "尚未訓練"}`,
            })
          )
        ),
        el("div", { class: "record-bar" }, fill),
        el(
          "div",
          { class: "record-score" },
          el("strong", { text: String(best) }),
          " / 1000"
        ),
        el("a", { class: "record-action", href: `#/play/${game.id}` }, plays ? "再練" : "開始")
      );
      return row;
    });

    const panel = el(
      "section",
      { class: "records-panel" },
      el(
        "div",
        { class: "records-head" },
        el("h2", { text: "各項訓練紀錄" }),
        el("span", { text: "最佳分數" })
      ),
      ...rows
    );

    const nodes = [head, summary, panel];

    if (played > 0) {
      const resetButton = el("button", { class: "btn btn-danger", type: "button" }, "清除所有紀錄");
      resetButton.addEventListener("click", () => {
        if (!window.confirm("確定要清除所有訓練紀錄嗎？此動作無法復原。")) return;
        store.reset();
        toast("訓練紀錄已清除");
        paint();
      });
      nodes.push(
        el(
          "section",
          { class: "danger-zone" },
          el(
            "div",
            {},
            el("h2", { text: "重新開始" }),
            el("p", { text: "清除後，腦力總分、腦年齡與連續訓練天數都會歸零。" })
          ),
          resetButton
        )
      );
    }

    root.replaceChildren(...nodes);
  }

  paint();
}
