import { loadState, saveState, resetState } from "./state.js";
import { PIECES, SCREENS, TARGET_DATE, unlockPiece } from "./screens.js";
import { renderPuzzle } from "./puzzle.js";

const app = document.getElementById("app");
let previewAudio = null;
let prologueCleanup = null;
let balloonLayerEl = null;
let chatTypingRunId = 0;
let chatTypingTimers = [];
const CHAT_TYPING_YOU_MS = 1200;
const CHAT_TYPING_HER_MS = 1500;

function clearChatTypingTimers() {
  chatTypingRunId += 1;
  chatTypingTimers.forEach((timerId) => clearTimeout(timerId));
  chatTypingTimers = [];
}

function pushChatTypingTimer(timerId) {
  chatTypingTimers.push(timerId);
}

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
  if (step !== 2) {
    clearChatTypingTimers();
  }
  const state = loadState();
  const next = { ...state, step };
  saveState(next);
  renderApp();
}

function resetProgress() {
  clearChatTypingTimers();
  resetState();
  renderApp();
}

function resetCurrentStepDebug() {
  const state = loadState();
  const step = Number(state.step);

  if (!Number.isFinite(step) || step < 1 || step > 7) {
    renderApp();
    return;
  }

  if (step === 2) {
    clearChatTypingTimers();
  }

  const games = { ...(state.games || {}) };
  delete games[step];

  const nextState = { ...state, games };
  if (step === 5) {
    nextState.choice5 = null;
  }

  saveState(nextState);
  renderApp();
}

