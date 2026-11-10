import { el } from "../core/utils.js";

const sampleCode = `import { el, injectStyles } from "../core/utils.js";

const styles = \`.my-game { text-align: center; }\`;

export default {
  id: "my-game",
  title: "我的遊戲",
  description: "一句話介紹這個訓練。",
  icon: "🎯",
  color: "#22c55e",
  category: "專注",
  tags: ["自訂"],
  duration: 30,
  howTo: ["看完題目後選出答案", "限時內完成即可得分"],

  mount(container, api) {
    injectStyles("my-game", styles);

    const button = el("button", {
      class: "btn btn-primary",
      text: "完成訓練",
      onclick: () =>
        api.finish({
          score: 800,
          summary: "第一次自訂訓練完成！",
          details: [{ label: "答對", value: "8 / 10" }],
        }),
    });

    container.append(el("div", { class: "game-panel my-game" }, button));

    return () => {
      // 離開頁面或重玩時，清除計時器與事件監聽
    };
  },
};`;

function guideStep(number, title, ...content) {
  return el(
    "li",
    { class: "guide-step" },
    el("span", { class: "step-num", text: String(number) }),
    el("div", {}, el("h3", { text: title }), ...content)
  );
}

function apiItem(title, ...content) {
  return el("div", { class: "api-item" }, el("h3", { text: title }), ...content);
}

export function renderAbout(root) {
  const head = el(
    "div",
    { class: "page-head" },
    el("a", { class: "back-link", href: "#/" }, "← 返回大廳"),
    el("h1", { text: "擴充指南" }),
    el("p", {
      text: "靈活腦學校採用「一個遊戲一個檔案」的外掛式設計。新增訓練不需要打包工具，只要建立模組並註冊即可。",
    })
  );

  const stepsPanel = el(
    "section",
    { class: "panel" },
    el("h2", { text: "新增一款遊戲" }),
    el("p", { text: "整個流程大約 10 分鐘，適合用純 HTML、CSS 與 JavaScript 實作。" }),
    el(
      "ol",
      { class: "guide-steps" },
      guideStep(
        1,
        "複製遊戲範本",
        el(
          "p",
          {},
          "開啟 ",
          el(
            "a",
            { href: "./js/games/_template.js", target: "_blank", rel: "noreferrer" },
            el("code", { text: "js/games/_template.js" })
          ),
          "，另存為例如 ",
          el("code", { text: "js/games/my-game.js" }),
          "。"
        )
      ),
      guideStep(
        2,
        "填寫遊戲資料",
        el(
          "p",
          {},
          "設定 ",
          el("code", { text: "id" }),
          "、",
          el("code", { text: "title" }),
          "、",
          el("code", { text: "category" }),
          "、",
          el("code", { text: "howTo" }),
          " 等欄位；大廳卡片與遊戲說明頁會自動產生。"
        )
      ),
      guideStep(
        3,
        "實作 mount(container, api)",
        el(
          "p",
          {},
          "在 ",
          el("code", { text: "container" }),
          " 中建立遊戲介面，結束時呼叫 ",
          el("code", { text: "api.finish({ score })" }),
          "，並回傳一個清理函式。"
        )
      ),
      guideStep(
        4,
        "註冊遊戲",
        el(
          "p",
          {},
          "在 ",
          el("code", { text: "js/games/index.js" }),
          " 匯入新模組，並加入 ",
          el("code", { text: "registerGames([...])" }),
          " 陣列。"
        )
      ),
      guideStep(
        5,
        "完成",
        el("p", {}, "重新整理網頁即可看到新遊戲，不需要建置或重新部署設定。")
      )
    ),
    el("pre", { class: "code-block" }, el("code", { text: sampleCode }))
  );

  const apiPanel = el(
    "section",
    { class: "panel" },
    el("h2", { text: "遊戲 API" }),
    el("p", { text: "掛載函式會收到兩個參數，回傳值可選但建議提供清理函式。" }),
    el(
      "div",
      { class: "api-list" },
      apiItem(
        "container",
        el("p", {}, "一個空的 ", el("code", { text: "<div>" }), "，遊戲的 UI 直接插入其中。")
      ),
      apiItem(
        "api.finish(result)",
        el(
          "p",
          {},
          "結束訓練並顯示結算畫面。",
          el("br"),
          el("code", { text: "score" }),
          "：0–1000，越高越好（反應時間請自行轉換）。",
          el("br"),
          el("code", { text: "summary" }),
          "：一句結算評語；",
          el("code", { text: "details" }),
          "：[{ label, value }] 額外統計。"
        )
      ),
      apiItem(
        "api.best",
        el("p", {}, "目前該遊戲的最佳分數，可用來顯示個人紀錄。")
      ),
      apiItem(
        "api.game",
        el("p", {}, "遊戲定義本身，包含 id、title、category 等中繼資料。")
      ),
      apiItem(
        "清理函式",
        el(
          "p",
          {},
          "mount 回傳的函式會在離開頁面或重玩時執行，請清除 ",
          el("code", { text: "setInterval" }),
          "、",
          el("code", { text: "setTimeout" }),
          " 與事件監聽。"
        )
      )
    ),
    el(
      "div",
      { class: "callout" },
      el("strong", { text: "共用工具：" }),
      " 從 ",
      el("code", { text: "js/core/utils.js" }),
      " 取用 ",
      el("code", { text: "el" }),
      "、",
      el("code", { text: "injectStyles" }),
      "、",
      el("code", { text: "shuffle" }),
      "、",
      el("code", { text: "randInt" }),
      "、",
      el("code", { text: "clamp" }),
      "、",
      el("code", { text: "sleep" }),
      " 等函式；音效則使用 ",
      el("code", { text: "js/core/audio.js" }),
      " 的 ",
      el("code", { text: "sound" }),
      "。"
    )
  );

  const deploy = el(
    "section",
    { class: "panel", style: { marginTop: "18px" } },
    el("h2", { text: "部署到 GitHub Pages" }),
    el(
      "p",
      {},
      "專案沒有任何建置步驟，整份目錄就是靜態網站。推送到 ",
      el("code", { text: "main" }),
      " 分支後，內建的 GitHub Actions 會自動部署。第一次使用時，請到 repository 的 Settings → Pages，將 Source 設為 ",
      el("strong", { text: "GitHub Actions" }),
      "。"
    ),
    el(
      "div",
      { class: "callout" },
      el("strong", { text: "小提醒：" }),
      " 遊戲分數存於瀏覽器 ",
      el("code", { text: "localStorage" }),
      "，不會上傳到伺服器；換裝置或清除瀏覽資料後紀錄會消失。"
    )
  );

  root.replaceChildren(
    head,
    el("div", { class: "about-grid" }, stepsPanel, apiPanel),
    deploy
  );
}
