const STORAGE_KEY = "albina_bday_state_v1";

const defaultState = {
  step: 0,
  unlockedPieces: [],
  placedPieces: {},
  puzzleSolved: false,
  audioEnabled: true,
  games: {},
  choice5: null,
};

function normalizeState(state) {
  if (!state || typeof state !== "object") {
    return { ...defaultState };
  }

  return {
    step: Number.isFinite(state.step) ? state.step : defaultState.step,
    unlockedPieces: Array.isArray(state.unlockedPieces) ? state.unlockedPieces : [],
    placedPieces: state.placedPieces && typeof state.placedPieces === "object" ? state.placedPieces : {},
    puzzleSolved: Boolean(state.puzzleSolved),
    audioEnabled: state.audioEnabled !== undefined ? Boolean(state.audioEnabled) : defaultState.audioEnabled,
    games: state.games && typeof state.games === "object" ? state.games : {},
    choice5: state.choice5 ?? null,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    return { ...defaultState };
  }
}

export function saveState(state) {
  const normalized = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function resetState() {
  const fresh = { ...defaultState };
  saveState(fresh);
  return fresh;
}

export { STORAGE_KEY, defaultState };