function debugJumpStep(delta) {
  const state = loadState();
  const currentStep = Number.isFinite(state.step) ? state.step : 0;
  const nextStep = Math.min(8, Math.max(0, currentStep + delta));
  if (nextStep === currentStep) return;
  setStep(nextStep);
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

function renderReward(piece, options = {}) {
  const { showNext = true, audioClass = "btn", nextClass = "btn" } = options;
  return `
    <div class="reward">
      <img src="${piece.img}" alt="Кусочек ${piece.id}" data-piece-id="${piece.id}" />
      <div class="reward-actions cta-group">
        <button class="${audioClass}" data-action="audio" data-audio="${piece.audio}">
          ▶ Послушать голосовое ${String(piece.id).padStart(2, "0")}
        </button>
        ${showNext ? `<button class="${nextClass}" data-action="next">Дальше</button>` : ""}
      </div>
    </div>
  `;
}

function renderGameDate(state, screen) {
  const game = getGameState(state, 1, { solved: false, message: "", status: "idle" });
  const piece = PIECES.find((item) => item.id === 1);
  const isSuccess = game.status === "success";
  return `
    <div class="game-block" data-game="date">
      ${!isSuccess
        ? `<div class="date-text">
            <div class="date-kicker">Есть один день, который для меня стал особенным.</div>
            <div class="date-title">Ты помнишь, какой? ❤️</div>
            <div class="date-body">Введи его — и я покажу кое-что важное.</div>
            <div class="date-hint">Только цифры — точки появятся сами</div>
          </div>`
        : ""}
      <div class="date-inputs ${isSuccess ? "is-hidden" : ""}" data-date-inputs>
        <label class="game-label">Этот день</label>
        <input class="game-input" data-field="date" placeholder="ДД.ММ.ГГГГ" inputmode="numeric" autocomplete="off" maxlength="10" value="" />
        <div class="game-message">${game.message || ""}</div>
      </div>
      <div class="date-confirm ${isSuccess ? "is-visible" : ""}" data-date-confirm>
        <div class="date-success">
          <div class="date-success-title">Да… именно он ❤️</div>
          <div class="date-success-note">С этого дня всё стало немного иначе.</div>
        </div>
        ${isSuccess && piece ? renderReward(piece, { showNext: false, audioClass: "btn btn-outline" }) : ""}
        <div class="cta-group">
          <button class="btn btn-primary btn-wide" data-action="continue">Продолжить</button>
        </div>
      </div>
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

function normalizeDigits(value) {
  return value.replace(/\D/g, "");
}

const HEART_GRID_COLS = 4;
const HEART_GRID_SIZE = 16;
const HEART_PUZZLE_LAYOUT_VERSION = 2;

function getHeartDistance(fromIndex, toIndex, columns = HEART_GRID_COLS) {
  const fromRow = Math.floor(fromIndex / columns);
  const fromCol = fromIndex % columns;
  const toRow = Math.floor(toIndex / columns);
  const toCol = toIndex % columns;
  return Math.hypot(fromRow - toRow, fromCol - toCol);
}

function getRandomHeartIndex(size = HEART_GRID_SIZE) {
  return Math.floor(Math.random() * size);
}

function getHeartHintByDistance(distance, isHit) {
  if (isHit) {
    return { level: "found", text: "❤️ нашла!" };
  }
  if (distance <= 1.05) {
    return { level: "very-close", text: "👀 очень близко…" };
  }
  if (distance <= 1.9) {
    return { level: "hot", text: "🔥 горячо…" };
  }
  if (distance <= 2.7) {
    return { level: "warm", text: "🌤 теплее…" };
  }
  return { level: "cold", text: "❄️ холодно…" };
}

function getHeartHintClass(level) {
  switch (level) {
    case "very-close":
      return "heart-hint heart-hint--very-close";
    case "hot":
      return "heart-hint heart-hint--hot";
    case "warm":
      return "heart-hint heart-hint--warm";
    case "found":
      return "heart-hint heart-hint--found";
    default:
      return "heart-hint heart-hint--cold";
  }
}

function getHeartPlayfulMissLine(gameState) {
  if (gameState.playfulUsed) return "";
  if (Math.random() > 0.28) return "";
  const lines = ["не там ищешь 😏", "ахаха нет)"];
  return lines[Math.floor(Math.random() * lines.length)];
}

function renderGameChat(state, screen) {
  const game = getGameState(state, 2, { solved: false, turn: 0, history: [], isLocked: false, typingActor: null });
  if (game.solved) {
    return `
      <div class="game-block" data-game="chat">
        <div class="chat-success">
          <div class="chat-success-title">${screen.gameConfig.successTitle || "Ура!"}</div>
          <div class="chat-success-text">${screen.gameConfig.successText || ""}</div>
        </div>
      </div>
    `;
  }

  const intro = screen.gameConfig.intro || [];
  const turns = screen.gameConfig.turns || [];
  const history = Array.isArray(game.history) ? game.history : [];
  const activeTurn = turns[game.turn];
  const lastLine = history[history.length - 1];
  const shouldShowActivePrompt = Boolean(
    activeTurn && !game.isLocked && (!lastLine || lastLine.role !== "her" || lastLine.text !== activeTurn.prompt)
  );
  const transcript = [
    ...intro.map((text) => ({ role: "her", text })),
    ...history,
    ...(shouldShowActivePrompt ? [{ role: "her", text: activeTurn.prompt }] : []),
  ];

  return `
    <div class="game-block" data-game="chat">
      <div class="chat-thread">
        ${transcript
          .map(
            (line) => `
          <div class="chat-line ${line.role === "you" ? "chat-line--you" : "chat-line--her"}">
            <div class="chat-bubble">${line.text}</div>
          </div>
        `
          )
          .join("")}
        ${game.typingActor
          ? `<div class="chat-line ${game.typingActor === "you" ? "chat-line--you" : "chat-line--her"}">
              <div class="chat-bubble chat-bubble--typing">
                <span class="chat-dot"></span>
                <span class="chat-dot"></span>
                <span class="chat-dot"></span>
              </div>
            </div>`
          : ""}
      </div>
      ${!game.solved && activeTurn && !game.isLocked
        ? `<div class="chat-options">
          ${activeTurn.options
            .map(
              (option, index) => `
              <button class="btn btn-outline" data-action="chat-option" data-index="${index}">${option.text}</button>
            `
            )
            .join("")}
        </div>`
        : ""}
      <div class="game-message">${game.message || ""}</div>
    </div>
  `;
}

function renderGameHeart(state, screen) {
  const game = getGameState(state, 3, {
    solved: false,
    tries: 0,
    opened: [],
    message: "❄️ холодно…",
    hintLevel: "cold",
    playfulUsed: false,
    playfulLine: "",
    missIndex: null,
    pulseIndex: null,
    lastIndex: null,
    locked: false,
    listenedAudio: false,
    gateMessage: "",
  });
  const maxAttemptsRaw = Number(screen.gameConfig.maxAttempts);
  const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0 ? maxAttemptsRaw : 6;
  const attemptsLeft = Math.max(0, maxAttempts - game.tries);
  const openedSet = new Set(game.opened || []);
  const hintClass = getHeartHintClass(game.hintLevel);
  const canPlay = !game.solved && !game.locked;
  const targetIndex = Number.isInteger(game.targetIndex) ? game.targetIndex : screen.gameConfig.correctIndex;

  return `
    <div class="game-block" data-game="heart">
      <div class="heart-grid">
        ${Array.from({ length: HEART_GRID_SIZE }, (_, index) => {
          const opened = openedSet.has(index);
          const isHit = game.solved && index === targetIndex;
          const isMissFx = game.missIndex === index;
          const isPulseFx = game.pulseIndex === index;
          const canClick = canPlay && !opened;
          return `
            <button
              class="heart-card ${opened ? "heart-card--opened" : ""} ${isMissFx ? "heart-card--miss" : ""} ${isPulseFx ? "heart-card--pulse" : ""} ${isHit ? "heart-card--found" : ""}"
              data-action="heart"
              data-index="${index}"
              ${canClick ? "" : "disabled"}
              aria-label="${isHit ? "Найдено сердце" : "Карточка"}"
            >
              ${isHit ? "❤️" : opened ? "•" : ""}
            </button>
          `;
        }).join("")}
      </div>
      <div class="heart-status">Осталось попыток: ${attemptsLeft}</div>
      <div class="${hintClass}">${game.message || "❄️ холодно…"}</div>
      ${game.playfulLine ? `<div class="heart-side-note">${game.playfulLine}</div>` : ""}
      ${game.locked && !game.solved
        ? `<div class="cta-group"><button class="btn btn-outline btn-wide" data-action="heart-retry">Попробовать ещё раз</button></div>`
        : ""}
      ${game.solved
        ? `<div class="heart-win">
            <div class="heart-win-title">вот оно 🤍</div>
            <div class="heart-win-text">ты нашла моё сердце</div>
            ${game.gateMessage ? `<div class="heart-side-note">${game.gateMessage}</div>` : ""}
            <div class="cta-group"><button class="btn btn-primary btn-wide" data-action="continue">забрать 🤍</button></div>
          </div>`
        : ""}
    </div>
  `;
}

function getPuzzleEdgePathHorizontal(x0, x1, y, edge, normal, tabWidth, tabDepth) {
  if (!edge) return `L ${x1} ${y}`;
  const dir = x1 >= x0 ? 1 : -1;
  const mid = (x0 + x1) / 2;
  const bump = normal * edge * tabDepth;
  const start = mid - dir * tabWidth;
  const end = mid + dir * tabWidth;
  return [
    `L ${start} ${y}`,
    `C ${mid - dir * tabWidth * 0.5} ${y}, ${mid - dir * tabWidth * 0.5} ${y + bump}, ${mid} ${y + bump}`,
    `C ${mid + dir * tabWidth * 0.5} ${y + bump}, ${mid + dir * tabWidth * 0.5} ${y}, ${end} ${y}`,
    `L ${x1} ${y}`,
  ].join(" ");
}

function getPuzzleEdgePathVertical(y0, y1, x, edge, normal, tabWidth, tabDepth) {
  if (!edge) return `L ${x} ${y1}`;
  const dir = y1 >= y0 ? 1 : -1;
  const mid = (y0 + y1) / 2;
  const bump = normal * edge * tabDepth;
  const start = mid - dir * tabWidth;
  const end = mid + dir * tabWidth;
  return [
    `L ${x} ${start}`,
    `C ${x} ${mid - dir * tabWidth * 0.5}, ${x + bump} ${mid - dir * tabWidth * 0.5}, ${x + bump} ${mid}`,
    `C ${x + bump} ${mid + dir * tabWidth * 0.5}, ${x} ${mid + dir * tabWidth * 0.5}, ${x} ${end}`,
    `L ${x} ${y1}`,
  ].join(" ");
}

function createHeartPuzzleEdges(gridSize) {
  const right = Array.from({ length: gridSize }, () => Array.from({ length: gridSize - 1 }, () => (Math.random() > 0.5 ? 1 : -1)));
  const bottom = Array.from({ length: gridSize - 1 }, () => Array.from({ length: gridSize }, () => (Math.random() > 0.5 ? 1 : -1)));
  return { right, bottom };
}

function getHeartPuzzlePieceEdges(edges, row, col, gridSize) {
  const top = row === 0 ? 0 : -edges.bottom[row - 1][col];
  const right = col === gridSize - 1 ? 0 : edges.right[row][col];
  const bottom = row === gridSize - 1 ? 0 : edges.bottom[row][col];
  const left = col === 0 ? 0 : -edges.right[row][col - 1];
  return { top, right, bottom, left };
}

function getHeartPuzzlePiecePath(pieceOuter, pad, cell, tabs) {
  const tabWidth = cell * 0.24;
  const tabDepth = cell * 0.18;
  const x0 = pad;
  const y0 = pad;
  const x1 = pad + cell;
  const y1 = pad + cell;

  return [
    `M ${x0} ${y0}`,
    getPuzzleEdgePathHorizontal(x0, x1, y0, tabs.top, -1, tabWidth, tabDepth),
    getPuzzleEdgePathVertical(y0, y1, x1, tabs.right, 1, tabWidth, tabDepth),
    getPuzzleEdgePathHorizontal(x1, x0, y1, tabs.bottom, 1, tabWidth, tabDepth),
    getPuzzleEdgePathVertical(y1, y0, x0, tabs.left, -1, tabWidth, tabDepth),
    "Z",
  ].join(" ");
}

function getHeartArtworkSvgDataUri() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffb6c9"/>
          <stop offset="50%" stop-color="#ff6f9f"/>
          <stop offset="100%" stop-color="#ff4e82"/>
        </linearGradient>
        <radialGradient id="heartGlow" cx="30%" cy="25%" r="50%">
          <stop offset="0%" stop-color="#fff6fb" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#fff6fb" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="transparent"/>
      <path fill="url(#heartGrad)" d="M256 463c-8 0-16-3-22-8l-29-27C96 327 48 278 48 197 48 127 101 74 171 74c34 0 66 14 89 38 22-24 54-38 88-38 70 0 123 53 123 123 0 81-48 130-157 231l-29 27c-6 5-14 8-21 8z"/>
      <ellipse cx="192" cy="178" rx="132" ry="110" fill="url(#heartGlow)"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getHeartPuzzleLayout(stageEl, gridSize) {
  const stageRect = stageEl.getBoundingClientRect();
  const stageWidth = stageRect.width;
  const stageHeight = stageRect.height;
  const boardSize = Math.min(stageWidth - 22, 460);
  const boardLeft = Math.round((stageWidth - boardSize) / 2);
  const boardTop = 16;
  const cell = boardSize / gridSize;
  const pad = Math.round(cell * 0.2);
  const pieceOuter = Math.round(cell + pad * 2);
  return {
    stageWidth,
    stageHeight,
    boardSize,
    boardLeft,
    boardTop,
    cell,
    pad,
    pieceOuter,
  };
}

function getHeartPuzzleTarget(layout, row, col) {
  return {
    x: Math.round(layout.boardLeft + col * layout.cell - layout.pad),
    y: Math.round(layout.boardTop + row * layout.cell - layout.pad),
  };
}

function createHeartPuzzleInitialPieces(gridSize, layout) {
  const pieces = {};
  const total = gridSize * gridSize;
  const topMin = layout.boardTop + 8;
  const topMax = layout.boardTop + layout.boardSize - layout.pieceOuter - 8;
  const bottomMin = layout.boardTop + layout.boardSize + 16;
  const bottomMax = layout.stageHeight - layout.pieceOuter - 8;
  const leftMin = 8;
  const leftMax = layout.boardLeft - layout.pieceOuter - 12;
  const rightMin = layout.boardLeft + layout.boardSize + 12;
  const rightMax = layout.stageWidth - layout.pieceOuter - 8;

  const zones = [];
  if (leftMax > leftMin && topMax > topMin) {
    zones.push({ xMin: leftMin, xMax: leftMax, yMin: topMin, yMax: topMax });
  }
  if (rightMax > rightMin && topMax > topMin) {
    zones.push({ xMin: rightMin, xMax: rightMax, yMin: topMin, yMax: topMax });
  }
  if (bottomMax > bottomMin) {
    zones.push({
      xMin: 8,
      xMax: layout.stageWidth - layout.pieceOuter - 8,
      yMin: bottomMin,
      yMax: bottomMax,
    });
  }

  if (zones.length === 0) {
    zones.push({
      xMin: 8,
      xMax: layout.stageWidth - layout.pieceOuter - 8,
      yMin: layout.boardTop + layout.boardSize + 8,
      yMax: layout.stageHeight - layout.pieceOuter - 8,
    });
  }

  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const zone = zones[index % zones.length];
    const x = zone.xMin + Math.random() * Math.max(0, zone.xMax - zone.xMin);
    const y = zone.yMin + Math.random() * Math.max(0, zone.yMax - zone.yMin);
    pieces[`${row}-${col}`] = { x: Math.round(x), y: Math.round(y), locked: false };
  }

  return pieces;
}

function renderHeartPuzzle(screen, index) {
  const step = index + 1;
  const state = loadState();
  const game = getGameState(state, step, { solved: false });
  const piece = PIECES.find((p) => p.id === step);
  const gridSizeRaw = Number(screen.gameConfig?.gridSize);
  const gridSize = Number.isFinite(gridSizeRaw) && gridSizeRaw > 1 ? gridSizeRaw : 3;
  const total = gridSize * gridSize;
  const solvedCount = Array.isArray(game.lockedIds) ? game.lockedIds.length : game.solved ? total : 0;
  const finalText = screen.gameConfig?.finalText || "";

  return `
    <div class="game-block heart-puzzle" data-game="puzzle-heart" data-step="${step}" data-grid="${gridSize}">
      <div class="heart-puzzle-meta">
        <div class="heart-puzzle-progress" data-heart-progress>${Math.min(total, solvedCount)} из ${total}</div>
        <button class="btn btn-outline heart-puzzle-hint-btn" data-action="heart-hint" type="button">Подсказка</button>
      </div>
      <div class="heart-puzzle-stage" data-heart-stage>
        <div class="heart-puzzle-board" data-heart-board></div>
        <div class="heart-puzzle-pieces" data-heart-pieces></div>
      </div>
      <div class="heart-puzzle-final ${game.solved ? "is-visible" : ""}" data-heart-final>
        <div class="heart-puzzle-final-card">
          <div class="heart-puzzle-final-title">Сердце собрано ❤️</div>
          <p>${finalText}</p>
          ${piece ? renderReward(piece, { showNext: false, audioClass: "btn btn-outline" }) : ""}
        </div>
        <div class="cta-group">
          <button class="btn btn-primary btn-wide" data-action="continue">Продолжить</button>
        </div>
      </div>
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
    case "chat":
      return renderGameChat(state, screen);
    case "heart":
      return renderGameHeart(state, screen);
    case "puzzle-heart":
      return renderHeartPuzzle(screen, state.step - 1);
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

function initHeartPuzzleGame(screen, index) {
  const step = index + 1;
  const root = app.querySelector("[data-game='puzzle-heart']");
  if (!root) return;

  const stage = root.querySelector("[data-heart-stage]");
  const board = root.querySelector("[data-heart-board]");
  const piecesLayer = root.querySelector("[data-heart-pieces]");
  const progressEl = root.querySelector("[data-heart-progress]");
  const finalEl = root.querySelector("[data-heart-final]");
  const hintBtn = root.querySelector("[data-action='heart-hint']");
  if (!stage || !board || !piecesLayer || !progressEl || !finalEl) return;

  const gridSizeRaw = Number(screen.gameConfig?.gridSize);
  const gridSize = Number.isFinite(gridSizeRaw) && gridSizeRaw > 1 ? gridSizeRaw : 3;
  const snapToleranceRaw = Number(screen.gameConfig?.snapTolerance);
  const snapTolerance = Number.isFinite(snapToleranceRaw) && snapToleranceRaw > 0 ? snapToleranceRaw : 28;
  const total = gridSize * gridSize;
  const artworkUri = getHeartArtworkSvgDataUri();
  const layout = getHeartPuzzleLayout(stage, gridSize);

  board.style.width = `${layout.boardSize}px`;
  board.style.height = `${layout.boardSize}px`;
  board.style.left = `${layout.boardLeft}px`;
  board.style.top = `${layout.boardTop}px`;
  board.style.backgroundImage = "none";
  root.classList.remove("is-hint-visible");

  let game = getGameState(loadState(), step, {
    solved: false,
    lockedIds: [],
    piecePositions: null,
    edges: null,
    layoutVersion: HEART_PUZZLE_LAYOUT_VERSION,
  });

  let changed = false;
  if (!game.edges || !Array.isArray(game.edges.right) || !Array.isArray(game.edges.bottom)) {
    game = { ...game, edges: createHeartPuzzleEdges(gridSize) };
    changed = true;
  }
  if (!game.piecePositions || typeof game.piecePositions !== "object") {
    game = { ...game, piecePositions: createHeartPuzzleInitialPieces(gridSize, layout) };
    changed = true;
  }

  const lockedSet = new Set(Array.isArray(game.lockedIds) ? game.lockedIds : []);
  if (game.solved) {
    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        lockedSet.add(`${row}-${col}`);
      }
    }
  }

  if (!game.solved && game.layoutVersion !== HEART_PUZZLE_LAYOUT_VERSION) {
    const regenerated = createHeartPuzzleInitialPieces(gridSize, layout);
    const nextPositions = { ...game.piecePositions };
    Object.keys(regenerated).forEach((key) => {
      if (!lockedSet.has(key)) {
        nextPositions[key] = regenerated[key];
      }
    });
    game = {
      ...game,
      piecePositions: nextPositions,
      layoutVersion: HEART_PUZZLE_LAYOUT_VERSION,
    };
    changed = true;
  }

  const patch = {};
  if (changed) {
    patch.edges = game.edges;
    patch.piecePositions = game.piecePositions;
    patch.layoutVersion = game.layoutVersion;
  }
  if (lockedSet.size !== (game.lockedIds || []).length) {
    patch.lockedIds = [...lockedSet];
  }
  if (Object.keys(patch).length > 0) {
    updateGameState(step, patch);
    game = getGameState(loadState(), step, game);
  }

  board.innerHTML = "";

  const renderProgress = () => {
    progressEl.textContent = `${lockedSet.size} из ${total}`;
  };

  const persistPieces = (extraPatch = {}) => {
    updateGameState(step, {
      piecePositions: game.piecePositions,
      lockedIds: [...lockedSet],
      layoutVersion: HEART_PUZZLE_LAYOUT_VERSION,
      ...extraPatch,
    });
  };

  const topLeftTarget = getHeartPuzzleTarget(layout, 0, 0);
  const bottomRightTarget = getHeartPuzzleTarget(layout, gridSize - 1, gridSize - 1);
  const minDragX = Math.min(6, Math.floor(topLeftTarget.x - 12));
  const minDragY = Math.min(6, Math.floor(topLeftTarget.y - 12));
  const maxDragX = Math.max(layout.stageWidth - layout.pieceOuter - 6, Math.ceil(bottomRightTarget.x + 12));
  const maxDragY = Math.max(layout.stageHeight - layout.pieceOuter - 6, Math.ceil(bottomRightTarget.y + 12));
  const clampX = (x) => Math.max(minDragX, Math.min(maxDragX, x));
  const clampY = (y) => Math.max(minDragY, Math.min(maxDragY, y));

  piecesLayer.innerHTML = "";
  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const key = `${row}-${col}`;
      const tabs = getHeartPuzzlePieceEdges(game.edges, row, col, gridSize);
      const path = getHeartPuzzlePiecePath(layout.pieceOuter, layout.pad, layout.cell, tabs);
      const target = getHeartPuzzleTarget(layout, row, col);
      const pieceState = game.piecePositions[key] || { x: target.x, y: target.y, locked: false };
      const isLocked = game.solved || lockedSet.has(key) || Boolean(pieceState.locked);

      if (isLocked) {
        pieceState.x = target.x;
        pieceState.y = target.y;
        pieceState.locked = true;
      } else {
        pieceState.x = clampX(pieceState.x);
        pieceState.y = clampY(pieceState.y);
      }
      game.piecePositions[key] = pieceState;

      const pieceEl = document.createElement("button");
      pieceEl.type = "button";
      pieceEl.className = `heart-piece ${isLocked ? "is-locked" : ""}`;
      pieceEl.dataset.key = key;
      pieceEl.style.width = `${layout.pieceOuter}px`;
      pieceEl.style.height = `${layout.pieceOuter}px`;
      pieceEl.style.transform = `translate(${pieceState.x}px, ${pieceState.y}px)`;
      pieceEl.style.zIndex = isLocked ? "2" : "5";
      pieceEl.innerHTML = `
        <svg viewBox="0 0 ${layout.pieceOuter} ${layout.pieceOuter}" width="${layout.pieceOuter}" height="${layout.pieceOuter}" aria-hidden="true">
          <defs>
            <clipPath id="heart-clip-${step}-${row}-${col}">
              <path d="${path}" />
            </clipPath>
          </defs>
          <image
            href="${artworkUri}"
            x="${layout.pad - col * layout.cell}"
            y="${layout.pad - row * layout.cell}"
            width="${layout.boardSize}"
            height="${layout.boardSize}"
            preserveAspectRatio="none"
            clip-path="url(#heart-clip-${step}-${row}-${col})"
          ></image>
          <path d="${path}" class="heart-piece-stroke"></path>
        </svg>
      `;
      if (isLocked) {
        pieceEl.disabled = true;
      }
      piecesLayer.appendChild(pieceEl);
    }
  }

  if (changed) {
    persistPieces({ solved: Boolean(game.solved) });
  }
  renderProgress();
  finalEl.classList.toggle("is-visible", Boolean(game.solved));

  const toggleHint = () => {
    const nextVisible = !root.classList.contains("is-hint-visible");
    root.classList.toggle("is-hint-visible", nextVisible);
    board.style.backgroundImage = nextVisible ? `url("${artworkUri}")` : "none";
  };

  hintBtn?.addEventListener("click", toggleHint);

  if (game.solved) return;

  let drag = null;

  const onPointerMove = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const nextX = clampX(drag.pieceStartX + dx);
    const nextY = clampY(drag.pieceStartY + dy);
    const statePiece = game.piecePositions[drag.key];
    statePiece.x = nextX;
    statePiece.y = nextY;
    drag.el.style.transform = `translate(${nextX}px, ${nextY}px)`;
  };

  const onPointerUp = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const active = drag;
    drag = null;
    active.el.releasePointerCapture(event.pointerId);
    active.el.classList.remove("is-dragging");

    const [row, col] = active.key.split("-").map(Number);
    const target = getHeartPuzzleTarget(layout, row, col);
    const pieceState = game.piecePositions[active.key];
    const dist = Math.hypot(pieceState.x - target.x, pieceState.y - target.y);
    if (dist <= snapTolerance) {
      pieceState.x = target.x;
      pieceState.y = target.y;
      pieceState.locked = true;
      lockedSet.add(active.key);
      active.el.style.transform = `translate(${target.x}px, ${target.y}px)`;
      active.el.classList.add("snap");
      active.el.classList.add("is-locked");
      active.el.style.zIndex = "2";
      active.el.disabled = true;
    } else {
      active.el.style.zIndex = "5";
    }

    const solved = lockedSet.size === total;
    persistPieces({ solved });
    renderProgress();

    if (solved) {
      unlockPiece(index + 1);
      finalEl.classList.add("is-visible");
    }
  };

  piecesLayer.querySelectorAll(".heart-piece").forEach((pieceEl) => {
    const key = pieceEl.dataset.key;
    if (!key || lockedSet.has(key)) return;

    pieceEl.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary) return;
      const current = game.piecePositions[key];
      if (!current || current.locked) return;
      drag = {
        key,
        el: pieceEl,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        pieceStartX: current.x,
        pieceStartY: current.y,
      };
      pieceEl.classList.add("is-dragging");
      pieceEl.style.zIndex = "20";
      pieceEl.setPointerCapture(event.pointerId);
    });

    pieceEl.addEventListener("pointermove", onPointerMove);
    pieceEl.addEventListener("pointerup", onPointerUp);
    pieceEl.addEventListener("pointercancel", onPointerUp);
  });
}

