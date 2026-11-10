import { clamp, dateKey } from "./utils.js";

const STORAGE_KEY = "bigbrain:v1";
const MAX_HISTORY = 20;

function defaults() {
  return {
    settings: { theme: null, sound: true },
    records: {},
    days: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const base = defaults();
    return {
      settings: { ...base.settings, ...(parsed.settings || {}) },
      records: parsed.records || {},
      days: Array.isArray(parsed.days) ? parsed.days : [],
    };
  } catch (error) {
    console.warn("無法讀取訓練紀錄，將使用預設值。", error);
    return defaults();
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("無法儲存訓練紀錄。", error);
  }
  listeners.forEach((listener) => listener(state));
}

function powerOf(records) {
  const bests = Object.values(records)
    .map((record) => Number(record.best) || 0)
    .filter((best) => best > 0);
  if (!bests.length) return 0;
  return Math.round(bests.reduce((sum, best) => sum + best, 0) / bests.length);
}

function markToday() {
  const key = dateKey();
  if (!state.days.includes(key)) {
    state.days = [...state.days.slice(-400), key];
  }
}

function streakFrom(days) {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const store = {
  getTheme() {
    return state.settings.theme;
  },

  setTheme(theme) {
    state.settings.theme = theme;
    save();
  },

  getSound() {
    return Boolean(state.settings.sound);
  },

  setSound(enabled) {
    state.settings.sound = Boolean(enabled);
    save();
  },

  getRecords() {
    return { ...state.records };
  },

  getRecord(gameId) {
    return state.records[gameId] || null;
  },

  getTotalPlays() {
    return Object.values(state.records).reduce((sum, record) => sum + (record.plays || 0), 0);
  },

  getPlayedCount() {
    return Object.values(state.records).filter((record) => (record.plays || 0) > 0).length;
  },

  getBrainPower() {
    return powerOf(state.records);
  },

  getBrainAge() {
    const power = powerOf(state.records);
    if (!power) return null;
    return clamp(Math.round(80 - power * 0.06), 20, 80);
  },

  getStreak() {
    return streakFrom(state.days);
  },

  getDays() {
    return [...state.days];
  },

  hasPlayedToday() {
    return state.days.includes(dateKey());
  },

  recordResult(gameId, result) {
    const score = clamp(Math.round(Number(result.score) || 0), 0, 1000);
    const previous = state.records[gameId] || { best: 0, plays: 0, history: [] };
    const previousBest = Number(previous.best) || 0;
    const isRecord = score > previousBest;
    const powerBefore = powerOf(state.records);

    state.records[gameId] = {
      ...previous,
      best: Math.max(previousBest, score),
      plays: (previous.plays || 0) + 1,
      history: [...(previous.history || []), score].slice(-MAX_HISTORY),
      lastPlayed: new Date().toISOString(),
      lastScore: score,
      lastDetails: Array.isArray(result.details) ? result.details : [],
    };
    markToday();
    save();

    const powerAfter = powerOf(state.records);
    return {
      isRecord,
      previousBest,
      best: state.records[gameId].best,
      score,
      power: powerAfter,
      powerDelta: powerAfter - powerBefore,
    };
  },

  reset() {
    state = defaults();
    save();
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
