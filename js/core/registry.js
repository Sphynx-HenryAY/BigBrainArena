const games = new Map();

export function defineGame(definition) {
  if (!definition || typeof definition !== "object") {
    console.error("[registry] 遊戲定義必須是物件。");
    return null;
  }
  if (!definition.id || typeof definition.id !== "string") {
    console.error("[registry] 遊戲缺少 id。", definition);
    return null;
  }
  if (typeof definition.mount !== "function") {
    console.error(`[registry] 遊戲「${definition.id}」缺少 mount(root, api) 函式。`);
    return null;
  }
  if (games.has(definition.id)) {
    console.warn(`[registry] 遊戲 id「${definition.id}」重複，後者將覆蓋前者。`);
  }

  const game = {
    icon: "🎮",
    color: "#7c3aed",
    category: "綜合",
    tags: [],
    duration: null,
    howTo: [],
    description: "",
    ...definition,
  };

  games.set(game.id, game);
  return game;
}

export function registerGames(definitions) {
  definitions.filter(Boolean).forEach(defineGame);
  return getGames();
}

export function getGames() {
  return [...games.values()];
}

export function getGame(id) {
  return games.get(id);
}

export function getCategories() {
  return ["全部", ...new Set(getGames().map((game) => game.category).filter(Boolean))];
}
