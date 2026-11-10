import { el, injectStyles, pick, clamp, statChip } from "../core/utils.js";
import { sound } from "../core/audio.js";

const N = 2;
const TRIALS = 24;
const TRIAL_MS = 2400;
const WARMUP_MS = 1100;
const SYMBOLS = ["🍎", "🍋", "🍇", "🔷", "⭐", "🌙", "🔺", "🍀"];

const styles = `
.nb-panel { max-width: 620px; margin: 0 auto; }
.nb-timer { margin-bottom: 16px; }
.nb-stage {
  display: grid;
  place-items: center;
  min-height: clamp(170px, 28vh, 230px);
  margin: 4px 0 16px;
  border-radius: 20px;
  border: 1px dashed var(--border);
  background: color-mix(in srgb, var(--surface-solid) 55%, transparent);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.nb-stage.good {
  background: color-mix(in srgb, var(--success) 10%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--success) 45%, var(--border));
}
.nb-stage.bad {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
}
.nb-symbol {
  font-size: clamp(76px, 18vw, 118px);
  line-height: 1;
  filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.12));
}
.nb-prompt {
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 14px;
}
.nb-choices { gap: 10px; }
.nb-choices .choice-btn { font-size: clamp(18px, 3.4vw, 23px); }
.nb-choices .choice-btn:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
  box-shadow: none;
}
.nb-feedback {
  text-align: center;
  min-height: 20px;
  margin: 14px 0 0;
  font-size: 13.5px;
  color: var(--text-faint);
}
`;

