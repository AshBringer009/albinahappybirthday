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
export const TARGET_DATE = "2025-08-31";

export const SCREENS = [
  {
    id: 0,
    title: "Пролог ❤️",
    subtitle: "Я спрятал для тебя 8 маленьких моментов.\nСоберёшь их все?",
    primaryCtaText: "Начать путь",
    primaryCtaTextContinue: "Продолжить путь",
    secondaryCtaText: "Начать заново",
    type: "prologue",
  },
  {
    id: 1,
    title: "Тёплый день",
    text: "Один день стал особенным.",
    type: "date",
    gameConfig: {
      leadTitle: "С чего всё началось ❤️",
      leadText: "В этот день мир стал чуть теплее. Давай вспомним его.",
      leadHint: "Набирай только цифры — точки появятся сами ✨",
    },
  },
  {
    id: 2,
    title: "Собери фразу кликами",
    text: "Нажимай слова по порядку.",
    type: "phrase",
    gameConfig: {
      words: ["ты", "мой", "самый", "тёплый", "дом"],
      expectedOrder: ["ты", "мой", "самый", "тёплый", "дом"],
    },
  },
  {
    id: 3,
    title: "Найди сердечко",
    text: "Одно сердечко спряталось среди карточек.",
    type: "heart",
    gameConfig: {
      correctIndex: 6,
      hint: "Оно ближе к середине.",
    },
  },
  {
    id: 4,
    title: "Шифр-слово",
    text: "Разгадай слово.",
    type: "cipher",
    gameConfig: {
      cipher: "Л❤️БЛЮ",
      answer: "люблю",
    },
  },
  {
    id: 5,
    title: "Выбор-сцена",
    text: "Что ты выбираешь в этот момент?",
    type: "choice",
    gameConfig: {
      options: ["Обнять", "Смеяться", "Тихо рядом"],
    },
  },
  {
    id: 6,
    title: "Открой фото плитками",
    text: "Сними все плитки, чтобы увидеть фото.",
    type: "tiles",
    gameConfig: {
      image: "assets/img/photo.jpg",
      tiles: 9,
    },
  },
  {
    id: 7,
    title: "Стрелки-последовательность",
    text: "Повтори последовательность стрелок.",
    type: "arrows",
    gameConfig: {
      sequence: ["→", "→", "↓", "←"],
    },
  },
  {
    id: 8,
    title: "Финал-пазл",
    text: "Собери письмо из кусочков.",
    type: "puzzle",
  },
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
