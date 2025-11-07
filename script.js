const form = document.querySelector('.search-form');
const input = document.querySelector('#query');
const clearBtn = document.querySelector('.clear');
const luckyBtn = document.querySelector('.lucky');
const gameButton = document.querySelector('.game-button');
const gameOverlay = document.querySelector('#game-overlay');
const closeGameBtn = document.querySelector('.game-close');
const gameCanvas = document.querySelector('#mario-canvas');
const gameStartBtn = document.querySelector('.game-start');
const gameScoreLabel = document.querySelector('.game-score');
const gameStatus = document.querySelector('.game-status');
const touchLeftBtn = document.querySelector('.touch-btn.left');
const touchRightBtn = document.querySelector('.touch-btn.right');
const touchJumpBtn = document.querySelector('.touch-btn.jump');

if (gameOverlay) {
  gameOverlay.hidden = true;
}

function updateClearButton() {
  if (input.value.trim()) {
    clearBtn.classList.add('visible');
  } else {
    clearBtn.classList.remove('visible');
  }
}

input.addEventListener('input', updateClearButton);

clearBtn.addEventListener('click', () => {
  input.value = '';
  updateClearButton();
  input.focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const term = input.value.trim();

  if (!term) {
    input.focus();
    return;
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(term)}`;
  window.open(url, '_blank', 'noopener');
});

luckyBtn.addEventListener('click', () => {
  const term = input.value.trim();
  const url = term
    ? `https://www.google.com/search?btnI=I&q=${encodeURIComponent(term)}`
    : 'https://www.google.com/doodles';
  window.open(url, '_blank', 'noopener');
});

updateClearButton();

