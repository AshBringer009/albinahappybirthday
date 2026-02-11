import { loadState, saveState } from "./state.js";
import { PIECES, FINAL_LETTER_PATH } from "./screens.js";

let selectedPieceId = null;
let activeAudio = null;
let playlistIndex = 0;

function pieceById(pieceId) {
  return PIECES.find((piece) => piece.id === pieceId);
}

function allSlotsFilledCorrectly(state) {
  return PIECES.every((piece) => Number(state.placedPieces[String(piece.id)]) === piece.id);
}

function showToast(root, message) {
  const toast = root.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("toast--visible");
  window.clearTimeout(toast._toastTimer);
  toast._toastTimer = window.setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, 1800);
}

function replaceImageWithPlaceholder(imgEl, label) {
  const placeholder = document.createElement("div");
  placeholder.className = "img-placeholder";
  placeholder.textContent = label;
  placeholder.dataset.placeholder = "true";
  imgEl.replaceWith(placeholder);
}

export function attemptPlace(pieceId, slotId, root) {
  const state = loadState();
  const slotKey = String(slotId);
  const piece = pieceById(pieceId);

  if (!piece) {
    showToast(root, "Такого кусочка нет");
    return state;
  }
  if (!state.unlockedPieces.includes(pieceId)) {
    showToast(root, "Кусочек ещё не получен");
    return state;
  }
  if (state.placedPieces[slotKey]) {
    showToast(root, "Этот слот уже занят");
    return state;
  }

  if (Number(slotId) !== Number(pieceId)) {
    showToast(root, "Почти! Попробуй другой слот");
    return state;
  }

  state.placedPieces = { ...state.placedPieces, [slotKey]: pieceId };
  if (allSlotsFilledCorrectly(state)) {
    state.puzzleSolved = true;
  }
  saveState(state);
  return state;
}

export function autoPlace() {
  const state = loadState();
  const updated = { ...state, placedPieces: { ...state.placedPieces } };

  updated.unlockedPieces.forEach((pieceId) => {
    updated.placedPieces[String(pieceId)] = pieceId;
  });

  updated.puzzleSolved = allSlotsFilledCorrectly(updated);

  saveState(updated);
  return updated;
}

export function clearPlaced() {
  const state = loadState();
  const updated = { ...state, placedPieces: {}, puzzleSolved: false };
  saveState(updated);
  return updated;
}

export function playlistPlayAll(root) {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  playlistIndex = 0;

  const playNext = () => {
    if (playlistIndex >= PIECES.length) {
      activeAudio = null;
      return;
    }

    const piece = PIECES[playlistIndex];
    playlistIndex += 1;
    activeAudio = new Audio(piece.audio);
    activeAudio.onended = playNext;
    activeAudio.onerror = () => {
      showToast(root, "Не удалось воспроизвести аудио");
      playNext();
    };
    activeAudio.play().catch(() => {
      showToast(root, "Нужен клик, чтобы включить звук");
    });
  };

  playNext();
}

function renderTray(state) {
  const placedIds = new Set(Object.values(state.placedPieces).map(Number));
  const available = state.unlockedPieces.filter((id) => !placedIds.has(id));

  if (available.length === 0) {
    return `
      <div class="tray-empty">Все полученные кусочки уже на месте</div>
    `;
  }

  return available
    .map((pieceId) => {
      const piece = pieceById(pieceId);
      return `
        <div class="piece" draggable="true" data-piece-id="${piece.id}">
          <img src="${piece.img}" alt="Кусочек ${piece.id}" data-piece-id="${piece.id}" />
          <span>${piece.id}</span>
        </div>
      `;
    })
    .join("");
}

function renderBoard(state) {
  return PIECES.map((piece) => {
    const slotId = piece.id;
    const placedId = state.placedPieces[String(slotId)];
    const placedPiece = placedId ? pieceById(Number(placedId)) : null;
    return `
      <div class="slot" data-slot-id="${slotId}">
        ${placedPiece ? `<img src="${placedPiece.img}" alt="Кусочек ${slotId}" data-piece-id="${slotId}" />` : `<span>${slotId}</span>`}
      </div>
    `;
  }).join("");
}

function applySelection(root) {
  root.querySelectorAll(".piece").forEach((pieceEl) => {
    const pieceId = Number(pieceEl.dataset.pieceId);
    if (pieceId === selectedPieceId) {
      pieceEl.classList.add("piece--selected");
    } else {
      pieceEl.classList.remove("piece--selected");
    }
  });
}

