import { el, injectStyles, shuffle, pick, clamp, statChip } from "../core/utils.js";
import { sound } from "../core/audio.js";

const TRIALS = 36;
const GO_TRIALS = 27;
const SHOW_MS = 680;
const NEXT_MS = 320;
const GO_SYMBOLS = ["🍎", "🍋", "🍇", "🍓", "🍊", "🥝"];
const NOGO_SYMBOLS = ["💣", "🧨", "🚫", "⛔"];

const styles = `
.gng-panel { max-width: 620px; margin: 0 auto; }
.gng-pad {
  width: 100%;
  min-height: clamp(210px, 36vh, 300px);
  display: grid;
  place-items: center;
  margin: 4px 0 16px;
  padding: 20px;
  border-radius: 22px;
  border: 2px solid var(--border-strong);
  background: color-mix(in srgb, var(--surface-solid) 70%, transparent);
  font-family: inherit;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s ease, border-color 0.12s ease, transform 0.08s ease;
}
.gng-pad:active { transform: scale(0.995); }
.gng-pad.idle { cursor: default; }
.gng-pad.good {
  background: color-mix(in srgb, var(--success) 12%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--success) 50%, var(--border));
}
.gng-pad.bad {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--danger) 50%, var(--border));
}
.gng-symbol {
  font-size: clamp(78px, 18vw, 122px);
  line-height: 1;
  filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.12));
}
.gng-status { text-align: center; margin-top: 2px; }
.gng-status strong {
  display: block;
  font-size: 19px;
  letter-spacing: -0.01em;
}
.gng-status span {
  font-size: 13px;
  color: var(--text-faint);
}
`;

export default {
  id: "go-no-go",
  title: "煞車挑戰",
  description: "看到水果就點、看到炸彈要忍住，訓練反應抑制與衝動控制。",
  icon: "🛑",
  color: "#f43f5e",
  category: "專注",
  tags: ["反應抑制", "自我控制"],
  duration: 45,
  howTo: [
    "看到水果時，立刻點擊大方塊",
    "看到炸彈時，什麼都不要做",
    "誤點炸彈會扣分，共 36 個刺激",
  ],

  mount(container, api) {
    injectStyles("go-no-go", styles);

    const trials = shuffle([
      ...Array.from({ length: GO_TRIALS }, () => "go"),
      ...Array.from({ length: TRIALS - GO_TRIALS }, () => "nogo"),
    ]);
    if (trials[0] === "nogo") {
      const swapAt = trials.indexOf("go");
      [trials[0], trials[swapAt]] = [trials[swapAt], trials[0]];
    }

    let index = -1;
    let accepting = false;
    let done = false;
    let current = "go";
    let hits = 0;
    let misses = 0;
    let falseAlarms = 0;
    let correctRejects = 0;
    let shownAt = 0;
    let token = 0;
    let timerId = null;
    let nextId = null;
    const controller = new AbortController();

    const progressFill = el("div", { class: "progress-fill" });
    const trialEl = el("strong", { text: `0 / ${TRIALS}` });
    const hitEl = el("strong", { text: "0" });
    const falseEl = el("strong", { text: "0" });

    const symbol = el("span", { class: "gng-symbol", text: "•" });
    const pad = el(
      "button",
      { class: "gng-pad idle", type: "button", "aria-label": "作答" },
      symbol
    );
    pad.addEventListener("click", respond);

    const statusTitle = el("strong", { text: "準備開始…" });
    const statusCopy = el("span", { text: "水果就點，炸彈就忍住" });

    const panel = el(
      "div",
      { class: "game-panel gng-panel" },
      el("div", { class: "progress-track gng-timer", style: { marginBottom: "16px" } }, progressFill),
      el(
        "div",
        { class: "hud" },
        statChip("進度", trialEl),
        statChip("命中", hitEl),
        statChip("誤按", falseEl)
      ),
      pad,
      el("div", { class: "gng-status" }, statusTitle, statusCopy),
      el("p", {
        class: "game-status",
        text: "空白鍵或 Enter 也可以作答。",
      })
    );
    container.append(panel);

    function setStatus(title, copy) {
      statusTitle.textContent = title;
      statusCopy.textContent = copy;
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
      current = trials[index];
      accepting = true;
      shownAt = performance.now();

      pad.className = "gng-pad";
      symbol.textContent =
        current === "go" ? pick(GO_SYMBOLS) : pick(NOGO_SYMBOLS);
      trialEl.textContent = `${index + 1} / ${TRIALS}`;
      progressFill.style.width = `${(index / TRIALS) * 100}%`;
      setStatus("現在！", "水果就點，炸彈就忍住");

      timerId = window.setTimeout(() => {
        if (done || myToken !== token) return;
        endTrial("timeout");
      }, SHOW_MS);
    }

    function respond() {
      if (done || !accepting) return;
      if (performance.now() - shownAt > SHOW_MS) return;
      endTrial("respond");
    }

    function endTrial(reason) {
      accepting = false;
      window.clearTimeout(timerId);

      const isGo = current === "go";

      if (reason === "respond" && isGo) {
        hits += 1;
        hitEl.textContent = String(hits);
        pad.classList.add("good");
        setStatus("✓ 命中！", "反應很快");
        sound.correct();
      } else if (reason === "respond" && !isGo) {
        falseAlarms += 1;
        falseEl.textContent = String(falseAlarms);
        pad.classList.add("bad");
        setStatus("✕ 這是炸彈！", "看到炸彈時要忍住");
        sound.wrong();
      } else if (reason === "timeout" && isGo) {
        misses += 1;
        pad.classList.add("bad");
        setStatus("太慢了！", "水果出現時要點擊");
        sound.wrong();
      } else {
        correctRejects += 1;
        pad.classList.add("good");
        setStatus("✓ 成功忍住", "這張是炸彈，做得很好");
        sound.correct();
      }

      nextId = window.setTimeout(() => {
        if (done) return;
        pad.className = "gng-pad idle";
        symbol.textContent = "•";
        startTrial();
      }, NEXT_MS);
    }

    function finish() {
      if (done) return;
      done = true;
      accepting = false;
      window.clearTimeout(timerId);
      window.clearTimeout(nextId);
      controller.abort();
      progressFill.style.width = "100%";

      const totalCorrect = hits + correctRejects;
      const accuracy = Math.round((totalCorrect / TRIALS) * 100);
      api.finish({
        score: clamp(Math.round((totalCorrect / TRIALS) * 1000), 0, 1000),
        summary:
          falseAlarms === 0 && misses === 0
            ? "零失誤，反應與抑制控制都滿分！"
            : falseAlarms <= 2
              ? "控制得很好，只有少數幾次太衝動。"
              : "先深呼吸，看到炸彈時把手指停住。",
        details: [
          { label: "命中", value: `${hits} / ${GO_TRIALS}` },
          { label: "成功忍住", value: `${correctRejects} / ${TRIALS - GO_TRIALS}` },
          { label: "誤按炸彈", value: `${falseAlarms} 次` },
          { label: "漏按水果", value: `${misses} 次` },
        ],
      });
    }

    function onKeydown(event) {
      if (event.repeat) return;
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        respond();
      }
    }

    window.addEventListener("keydown", onKeydown, { signal: controller.signal });
    setStatus("準備開始…", "水果就點，炸彈就忍住");
    nextId = window.setTimeout(startTrial, 800);

    return () => {
      done = true;
      accepting = false;
      window.clearTimeout(timerId);
      window.clearTimeout(nextId);
      controller.abort();
    };
  },
};
