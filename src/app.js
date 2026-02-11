import { loadState, saveState, resetState } from "./state.js";
import { PIECES, SCREENS, TARGET_DATE, unlockPiece } from "./screens.js";
import { renderPuzzle } from "./puzzle.js";

const app = document.getElementById("app");
let previewAudio = null;
let prologueCleanup = null;
let balloonLayerEl = null;

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

function getGameState(state, step, defaults) {
  const current = state.games?.[step] && typeof state.games[step] === "object" ? state.games[step] : {};
  return { ...defaults, ...current };
}

function updateGameState(step, patch) {
  const state = loadState();
  const current = state.games?.[step] && typeof state.games[step] === "object" ? state.games[step] : {};
  const updated = { ...state, games: { ...state.games, [step]: { ...current, ...patch } } };
  saveState(updated);
  return updated;
}

function ensureUnlockedIfSolved(state) {
  if (state.step >= 1 && state.step <= 7) {
    const game = getGameState(state, state.step, { solved: false });
    if (game.solved && !state.unlockedPieces.includes(state.step)) {
      unlockPiece(state.step);
      return loadState();
    }
  }
  return state;
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
  const state = loadState();
  const hasProgress = state.unlockedPieces.length > 0 || state.step > 0 || Object.keys(state.games || {}).length > 0;
  const primaryText = hasProgress ? screen.primaryCtaTextContinue : screen.primaryCtaText;
  const stepHintRaw = Number.isFinite(state.step) && state.step > 0 ? state.step : state.unlockedPieces.length;
  const stepHint = stepHintRaw >= 1 && stepHintRaw <= 8 ? stepHintRaw : null;
  const statusText = hasProgress
    ? stepHint
      ? `Продолжим с шага ${stepHint} из 8? ✨`
      : "Продолжим? ✨"
    : "Готова начать? ✨";
  if (prologueCleanup) {
    prologueCleanup();
    prologueCleanup = null;
  }

  app.innerHTML = `
    <section class="screen screen--center">
      <div class="start-card">
        <h1 class="start-title">${screen.title}</h1>
        <p class="start-subtitle">${screen.subtitle.replace(/\n/g, "<br />")}</p>
        <div class="start-actions">
          <button class="btn btn-primary pulse" data-action="start">${primaryText}</button>
          <button class="btn btn-ghost" data-action="reset">${screen.secondaryCtaText}</button>
        </div>
        <div class="start-status">${statusText}</div>
      </div>
    </section>
  `;

  document.body.classList.add("has-balloons");
  if (!balloonLayerEl) {
    balloonLayerEl = document.createElement("div");
    balloonLayerEl.className = "balloon-layer";
    balloonLayerEl.innerHTML = `
      <div class="balloon-parallax">
        <div class="balloon-field"></div>
      </div>
    `;
    document.body.appendChild(balloonLayerEl);
  }
  const balloonParallax = balloonLayerEl.querySelector(".balloon-parallax");
  const balloonField = balloonLayerEl.querySelector(".balloon-field");
  balloonField.innerHTML = "";

  const pastelColors = ["#f7b3c8", "#e7c8ff", "#f6c4a6", "#bfdcff", "#f2a9c9", "#d9c9ff", "#f5ccb5", "#cfe4ff"];
  const heartColors = ["#ffb3c7", "#f5a7bd", "#f0b6d9", "#f7c1d2", "#f2a4c0"];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const totalCount = Math.floor(rand(18, 26));
  const heartCount = Math.max(4, Math.floor(totalCount * 0.3));
  const balloonCount = totalCount - heartCount;

  const applyBalloonVars = (el, palette, options = {}) => {
    const {
      setPosition = true,
      setSize = true,
      setOpacity = true,
      setBlur = true,
      setColor = true,
      setDuration = true,
      setDelay = true,
      setSwayDelay = true,
      setStringDelay = true,
    } = options;

    if (setSize) {
      const size = rand(options.sizeMin ?? 36, options.sizeMax ?? 86);
      el.style.setProperty("--size", `${size.toFixed(1)}px`);
    }
    if (setPosition) {
      el.style.setProperty("--x", `${rand(0, 100).toFixed(2)}vw`);
    }
    if (setOpacity) {
      el.style.setProperty("--opacity", rand(options.opacityMin ?? 0.6, options.opacityMax ?? 0.8).toFixed(2));
    }
    if (setBlur) {
      el.style.setProperty("--blur", `${rand(options.blurMin ?? 0, options.blurMax ?? 0.6).toFixed(2)}px`);
    }
    if (setColor) {
      el.style.setProperty("--color", palette[Math.floor(rand(0, palette.length))]);
    }
    if (setDuration) {
      el.style.setProperty("--dur", `${rand(options.floatMin ?? 18, options.floatMax ?? 35).toFixed(2)}s`);
    }
    if (setDelay) {
      const sign = options.delaySign ?? 1;
      el.style.setProperty("--delay", `${sign * rand(0, options.delayMax ?? 6).toFixed(2)}s`);
    }
    el.style.setProperty("--sway", `${rand(options.swayRangeMin ?? 8, options.swayRangeMax ?? 18).toFixed(1)}px`);
    el.style.setProperty("--sway-dur", `${rand(options.swayMin ?? 3, options.swayMax ?? 7).toFixed(2)}s`);
    if (setSwayDelay) {
      el.style.setProperty("--sway-delay", `${-rand(0, options.swayDelayMax ?? 3).toFixed(2)}s`);
    }
    el.style.setProperty("--string-dur", `${rand(options.stringMin ?? 3, options.stringMax ?? 7).toFixed(2)}s`);
    if (setStringDelay) {
      el.style.setProperty("--string-delay", `${-rand(0, options.stringDelayMax ?? 2).toFixed(2)}s`);
    }
  };

  for (let i = 0; i < balloonCount; i += 1) {
    const balloon = document.createElement("div");
    balloon.className = "balloon";
    applyBalloonVars(balloon, pastelColors, { stringDelayMax: 2.5, delaySign: 1 });
    const inner = document.createElement("div");
    inner.className = "balloonInner";
    const shape = document.createElement("div");
    shape.className = "balloon-shape";
    inner.appendChild(shape);
    balloon.appendChild(inner);
    balloonField.appendChild(balloon);

    balloon.addEventListener("animationiteration", (event) => {
      if (event.target !== balloon || event.animationName !== "floatUp") return;
      applyBalloonVars(balloon, pastelColors, {
        stringDelayMax: 2.5,
        setPosition: false,
        setSize: false,
        setOpacity: false,
        setBlur: false,
        setDuration: false,
        setDelay: false,
        setSwayDelay: false,
        setStringDelay: false,
      });
    });
  }

  for (let i = 0; i < heartCount; i += 1) {
    const heart = document.createElement("div");
    heart.className = "balloon heart";
    applyBalloonVars(
      heart,
      heartColors,
      {
        sizeMin: 26,
        sizeMax: 56,
        opacityMin: 0.55,
        opacityMax: 0.75,
        floatMin: 18,
        floatMax: 35,
        swayRangeMin: 6,
        swayRangeMax: 14,
        delayMax: 6,
        delaySign: 1,
      },
    );
    const inner = document.createElement("div");
    inner.className = "balloonInner";
    const sway = document.createElement("div");
    sway.className = "heart-sway";
    const shape = document.createElement("div");
    shape.className = "heart-shape";
    sway.appendChild(shape);
    inner.appendChild(sway);
    heart.appendChild(inner);
    balloonField.appendChild(heart);

    heart.addEventListener("animationiteration", (event) => {
      if (event.target !== heart || event.animationName !== "floatUp") return;
      applyBalloonVars(
        heart,
        heartColors,
        {
          sizeMin: 26,
          sizeMax: 56,
          opacityMin: 0.55,
          opacityMax: 0.75,
          floatMin: 18,
          floatMax: 35,
          swayRangeMin: 6,
          swayRangeMax: 14,
          setPosition: false,
          setSize: false,
          setOpacity: false,
          setBlur: false,
          setDuration: false,
          setDelay: false,
          setSwayDelay: false,
          setStringDelay: false,
        },
      );
    });
  }

  if (prologueCleanup) {
    prologueCleanup();
  }

  let parallaxRaf = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const applyParallax = () => {
    const ease = 0.08;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    const translate = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
    balloonParallax.style.transform = translate;

    const dx = Math.abs(targetX - currentX);
    const dy = Math.abs(targetY - currentY);
    if (dx > 0.05 || dy > 0.05) {
      parallaxRaf = requestAnimationFrame(applyParallax);
    } else {
      parallaxRaf = 0;
    }
  };

  const scheduleParallax = () => {
    if (!parallaxRaf) {
      parallaxRaf = requestAnimationFrame(applyParallax);
    }
  };

  const onPointerMove = (event) => {
    const point = event.touches?.[0] ?? event;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = (point.clientX - cx) / cx;
    const dy = (point.clientY - cy) / cy;
    targetX = dx * 18;
    targetY = dy * 12;
    scheduleParallax();
  };

  const onWheel = (event) => {
    event.preventDefault();
  };

  window.addEventListener("mousemove", onPointerMove, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });
  scheduleParallax();

  prologueCleanup = () => {
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("wheel", onWheel);
    if (parallaxRaf) cancelAnimationFrame(parallaxRaf);
  };

  app.querySelector("[data-action='start']").addEventListener("click", () => {
    const nextStep = hasProgress ? (state.step > 0 ? state.step : 1) : 1;
    setStep(nextStep);
  });
  app.querySelector("[data-action='reset']").addEventListener("click", () => {
    const ok = window.confirm("Точно начать заново? 🙂");
    if (ok) resetProgress();
  });

  const primaryBtn = app.querySelector("[data-action='start']");
  if (primaryBtn) {
    const stopPulse = () => primaryBtn.classList.remove("pulse");
    primaryBtn.addEventListener("mouseenter", stopPulse, { once: true });
    primaryBtn.addEventListener("focus", stopPulse, { once: true });
    primaryBtn.addEventListener("click", stopPulse, { once: true });
  }
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