export function renderPuzzle(state, root) {
  const solvedClass = state.puzzleSolved ? "puzzle puzzle--solved" : "puzzle";

  root.innerHTML = `
    <section class="${solvedClass}">
      <div class="puzzle-header">
        <h2>Сборка письма</h2>
        <p>Перетащи кусочки на правильные места или тапни на них, а затем на слот.</p>
      </div>

      <div class="board" aria-label="Письмо">
        ${renderBoard(state)}
      </div>

      <div class="tray">
        <h3>Доступные кусочки</h3>
        <div class="tray-row">
          ${renderTray(state)}
        </div>
      </div>

      <div class="puzzle-actions">
        <button class="btn" data-action="auto">Авто-собрать</button>
        <button class="btn" data-action="clear">Сбросить пазл</button>
        <button class="btn btn-outline" data-action="full-reset">Начать сначала</button>
      </div>

      <div class="after" ${state.puzzleSolved ? "" : "hidden"}>
        <div class="after-head">
          <span class="after-ratio">8/8 → ∞</span>
          <h3>Письмо собрано</h3>
        </div>
        <div class="final-letter" data-final-root="true">
          ${FINAL_LETTER_PATH.match(/\\.(png|jpe?g|gif|webp)$/i)
            ? `<img src="${FINAL_LETTER_PATH}" alt="Письмо" data-final-media="img" />`
            : `<iframe src="${FINAL_LETTER_PATH}" title="Письмо" loading="lazy" data-final-media="iframe"></iframe>`}
          <div class="final-placeholder" data-final-placeholder="true">
            Файл письма пока не добавлен. Замените FINAL_LETTER_PATH.
          </div>
        </div>
        <button class="btn" data-action="playlist">Прослушать всё</button>
      </div>

      <div class="confetti" aria-hidden="true"></div>
      <div class="toast" aria-live="polite"></div>
    </section>
  `;

  const trayPieces = root.querySelectorAll(".piece");
  trayPieces.forEach((pieceEl) => {
    pieceEl.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", pieceEl.dataset.pieceId);
    });

    pieceEl.addEventListener("click", () => {
      selectedPieceId = Number(pieceEl.dataset.pieceId);
      applySelection(root);
      showToast(root, `Выбран кусочек ${selectedPieceId}`);
    });
  });

  const slots = root.querySelectorAll(".slot");
  slots.forEach((slot) => {
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      const pieceId = Number(event.dataTransfer.getData("text/plain"));
      const slotId = Number(slot.dataset.slotId);
      const updated = attemptPlace(pieceId, slotId, root);
      renderPuzzle(updated, root);
    });

    slot.addEventListener("click", () => {
      if (!selectedPieceId) {
        showToast(root, "Сначала выбери кусочек");
        return;
      }
      const slotId = Number(slot.dataset.slotId);
      const updated = attemptPlace(selectedPieceId, slotId, root);
      if (updated.placedPieces[String(slotId)]) {
        selectedPieceId = null;
      }
      renderPuzzle(updated, root);
    });
  });

  root.querySelectorAll("img[data-piece-id]").forEach((imgEl) => {
    imgEl.addEventListener("error", () => {
      const pieceId = imgEl.dataset.pieceId || "—";
      replaceImageWithPlaceholder(imgEl, `Нет файла (${pieceId})`);
    }, { once: true });
  });

  const finalRoot = root.querySelector("[data-final-root]");
  if (finalRoot) {
    const placeholder = finalRoot.querySelector("[data-final-placeholder]");
    const media = finalRoot.querySelector("[data-final-media]");
    if (media && placeholder) {
      media.addEventListener("load", () => {
        placeholder.hidden = true;
      }, { once: true });
      media.addEventListener("error", () => {
        placeholder.hidden = false;
        if (media.tagName.toLowerCase() === "img") {
          replaceImageWithPlaceholder(media, "Письмо не найдено");
        }
      }, { once: true });
    }
  }

  root.querySelectorAll("[data-action='auto']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const updated = autoPlace();
      renderPuzzle(updated, root);
    });
  });

  root.querySelectorAll("[data-action='clear']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const updated = clearPlaced();
      renderPuzzle(updated, root);
    });
  });

  root.querySelectorAll("[data-action='playlist']").forEach((btn) => {
    btn.addEventListener("click", () => playlistPlayAll(root));
  });

  applySelection(root);
}
