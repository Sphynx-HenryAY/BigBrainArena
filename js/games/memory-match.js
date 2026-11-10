import {
  el,
  injectStyles,
  shuffle,
  clamp,
  statChip,
  formatDuration,
} from "../core/utils.js";
import { sound } from "../core/audio.js";

const EMOJIS = ["🍎", "🍇", "🍋", "🍑", "🥝", "🍒", "🫐", "🥥"];

const styles = `
.mem-panel { max-width: 600px; margin: 0 auto; }
.mem-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(7px, 1.6vw, 12px);
  margin: 6px 0 4px;
}
.mem-card {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 15px;
  border: 1px solid var(--border-strong);
  background: linear-gradient(145deg, var(--surface-2), var(--surface-3));
  font-size: clamp(26px, 7vw, 40px);
  line-height: 1;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}
.mem-card:not(.flipped)::after {
  content: "✦";
  font-size: 17px;
  color: var(--text-faint);
  opacity: 0.6;
}
.mem-card:hover:not(.flipped):not(.matched) { transform: translateY(-2px); border-color: var(--primary); }
.mem-card.flipped {
  background: var(--surface-solid);
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  transform: none;
  cursor: default;
}
.mem-card.matched {
  background: var(--success-soft);
  border-color: color-mix(in srgb, var(--success) 45%, var(--border));
  animation: mem-pop 0.3s ease;
}
.mem-card.matched::after { content: none; }
.mem-card:disabled { cursor: default; }
@keyframes mem-pop {
  0% { transform: scale(1); }
  45% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.mem-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--text-faint);
}
`;

export default {
  id: "memory-match",
  title: "記憶翻牌",
  description: "翻開卡片找出相同的圖案，用最少的步數完成 8 組配對。",
  icon: "🃏",
  color: "#ec4899",
  category: "記憶",
  tags: ["圖像記憶", "配對"],
  duration: 90,
  howTo: [
    "每次翻開兩張卡片",
    "圖案相同就會保持翻開",
    "用最少的翻牌次數與時間完成全部配對",
  ],

  mount(container, api) {
    injectStyles("memory-match", styles);

    const deck = shuffle([...EMOJIS, ...EMOJIS]);
    let first = null;
    let second = null;
    let locked = false;
    let done = false;
    let matched = 0;
    let moves = 0;
    let seconds = 0;
    let hideId = null;

    const matchesEl = el("strong", { text: "0 / 8" });
    const movesEl = el("strong", { text: "0" });
    const timeEl = el("strong", { text: "0:00" });

    const grid = el("div", { class: "mem-grid" });
    const panel = el(
      "div",
      { class: "game-panel mem-panel" },
      el(
        "div",
        { class: "hud" },
        statChip("已配對", matchesEl),
        statChip("翻牌次數", movesEl),
        statChip("用時", timeEl)
      ),
      grid,
      el("p", { class: "game-status", text: "翻開兩張卡片，找出相同圖案。" })
    );
    container.append(panel);

    const buttons = deck.map((emoji, index) => {
      const button = el("button", {
        class: "mem-card",
        type: "button",
        "aria-label": `第 ${index + 1} 張卡片，未翻開`,
      });
      button.addEventListener("click", () => flipCard(index, emoji, button));
      grid.append(button);
      return button;
    });

    function flipCard(index, emoji, button) {
      if (locked || done || button.classList.contains("flipped")) return;
      button.classList.add("flipped");
      button.textContent = emoji;
      button.setAttribute("aria-label", `第 ${index + 1} 張卡片，${emoji}`);
      sound.click();

      if (!first) {
        first = { index, emoji, button };
        return;
      }

      second = { index, emoji, button };
      moves += 1;
      movesEl.textContent = String(moves);

      if (first.emoji === second.emoji) {
        const pair = [first, second];
        first = null;
        second = null;
        pair.forEach((card) => card.button.classList.add("matched"));
        matched += 1;
        matchesEl.textContent = `${matched} / 8`;
        sound.correct();
        if (matched === EMOJIS.length) {
          finish();
        }
        return;
      }

      locked = true;
      sound.wrong();
      hideId = window.setTimeout(() => {
        const pair = [first, second];
        pair.forEach((card) => {
          if (!card) return;
          card.button.classList.remove("flipped");
          card.button.textContent = "";
          card.button.setAttribute("aria-label", `第 ${card.index + 1} 張卡片，未翻開`);
        });
        first = null;
        second = null;
        locked = false;
      }, 720);
    }

    function finish() {
      if (done) return;
      done = true;
      window.clearInterval(timerId);
      window.clearTimeout(hideId);
      buttons.forEach((button) => {
        button.disabled = true;
      });
      const score = clamp(Math.round(1000 - seconds * 4 - Math.max(0, moves - 8) * 30), 100, 1000);
      api.finish({
        score,
        summary:
          moves === 8 && seconds < 30
            ? "記憶力驚人，幾乎零失誤！"
            : `用 ${moves} 次翻牌完成 8 組配對`,
        details: [
          { label: "完成配對", value: "8 / 8" },
          { label: "翻牌次數", value: `${moves} 次` },
          { label: "用時", value: formatDuration(seconds) },
        ],
      });
    }

    const timerId = window.setInterval(() => {
      if (done) return;
      seconds += 1;
      timeEl.textContent = formatDuration(seconds);
    }, 1000);

    return () => {
      done = true;
      window.clearInterval(timerId);
      window.clearTimeout(hideId);
    };
  },
};