function renderGameDate(state, screen) {
  const game = getGameState(state, 1, { solved: false, message: "" });
  return `
    <div class="game-block" data-game="date">
      <div class="game-lead">
        <div class="game-lead-title">${screen.gameConfig.leadTitle}</div>
        <div class="game-lead-text">${screen.gameConfig.leadText}</div>
        <div class="game-lead-hint">${screen.gameConfig.leadHint}</div>
      </div>
      <label class="game-label">Этот день</label>
      <input class="game-input" data-field="date" placeholder="ДД.ММ.ГГГГ" inputmode="numeric" autocomplete="off" maxlength="10" value="" />
      <button class="btn" data-action="check-date">Проверить</button>
      <div class="game-message">${game.message || ""}</div>
    </div>
  `;
}

function parseDateInput(raw) {
  const value = raw.trim();
  if (!value) return null;

  const ddmm = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?$/;
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

  let day;
  let month;
  let year = null;

  if (ymd.test(value)) {
    const match = value.match(ymd);
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else if (ddmm.test(value)) {
    const match = value.match(ddmm);
    day = Number(match[1]);
    month = Number(match[2]);
    year = match[3] ? Number(match[3]) : null;
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year, hasYear: year !== null };
}

function formatDateInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [];
  if (digits.length <= 2) {
    parts.push(digits);
  } else if (digits.length <= 4) {
    parts.push(digits.slice(0, 2), digits.slice(2));
  } else {
    parts.push(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4));
  }
  return parts.filter(Boolean).join(".");
}

