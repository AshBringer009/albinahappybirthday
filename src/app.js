import { loadState, saveState, resetState } from "./state.js";
import { PIECES, SCREENS, unlockPiece } from "./screens.js";
import { renderPuzzle } from "./puzzle.js";

const app = document.getElementById("app");
let previewAudio = null;

function replaceImageWithPlaceholder(imgEl, label) {
  const placeholder = document.createElement("div");
  placeholder.className = "img-placeholder";
  placeholder.textContent = label;
  placeholder.dataset.placeholder = "true";
  imgEl.replaceWith(placeholder);
}

function playPreview(audioPath) {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  previewAudio = new Audio(audioPath);
  previewAudio.onerror = () => {
    alert("Аудио-файл не найден");
  };
  previewAudio.play().catch(() => {
    alert("Нужен клик, чтобы включить звук");
  });
}

function setStep(step) {
  const state = loadState();
  const next = { ...state, step };
  saveState(next);
  renderApp();
}

function resetProgress() {
  resetState();
  renderApp();
}

function renderProgress(state) {
  const count = state.unlockedPieces.length;
  const percent = Math.round((count / PIECES.length) * 100);
  return `
    <div class="progress">
      <div class="progress-label">${count}/8</div>
      <div class="progress-bar"><span style="width:${percent}%"></span></div>
    </div>
  `;
}

function renderCollection(state) {
  return `
    <div class="collection">
      ${PIECES.map((piece) => {
        const unlocked = state.unlockedPieces.includes(piece.id);
        return `
          <div class="collection-cell ${unlocked ? "unlocked" : ""}">
            <span>${piece.id}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPrologue() {
  const screen = SCREENS[0];
  app.innerHTML = `
    <section class="screen screen--center">
      <div class="card">
        <h1>${screen.title}</h1>
        <p>${screen.text}</p>
        <button class="btn" data-action="start">Начать путь</button>
        <button class="btn btn-outline" data-action="reset">Сбросить прогресс</button>
      </div>
    </section>
  `;

  app.querySelector("[data-action='start']").addEventListener("click", () => setStep(1));
  app.querySelector("[data-action='reset']").addEventListener("click", resetProgress);
}

function renderReward(piece) {
  return `
    <div class="reward">
      <img src="${piece.img}" alt="Кусочек ${piece.id}" data-piece-id="${piece.id}" />
      <div class="reward-actions">
        <button class="btn" data-action="audio" data-audio="${piece.audio}">
          ▶ Прослушать голосовое ${String(piece.id).padStart(2, "0")}
        </button>
        <button class="btn" data-action="next">Дальше</button>
      </div>
    </div>
  `;
}

function renderGame(step, state) {
  const piece = PIECES.find((p) => p.id === step);
  const unlocked = state.unlockedPieces.includes(step);

  return `
    <div class="card">
      <h2>${SCREENS[step].title}</h2>
      <p>${SCREENS[step].text}</p>
      ${unlocked ? renderReward(piece) : `
        <div class="game-placeholder">
          <p>Игра-заглушка. Нажми кнопку, если ты прошла этап.</p>
          <button class="btn" data-action="complete">Я прошёл</button>
        </div>
      `}
    </div>
  `;
}

function renderFinal(state) {
  app.innerHTML = `
    <section class="screen">
      <header class="screen-header">
        <div>
          <h1>Финал</h1>
          <p>Собери письмо из 8 частей.</p>
        </div>
        <button class="btn btn-outline" data-action="reset">Сбросить прогресс</button>
      </header>
      ${renderProgress(state)}
      ${renderCollection(state)}
      <div id="puzzle-root"></div>
    </section>
  `;

  app.querySelector("[data-action='reset']").addEventListener("click", resetProgress);
  const puzzleRoot = app.querySelector("#puzzle-root");
  renderPuzzle(state, puzzleRoot);

  const fullResetBtn = puzzleRoot.querySelector("[data-action='full-reset']");
  if (fullResetBtn) {
    fullResetBtn.addEventListener("click", resetProgress);
  }
}

function renderStep(state) {
  app.innerHTML = `
    <section class="screen">
      <header class="screen-header">
        <div>
          <h1>${SCREENS[state.step].title}</h1>
          <p>Этап ${state.step} из 8</p>
        </div>
      </header>
      ${renderProgress(state)}
      ${renderCollection(state)}
      ${renderGame(state.step, state)}
    </section>
  `;

  const completeBtn = app.querySelector("[data-action='complete']");
  if (completeBtn) {
    completeBtn.addEventListener("click", () => {
      unlockPiece(state.step);
      renderApp();
    });
  }

  app.querySelectorAll("img[data-piece-id]").forEach((imgEl) => {
    imgEl.addEventListener("error", () => {
      const pieceId = imgEl.dataset.pieceId || "—";
      replaceImageWithPlaceholder(imgEl, `Нет файла (${pieceId})`);
    }, { once: true });
  });

  const audioBtn = app.querySelector("[data-action='audio']");
  if (audioBtn) {
    audioBtn.addEventListener("click", () => {
      const audioPath = audioBtn.dataset.audio;
      playPreview(audioPath);
    });
  }

  const nextBtn = app.querySelector("[data-action='next']");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      setStep(state.step + 1);
    });
  }
}

export function renderScreen(step, state) {
  if (step === 0) {
    renderPrologue();
    return;
  }

  if (step === 8) {
    renderFinal(state);
    return;
  }

  renderStep(state);
}

export function renderApp() {
  const state = loadState();
  if (state.step < 0) {
    state.step = 0;
    saveState(state);
  }
  if (state.step > 8) {
    state.step = 8;
    saveState(state);
  }

  renderScreen(state.step, state);
}

renderApp();
