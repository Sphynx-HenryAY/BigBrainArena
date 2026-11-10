import { el, injectStyles, shuffle, pick, clamp, statChip } from "../core/utils.js";
import { sound } from "../core/audio.js";

const ROUNDS = 8;

const SHAPES = [
  [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3]],
  [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1], [3, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [3, 0]],
  [[0, 1], [0, 2], [1, 0], [1, 1], [2, 0], [3, 0]],
];

function normalize(cells) {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells
    .map(([row, col]) => [row - minRow, col - minCol])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function shapeKey(cells) {
  return normalize(cells)
    .map(([row, col]) => `${row},${col}`)
    .join(";");
}

function rotateShape(cells) {
  return normalize(cells.map(([row, col]) => [col, -row]));
}

function mirrorShape(cells) {
  return normalize(cells.map(([row, col]) => [row, -col]));
}

function rotationsOf(cells) {
  const result = [];
  let current = normalize(cells);
  for (let index = 0; index < 4; index += 1) {
    result.push(current);
    current = rotateShape(current);
  }
  return result;
}

function reflectionsOf(cells) {
  const result = [];
  let current = mirrorShape(cells);
  for (let index = 0; index < 4; index += 1) {
    result.push(current);
    current = rotateShape(current);
  }
  return result;
}

const SHAPE_POOL = SHAPES.filter((shape) => {
  const rotations = new Set(rotationsOf(shape).map(shapeKey));
  const reflections = new Set(reflectionsOf(shape).map(shapeKey));
  if (rotations.size !== 4 || reflections.size !== 4) return false;
  return [...reflections].every((key) => !rotations.has(key));
});

function shapeNode(cells, variant) {
  const normalized = normalize(cells);
  const rows = Math.max(...normalized.map(([row]) => row)) + 1;
  const cols = Math.max(...normalized.map(([, col]) => col)) + 1;
  const filled = new Set(normalized.map(([row, col]) => `${row},${col}`));
  const grid = el("div", { class: `mr-shape ${variant}` });
  grid.style.gridTemplateColumns = `repeat(${cols}, var(--mr-unit))`;
  grid.style.gridTemplateRows = `repeat(${rows}, var(--mr-unit))`;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      grid.append(
        el("span", {
          class: filled.has(`${row},${col}`) ? "mr-cell filled" : "mr-cell",
        })
      );
    }
  }

  return grid;
}

const styles = `
.mr-panel { max-width: 640px; margin: 0 auto; }
.mr-target-wrap {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin: 0 0 16px;
  padding: 16px;
  border-radius: 18px;
  border: 1px dashed var(--border);
  background: color-mix(in srgb, var(--surface-solid) 55%, transparent);
}
.mr-target-label {
  font-size: 11.5px;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}
.mr-prompt {
  text-align: center;
  font-size: 14.5px;
  font-weight: 700;
  margin: 0 0 14px;
}
.mr-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(8px, 1.8vw, 12px);
}
.mr-option {
  display: grid;
  place-items: center;
  min-height: clamp(112px, 22vw, 154px);
  padding: 10px;
  border-radius: 16px;
  border: 1px solid var(--border-strong);
  background: var(--surface-solid);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease,
    box-shadow 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}
.mr-option:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}
.mr-option.is-right {
  border-color: var(--success);
  background: var(--success-soft);
}
.mr-option.is-wrong {
  border-color: var(--danger);
  background: var(--danger-soft);
}
.mr-option:disabled { cursor: default; }
.mr-shape {
  display: grid;
  gap: 2px;
  justify-content: center;
  align-content: center;
  --mr-unit: clamp(12px, 2.8vw, 20px);
}
.mr-shape.target { --mr-unit: clamp(16px, 3.8vw, 26px); }
.mr-cell {
  width: var(--mr-unit);
  height: var(--mr-unit);
  border-radius: 4px;
  background: transparent;
}
.mr-cell.filled {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--primary) 72%, white),
    var(--primary)
  );
  box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 32%, transparent);
}
`;