function renderStep(state) {
  const screen = SCREENS[state.step];
  const updatedState = ensureUnlockedIfSolved(state);
  let game = getGameState(updatedState, state.step, { solved: false });
  if (screen.type === "heart" && !Number.isInteger(game.targetIndex)) {
    updateGameState(3, { targetIndex: getRandomHeartIndex() });
    game = getGameState(loadState(), state.step, { solved: false });
  }
  const piece = PIECES.find((p) => p.id === state.step);
  const showReward = !["date", "chat", "heart", "puzzle-heart"].includes(screen.type) && game.solved && updatedState.unlockedPieces.includes(state.step);
  const showChatDoneActions = screen.type === "chat" && game.solved;
  const hideRewardNext = showChatDoneActions || screen.type === "heart" || screen.type === "puzzle-heart";

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
        ${screen.text ? `<p>${screen.text}</p>` : ""}
        ${screen.type === "puzzle" ? "" : renderGameByType(updatedState, screen)}
        ${showChatDoneActions
          ? `<div class="cta-group">
              <button class="btn btn-outline" data-action="replay-chat">Пройти историю ещё раз</button>
              <button class="btn btn-primary" data-action="continue">Дальше</button>
            </div>`
          : ""}
        ${game.solved && screen.type !== "date" && screen.type !== "chat" && screen.type !== "heart" && screen.type !== "puzzle-heart" ? `<div class="cta-group"><button class="btn btn-outline btn-wide" data-action="continue">Продолжить дальше</button></div>` : ""}
        ${showReward ? renderReward(piece, { showNext: !hideRewardNext }) : ""}
      </div>
    </section>
  `;

  if (screen.type === "puzzle-heart") {
    initHeartPuzzleGame(screen, state.step - 1);
  }

  if (screen.type === "date") {
    const input = app.querySelector("[data-field='date']");
    const inputsWrap = app.querySelector("[data-date-inputs]");
    const confirmWrap = app.querySelector("[data-date-confirm]");
    const messageEl = inputsWrap?.querySelector(".game-message");
    let debounceId = null;
    const errText = "Кажется, не он 🙂 Попробуй ещё раз";
    if (input) {
      const applyMask = () => {
        input.value = formatDateInput(input.value);
      };
      input.addEventListener("input", applyMask);
      input.addEventListener("paste", () => {
        requestAnimationFrame(applyMask);
      });
    }
    if (game.status === "success") {
      requestAnimationFrame(() => {
        if (input) input.disabled = true;
        inputsWrap?.classList.add("is-hidden");
        confirmWrap?.classList.add("is-visible");
      });
    } else {
      if (input) input.disabled = false;
      inputsWrap?.classList.remove("is-hidden");
      confirmWrap?.classList.remove("is-visible");
    }
    if (input) {
      if (game.status === "error") {
        input.classList.add("is-error");
      } else {
        input.classList.remove("is-error");
      }
    }
    const runCheck = () => {
      if (!input) return;
      const digits = normalizeDigits(input.value);
      if (digits.length !== 8) return;
      const parsed = parseDateInput(input.value);
      if (!parsed) {
        updateGameState(1, { status: "error", message: errText });
        if (messageEl) messageEl.textContent = errText;
        input.classList.add("is-error");
        return;
      }
      const target = parseDateInput(TARGET_DATE) || parseDateInput("2000-01-01");
      const match = parsed.day === target.day && parsed.month === target.month && (!parsed.hasYear || parsed.year === target.year);
      if (match) {
        updateGameState(1, { solved: true, status: "success", message: "" });
        renderApp();
      } else {
        updateGameState(1, { status: "error", message: errText });
        if (messageEl) messageEl.textContent = errText;
        input.classList.add("is-error");
      }
    };
    input?.addEventListener("input", () => {
      if (game.solved) return;
      const digits = normalizeDigits(input.value);
      const isComplete = digits.length === 8;
      if (!isComplete) {
        if (debounceId) clearTimeout(debounceId);
        debounceId = null;
        if (messageEl && messageEl.textContent) {
          messageEl.textContent = "";
          updateGameState(1, { status: "idle", message: "" });
        }
        input.classList.remove("is-error");
        return;
      }
      if (debounceId) clearTimeout(debounceId);
      updateGameState(1, { status: "checking" });
      debounceId = setTimeout(runCheck, 200);
    });
    input?.addEventListener("paste", () => {
      if (game.solved) return;
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        const digits = normalizeDigits(input.value);
        if (digits.length === 8) runCheck();
      }, 200);
    });
  }

  if (screen.type === "chat") {
    const chatThread = app.querySelector(".chat-thread");
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }

    app.querySelectorAll("[data-action='chat-option']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const optionIndex = Number(btn.dataset.index);
        const gameState = getGameState(loadState(), 2, { solved: false, turn: 0, history: [], isLocked: false });
        if (gameState.isLocked || gameState.solved) return;

        const turns = screen.gameConfig.turns || [];
        const currentTurn = turns[gameState.turn];
        if (!currentTurn) return;

        const selected = currentTurn.options?.[optionIndex];
        if (!selected) return;

        clearChatTypingTimers();
        const runId = chatTypingRunId;
        const turnIndex = gameState.turn;
        const selectedText = selected.text;
        const replyText = selected.reply;
        const historyBase = Array.isArray(gameState.history) ? gameState.history : [];
        const lastSavedLine = historyBase[historyBase.length - 1];
        const needsPromptInHistory = !lastSavedLine || lastSavedLine.role !== "her" || lastSavedLine.text !== currentTurn.prompt;
        const historyWithPrompt = needsPromptInHistory
          ? [...historyBase, { role: "her", text: currentTurn.prompt }]
          : historyBase;

        updateGameState(2, {
          history: historyWithPrompt,
          isLocked: true,
          typingActor: "you",
          message: "",
        });
        renderApp();

        const showYourMessageTimer = setTimeout(() => {
          if (chatTypingRunId !== runId) return;
          const stateNow = loadState();
          if (stateNow.step !== 2) return;

          const gameNow = getGameState(stateNow, 2, { turn: 0, history: [] });
          if (gameNow.turn !== turnIndex) return;

          const historyNow = Array.isArray(gameNow.history) ? gameNow.history : [];
          const history = [
            ...historyNow,
            { role: "you", text: selectedText },
          ];
          updateGameState(2, { history, typingActor: "her" });
          renderApp();

          const showHerMessageTimer = setTimeout(() => {
            if (chatTypingRunId !== runId) return;
            const latestState = loadState();
            if (latestState.step !== 2) return;

            const latestGame = getGameState(latestState, 2, { turn: 0, history: [] });
            if (latestGame.turn !== turnIndex) return;

            const nextHistory = [
              ...(Array.isArray(latestGame.history) ? latestGame.history : []),
              { role: "her", text: replyText },
            ];
            const nextTurn = latestGame.turn + 1;
            const solved = nextTurn >= turns.length;
            updateGameState(2, {
              history: nextHistory,
              turn: nextTurn,
              solved,
              isLocked: false,
              typingActor: null,
              message: solved ? "Ты прошла нашу чат-историю 💫" : "",
            });
            renderApp();
          }, CHAT_TYPING_HER_MS);
          pushChatTypingTimer(showHerMessageTimer);
        }, CHAT_TYPING_YOU_MS);
        pushChatTypingTimer(showYourMessageTimer);
      });
    });
  }

  const replayChatBtn = app.querySelector("[data-action='replay-chat']");
  if (replayChatBtn) {
    replayChatBtn.addEventListener("click", () => {
      clearChatTypingTimers();
      const stateNow = loadState();
      const games = { ...(stateNow.games || {}) };
      delete games[2];
      const nextState = { ...stateNow, games };
      saveState(nextState);
      renderApp();
    });
  }

  if (screen.type === "heart") {
    app.querySelectorAll("[data-action='heart']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.index);
        const maxAttemptsRaw = Number(screen.gameConfig.maxAttempts);
        const maxAttempts = Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0 ? maxAttemptsRaw : 6;
        const gameState = getGameState(loadState(), 3, {
          tries: 0,
          opened: [],
          solved: false,
          locked: false,
          playfulUsed: false,
        });
        if (gameState.solved || gameState.locked) return;

        const alreadyOpened = (gameState.opened || []).includes(index);
        if (alreadyOpened) return;

        const correctIndex = Number.isInteger(gameState.targetIndex) ? gameState.targetIndex : screen.gameConfig.correctIndex;
        const isHit = index === correctIndex;
        if (isHit) {
          updateGameState(3, {
            solved: true,
            locked: false,
            opened: Array.from(new Set([...(gameState.opened || []), index])),
            lastIndex: index,
            pulseIndex: index,
            missIndex: null,
            hintLevel: "found",
            message: "❤️ нашла!",
            playfulLine: "",
            listenedAudio: false,
            gateMessage: "",
          });
          renderApp();
          const clearPulseTimer = setTimeout(() => {
            const stateNow = loadState();
            if (stateNow.step !== 3) return;
            const gameNow = getGameState(stateNow, 3, { solved: false });
            if (!gameNow.solved) return;
            updateGameState(3, { pulseIndex: null });
            renderApp();
          }, 900);
          pushChatTypingTimer(clearPulseTimer);
          return;
        }

        const distance = getHeartDistance(index, correctIndex);
        const hint = getHeartHintByDistance(distance, false);
        const playfulLine = getHeartPlayfulMissLine(gameState);
        const opened = Array.from(new Set([...(gameState.opened || []), index]));
        const tries = gameState.tries + 1;
        const locked = tries >= maxAttempts;
        const shouldPulse = hint.level === "hot" || hint.level === "very-close";

        updateGameState(3, {
          opened,
          tries,
          locked,
          lastIndex: index,
          missIndex: index,
          pulseIndex: shouldPulse ? index : null,
          hintLevel: hint.level,
          message: hint.text,
          playfulLine: playfulLine || "",
          playfulUsed: gameState.playfulUsed || Boolean(playfulLine),
        });
        renderApp();

        const clearMissFxTimer = setTimeout(() => {
          const stateNow = loadState();
          if (stateNow.step !== 3) return;
          const gameNow = getGameState(stateNow, 3, { solved: false, lastIndex: null });
          if (gameNow.solved || gameNow.lastIndex !== index) return;
          updateGameState(3, { missIndex: null, pulseIndex: null });
          renderApp();
        }, shouldPulse ? 1000 : 720);
        pushChatTypingTimer(clearMissFxTimer);
      });
    });

    const retryBtn = app.querySelector("[data-action='heart-retry']");
    retryBtn?.addEventListener("click", () => {
      updateGameState(3, {
        solved: false,
        tries: 0,
        opened: [],
        targetIndex: getRandomHeartIndex(),
        message: "❄️ холодно…",
        hintLevel: "cold",
        playfulUsed: false,
        playfulLine: "",
        missIndex: null,
        pulseIndex: null,
        lastIndex: null,
        locked: false,
        listenedAudio: false,
        gateMessage: "",
      });
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
    continueBtn.addEventListener("click", () => {
      if (screen.type === "heart") {
        const heartGame = getGameState(loadState(), 3, { solved: false, listenedAudio: false });
        if (heartGame.solved && !heartGame.listenedAudio) {
          updateGameState(3, { gateMessage: "Сначала послушай голосовое сообщение 🤍" });
          renderApp();
          return;
        }
      }
      setStep(state.step + 1);
    });
  }

  const audioBtn = app.querySelector("[data-action='audio']");
  if (audioBtn) {
    audioBtn.addEventListener("click", () => {
      const audioPath = audioBtn.dataset.audio;
      playPreview(audioPath);
      if (state.step === 3) {
        const heartGame = getGameState(loadState(), 3, { solved: false });
        if (heartGame.solved) {
          updateGameState(3, { listenedAudio: true, gateMessage: "" });
          renderApp();
        }
      }
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
  if (step !== 2) {
    clearChatTypingTimers();
  }
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

  const debugMenu = document.createElement("div");
  debugMenu.className = "debug-menu";
  debugMenu.innerHTML = `
    <button class="btn btn-ghost debug-toggle" type="button" data-action="debug-toggle">Debug</button>
    <div class="debug-panel" data-debug-panel>
      <div class="debug-nav">
        <button class="btn btn-ghost debug-arrow" type="button" data-action="debug-prev-step" aria-label="Предыдущий этап">←</button>
        <div class="debug-step-label">Этап ${state.step}/8</div>
        <button class="btn btn-ghost debug-arrow" type="button" data-action="debug-next-step" aria-label="Следующий этап">→</button>
      </div>
      <button class="btn btn-ghost debug-panel-btn" type="button" data-action="debug-full-reset">Сброс (debug)</button>
      <button class="btn btn-ghost debug-panel-btn" type="button" data-action="debug-step-reset">Рестарт этапа (debug)</button>
    </div>
  `;
  app.appendChild(debugMenu);

  const debugToggle = debugMenu.querySelector("[data-action='debug-toggle']");
  const debugPanel = debugMenu.querySelector("[data-debug-panel]");
  const debugPrevStep = debugMenu.querySelector("[data-action='debug-prev-step']");
  const debugNextStep = debugMenu.querySelector("[data-action='debug-next-step']");
  const debugFullReset = debugMenu.querySelector("[data-action='debug-full-reset']");
  const debugStepReset = debugMenu.querySelector("[data-action='debug-step-reset']");

  debugToggle?.addEventListener("click", () => {
    debugPanel?.classList.toggle("is-open");
  });
  debugPrevStep?.addEventListener("click", () => {
    debugJumpStep(-1);
  });
  debugNextStep?.addEventListener("click", () => {
    debugJumpStep(1);
  });
  debugFullReset?.addEventListener("click", () => {
    debugPanel?.classList.remove("is-open");
    resetProgress();
  });
  debugStepReset?.addEventListener("click", () => {
    debugPanel?.classList.remove("is-open");
    resetCurrentStepDebug();
  });
}

renderApp();