function renderGamePhrase(state, screen) {
  const game = getGameState(state, 2, { solved: false, progress: [] });
  const { words } = screen.gameConfig;
  return `
    <div class="game-block" data-game="phrase">
      <div class="phrase-words">
        ${words
          .map((word, index) => `
            <button class="btn btn-outline" data-action="word" data-word="${word}" data-index="${index}">${word}</button>
          `)
          .join("")}
      </div>
      <div class="phrase-output">Собранная фраза: <strong>${game.progress.join(" ")}</strong></div>
      <div class="game-message">${game.message || ""}</div>
    </div>
  `;
}

function renderGameHeart(state, screen) {
  const game = getGameState(state, 3, { solved: false, tries: 0, opened: [] });
  const hint = game.tries >= 2 ? screen.gameConfig.hint : "";
  const openedSet = new Set(game.opened || []);

  return `
    <div class="game-block" data-game="heart">
      <div class="heart-grid">
        ${Array.from({ length: 16 }, (_, index) => {
          const opened = openedSet.has(index);
          return `
            <button class="heart-card" data-action="heart" data-index="${index}">
              ${opened ? "•" : ""}
            </button>
          `;
        }).join("")}
      </div>
      <div class="heart-status">Попытки: ${game.tries}</div>
      <div class="game-message">${hint}</div>
    </div>
  `;
}

function renderGameCipher(state, screen) {
  const game = getGameState(state, 4, { solved: false, message: "" });
  return `
    <div class="game-block" data-game="cipher">
      <div class="cipher-text">${screen.gameConfig.cipher}</div>
      <input class="game-input" data-field="cipher" placeholder="введите слово" />
      <button class="btn" data-action="check-cipher">Проверить</button>
      <div class="game-message">${game.message || ""}</div>
    </div>
  `;
}

