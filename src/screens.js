import { loadState, saveState } from "./state.js";

export const PIECES = Array.from({ length: 8 }, (_, index) => {
  const id = index + 1;
  const audioId = String(id).padStart(2, "0");
  return {
    id,
    img: `assets/pieces/p${id}.png`,
    audio: `assets/audio/${audioId}.mp3`,
  };
});

export const FINAL_LETTER_PATH = "assets/final/letter.html";

export const SCREENS = [
  {
    id: 0,
    title: "Пролог",
    text: "Восемь этапов, восемь кусочков письма. Собери их все.",
  },
  ...Array.from({ length: 8 }, (_, index) => {
    const id = index + 1;
    return {
      id,
      title: `Этап ${id}`,
      text: "Мини-игра-заглушка. Нажми кнопку, чтобы подтвердить прохождение.",
    };
  }),
];

export function unlockPiece(pieceId) {
  const state = loadState();
  const alreadyUnlocked = state.unlockedPieces.includes(pieceId);
  if (!alreadyUnlocked) {
    state.unlockedPieces = [...state.unlockedPieces, pieceId].sort((a, b) => a - b);
    saveState(state);
  }
  return state;
}
