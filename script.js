const form = document.querySelector('.search-form');
const input = document.querySelector('#query');
const clearBtn = document.querySelector('.clear');
const luckyBtn = document.querySelector('.lucky');
const gameButton = document.querySelector('.game-button');
const gameOverlay = document.querySelector('#game-overlay');
const closeGameBtn = document.querySelector('.game-close');
const gameCanvas = document.querySelector('#mario-canvas');

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
  const heroHeight = 40;
  const baseSpeed = 220;
  const gravity = 1700;
  const jumpVelocity = 650;

  let running = false;
  let lastTimestamp = 0;
  let animationId = 0;
  let hero;
  let obstacles;
  let score;
  let spawnTimer;
  let sceneryOffset;
  let gameOver;

  const inputState = {
    left: false,
    right: false,
    jump: false,
    restart: false,
  };

  function resetGame() {
    hero = {
      x: width * 0.2,
      y: groundY - heroHeight,
      width: heroWidth,
      height: heroHeight,
      vy: 0,
      onGround: true,
    };
    obstacles = [];
    score = 0;
    spawnTimer = 0;
    sceneryOffset = 0;
    gameOver = false;
  }

  function spawnObstacle() {
    const obstacleHeight = 40 + Math.random() * 50;
    const obstacleWidth = 30 + Math.random() * 40;
    obstacles.push({
      x: width + obstacleWidth,
      y: groundY - obstacleHeight,
      width: obstacleWidth,
      height: obstacleHeight,
      speed: baseSpeed * (1 + Math.min(score / 1800, 0.6)),
    });
  }

  function updateHero(delta) {
    let horizontal = 0;
    if (inputState.left) horizontal -= 1;
    if (inputState.right) horizontal += 1;

    hero.x += horizontal * baseSpeed * 0.75 * delta;
    hero.x = Math.max(20, Math.min(hero.x, width - hero.width - 20));

    if (inputState.jump && hero.onGround) {
      hero.vy = -jumpVelocity;
      hero.onGround = false;
    }
    inputState.jump = false;

    hero.vy += gravity * delta;
    hero.y += hero.vy * delta;

    if (hero.y + hero.height >= groundY) {
      hero.y = groundY - hero.height;
      hero.vy = 0;
      hero.onGround = true;
    }
  }

  function updateObstacles(delta) {
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const interval = 1.25 - Math.min(score / 2000, 0.6);
      spawnTimer = Math.max(0.55, interval);
    }

    obstacles.forEach((obstacle) => {
      obstacle.x -= obstacle.speed * delta;
    });

    obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);
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
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      ctx.fillStyle = '#388e3c';
      ctx.fillRect(obstacle.x - 4, obstacle.y - 10, obstacle.width + 8, 12);
    });
  }

  function drawHero() {
    ctx.fillStyle = '#ff6f61';
    ctx.fillRect(hero.x, hero.y, hero.width, hero.height);

    ctx.fillStyle = '#fff';
    ctx.fillRect(hero.x + 8, hero.y + 10, 6, 6);
    ctx.fillRect(hero.x + hero.width - 14, hero.y + 10, 6, 6);

    ctx.fillStyle = '#000';
    ctx.fillRect(hero.x + 10, hero.y + 12, 2, 2);
    ctx.fillRect(hero.x + hero.width - 12, hero.y + 12, 2, 2);

    ctx.fillStyle = '#fdd835';
    ctx.fillRect(hero.x + 6, hero.y + hero.height - 10, hero.width - 12, 10);
  }

  function drawScore() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(16, 16, 160, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Roboto", sans-serif';
    ctx.fillText(`分数：${Math.floor(score)}`, 30, 46);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffe082';
    ctx.font = '36px "Roboto", sans-serif';
    ctx.fillText('游戏结束！', width / 2 - 110, height / 2 - 10);
    ctx.font = '20px "Roboto", sans-serif';
    ctx.fillText('按 R 重新开始', width / 2 - 90, height / 2 + 30);
  }

  function update(delta) {
    if (inputState.restart) {
      inputState.restart = false;
      resetGame();
    }

    if (gameOver) {
      return;
    }

    updateHero(delta);
    updateObstacles(delta);

    sceneryOffset = (sceneryOffset + baseSpeed * delta * 0.4) % (width * 2);
    score += delta * 110;

    if (checkCollisions()) {
      gameOver = true;
    }
  }

  function draw() {
    drawBackground();
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
    start() {
      if (running) {
        resetGame();
        return;
      }
      resetGame();
      running = true;
      lastTimestamp = 0;
      animationId = requestAnimationFrame(gameLoop);
    },
    stop() {
      running = false;
      lastTimestamp = 0;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
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
      return running;
    },
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

function openGame() {
  if (!gameOverlay || !marioGame) return;

  gameOverlay.hidden = false;
  isGameOpen = true;
  marioGame.start();
  document.body.classList.add('game-open');
  releaseFocusTrap = trapFocusOnGame();
  requestAnimationFrame(() => {
    closeGameBtn?.focus();
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

  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyR'].includes(event.code)) {
    event.preventDefault();
  }

  marioGame?.handleKeyDown(event.code);
}

function handleGameKeyUp(event) {
  if (!isGameOpen) return;

  marioGame?.handleKeyUp(event.code);
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