function renderGameChoice(state, screen) {
  const game = getGameState(state, 5, { solved: false });
  return `
    <div class="game-block" data-game="choice">
      <div class="choice-row">
        ${screen.gameConfig.options
          .map((option) => `
            <button class="btn" data-action="choice" data-choice="${option}">${option}</button>
          `)
          .join("")}
      </div>
      ${state.choice5 ? `<div class="game-message">Выбрано: ${state.choice5}</div>` : ""}
      ${game.solved ? `<div class="game-message">Нежный выбор принят.</div>` : ""}
    </div>
  `;
}

function renderGameTiles(state, screen) {
  const game = getGameState(state, 6, { solved: false, opened: [] });
  const openedSet = new Set(game.opened || []);
  const tiles = Array.from({ length: 9 }, (_, index) => index);

  return `
    <div class="game-block" data-game="tiles">
      <div class="photo-reveal">
        <img src="${screen.gameConfig.image}" alt="Фото" data-photo="true" />
        <div class="photo-overlay">
          ${tiles
            .map((index) => {
              const opened = openedSet.has(index);
              return `
                <button class="tile ${opened ? "tile--open" : ""}" data-action="tile" data-index="${index}"></button>
              `;
            })
            .join("")}
        </div>
      </div>
      <div class="game-message">${game.solved ? "Фото открыто!" : "Тапай по плиткам."}</div>
    </div>
  `;
}

function renderGameArrows(state, screen) {
  const game = getGameState(state, 7, { solved: false, progress: 0, message: "" });
  const dots = screen.gameConfig.sequence
    .map((_, index) => `<span class="dot ${index < game.progress ? "dot--filled" : ""}"></span>`)
    .join("");
  return `
    <div class="game-block" data-game="arrows">
      <div class="arrow-row">
        ${["←", "↑", "→", "↓"]
          .map((arrow) => `
            <button class="arrow-btn" data-action="arrow" data-arrow="${arrow}">${arrow}</button>
          `)
          .join("")}
      </div>
      <div class="arrow-progress">${dots}</div>
      <div class="game-message">${game.message || ""}</div>
    </div>
  `;
}

function renderGameByType(state, screen) {
  switch (screen.type) {
    case "date":
      return renderGameDate(state, screen);
    case "phrase":
      return renderGamePhrase(state, screen);
    case "heart":
      return renderGameHeart(state, screen);
    case "cipher":
      return renderGameCipher(state, screen);
    case "choice":
      return renderGameChoice(state, screen);
    case "tiles":
      return renderGameTiles(state, screen);
    case "arrows":
      return renderGameArrows(state, screen);
    default:
      return `<div class="game-block">Игра готовится.</div>`;
  }
}

