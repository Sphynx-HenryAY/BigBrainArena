import {
  el,
  injectStyles,
  randInt,
  clamp,
  sleep,
  statChip,
} from "../core/utils.js";
import { sound } from "../core/audio.js";

const MAX_LEVELS = 10;
const TILE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const styles = `
.seq-panel { max-width: 560px; margin: 0 auto; }
.seq-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 1.8vw, 12px);
  margin: 8px 0 18px;
}
.seq-tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 17px;
  border: 1px solid color-mix(in srgb, var(--tile) 34%, var(--border));
  background: color-mix(in srgb, var(--tile) 20%, var(--surface-solid));
  cursor: pointer;
  transition: transform 0.09s ease, background 0.12s ease, box-shadow 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}
.seq-tile:hover { transform: translateY(-2px); }
.seq-tile.lit,
.seq-tile.pressed {
  background: var(--tile);
  border-color: var(--tile);
  box-shadow: 0 0 34px color-mix(in srgb, var(--tile) 55%, transparent);
  transform: scale(1.03);
}
.seq-grid.is-locked .seq-tile { cursor: default; }
.seq-grid.is-locked .seq-tile:hover { transform: none; }
.seq-tile .seq-num {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: color-mix(in srgb, var(--tile) 65%, var(--text));
  opacity: 0.55;
}
.seq-status { text-align: center; margin-top: 2px; }
.seq-status strong {
  display: block;
  font-size: 19px;
  letter-spacing: -0.01em;
}
.seq-status span {
  font-size: 13px;
  color: var(--text-faint);
}
`;

export default {
  id: "sequence-memory",
  title: "記憶序列",
  description: "記住方塊亮起的順序並依序點擊，序列會越來越長，挑戰你的工作記憶。",
  icon: "🔮",
  color: "#8b5cf6",
  category: "記憶",
  tags: ["工作記憶", "序列"],
  duration: 90,
  howTo: [
    "仔細觀察方塊亮起的順序",
    "輪到你時，依相同順序點擊方塊",
    "每成功一關，序列就會加長一個",
  ],

  mount(container, api) {
    injectStyles("sequence-memory", styles);

    let sequence = [randInt(0, 8), randInt(0, 8)];
    let level = 0;
    let inputIndex = 0;
    let accepting = false;
    let done = false;
    let playToken = 0;
    let nextLevelId = null;
    const controller = new AbortController();

    const levelEl = el("strong", { text: "0 / 10" });
    const lengthEl = el("strong", { text: "0" });
    const statusTitle = el("strong", { text: "準備開始…" });
    const statusCopy = el("span", { text: "觀察方塊亮起的順序" });
    const grid = el("div", { class: "seq-grid is-locked" });

    const panel = el(
      "div",
      { class: "game-panel seq-panel" },
      el(
        "div",
        { class: "hud" },
        statChip("關卡", levelEl),
        statChip("序列長度", lengthEl)
      ),
      grid,
      el("div", { class: "seq-status" }, statusTitle, statusCopy)
    );
    container.append(panel);

    const tiles = TILE_COLORS.map((color, index) => {
      const tile = el(
        "button",
        {
          class: "seq-tile",
          type: "button",
          "aria-label": `方塊 ${index + 1}`,
        },
        el("span", { class: "seq-num", text: String(index + 1) })
      );
      tile.style.setProperty("--tile", color);
      tile.addEventListener("click", () => press(index));
      grid.append(tile);
      return tile;
    });

    function setStatus(title, copy) {
      statusTitle.textContent = title;
      statusCopy.textContent = copy;
    }

    function updateHud() {
      levelEl.textContent = `${level} / ${MAX_LEVELS}`;
      lengthEl.textContent = String(sequence.length);
    }

    function setAccepting(value) {
      accepting = value;
      grid.classList.toggle("is-locked", !value);
    }

    async function highlight(index, token) {
      if (done || token !== playToken) return;
      const tile = tiles[index];
      tile.classList.add("lit");
      sound.note(index);
      await sleep(400);
      tile.classList.remove("lit");
      await sleep(140);
    }

    async function playSequence(token) {
      await sleep(650);
      for (const index of sequence) {
        if (done || token !== playToken) return;
        await highlight(index, token);
      }
      if (done || token !== playToken) return;
      setAccepting(true);
      setStatus("換你了！", `依序點擊 ${sequence.length} 個方塊`);
    }

    function startLevel() {
      if (done) return;
      level += 1;
      inputIndex = 0;
      sequence.push(randInt(0, 8));
      setAccepting(false);
      updateHud();
      setStatus("觀察序列…", "記住方塊亮起的順序");
      playToken += 1;
      playSequence(playToken);
    }

    function press(index) {
      if (!accepting || done) return;
      const tile = tiles[index];
      tile.classList.add("pressed");
      sound.note(index);
      window.setTimeout(() => tile.classList.remove("pressed"), 160);

      if (sequence[inputIndex] !== index) {
        setAccepting(false);
        setStatus("順序不對…", "訓練結束，看看你的成績");
        sound.wrong();
        nextLevelId = window.setTimeout(() => finish(false), 450);
        return;
      }

      inputIndex += 1;
      if (inputIndex === sequence.length) {
        setAccepting(false);
        if (level >= MAX_LEVELS) {
          setStatus("完美通關！", "你的工作記憶非常出色");
          sound.correct();
          nextLevelId = window.setTimeout(() => finish(true), 600);
        } else {
          setStatus("太棒了！", "下一關準備中…");
          sound.correct();
          nextLevelId = window.setTimeout(startLevel, 850);
        }
      }
    }

    function finish(perfect) {
      if (done) return;
      done = true;
      setAccepting(false);
      window.clearTimeout(nextLevelId);
      controller.abort();
      const completed = perfect ? MAX_LEVELS : level - 1;
      api.finish({
        score: clamp(Math.round((completed / MAX_LEVELS) * 1000), 0, 1000),
        summary: perfect
          ? "10 關全數通過，工作記憶滿分！"
          : `完成 ${completed} 關，挑戰到 ${sequence.length} 個序列`,
        details: [
          { label: "完成關卡", value: `${completed} / ${MAX_LEVELS}` },
          { label: "挑戰序列長度", value: `${sequence.length} 個` },
        ],
      });
    }

    window.addEventListener(
      "keydown",
      (event) => {
        const index = Number(event.key) - 1;
        if (Number.isInteger(index) && index >= 0 && index < 9) {
          event.preventDefault();
          press(index);
        }
      },
      { signal: controller.signal }
    );

    startLevel();

    return () => {
      done = true;
      setAccepting(false);
      window.clearTimeout(nextLevelId);
      controller.abort();
    };
  },
};