const marioGame = (() => {
  if (!gameCanvas) return null;

  const ctx = gameCanvas.getContext('2d');
  const width = gameCanvas.width;
  const height = gameCanvas.height;
  const groundY = height - 60;
  const heroWidth = 34;
  const heroHeight = 42;
  const baseSpeed = 220;
  const gravity = 1700;
  const jumpVelocity = 650;

  const statusMessages = {
    ready: '点击“开始游戏”或按 Enter/空格开始冒险。',
    running: '躲避管道，收集金币，保持奔跑！',
    gameOver: '游戏结束！按 R 键或点击“再玩一次”。',
  };

  const storageKey = 'simple-mario-best-score';
  let bestScore = 0;
  try {
    const storedBest = window.localStorage?.getItem(storageKey);
    if (storedBest) {
      const parsed = Number.parseInt(storedBest, 10);
      if (!Number.isNaN(parsed)) {
        bestScore = parsed;
      }
    }
  } catch (error) {
    bestScore = 0;
  }

  let running = false;
  let active = false;
  let lastTimestamp = 0;
  let animationId = 0;
  let hero;
  let obstacles;
  let coins;
  let clouds;
  let score;
  let spawnTimer;
  let coinSpawnTimer;
  let sceneryOffset;
  let gameOver;
  let hasStartedOnce = false;
  let hasShownGameOver = false;
  let statusTimer = 0;

  const inputState = {
    left: false,
    right: false,
    jump: false,
    restart: false,
  };

  function resetInputs() {
    inputState.left = false;
    inputState.right = false;
    inputState.jump = false;
    inputState.restart = false;
  }

  function updateStartButtonLabel() {
    if (gameStartBtn) {
      gameStartBtn.textContent = hasStartedOnce ? '再玩一次' : '开始游戏';
    }
  }

  function setStatus(text) {
    if (gameStatus) {
      gameStatus.textContent = text;
    }
  }

  function setTemporaryStatus(text, duration) {
    setStatus(text);
    statusTimer = duration;
  }

  function updateStatusTimer(delta) {
    if (statusTimer > 0) {
      statusTimer -= delta;
      if (statusTimer <= 0) {
        setStatus(active ? statusMessages.running : statusMessages.ready);
      }
    }
  }

  function updateScoreLabel() {
    if (!gameScoreLabel) return;
    const currentScore = Math.max(0, Math.floor(score));
    const displayBest = Math.max(currentScore, Math.floor(bestScore));
    gameScoreLabel.textContent = `分数：${currentScore} · 最高：${displayBest}`;
  }

  function createHero() {
    return {
      x: width * 0.2,
      y: groundY - heroHeight,
      width: heroWidth,
      height: heroHeight,
      vy: 0,
      onGround: true,
      frame: 0,
      facing: 1,
    };
  }

  function createClouds() {
    const cloudCount = 4;
    const generated = [];
    for (let i = 0; i < cloudCount; i += 1) {
      const cloudWidth = 110 + Math.random() * 70;
      generated.push({
        x: (width / cloudCount) * i + Math.random() * 100,
        y: 40 + Math.random() * 100,
        width: cloudWidth,
        height: 30 + Math.random() * 22,
        speed: 30 + Math.random() * 25,
      });
    }
    return generated;
  }

  function resetGameState() {
    hero = createHero();
    obstacles = [];
    coins = [];
    clouds = createClouds();
    score = 0;
    spawnTimer = 0;
    coinSpawnTimer = 1.6;
    sceneryOffset = 0;
    gameOver = false;
    hasShownGameOver = false;
    statusTimer = 0;
    resetInputs();
    updateScoreLabel();
  }

  function spawnObstacle() {
    const difficulty = Math.min(score / 2200, 0.75);
    const roll = Math.random();

    if (roll < 0.55) {
      const obstacleWidth = 46 + Math.random() * 30;
      const obstacleHeight = 70 + Math.random() * 70;
      obstacles.push({
        type: 'pipe',
        solidTop: true,
        x: width + obstacleWidth,
        y: groundY - obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight,
        speed: baseSpeed * (1 + difficulty),
      });
      return;
    }

    if (roll < 0.8) {
      const obstacleWidth = 36;
      const obstacleHeight = 32;
      const obstacleY = groundY - heroHeight * (1.8 + Math.random() * 0.6);
      const speed = baseSpeed * (1 + difficulty * 0.8);
      obstacles.push({
        type: 'brick',
        solidTop: true,
        x: width + 60,
        y: obstacleY,
        width: obstacleWidth,
        height: obstacleHeight,
        speed,
      });

      if (Math.random() < 0.7) {
        coins.push({
          x: width + 60 + obstacleWidth / 2,
          y: obstacleY - 36,
          radius: 12,
          speed,
          wobble: Math.random() * Math.PI * 2,
        });
      }
      return;
    }

    const goombaWidth = 36;
    const goombaHeight = 28;
    obstacles.push({
      type: 'goomba',
      solidTop: false,
      x: width + 60,
      y: groundY - goombaHeight,
      baseY: groundY - goombaHeight,
      width: goombaWidth,
      height: goombaHeight,
      speed: baseSpeed * (1 + difficulty * 1.15),
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function spawnCoin() {
    const radius = 12;
    coins.push({
      x: width + 80 + Math.random() * 80,
      y: groundY - 110 - Math.random() * 100,
      radius,
      speed: baseSpeed * 0.85,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function updateHero(delta) {
    let horizontal = 0;
    if (inputState.left) horizontal -= 1;
    if (inputState.right) horizontal += 1;

    if (horizontal !== 0) {
      hero.facing = horizontal;
      hero.frame += Math.abs(horizontal) * delta * 12;
    } else {
      hero.frame += delta * 6;
    }

    hero.x += horizontal * baseSpeed * 0.8 * delta;
    hero.x = Math.max(16, Math.min(hero.x, width - hero.width - 16));

    if (inputState.jump && hero.onGround) {
      hero.vy = -jumpVelocity;
      hero.onGround = false;
    }
    inputState.jump = false;

    const previousY = hero.y;
    hero.vy += gravity * delta;
    hero.y += hero.vy * delta;

    let landed = false;

    obstacles.forEach((obstacle) => {
      if (!obstacle.solidTop) return;
      const heroBottom = hero.y + hero.height;
      const previousBottom = previousY + hero.height;
      const obstacleTop = obstacle.y;
      const overlapsX = hero.x + hero.width > obstacle.x + 4 && hero.x < obstacle.x + obstacle.width - 4;
      if (
        overlapsX &&
        hero.vy >= 0 &&
        previousBottom <= obstacleTop &&
        heroBottom >= obstacleTop
      ) {
        hero.y = obstacleTop - hero.height;
        hero.vy = 0;
        hero.onGround = true;
        landed = true;
      }
    });

    if (hero.y + hero.height >= groundY) {
      hero.y = groundY - hero.height;
      hero.vy = 0;
      hero.onGround = true;
      landed = true;
    }

    if (!landed) {
      hero.onGround = false;
    }
  }

  function updateObstacles(delta) {
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const interval = 1.15 - Math.min(score / 2600, 0.55);
      spawnTimer = Math.max(0.55, interval + Math.random() * 0.25);
    }

    obstacles.forEach((obstacle) => {
      obstacle.x -= obstacle.speed * delta;
      if (obstacle.type === 'goomba') {
        obstacle.wobble += delta * 6;
        obstacle.y = obstacle.baseY + Math.sin(obstacle.wobble) * 4;
      }
    });

    obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);
  }

  function updateCoins(delta) {
    coinSpawnTimer -= delta;
    if (coinSpawnTimer <= 0) {
      spawnCoin();
      coinSpawnTimer = 1.8 + Math.random() * 1.4;
    }

    coins.forEach((coin) => {
      coin.x -= coin.speed * delta;
      coin.wobble += delta * 4.5;
      coin.y += Math.sin(coin.wobble) * 10 * delta;
    });

    coins = coins.filter((coin) => coin.x + coin.radius > -40);
  }

  function handleCoinCollection() {
    let collected = false;
    coins = coins.filter((coin) => {
      const overlapsX = hero.x < coin.x + coin.radius && hero.x + hero.width > coin.x - coin.radius;
      const overlapsY = hero.y < coin.y + coin.radius && hero.y + hero.height > coin.y - coin.radius;
      if (overlapsX && overlapsY) {
        score += 120;
        collected = true;
        return false;
      }
      return true;
    });

    if (collected) {
      updateScoreLabel();
      setTemporaryStatus('收集到金币！+120 分', 1.4);
    }
  }

  function updateBackground(delta) {
    sceneryOffset = (sceneryOffset + baseSpeed * delta * 0.4) % (width * 2);
    clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * delta;
      if (cloud.x + cloud.width < -40) {
        cloud.x = width + Math.random() * 160;
        cloud.y = 40 + Math.random() * 120;
        cloud.width = 110 + Math.random() * 70;
        cloud.height = 30 + Math.random() * 20;
        cloud.speed = 30 + Math.random() * 25;
      }
    });
  }

  function checkCollisions() {
    return obstacles.some((obstacle) => {
      const overlapX = hero.x < obstacle.x + obstacle.width && hero.x + hero.width > obstacle.x;
      const overlapY = hero.y < obstacle.y + obstacle.height && hero.y + hero.height > obstacle.y;
      return overlapX && overlapY;
    });
  }

  function drawBackground() {
    ctx.fillStyle = '#5ec5ff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    clouds.forEach((cloud) => {
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.width * 0.35, cloud.height * 0.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + cloud.width * 0.3, cloud.y + 6, cloud.width * 0.4, cloud.height * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + cloud.width * 0.65, cloud.y, cloud.width * 0.33, cloud.height * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    const hillHeight = 90;
    const offset = sceneryOffset % (width * 2);
    ctx.fillStyle = '#a1d86a';
    for (let i = -1; i <= 3; i += 1) {
      const hillX = ((i * width) - offset * 0.6) % (width * 2);
      ctx.beginPath();
      ctx.moveTo(hillX, groundY);
      ctx.quadraticCurveTo(hillX + width * 0.25, groundY - hillHeight, hillX + width * 0.5, groundY);
      ctx.quadraticCurveTo(hillX + width * 0.75, groundY - hillHeight, hillX + width, groundY);
      ctx.lineTo(hillX + width, height);
      ctx.lineTo(hillX, height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#4caf50';
    ctx.fillRect(0, groundY, width, height - groundY);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY - 8);
    ctx.lineTo(width, groundY - 8);
    ctx.stroke();
  }

  function drawObstacles() {
    obstacles.forEach((obstacle) => {
      if (obstacle.type === 'pipe') {
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(obstacle.x - 6, obstacle.y - 16, obstacle.width + 12, 18);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(obstacle.x + 6, obstacle.y + 12, 6, obstacle.height - 24);
        return;
      }

      if (obstacle.type === 'brick') {
        ctx.fillStyle = '#b66a30';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#87421d';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ctx.fillStyle = '#d58d4c';
        ctx.fillRect(obstacle.x + 6, obstacle.y + 6, obstacle.width - 12, obstacle.height - 12);
        return;
      }

      ctx.fillStyle = '#8d4b1d';
      ctx.beginPath();
      ctx.ellipse(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2 + 6,
        obstacle.width / 2,
        obstacle.height / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.fillRect(obstacle.x + 6, obstacle.y + 6, 8, 10);
      ctx.fillRect(obstacle.x + obstacle.width - 14, obstacle.y + 6, 8, 10);
      ctx.fillStyle = '#000';
      ctx.fillRect(obstacle.x + 8, obstacle.y + 10, 3, 3);
      ctx.fillRect(obstacle.x + obstacle.width - 12, obstacle.y + 10, 3, 3);
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(obstacle.x + 4, obstacle.y + obstacle.height - 6, obstacle.width - 8, 6);
    });
  }

  function drawCoins() {
    coins.forEach((coin) => {
      const gradient = ctx.createRadialGradient(
        coin.x - 4,
        coin.y - 6,
        2,
        coin.x,
        coin.y,
        coin.radius,
      );
      gradient.addColorStop(0, '#ffeb3b');
      gradient.addColorStop(1, '#f9a825');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawHero() {
    ctx.save();
    ctx.translate(hero.x + hero.width / 2, hero.y + hero.height / 2);
    ctx.scale(hero.facing, 1);
    ctx.translate(-hero.width / 2, -hero.height / 2);

    const legSwing = Math.sin(hero.frame) * 4;

    ctx.fillStyle = '#fdd835';
    ctx.fillRect(6, hero.height - 12, hero.width - 12, 12);

    ctx.fillStyle = '#ff6f61';
    ctx.fillRect(0, 0, hero.width, hero.height - 10);

    ctx.fillStyle = '#d84315';
    ctx.fillRect(-2, -10, hero.width + 4, 14);
    ctx.fillStyle = '#bf360c';
    ctx.fillRect(hero.width / 2 - 12, -6, 24, 12);

    ctx.fillStyle = '#fff';
    ctx.fillRect(8, 10, 6, 6);
    ctx.fillRect(hero.width - 14, 10, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(10, 12, 2, 2);
    ctx.fillRect(hero.width - 12, 12, 2, 2);

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(8, 20, hero.width - 16, 4);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(4, hero.height - 10, 10, 10);
    ctx.fillRect(hero.width - 14, hero.height - 10, 10, 10);

    ctx.save();
    ctx.translate(8, hero.height - 8);
    ctx.rotate((-0.2 + legSwing * 0.02));
    ctx.fillStyle = '#ff6f61';
    ctx.fillRect(-2, 0, 8, 18);
    ctx.restore();

    ctx.save();
    ctx.translate(hero.width - 8, hero.height - 8);
    ctx.rotate((0.2 - legSwing * 0.02));
    ctx.fillStyle = '#ff6f61';
    ctx.fillRect(-6, 0, 8, 18);
    ctx.restore();

    ctx.restore();
  }

  function drawScore() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(16, 16, 220, 60);
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Roboto", sans-serif';
    ctx.fillText(`分数：${Math.floor(score)}`, 30, 46);
    ctx.font = '16px "Roboto", sans-serif';
    ctx.fillText(`最高：${Math.max(Math.floor(bestScore), Math.floor(score))}`, 30, 70);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffe082';
    ctx.font = '36px "Roboto", sans-serif';
    ctx.fillText('游戏结束！', width / 2 - 120, height / 2 - 20);
    ctx.font = '20px "Roboto", sans-serif';
    const restartText = hasStartedOnce ? '按 R 或点击“再玩一次”重来' : '按 R 键重新开始';
    ctx.fillText(restartText, width / 2 - 130, height / 2 + 24);
  }

  function update(delta) {
    if (inputState.restart) {
      inputState.restart = false;
      active = true;
      resetGameState();
      setStatus(statusMessages.running);
      return;
    }

    if (!active) {
      updateStatusTimer(delta);
      return;
    }

    updateHero(delta);
    updateObstacles(delta);
    updateCoins(delta);
    updateBackground(delta);
    handleCoinCollection();
    updateStatusTimer(delta);

    score += delta * 120;
    updateScoreLabel();

    if (checkCollisions()) {
      gameOver = true;
      active = false;
      if (!hasShownGameOver) {
        hasShownGameOver = true;
        let message = statusMessages.gameOver;
        if (score > bestScore) {
          bestScore = Math.floor(score);
          try {
            window.localStorage?.setItem(storageKey, String(bestScore));
          } catch (error) {
            // ignore storage errors
          }
          message = '新的最高分！按 R 键或点击“再玩一次”。';
        }
        updateScoreLabel();
        setStatus(message);
        updateStartButtonLabel();
      }
    }
  }

  function draw() {
    drawBackground();
    drawCoins();
    drawObstacles();
    drawHero();
    drawScore();

    if (gameOver) {
      drawGameOver();
    }
  }

  function gameLoop(timestamp) {
    if (!running) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    update(delta);
    draw();

    animationId = requestAnimationFrame(gameLoop);
  }

  return {
    prepare() {
      running = false;
      active = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
      lastTimestamp = 0;
      resetGameState();
      setStatus(statusMessages.ready);
      updateStartButtonLabel();
      draw();
    },
    start() {
      if (!running) {
        running = true;
        lastTimestamp = 0;
        animationId = requestAnimationFrame(gameLoop);
      }
      active = true;
      hasStartedOnce = true;
      updateStartButtonLabel();
      resetGameState();
      setStatus(statusMessages.running);
    },
    stop() {
      running = false;
      active = false;
      lastTimestamp = 0;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
      resetInputs();
    },
    handleKeyDown(code) {
      if (!running) return;

      if (code === 'ArrowLeft' || code === 'KeyA') {
        inputState.left = true;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        inputState.right = true;
      }
      if (code === 'ArrowUp' || code === 'Space' || code === 'KeyW') {
        inputState.jump = true;
      }
      if (code === 'KeyR') {
        inputState.restart = true;
      }
    },
    handleKeyUp(code) {
      if (!running) return;

      if (code === 'ArrowLeft' || code === 'KeyA') {
        inputState.left = false;
      }
      if (code === 'ArrowRight' || code === 'KeyD') {
        inputState.right = false;
      }
    },
    isRunning() {
      return active;
    },
    clearInputs: resetInputs,
  };
})();

let isGameOpen = false;

function trapFocusOnGame() {
  if (!gameOverlay) return null;
  const focusable = gameOverlay.querySelectorAll('button');
  if (!focusable.length) return null;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleTab(event) {
    if (event.key !== 'Tab') return;
    if (focusable.length === 1) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  gameOverlay.addEventListener('keydown', handleTab);

  return () => {
    gameOverlay.removeEventListener('keydown', handleTab);
  };
}

let releaseFocusTrap;

gameStartBtn?.addEventListener('click', () => {
  marioGame?.start();
});

function bindTouchControl(button, code) {
  if (!button) return;

  let activePointer = false;

  const press = (event) => {
    event.preventDefault();
    if (!isGameOpen) return;
    activePointer = true;
    if (!marioGame?.isRunning()) {
      marioGame?.start();
    }
    marioGame?.handleKeyDown(code);
  };

  const release = (event) => {
    if (!activePointer) return;
    event.preventDefault();
    activePointer = false;
    marioGame?.handleKeyUp(code);
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

bindTouchControl(touchLeftBtn, 'ArrowLeft');
bindTouchControl(touchRightBtn, 'ArrowRight');
bindTouchControl(touchJumpBtn, 'Space');

function openGame() {
  if (!gameOverlay || !marioGame) return;

  gameOverlay.hidden = false;
  isGameOpen = true;
  marioGame.prepare();
  document.body.classList.add('game-open');
  releaseFocusTrap = trapFocusOnGame();
  requestAnimationFrame(() => {
    (gameStartBtn ?? closeGameBtn)?.focus();
  });
}

function closeGame() {
  if (!gameOverlay || !marioGame) return;

  gameOverlay.hidden = true;
  isGameOpen = false;
  marioGame.stop();
  document.body.classList.remove('game-open');
  releaseFocusTrap?.();
  releaseFocusTrap = null;
  gameButton?.focus();
}

function handleGameKeyDown(event) {
  if (!isGameOpen) return;

  if (event.code === 'Escape') {
    event.preventDefault();
    closeGame();
    return;
  }

  const running = marioGame?.isRunning();

  if (!running) {
    if (['Space', 'Enter', 'KeyR'].includes(event.code)) {
      event.preventDefault();
      marioGame?.start();
    }
    return;
  }

  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyR'].includes(event.code)) {
    event.preventDefault();
  }

  marioGame?.handleKeyDown(event.code);
}

function handleGameKeyUp(event) {
  if (!isGameOpen) return;

  if (!marioGame?.isRunning()) {
    return;
  }

  marioGame.handleKeyUp(event.code);
}

gameButton?.addEventListener('click', () => {
  if (isGameOpen) {
    closeGame();
  } else {
    openGame();
  }
});

closeGameBtn?.addEventListener('click', closeGame);

gameOverlay?.addEventListener('click', (event) => {
  if (event.target === gameOverlay) {
    closeGame();
  }
});

window.addEventListener('keydown', handleGameKeyDown, { passive: false });
window.addEventListener('keyup', handleGameKeyUp);
window.addEventListener('blur', () => {
  marioGame?.clearInputs();
});
