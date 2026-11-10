import { el, injectStyles, randInt, clamp, statChip, formatMs } from "../core/utils.js";
import { sound } from "../core/audio.js";

const ROUNDS = 5;

const styles = `
.rt-panel { max-width: 680px; margin: 0 auto; }
.rt-pad {
  width: 100%;
  min-height: clamp(280px, 46vh, 390px);
  display: grid;
  place-content: center;
  gap: 10px;
  text-align: center;
  padding: 24px;
  border-radius: 22px;
  border: 2px solid var(--border-strong);
  font-family: inherit;
  color: var(--text);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
}
.rt-pad.waiting {
  background: color-mix(in srgb, var(--danger) 10%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--danger) 32%, var(--border));
}
.rt-pad.ready {
  background: linear-gradient(150deg, #22c55e, #15803d);
  border-color: #22c55e;
  color: #fff;
  transform: scale(0.995);
}
.rt-pad.early {
  background: color-mix(in srgb, var(--warning) 16%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--warning) 48%, var(--border));
}
.rt-pad.done {
  background: color-mix(in srgb, var(--primary) 10%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
}
.rt-title {
  font-size: clamp(34px, 7vw, 56px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.rt-sub { font-size: 14px; opacity: 0.78; }
.rt-dots { display: flex; justify-content: center; gap: 8px; margin-top: 18px; }
.rt-dot {
  width: 13px; height: 13px; border-radius: 50%;
  background: var(--surface-3);
  transition: background 0.2s ease, transform 0.2s ease;
}
.rt-dot.done { background: var(--primary); transform: scale(1.1); }
.rt-dot.foul { background: var(--warning); }
`;

export default {
  id: "reaction-time",
  title: "反應極限",
  description: "看到綠色就立刻按下，測試你的純粹反應速度，共五個回合。",
  icon: "⚡",
  color: "#f59e0b",
  category: "反應",
  tags: ["反應速度", "專注"],
  duration: 30,
  howTo: [
    "畫面變綠時，立刻按下大方塊",
    "紅色階段按下會判定為「太早」並記為慢速",
    "完成 5 個回合後結算平均反應時間",
  ],

  mount(container, api) {
    injectStyles("reaction-time", styles);

    let phase = "idle";
    let round = 0;
    let done = false;
    let fouls = 0;
    let startedAt = 0;
    let roundTimeout = null;
    let nextTimeout = null;
    const times = [];

    const roundEl = el("strong", { text: `0 / ${ROUNDS}` });
    const lastEl = el("strong", { text: "—" });
    const avgEl = el("strong", { text: "—" });

    const title = el("span", { class: "rt-title", text: "準備…" });
    const subtitle = el("span", { class: "rt-sub", text: "看到綠色就立刻按下" });
    const pad = el("button", { class: "rt-pad waiting", type: "button" }, title, subtitle);
    const dots = el("div", { class: "rt-dots", "aria-hidden": "true" });

    const panel = el(
      "div",
      { class: "game-panel rt-panel" },
      el(
        "div",
        { class: "hud" },
        statChip("回合", roundEl),
        statChip("上一回合", lastEl),
        statChip("平均反應", avgEl)
      ),
      pad,
      dots,
      el("p", { class: "game-status", text: "用滑鼠、觸控或空白鍵都可以。" })
    );
    container.append(panel);

    for (let index = 0; index < ROUNDS; index += 1) {
      dots.append(el("span", { class: "rt-dot" }));
    }

    function setPad(kind, heading, copy) {
      pad.className = `rt-pad ${kind}`;
      pad.replaceChildren(
        el("span", { class: "rt-title", text: heading }),
        el("span", { class: "rt-sub", text: copy })
      );
    }

    function dotAt(index) {
      return dots.children[index];
    }

    function beginRound() {
      if (done) return;
      phase = "waiting";
      setPad("waiting", "準備…", "看到綠色就立刻按下");
      roundTimeout = window.setTimeout(() => {
        if (done) return;
        phase = "ready";
        startedAt = performance.now();
        setPad("ready", "按！", "越快越好");
        sound.tick();
      }, randInt(1100, 3000));
    }

    function record(ms, foul) {
      times.push(ms);
      const dot = dotAt(round);
      if (dot) dot.classList.add(foul ? "foul" : "done");
      round += 1;
      roundEl.textContent = `${round} / ${ROUNDS}`;
      lastEl.textContent = formatMs(ms);
      const average = times.reduce((sum, value) => sum + value, 0) / times.length;
      avgEl.textContent = formatMs(average);
    }

    function advance() {
      if (done) return;
      if (round >= ROUNDS) {
        finish();
      } else {
        beginRound();
      }
    }

    function handlePress() {
      if (done) return;
      if (phase === "waiting") {
        window.clearTimeout(roundTimeout);
        phase = "result";
        fouls += 1;
        record(600, true);
        setPad("early", "太快了！", "等畫面變綠再按");
        sound.wrong();
        nextTimeout = window.setTimeout(advance, 900);
      } else if (phase === "ready") {
        const ms = performance.now() - startedAt;
        phase = "result";
        record(ms, false);
        setPad("done", formatMs(ms), round >= ROUNDS ? "結算中…" : "下一回合準備中…");
        sound.correct();
        nextTimeout = window.setTimeout(advance, 750);
      }
    }

    function finish() {
      if (done) return;
      done = true;
      phase = "idle";
      window.clearTimeout(roundTimeout);
      window.clearTimeout(nextTimeout);
      window.removeEventListener("keydown", onKeydown);

      const average = times.reduce((sum, value) => sum + value, 0) / times.length;
      const fastest = Math.min(...times);
      const score = clamp(Math.round(((500 - average) / 320) * 1000), 0, 1000);
      api.finish({
        score,
        summary:
          average < 240
            ? "反應神速！你的神經傳導非常靈敏。"
            : average < 340
              ? "反應不錯，再專注一點就能更快。"
              : "放鬆肩膀，把注意力集中在畫面變化。",
        details: [
          { label: "平均反應", value: formatMs(average) },
          { label: "最快反應", value: formatMs(fastest) },
          { label: "太早按下", value: `${fouls} 次` },
        ],
      });
    }

    function onKeydown(event) {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        handlePress();
      }
    }

    pad.addEventListener("click", handlePress);
    window.addEventListener("keydown", onKeydown);
    beginRound();

    return () => {
      done = true;
      window.clearTimeout(roundTimeout);
      window.clearTimeout(nextTimeout);
      window.removeEventListener("keydown", onKeydown);
    };
  },
};
