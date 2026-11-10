# 靈活腦學校 · Big Brain Arena

一個可擴充的腦力訓練小遊戲平台，靈感來自《靈活腦學校 / Brain Age》。純靜態網頁、零建置步驟，可直接部署到 GitHub Pages。

## 功能

- **九款內建訓練**：心算衝刺、記憶翻牌、反應極限、顏色風暴、記憶序列、瞬間計數、N-Back 記憶、空間旋轉、煞車挑戰
- **外掛式遊戲架構**：一個遊戲 = 一個 JS 模組，新增遊戲不需修改核心
- **個人成績**：最佳分數、腦力總分、腦年齡、連續訓練天數、各項紀錄
- **每日訓練 / 隨機挑戰**：快速開始，降低選擇障礙
- **深色 / 淺色主題、音效開關**：設定自動保存在瀏覽器
- **響應式設計**：手機、平板、桌面皆可遊玩，支援鍵盤操作
- **零依賴、零建置**：原生 ES Modules + CSS，GitHub Pages 直接可用

## 本機執行

任何靜態檔案伺服器都可以。例如：

```bash
npm start
# 或
python3 -m http.server 4173
```

然後開啟 `http://localhost:4173`。

> 直接雙擊 `index.html` 開啟 `file://` 可能因 ES Module 的 CORS 限制而無法運作，請使用本機伺服器。

## 部署到 GitHub Pages

1. 將專案推送到 GitHub 的 `main` 分支。
2. 到 repository 的 **Settings → Pages**，將 **Source** 設為 **GitHub Actions**。
3. `.github/workflows/deploy.yml` 會自動上傳並部署整份目錄。

因為所有路徑都是相對路徑，專案也能在 `https://<user>.github.io/<repo>/` 子路徑下正常運作。若偏好傳統部署，也可將 Pages 來源設為分支根目錄。

## 新增一款遊戲

### 1. 建立遊戲模組

複製 [`js/games/_template.js`](js/games/_template.js) 為 `js/games/my-game.js`，填入中繼資料並實作 `mount`。

```js
import { el } from "../core/utils.js";

export default {
  id: "my-game",              // 唯一 id（網址、儲存紀錄會用到）
  title: "我的遊戲",
  description: "一句話介紹這個訓練。",
  icon: "🎯",                  // 大廳卡片圖示
  color: "#22c55e",           // 卡片主色
  category: "專注",
  tags: ["自訂"],
  duration: 30,               // 說明頁顯示「約 30 秒」（選填）
  howTo: ["玩法步驟一", "玩法步驟二"],

  mount(container, api) {
    const button = el("button", {
      class: "btn btn-primary",
      text: "完成訓練",
      onclick: () =>
        api.finish({
          score: 800, // 0–1000，越高越好
          summary: "完成自訂訓練！",
          details: [{ label: "答對", value: "8 / 10" }],
        }),
    });

    container.append(el("div", { class: "game-panel" }, button));

    // 回傳清理函式（建議提供）
    return () => {
      // 清除 setInterval / setTimeout / 事件監聽
    };
  },
};
```

### 2. 註冊遊戲

在 `js/games/index.js` 匯入並加入陣列：

```js
import myGame from "./my-game.js";

export const games = registerGames([
  // ...其他遊戲
  myGame,
]);
```

重新整理即可。大廳卡片、路由、成績頁都會自動處理。

## 遊戲 API

`mount(container, api)` 會收到：

| 參數 | 說明 |
| --- | --- |
| `container` | 空的 `<div>`，遊戲 UI 插入此處 |
| `api.finish(result)` | 結束訓練並顯示結算畫面 |
| `api.best` | 此遊戲目前的最佳分數（number） |
| `api.game` | 遊戲定義物件本身 |

`api.finish` 的 `result`：

```ts
{
  score: number;            // 0–1000，越高越好
  summary?: string;         // 一句結算評語
  details?: { label: string; value: string }[];
}
```

**分數規範**：所有遊戲統一為 0–1000、越高越好。若遊戲本質是「越低越好」（例如反應時間），請在遊戲內換算成分數。

**清理**：`mount` 回傳的函式會在離開頁面、重玩時執行，請務必清除計時器與事件監聽，避免記憶體洩漏或背景執行。

## 可用的共用工具

- `js/core/utils.js`：`el`、`injectStyles`、`shuffle`、`randInt`、`pick`、`clamp`、`sleep`、`statChip` 等
- `js/core/audio.js`：`sound.correct()`、`sound.wrong()`、`sound.note(i)`、`sound.finish()` 等
- `js/core/store.js`：成績與設定儲存（`localStorage`）
- `js/core/registry.js`：遊戲註冊表
- `assets/css/style.css`：全站樣式與共用的遊戲 UI class（`.game-panel`、`.hud`、`.choice-grid`、`.choice-btn` 等）

每個遊戲可用 `injectStyles(id, css)` 注入自己的 CSS，讓單一檔案就能包含完整遊戲。

## 專案結構

```
index.html                  # 應用外殼
assets/
  css/style.css             # 全站樣式與共用元件
  icon.svg
js/
  app.js                    # 啟動、路由、主題與音效控制
  core/
    registry.js             # 遊戲註冊表
    store.js                # localStorage 成績儲存
    audio.js                # WebAudio 音效
    utils.js                # DOM 與通用工具
  games/
    index.js                # 遊戲清單（新增遊戲在此註冊）
    _template.js            # 可運作的遊戲範本
    math-sprint.js
    memory-match.js
    reaction-time.js
    stroop.js
    sequence-memory.js
    quick-count.js
    n-back.js
    mental-rotation.js
    go-no-go.js
  views/
    home.js                 # 訓練大廳
    play.js                 # 遊戲流程、結算
    stats.js                # 我的成績
    about.js                # 擴充指南
.github/workflows/deploy.yml
```

## 資料儲存

成績與設定存在瀏覽器的 `localStorage`（key：`bigbrain:v1`），不會上傳到任何伺服器。清除瀏覽資料或更換裝置後，紀錄會消失。
