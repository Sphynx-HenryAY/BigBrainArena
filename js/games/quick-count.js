import {
  el,
  injectStyles,
  randInt,
  shuffle,
  pick,
  clamp,
  statChip,
} from "../core/utils.js";
import { sound } from "../core/audio.js";

const ROUNDS = 10;
const CELLS = 25;
const EMOJIS = ["🍓", "🍋", "⭐", "🔵", "🟣", "🍀", "🔺", "💎"];

const styles = `
.qc-panel { max-width: 620px; margin: 0 auto; }
.qc-stage { position: relative; margin: 4px 0 16px; }
.qc-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(5px, 1.2vw, 8px);
  padding: clamp(8px, 1.6vw, 12px);
  border-radius: 18px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-solid) 55%, transparent);
}
.qc-cell {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--surface-2) 70%, transparent);
  font-size: clamp(19px, 4.6vw, 30px);
  line-height: 1;
  user-select: none;
}
.qc-cover {
  position: absolute;
  inset: 0;
  display: none;
  place-items: center;
  text-align: center;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--primary) 30%, var(--border));
  background: color-mix(in srgb, var(--surface-solid) 84%, transparent);
  backdrop-filter: blur(9px);
}
.qc-cover.show { display: grid; }
.qc-cover span { display: block; font-size: 13px; color: var(--text-faint); letter-spacing: 0.06em; }
.qc-target { font-size: clamp(46px, 11vw, 66px); line-height: 1.1; }
.qc-answer { min-height: 124px; display: grid; align-items: center; }
.qc-hint {
  text-align: center;
  color: var(--text-faint);
  font-size: 13.5px;
  animation: qc-pulse 1.2s ease-in-out infinite;
}
.qc-answer .choice-btn { font-variant-numeric: tabular-nums; }
@keyframes qc-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
`;

export default {
  id: "quick-count",
  title: "瞬間計數",
  description: "在圖案消失前快速數出目標數量，訓練視覺掃描與數量感。",
  icon: "🔢",
  color: "#06b6d4",
  category: "專注",
  tags: ["視覺掃描", "數量感"],
  duration: 45,
  howTo: [
    "記住畫面中有幾個目標圖案",
    "圖案會在一瞬間被遮住",
    "選出正確數量，共 10 個回合",
  ],

  mount(container, api) {
    injectStyles("quick-count", styles);

    let round = 0;
    let correct = 0;
    let done = false;
    let phase = "idle";
    let target = "";
    let count = 0;
    let revealId = null;
    let nextId = null;

    const roundEl = el("strong", { text: `0 / ${ROUNDS}` });
    const correctEl = el("strong", { text: "0" });
    const grid = el("div", { class: "qc-grid" });
    const coverText = el("span", { text: "剛剛有幾個" });
    const coverTarget = el("div", { class: "qc-target" });
    const cover = el("div", { class: "qc-cover" }, el("div", {}, coverText, coverTarget));
    const stage = el("div", { class: "qc-stage" }, grid, cover);
    const answer = el("div", { class: "qc-answer" });

    const panel = el(
      "div",
      { class: "game-panel qc-panel" },
      el(
        "div",
        { class: "hud" },
        statChip("回合", roundEl),
        statChip("答對", correctEl)
      ),
      stage,
      answer
    );
    container.append(panel);

    function buildRound() {
      target = pick(EMOJIS);
      const distractors = shuffle(EMOJIS.filter((emoji) => emoji !== target)).slice(0, 2);
      count = randInt(4, 9);
      const cells = Array.from({ length: count }, () => target);
      for (let index = count; index < CELLS; index += 1) {
        cells.push(distractors[randInt(0, 1)]);
      }
      const shuffled = shuffle(cells);

      grid.replaceChildren(
        ...shuffled.map((emoji) => el("span", { class: "qc-cell", text: emoji }))
      );

      const values = new Set([count]);
      let guard = 0;
      while (values.size < 4 && guard < 60) {
        guard += 1;
        const candidate = count + randInt(-3, 3);
        if (candidate > 0 && candidate !== count) values.add(candidate);
      }
      return { options: shuffle([...values]) };
    }

    function showAnswerPhase(options) {
      if (done) return;
      phase = "answer";
      cover.classList.add("show");
      coverTarget.textContent = target;
      answer.replaceChildren(
        el(
          "div",
          { class: "choice-grid" },
          ...options.map((value) => {
            const button = el("button", {
              class: "choice-btn",
              type: "button",
              text: String(value),
            });
            button.addEventListener("click", () => submit(value, button));
            return button;
          })
        )
      );
    }

    function submit(value, button) {
      if (phase !== "answer" || done) return;
      phase = "feedback";
      const isRight = value === count;
      if (isRight) {
        correct += 1;
        correctEl.textContent = String(correct);
        button.classList.add("is-right");
        sound.correct();
      } else {
        button.classList.add("is-wrong");
        const buttons = [...answer.querySelectorAll(".choice-btn")];
        buttons.forEach((candidate) => {
          if (Number(candidate.textContent) === count) candidate.classList.add("is-right");
        });
        sound.wrong();
      }
      coverText.textContent = isRight ? "答對了！共有" : `答錯了，共有 ${count} 個`;
      coverTarget.textContent = target;
      cover.classList.add("show");
      nextId = window.setTimeout(() => {
        if (round >= ROUNDS) {
          finish();
        } else {
          nextRound();
        }
      }, 850);
    }

    function nextRound() {
      if (done) return;
      round += 1;
      roundEl.textContent = `${round} / ${ROUNDS}`;
      phase = "reveal";
      cover.classList.remove("show");
      coverText.textContent = "剛剛有幾個";
      coverTarget.textContent = "";
      answer.replaceChildren(el("p", { class: "qc-hint", text: "觀察中…記住目標圖案的數量" }));
      const { options } = buildRound();
      revealId = window.setTimeout(() => showAnswerPhase(options), 1750);
    }

    function finish() {
      if (done) return;
      done = true;
      phase = "idle";
      window.clearTimeout(revealId);
      window.clearTimeout(nextId);
      api.finish({
        score: clamp(correct * 100, 0, 1000),
        summary: `10 個回合中答對 ${correct} 題`,
        details: [
          { label: "答對", value: `${correct} / ${ROUNDS}` },
          { label: "準確率", value: `${Math.round((correct / ROUNDS) * 100)}%` },
        ],
      });
    }

    nextRound();

    return () => {
      done = true;
      window.clearTimeout(revealId);
      window.clearTimeout(nextId);
    };
  },
};
