/**
 * 遊戲範本
 * 複製這個檔案為 js/games/<你的遊戲>.js，修改內容後，
 * 在 js/games/index.js 匯入並加入 registerGames([...]) 陣列即可。
 */
import { el, injectStyles, statChip, clamp } from "../core/utils.js";
import { sound } from "../core/audio.js";

const styles = `
.tpl-panel { max-width: 560px; margin: 0 auto; text-align: center; }
.tpl-button {
  width: 100%;
  margin-top: 16px;
  min-height: 160px;
  font-size: 28px;
  font-weight: 800;
}
`;

export default {
  // 唯一 id，會用於網址與儲存紀錄
  id: "template-game",
  title: "遊戲範本",
  description: "這是一個可運作的範例，複製後改造成你自己的腦力訓練。",
  icon: "🧪",
  color: "#22c55e",
  category: "綜合",
  tags: ["範例"],
  duration: 10,
  howTo: ["在 10 秒內盡量點擊按鈕", "每次點擊都會累積分數", "時間結束後自動結算"],

  mount(container, api) {
    injectStyles("template-game", styles);

    let clicks = 0;
    let timeLeft = 10;
    let done = false;

    const timeEl = el("strong", { text: String(timeLeft) });
    const clickEl = el("strong", { text: "0" });

    const button = el("button", {
      class: "btn btn-primary tpl-button",
      type: "button",
      text: "點我！",
    });

    const panel = el(
      "div",
      { class: "game-panel tpl-panel" },
      el(
        "div",
        { class: "hud" },
        statChip("剩餘時間", el("span", {}, timeEl, " 秒")),
        statChip("點擊次數", clickEl)
      ),
      button
    );
    container.append(panel);

    function finish() {
      if (done) return;
      done = true;
      window.clearInterval(timerId);
      api.finish({
        score: clamp(clicks * 20, 0, 1000),
        summary: `你總共點了 ${clicks} 次！`,
        details: [{ label: "點擊次數", value: `${clicks} 次` }],
      });
    }

    button.addEventListener("click", () => {
      if (done) return;
      clicks += 1;
      clickEl.textContent = String(clicks);
      sound.click();
    });

    const timerId = window.setInterval(() => {
      timeLeft -= 1;
      timeEl.textContent = String(Math.max(0, timeLeft));
      if (timeLeft <= 0) finish();
    }, 1000);

    // 回傳清理函式：離開頁面或重玩時會自動呼叫
    return () => {
      done = true;
      window.clearInterval(timerId);
    };
  },
};