function renderStep(state) {
  const screen = SCREENS[state.step];
  const updatedState = ensureUnlockedIfSolved(state);
  const game = getGameState(updatedState, state.step, { solved: false });
  const piece = PIECES.find((p) => p.id === state.step);
  const showReward = game.solved && updatedState.unlockedPieces.includes(state.step);

  app.innerHTML = `
    <section class="screen">
      <header class="screen-header">
        <div>
          <h1>${screen.title}</h1>
          <p>Этап ${state.step} из 8</p>
        </div>
      </header>
      ${renderProgress(updatedState)}
      ${renderCollection(updatedState)}
      <div class="card">
        <p>${screen.text}</p>
        ${screen.type === "puzzle" ? "" : renderGameByType(updatedState, screen)}
        ${game.solved ? `<button class="btn" data-action="continue">Продолжить</button>` : ""}
        ${showReward ? renderReward(piece) : ""}
      </div>
    </section>
  `;

  if (screen.type === "date") {
    const checkBtn = app.querySelector("[data-action='check-date']");
    const input = app.querySelector("[data-field='date']");
    if (input) {
      const applyMask = () => {
        input.value = formatDateInput(input.value);
      };
      input.addEventListener("input", applyMask);
      input.addEventListener("paste", () => {
        requestAnimationFrame(applyMask);
      });
    }
    checkBtn?.addEventListener("click", () => {
      const parsed = parseDateInput(input.value);
      if (!parsed) {
        updateGameState(1, { message: "Почти… кажется, это было чуть в другой день ❤️" });
        renderApp();
        return;
      }
      const target = parseDateInput(TARGET_DATE) || parseDateInput("2000-01-01");
      const match = parsed.day === target.day && parsed.month === target.month && (!parsed.hasYear || parsed.year === target.year);
      if (match) {
        updateGameState(1, { solved: true, message: "Да! Именно этот день ❤️" });
      } else {
        updateGameState(1, { message: "Почти… кажется, это было чуть в другой день ❤️" });
      }
      renderApp();
    });
  }

  if (screen.type === "phrase") {
    app.querySelectorAll("[data-action='word']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const word = btn.dataset.word;
        const gameState = getGameState(loadState(), 2, { progress: [], solved: false, message: "" });
        const expected = screen.gameConfig.expectedOrder[gameState.progress.length];
        if (word === expected) {
          const nextProgress = [...gameState.progress, word];
          const solved = nextProgress.length === screen.gameConfig.expectedOrder.length;
          updateGameState(2, { progress: nextProgress, solved, message: solved ? "Получилось!" : "" });
        } else {
          updateGameState(2, { progress: [], message: "Чуть-чуть не так. Попробуй сначала." });
        }
        renderApp();
      });
    });
  }

  if (screen.type === "heart") {
    app.querySelectorAll("[data-action='heart']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        const gameState = getGameState(loadState(), 3, { tries: 0, opened: [], solved: false });
        if (index === screen.gameConfig.correctIndex) {
          updateGameState(3, { solved: true });
        } else {
          const opened = Array.from(new Set([...(gameState.opened || []), index]));
          updateGameState(3, { opened, tries: gameState.tries + 1 });
        }
        renderApp();
      });
    });
  }

  if (screen.type === "cipher") {
    const checkBtn = app.querySelector("[data-action='check-cipher']");
    const input = app.querySelector("[data-field='cipher']");
    checkBtn?.addEventListener("click", () => {
      const raw = input.value.trim().toLowerCase().replace(/ё/g, "е");
      const target = screen.gameConfig.answer.toLowerCase().replace(/ё/g, "е");
      if (raw === target) {
        updateGameState(4, { solved: true, message: "Ты разгадала!" });
      } else {
        updateGameState(4, { message: "Почти. Попробуй ещё раз." });
      }
      renderApp();
    });
  }

  if (screen.type === "choice") {
    app.querySelectorAll("[data-action='choice']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        const stateNow = loadState();
        const updated = { ...stateNow, choice5: choice };
        saveState(updated);
        updateGameState(5, { solved: true });
        renderApp();
      });
    });
  }

  if (screen.type === "tiles") {
    const photo = app.querySelector("img[data-photo='true']");
    if (photo) {
      photo.addEventListener("error", () => replaceImageWithPlaceholder(photo, "Фото пока не добавлено"), { once: true });
    }

    app.querySelectorAll("[data-action='tile']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        const gameState = getGameState(loadState(), 6, { opened: [], solved: false });
        const opened = Array.from(new Set([...(gameState.opened || []), index]));
        const solved = opened.length >= 9;
        updateGameState(6, { opened, solved });
        renderApp();
      });
    });
  }

  if (screen.type === "arrows") {
    app.querySelectorAll("[data-action='arrow']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const arrow = btn.dataset.arrow;
        const gameState = getGameState(loadState(), 7, { progress: 0, solved: false, message: "" });
        const expected = screen.gameConfig.sequence[gameState.progress];
        if (arrow === expected) {
          const nextProgress = gameState.progress + 1;
          const solved = nextProgress === screen.gameConfig.sequence.length;
          updateGameState(7, { progress: nextProgress, solved, message: solved ? "Идеально!" : "" });
        } else {
          updateGameState(7, { progress: 0, message: "Ой, почти! Начнём заново." });
        }
        renderApp();
      });
    });
  }

  const continueBtn = app.querySelector("[data-action='continue']");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => setStep(state.step + 1));
  }

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

  app.querySelectorAll("img[data-piece-id]").forEach((imgEl) => {
    imgEl.addEventListener(
      "error",
      () => {
        const pieceId = imgEl.dataset.pieceId || "—";
        replaceImageWithPlaceholder(imgEl, `Нет файла (${pieceId})`);
      },
      { once: true }
    );
  });
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

export function renderScreen(step, state) {
  if (step !== 0 && prologueCleanup) {
    prologueCleanup();
    prologueCleanup = null;
  }
  if (step !== 0) {
    document.body.classList.remove("has-balloons");
    if (balloonLayerEl) {
      balloonLayerEl.remove();
      balloonLayerEl = null;
    }
  }
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

  const debugReset = document.createElement("button");
  debugReset.className = "btn btn-ghost debug-reset";
  debugReset.type = "button";
  debugReset.textContent = "Сброс (debug)";
  debugReset.addEventListener("click", resetProgress);
  app.appendChild(debugReset);
}

renderApp();