export default {
  id: "mental-rotation",
  title: "空間旋轉",
  description: "從四個選項中找出原始圖形旋轉後的樣子，訓練空間推理與心理旋轉。",
  icon: "🧊",
  color: "#0ea5e9",
  category: "空間",
  tags: ["空間推理", "心理旋轉"],
  duration: 90,
  howTo: [
    "先觀察上方「原始圖形」",
    "找出哪一個選項是原始圖形旋轉後的樣子",
    "鏡像翻轉不算旋轉，共 8 個回合",
  ],

  mount(container, api) {
    injectStyles("mental-rotation", styles);

    let round = 0;
    let correct = 0;
    let done = false;
    let locked = false;
    let nextId = null;
    let roundData = null;
    let optionButtons = [];
    const controller = new AbortController();

    const roundEl = el("strong", { text: `0 / ${ROUNDS}` });
    const correctEl = el("strong", { text: "0" });
    const targetWrap = el("div", { class: "mr-target-wrap" });
    const prompt = el("p", {
      class: "mr-prompt",
      text: "哪一個是原始圖形旋轉後的樣子？",
    });
    const options = el("div", { class: "mr-options" });

    const panel = el(
      "div",
      { class: "game-panel mr-panel" },
      el(
        "div",
        { class: "hud" },
        statChip("回合", roundEl),
        statChip("答對", correctEl)
      ),
      targetWrap,
      prompt,
      options,
      el("p", {
        class: "game-status",
        text: "只有一個選項是旋轉，其他都是鏡像。用 1–4 鍵也能作答。",
      })
    );
    container.append(panel);

    function buildRound() {
      const base = normalize(pick(SHAPE_POOL));
      const baseKey = shapeKey(base);
      const rotations = rotationsOf(base).filter((cells) => shapeKey(cells) !== baseKey);
      const reflections = reflectionsOf(base);

      const correctCells = pick(rotations);
      const correctKey = shapeKey(correctCells);
      const distractors = shuffle(reflections).filter((cells) => shapeKey(cells) !== correctKey);
      const chosen = [correctCells, ...distractors.slice(0, 3)];

      return {
        target: base,
        correctKey,
        options: shuffle(
          chosen.map((cells) => ({
            cells,
            isCorrect: shapeKey(cells) === correctKey,
          }))
        ),
      };
    }

    function startRound() {
      if (done) return;
      round += 1;
      if (round > ROUNDS) {
        finish();
        return;
      }

      locked = false;
      roundData = buildRound();
      roundEl.textContent = `${round} / ${ROUNDS}`;
      prompt.textContent = "哪一個是原始圖形旋轉後的樣子？";
      targetWrap.replaceChildren(
        el("span", { class: "mr-target-label", text: "原始圖形" }),
        shapeNode(roundData.target, "target")
      );

      optionButtons = roundData.options.map((option, index) => {
        const button = el("button", {
          class: "mr-option",
          type: "button",
          "aria-label": `選項 ${index + 1}`,
        });
        button.append(shapeNode(option.cells, "option"));
        button.addEventListener("click", () => choose(option, button));
        return { button, option };
      });
      options.replaceChildren(...optionButtons.map(({ button }) => button));
    }

    function choose(option, button) {
      if (locked || done) return;
      locked = true;

      if (option.isCorrect) {
        correct += 1;
        correctEl.textContent = String(correct);
        sound.correct();
      } else {
        button.classList.add("is-wrong");
        sound.wrong();
      }

      optionButtons.forEach((entry) => {
        entry.button.disabled = true;
        if (entry.option.isCorrect) entry.button.classList.add("is-right");
      });

      prompt.textContent = option.isCorrect ? "答對了！這是旋轉後的圖形。" : "這是鏡像，不是旋轉。";
      nextId = window.setTimeout(
        () => {
          if (!done) startRound();
        },
        option.isCorrect ? 650 : 1100
      );
    }

    function finish() {
      if (done) return;
      done = true;
      locked = true;
      window.clearTimeout(nextId);
      controller.abort();
      optionButtons.forEach(({ button }) => {
        button.disabled = true;
      });

      api.finish({
        score: clamp(Math.round((correct / ROUNDS) * 1000), 0, 1000),
        summary:
          correct === ROUNDS
            ? "全部答對，空間旋轉能力非常出色！"
            : correct >= 6
              ? "空間感不錯，再多練幾次會更敏銳。"
              : "試著先在腦中把圖形轉 90 度，再逐一比對。",
        details: [
          { label: "答對", value: `${correct} / ${ROUNDS}` },
          { label: "準確率", value: `${Math.round((correct / ROUNDS) * 100)}%` },
        ],
      });
    }

    window.addEventListener(
      "keydown",
      (event) => {
        if (done || locked) return;
        const index = Number(event.key) - 1;
        if (Number.isInteger(index) && index >= 0 && index < 4) {
          event.preventDefault();
          const entry = optionButtons[index];
          if (entry) entry.button.click();
        }
      },
      { signal: controller.signal }
    );

    startRound();

    return () => {
      done = true;
      window.clearTimeout(nextId);
      controller.abort();
    };
  },
};
