import { el, injectStyles, pick, clamp, statChip } from "../core/utils.js";
import { sound } from "../core/audio.js";

const TOTAL_TIME = 45;
const COLORS = [
  { name: "紅", hex: "#ef4444" },
  { name: "藍", hex: "#3b82f6" },
  { name: "綠", hex: "#22c55e" },
  { name: "黃", hex: "#eab308" },
];

const styles = `
.st-panel { max-width: 640px; margin: 0 auto; }
.st-timer { margin-bottom: 16px; }
.st-prompt {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin: 0 0 4px;
}
.st-word-wrap {
  display: grid;
  place-items: center;
  min-height: clamp(150px, 25vh, 210px);
  margin-bottom: 18px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-solid) 55%, transparent);
  border: 1px dashed var(--border);
  transition: background 0.15s ease;
}
.st-word-wrap.good { background: color-mix(in srgb, var(--success) 10%, var(--surface-solid)); }
.st-word-wrap.bad { background: color-mix(in srgb, var(--danger) 10%, var(--surface-solid)); }
.st-word {
  font-size: clamp(64px, 15vw, 104px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.06em;
  text-shadow: 0 14px 34px rgba(0, 0, 0, 0.08);
}
.st-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.st-color-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: clamp(16px, 3vw, 20px);
  padding: 15px 12px;
}
.st-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 30%, transparent);
}
`;

export default {
  id: "stroop",
  title: "顏色風暴",
  description: "文字的意思和顏色互相干擾，選出「文字的顏色」考驗你的抑制控制。",
  icon: "🎨",
  color: "#ef4444",
  category: "專注",
  tags: ["選擇性注意", "抑制控制"],
  duration: 45,
  howTo: [
    "看畫面上文字的「顏色」，不是文字的意思",
    "從四個選項中選出該顏色",
    "限時 45 秒，答對越多分數越高",
  ],

  mount(container, api) {
    injectStyles("stroop", styles);

    let timeLeft = TOTAL_TIME;
    let correct = 0;
    let wrong = 0;
    let done = false;
    let locked = false;
    let trial = null;
    let nextId = null;
    const controller = new AbortController();

    const timeEl = el("strong", { text: String(TOTAL_TIME) });
    const correctEl = el("strong", { text: "0" });
    const progressFill = el("div", { class: "progress-fill" });
    const wordWrap = el("div", { class: "st-word-wrap" });
    const word = el("span", { class: "st-word" });
    wordWrap.append(word);
    const choices = el("div", { class: "choice-grid st-choices" });

    const panel = el(
      "div",
      { class: "game-panel st-panel" },
      el("div", { class: "progress-track st-timer" }, progressFill),
      el(
        "div",
        { class: "hud" },
        statChip("剩餘時間", el("span", {}, timeEl, " 秒")),
        statChip("答對", correctEl)
      ),
      el("p", { class: "st-prompt", text: "選出文字的顏色" }),
      wordWrap,
      choices
    );
    container.append(panel);

    const buttons = COLORS.map((color) => {
      const dot = el("span", { class: "st-dot" });
      dot.style.background = color.hex;
      const button = el(
        "button",
        { class: "choice-btn st-color-btn", type: "button" },
        dot,
        el("span", { text: color.name })
      );
      button.addEventListener("click", () => answerWith(color, button));
      choices.append(button);
      return button;
    });

    function nextTrial() {
      if (done) return;
      locked = false;
      const ink = pick(COLORS);
      const alternatives = COLORS.filter((color) => color.name !== ink.name);
      const meaning = pick(alternatives);
      trial = { ink, meaning };
      word.textContent = meaning.name;
      word.style.color = ink.hex;
      wordWrap.className = "st-word-wrap";
      buttons.forEach((button) => {
        button.classList.remove("is-right", "is-wrong");
      });
    }

    function answerWith(color, button) {
      if (locked || done || !trial) return;
      locked = true;
      const isRight = color.name === trial.ink.name;
      if (isRight) {
        correct += 1;
        correctEl.textContent = String(correct);
        button.classList.add("is-right");
        wordWrap.classList.add("good");
        sound.correct();
      } else {
        wrong += 1;
        button.classList.add("is-wrong");
        buttons.forEach((candidate, index) => {
          if (COLORS[index].name === trial.ink.name) candidate.classList.add("is-right");
        });
        wordWrap.classList.add("bad");
        sound.wrong();
      }
      nextId = window.setTimeout(nextTrial, isRight ? 150 : 320);
    }

    function finish() {
      if (done) return;
      done = true;
      window.clearInterval(timerId);
      window.clearTimeout(nextId);
      controller.abort();
      const answered = correct + wrong;
      api.finish({
        score: clamp(Math.round((correct / 30) * 1000 - wrong * 20), 0, 1000),
        summary: `45 秒內正確辨識 ${correct} 次顏色`,
        details: [
          { label: "答對", value: `${correct} 次` },
          { label: "答錯", value: `${wrong} 次` },
          {
            label: "準確率",
            value: answered ? `${Math.round((correct / answered) * 100)}%` : "—",
          },
        ],
      });
    }

    const timerId = window.setInterval(() => {
      if (done) return;
      timeLeft -= 1;
      timeEl.textContent = String(Math.max(0, timeLeft));
      progressFill.style.width = `${Math.max(0, (timeLeft / TOTAL_TIME) * 100)}%`;
      if (timeLeft <= 5 && timeLeft > 0) sound.tick();
      if (timeLeft <= 0) finish();
    }, 1000);

    window.addEventListener(
      "keydown",
      (event) => {
        if (done) return;
        const index = ["1", "2", "3", "4"].indexOf(event.key);
        if (index === -1) return;
        event.preventDefault();
        buttons[index].click();
      },
      { signal: controller.signal }
    );

    nextTrial();

    return () => {
      done = true;
      window.clearInterval(timerId);
      window.clearTimeout(nextId);
      controller.abort();
    };
  },
};
