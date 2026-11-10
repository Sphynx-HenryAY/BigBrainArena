import { el, injectStyles, randInt, shuffle, clamp, pick, statChip } from "../core/utils.js";
import { sound } from "../core/audio.js";

const TOTAL_TIME = 60;

const styles = `
.ms-panel { max-width: 620px; margin: 0 auto; }
.ms-timer { margin-bottom: 16px; }
.ms-question { position: relative; text-align: center; margin: 18px 0 26px; }
.ms-equation {
  font-size: clamp(38px, 8vw, 62px);
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.ms-flash {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(54px, 12vw, 78px);
  font-weight: 800;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.16s ease, transform 0.16s ease;
  pointer-events: none;
}
.ms-flash.show { opacity: 1; transform: scale(1); }
.ms-flash.good { color: var(--success); }
.ms-flash.bad { color: var(--danger); }
.ms-choices { gap: 12px; }
.ms-choices .choice-btn { font-variant-numeric: tabular-nums; }
`;

export default {
  id: "math-sprint",
  title: "心算衝刺",
  description: "60 秒內解開最多的加減乘除，訓練計算速度與心算準確度。",
  icon: "➗",
  color: "#6366f1",
  category: "數學",
  tags: ["四則運算", "速度"],
  duration: 60,
  howTo: [
    "從四個選項中選出正確答案",
    "答對得分，答錯會扣分",
    "倒數結束時，訓練即完成",
  ],

  mount(container, api) {
    injectStyles("math-sprint", styles);

    let timeLeft = TOTAL_TIME;
    let correct = 0;
    let wrong = 0;
    let done = false;
    let locked = false;
    let current = null;
    let options = [];
    let transitionId = null;
    const controller = new AbortController();

    const timeEl = el("strong", { text: String(TOTAL_TIME) });
    const scoreEl = el("strong", { text: "0" });
    const progressFill = el("div", { class: "progress-fill" });
    const equation = el("div", { class: "ms-equation" });
    const flash = el("div", { class: "ms-flash" });
    const choices = el("div", { class: "choice-grid ms-choices" });

    const panel = el(
      "div",
      { class: "game-panel ms-panel" },
      el("div", { class: "progress-track ms-timer" }, progressFill),
      el(
        "div",
        { class: "hud" },
        statChip("剩餘時間", el("span", {}, timeEl, " 秒")),
        statChip("得分", scoreEl)
      ),
      el("div", { class: "ms-question" }, equation, flash),
      choices
    );
    container.append(panel);

    function currentScore() {
      return clamp(Math.round(correct * 25 - wrong * 10), 0, 1000);
    }

    function showFlash(text, kind) {
      flash.textContent = text;
      flash.className = `ms-flash show ${kind}`;
      window.clearTimeout(showFlash.timer);
      showFlash.timer = window.setTimeout(() => {
        flash.className = "ms-flash";
      }, 260);
    }

    function makeQuestion() {
      if (done) return;
      const elapsed = TOTAL_TIME - timeLeft;
      const level = Math.min(3, Math.floor(elapsed / 18));
      const pool = ["+", "-"];
      if (level >= 1) pool.push("×");
      if (level >= 2) pool.push("+", "×");
      const op = pick(pool);

      let a;
      let b;
      let answer;
      if (op === "+") {
        const max = 12 + elapsed;
        a = randInt(2, max);
        b = randInt(2, max);
        answer = a + b;
      } else if (op === "-") {
        const max = 14 + elapsed;
        a = randInt(6, max);
        b = randInt(1, a);
        answer = a - b;
      } else {
        const max = 6 + level * 2;
        a = randInt(2, max);
        b = randInt(2, max);
        answer = a * b;
      }

      const values = new Set([answer]);
      const spread = Math.max(3, Math.round(answer * 0.2) + 2);
      let guard = 0;
      while (values.size < 4 && guard < 60) {
        guard += 1;
        const delta = randInt(1, spread);
        const candidate = Math.random() < 0.5 ? answer - delta : answer + delta;
        if (candidate >= 0 && candidate !== answer) values.add(candidate);
      }

      current = { a, op, b, answer };
      options = shuffle([...values]);
      equation.textContent = `${a} ${op} ${b} = ?`;
      choices.replaceChildren(
        ...options.map((value, index) => {
          const button = el("button", {
            class: "choice-btn",
            type: "button",
            text: String(value),
            "aria-label": `選項 ${index + 1}：${value}`,
          });
          button.addEventListener("click", () => answerWith(value, button));
          return button;
        })
      );
    }

    function answerWith(value, button) {
      if (locked || done || !current) return;
      locked = true;
      const isRight = value === current.answer;
      const buttons = [...choices.querySelectorAll(".choice-btn")];

      if (isRight) {
        correct += 1;
        button.classList.add("is-right");
        showFlash("✓", "good");
        sound.correct();
      } else {
        wrong += 1;
        button.classList.add("is-wrong");
        buttons.forEach((candidate) => {
          if (Number(candidate.textContent) === current.answer) {
            candidate.classList.add("is-right");
          }
        });
        showFlash("✕", "bad");
        sound.wrong();
      }

      scoreEl.textContent = String(currentScore());
      transitionId = window.setTimeout(() => {
        if (done) return;
        locked = false;
        makeQuestion();
      }, isRight ? 190 : 420);
    }

    function finish() {
      if (done) return;
      done = true;
      window.clearInterval(timerId);
      window.clearTimeout(transitionId);
      controller.abort();
      const answered = correct + wrong;
      api.finish({
        score: currentScore(),
        summary: `在 60 秒內答對 ${correct} 題`,
        details: [
          { label: "答對", value: `${correct} 題` },
          { label: "答錯", value: `${wrong} 題` },
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
        const button = choices.querySelectorAll(".choice-btn")[index];
        if (button) {
          event.preventDefault();
          button.click();
        }
      },
      { signal: controller.signal }
    );

    makeQuestion();

    return () => {
      done = true;
      window.clearInterval(timerId);
      window.clearTimeout(transitionId);
      window.clearTimeout(showFlash.timer);
      controller.abort();
    };
  },
};
