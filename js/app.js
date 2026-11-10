import { el, toast } from "./core/utils.js";
import { getGame } from "./core/registry.js";
import { store } from "./core/store.js";
import { sound } from "./core/audio.js";
import "./games/index.js";
import { renderHome } from "./views/home.js";
import { renderPlay } from "./views/play.js";
import { renderStats } from "./views/stats.js";
import { renderAbout } from "./views/about.js";

const view = document.getElementById("view");
const themeToggle = document.getElementById("theme-toggle");
const soundToggle = document.getElementById("sound-toggle");
const navLinks = [...document.querySelectorAll("[data-nav]")];
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

let cleanup = null;

function resolvedTheme() {
  return store.getTheme() || (mediaQuery.matches ? "dark" : "light");
}

function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggle.title = theme === "dark" ? "切換亮色主題" : "切換暗色主題";
  themeToggle.setAttribute("aria-label", themeToggle.title);
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

function updateSoundButton() {
  const enabled = store.getSound();
  soundToggle.textContent = enabled ? "🔊" : "🔇";
  soundToggle.title = enabled ? "關閉音效" : "開啟音效";
  soundToggle.setAttribute("aria-label", soundToggle.title);
  soundToggle.setAttribute("aria-pressed", String(enabled));
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  store.setTheme(next);
  applyTheme();
});

soundToggle.addEventListener("click", () => {
  const next = !store.getSound();
  store.setSound(next);
  if (next) sound.unlock();
  updateSoundButton();
  toast(next ? "已開啟音效" : "已關閉音效");
});

mediaQuery.addEventListener("change", () => {
  if (!store.getTheme()) applyTheme();
});

function parseHash() {
  const path = window.location.hash.replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "play" && parts[1]) {
    return { name: "play", id: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "stats") return { name: "stats" };
  if (parts[0] === "about") return { name: "about" };
  return { name: "home" };
}

function setActiveNav(name) {
  navLinks.forEach((link) => {
    const active = link.dataset.nav === name;
    link.classList.toggle("active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function renderNotFound() {
  setActiveNav("home");
  view.replaceChildren(
    el(
      "div",
      { class: "page-head" },
      el("a", { class: "back-link", href: "#/" }, "← 返回大廳"),
      el("h1", { text: "找不到這個訓練" }),
      el("p", { text: "遊戲可能已被移除，或網址有誤。回到大廳挑選其他訓練吧。" })
    )
  );
}

function render() {
  if (cleanup) {
    try {
      cleanup();
    } catch (error) {
      console.warn(error);
    }
    cleanup = null;
  }

  const route = parseHash();
  setActiveNav(route.name === "play" ? "home" : route.name);

  if (route.name === "play") {
    const game = getGame(route.id);
    if (!game) {
      renderNotFound();
      window.scrollTo({ top: 0 });
      return;
    }
    view.replaceChildren();
    cleanup = renderPlay(view, game) || null;
  } else if (route.name === "stats") {
    renderStats(view);
  } else if (route.name === "about") {
    renderAbout(view);
  } else {
    renderHome(view);
  }

  window.scrollTo({ top: 0 });
  view.focus({ preventScroll: true });
}

applyTheme();
updateSoundButton();
window.addEventListener("hashchange", render);
render();