export default {
  id: "n-back",
  title: "N-Back 記憶",
  description: "判斷目前的符號是否與 2 步前相同，持續更新腦中的工作記憶。",
  icon: "🧠",
  color: "#0d9488",
  category: "記憶",
  tags: ["工作記憶", "持續更新"],
  duration: 60,
  howTo: [
    "符號會依序出現，記住每一個符號",
    "判斷目前的符號是否與 2 步前相同",
    "選「相同」或「不同」，用 1 / 2 鍵也可以作答",
  ],

  mount(container, api) {
    injectStyles("n-back", styles);

    let index = -1;
    let accepting = false;
    let done = false;
    let correct = 0;
    let wrong = 0;
    let streak = 0;
    let bestStreak = 0;
    let timerId = null;
    let token = 0;
    const controller = new AbortController();

    const sequence = [];
    for (let i = 0; i < TRIALS; i += 1) {
      if (i < N) {
        sequence.push(pick(SYMBOLS));
      } else if (Math.random() < 0.38) {
        sequence.push(sequence[i - N]);
      } else {
        let candidate = pick(SYMBOLS);
        while (candidate === sequence[i - N]) candidate = pick(SYMBOLS);
        sequence.push(candidate);
      }
    }

    const progressFill = el("div", { class: "progress-fill" });
    const trialEl = el("strong", { text: `0 / ${TRIALS}` });
    const correctEl = el("strong", { text: "0" });
    const streakEl = el("strong", { text: "0" });

    const symbol = el("span", { class: "nb-symbol", text: "•" });
    const stage = el("div", { class: "nb-stage" }, symbol);
    const prompt = el("p", { class: "nb-prompt", text: `跟 ${N} 步前的符號相同嗎？` });

    const sameButton = el("button", {
      class: "choice-btn",
      type: "button",
      text: "相同",
      disabled: true,
    });
    const differentButton = el("button", {
      class: "choice-btn",
      type: "button",
      text: "不同",
      disabled: true,
    });
    sameButton.addEventListener("click", () => answer(true));
    differentButton.addEventListener("click", () => answer(false));

    const feedback = el("p", { class: "nb-feedback", text: "準備開始…" });

    const panel = el(
      "div",
      { class: "game-panel nb-panel" },
      el("div", { class: "progress-track nb-timer" }, progressFill),
      el(
        "div",
        { class: "hud" },
        statChip("進度", trialEl),
        statChip("答對", correctEl),
        statChip("連續", streakEl)
      ),
      stage,
      prompt,
      el("div", { class: "choice-grid nb-choices" }, sameButton, differentButton),
      feedback
    );
    container.append(panel);

    function setButtonsEnabled(enabled) {
      sameButton.disabled = !enabled;
      differentButton.disabled = !enabled;
    }

    function updateHud() {
      correctEl.textContent = String(correct);
      streakEl.textContent = String(streak);
    }

    function startTrial() {
      if (done) return;
      index += 1;
      if (index >= TRIALS) {
        finish();
        return;
      }

      token += 1;
      const myToken = token;
      const isWarmup = index < N;

      stage.className = "nb-stage";
      symbol.textContent = sequence[index];
      trialEl.textContent = `${index + 1} / ${TRIALS}`;
      progressFill.style.width = `${(index / TRIALS) * 100}%`;

      if (isWarmup) {
        accepting = false;
        setButtonsEnabled(false);
        prompt.textContent = `記住第 ${index + 1} 個符號`;
        feedback.textContent = "暖身中…";
        timerId = window.setTimeout(() => {
          if (done || myToken !== token) return;
          startTrial();
        }, WARMUP_MS);
        return;
      }

      accepting = true;
      setButtonsEnabled(true);
      prompt.textContent = `跟 ${N} 步前的符號相同嗎？`;
      feedback.textContent = "選「相同」或「不同」";
      timerId = window.setTimeout(() => {
        if (done || myToken !== token) return;
        miss();
      }, TRIAL_MS);
    }

    function settle(isRight, message) {
      accepting = false;
      setButtonsEnabled(false);
      window.clearTimeout(timerId);

      if (isRight) {
        correct += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        stage.classList.add("good");
        sound.correct();
      } else {
        wrong += 1;
        streak = 0;
        stage.classList.add("bad");
        sound.wrong();
      }

      feedback.textContent = message;
      updateHud();
    }

    function answer(saidSame) {
      if (!accepting || done) return;
      const isTarget = sequence[index] === sequence[index - N];
      const isRight = saidSame === isTarget;
      settle(isRight, isRight ? "答對了！" : `答錯了：這是${isTarget ? "相同" : "不同"}的`);
      timerId = window.setTimeout(
        () => {
          if (!done) startTrial();
        },
        isRight ? 380 : 700
      );
    }

    function miss() {
      if (done) return;
      const isTarget = sequence[index] === sequence[index - N];
      settle(false, `時間到！這是${isTarget ? "相同" : "不同"}的`);
      timerId = window.setTimeout(() => {
        if (!done) startTrial();
      }, 700);
    }

    function finish() {
      if (done) return;
      done = true;
      accepting = false;
      window.clearTimeout(timerId);
      controller.abort();
      setButtonsEnabled(false);
      progressFill.style.width = "100%";

      const scored = TRIALS - N;
      const accuracy = scored ? Math.round((correct / scored) * 100) : 0;
      api.finish({
        score: clamp(Math.round((correct / scored) * 1000), 0, 1000),
        summary:
          accuracy >= 90
            ? "工作記憶非常穩定，2-back 幾乎全對！"
            : accuracy >= 70
              ? "不錯的專注力，再練幾次會更順。"
              : "先放慢節奏，把注意力放在兩個符號之前的比較。",
        details: [
          { label: "答對", value: `${correct} / ${scored}` },
          { label: "答錯", value: `${wrong} 題` },
          { label: "最長連續", value: `${bestStreak} 題` },
        ],
      });
    }

    window.addEventListener(
      "keydown",
      (event) => {
        if (done) return;
        if (event.key === "1" || event.key === "ArrowLeft") {
          event.preventDefault();
          sameButton.click();
        } else if (event.key === "2" || event.key === "ArrowRight") {
          event.preventDefault();
          differentButton.click();
        }
      },
      { signal: controller.signal }
    );

    startTrial();

    return () => {
      done = true;
      accepting = false;
      window.clearTimeout(timerId);
      controller.abort();
    };
  },
};
