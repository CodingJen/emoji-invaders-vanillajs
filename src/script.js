// basic elements of game
const gameWindow = document.getElementById("game");

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");

const player = document.getElementById("player");
const shot = document.getElementById("shot");
const invadersGrid = document.getElementById("invaders");
const invaders = document.querySelectorAll(".invader");

const audioD = document.getElementById("audio-d");
const audioC = document.getElementById("audio-c");
const audioAsharp = document.getElementById("audio-asharp");
const audioA = document.getElementById("audio-a");
const pew = document.getElementById("pew");
const boom = document.getElementById("boom");

const btnPlay = document.getElementById("play-btn");
const heading = document.getElementById("head");

// some game variable we need
const gameState = {
  // static settings
  playerWidth: 50,
  playerY: 50,
  playerSpeed: 300,
  shotHeight: 40,
  shotWidth: 10,
  shotStart: 50,
  shotSpeed: 500,
  invadersStartPosition: { x: 0, y: 50 },
  invadersInitialTop: 50,
  invadersBaseSpeed: 1000,
  totalInvaders: 55,
  boomTime: 75, // milliseconds boom emoji shown

  //variables
  paused: true,
  level: 1,
  score: 0,
  lastTime: null,
  lastAnimationTick: null,
  rollTick: 0,

  gameWidth: gameWindow.getBoundingClientRect().width,
  gameHeight: gameWindow.getBoundingClientRect().height,
  playerPosition: 300,
  shotFired: false,
  shotPosition: { x: null, y: null },
  invadersCurrentPosition: { x: 0, y: 50 },
  rightDirection: true,
  moveAmount: null,
  activeInvaders: 55,
  lastKilled: null,
  lastKilledTime: null,

  bombs: [],
  bombPositions: [], // array of {x: ?, y: ?}
};

const emojis = Object.freeze({
  player: "🌋",
  shot: "🔥",
  bomb: "💣",
  boom: "💥",
  alienShip: "😈",
  deadPlayer: "☠",
});

gameState.playerY = gameState.gameHeight - 50 - player.getBoundingClientRect().height;
recalcMoveAmount();

let keys = [];

function recalcMoveAmount() {
  gameState.moveAmount = gameState.gameWidth / (14 * 8 * (gameState.activeInvaders / gameState.totalInvaders)); // (11 chars + 3spaces)* 8 moves per char // (active cols + 3) * 8/col
}

function playButton(e) {
  gameState.paused = !gameState.paused;
  btnPlay.innerHTML = gameState.paused ? "Play!" : "Pause";

  if (!gameState.paused) {
    // heading.classList.add("to-top");
    this.blur();
    window.requestAnimationFrame(animate);
  }
}

function handleKeyDown(e) {
  keys[e.keyCode] = true;
}

function handleKeyUp(e) {
  keys[e.keyCode] = false;
}

function isKeyPressed(keycode) {
  return keys[keycode];
}

function lostFocus(e) {
  // clear keys so things don't keep happening
  keys.forEach((key, i) => (keys[i] = false)); // not sure why just setting key=false doesn't work?!
}

function setSpritePosition(sprite, { x, y }) {
  sprite.style.left = x + "px";
  sprite.style.top = y + "px";
}

function updateScore(newScore) {
  scoreElement.innerHTML = newScore;
}

function updateLevel(newLevel) {
  levelElement.innerHTML = newLevel;
}

function stopSounds() {
  audioD.pause();
  audioC.pause();
  audioAsharp.pause();
  audioA.pause();
}

function playSound(tickNumber) {
  stopSounds();
  if (tickNumber === 1 || tickNumber === 5) {
    audioD.currentTime = 0;
    audioD.play();
  } else if (tickNumber === 2 || tickNumber === 6) {
    audioC.currentTime = 0;
    audioC.play();
  } else if (tickNumber === 3 || tickNumber === 7) {
    audioAsharp.currentTime = 0;
    audioAsharp.play();
  } else if (tickNumber === 4 || tickNumber === 8) {
    audioA.currentTime = 0;
    audioA.play();
  }
}

function isCollided(element1, element2) {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();
}

function createInvader(emoji, { x, y }, points, classList = []) {
  const newInvader = document.createElement("div");
  newInvader.innerHTML = emoji;
  newInvader.dataset.points = points;
  newInvader.classList.add("invader", ...classList);
  newInvader.style.left = x;
  newInvader.style.top = y;

  return newInvader;
}

function createBomb(emoji, { x, y }) {
  const newBomb = document.createElement("div");
  newBomb.innerHTML = emoji;
  newBomb.classList.add("bomb");
  newBomb.style.left = x;
  newBomb.style.top = y;

  return newBomb;
}

// 11 columns x 5 rows

function generateEmojis({ x, y }) {}

function killed(element, currentTimestep) {
  gameState.lastKilled = element;
  gameState.lastKilledTime = currentTimestep;
  element.innerHTML = emojis.boom;
}

function clearKilled(currentTimestep) {
  if (gameState.lastKilled !== null && currentTimestep >= gameState.lastKilledTime + gameState.boomTime) {
    gameState.lastKilled.innerHTML = "";
    gameState.lastKilled.classList.add("hidden");
  }
}
/**********************************************************************************************/
/***********************************  MAIN GAME LOOP ******************************************/
/**********************************************************************************************/
function animate(timestep) {
  if (gameState.paused) return;
  if (!gameState.lastTime) {
    gameState.lastTime = timestep;
    gameState.lastAnimationTick = timestep;
    window.requestAnimationFrame(animate);
    return;
  }
  let doAnimate = false;
  if (timestep >= gameState.lastAnimationTick + gameState.invadersBaseSpeed * (gameState.activeInvaders / gameState.totalInvaders)) {
    gameState.lastAnimationTick = timestep;
    doAnimate = true;
    if (gameState.rollTick < 8) gameState.rollTick++;
    else gameState.rollTick = 1;
  }
  const deltaTime = (timestep - gameState.lastTime) / 1000; // deltaT in seconds

  // clear off screen what isn't needed first
  clearKilled(timestep);

  // handle other animations first, before player
  // we're moving, check collision before moving again
  // my thinking on the seperation of gameState.shotFired here is to test if the
  // last move loop collided before we continue to move the grid and shot again.
  if (gameState.shotFired) {
    const shotRect = shot.getBoundingClientRect();
    const shotTop = shotRect.top;
    const shotMid = shotRect.left + shotRect.width / 2;
    invaders.forEach((invader) => {
      // do we need to check for the presence of the hidden class to see if it's gone first?  -- YES!
      const rect = invader.getBoundingClientRect();
      if (!invader.classList.contains("hidden")) {
        if (shotTop < rect.bottom && shotTop > rect.top && shotMid > rect.left && shotMid < rect.right) {
          // Hit logic
          gameState.shotFired = false;
          shot.classList.add("hidden");
          boom.currentTime = 0;
          boom.play();
          // invader.classList.add("hidden");
          gameState.score += parseInt(invader.dataset.points);
          updateScore(gameState.score);
          gameState.activeInvaders--;
          killed(invader, timestep);
          //recalcMoveAmount();
        }
      }
    });
  }

  // ********************************************************************************************
  // move grid of invaders
  // ********************************************************************************************
  if (doAnimate) {
    let swapped = false;
    if (gameState.rightDirection) {
      // first test if any are going to touch a wall
      invaders.forEach((invader) => {
        if (!invader.classList.contains("hidden")) {
          if (invader.getBoundingClientRect().x + invader.getBoundingClientRect().width + gameState.moveAmount >= gameWindow.getBoundingClientRect().right) {
            gameState.rightDirection = false;
            swapped = true;
          }
        }
      });
    } else {
      invaders.forEach((invader) => {
        if (!invader.classList.contains("hidden")) {
          if (invader.getBoundingClientRect().x - gameState.moveAmount <= gameWindow.getBoundingClientRect().left) {
            gameState.rightDirection = true;
            swapped = true;
          }
        }
      });
    }
    if (swapped) {
      gameState.invadersCurrentPosition.y += 40;
    } else {
      if (gameState.rightDirection) {
        gameState.invadersCurrentPosition.x += gameState.moveAmount;
      } else {
        gameState.invadersCurrentPosition.x -= gameState.moveAmount;
      }
    }
    invaders.forEach((invader) => {
      invader.style.transform = "rotate(" + (360 / 8) * gameState.rollTick + "deg)";
    });
    playSound(gameState.rollTick);
    setSpritePosition(invadersGrid, gameState.invadersCurrentPosition);
  }

  // ********************************************************************************************
  // drop bomb if needed and move it (them)
  // ********************************************************************************************

  // always have 1 dropping or multiple if on higher level

  // ********************************************************************************************
  // handle shot move
  // ********************************************************************************************
  if (gameState.shotFired) {
    gameState.shotPosition.y -= gameState.shotSpeed * deltaTime;
    //if (gameState.shotPosition.y >= gameState.gameHeight) {
    if (gameState.shotPosition.y <= 0) {
      gameState.shotFired = false;
      shot.classList.add("hidden");
    } else {
      setSpritePosition(shot, gameState.shotPosition);
    }
  }

  // ********************************************************************************************
  // handle keys
  // ********************************************************************************************
  if (isKeyPressed(32)) {
    //space key
    if (!gameState.shotFired) {
      gameState.shotFired = true;
      gameState.shotPosition = {
        x: gameState.playerPosition + gameState.playerWidth / 2 - gameState.shotWidth / 2,
        y: gameState.playerY - shot.getBoundingClientRect().height / 2,
      };
      setSpritePosition(shot, gameState.shotPosition);
      shot.classList.remove("hidden");
      pew.currentTime = 0;
      pew.play();
    }
  }
  if (isKeyPressed(37)) {
    // left arrow
    const newPos = gameState.playerPosition - gameState.playerSpeed * deltaTime;
    if (newPos > 0) {
      gameState.playerPosition = newPos;
      setSpritePosition(player, {
        x: gameState.playerPosition,
        y: gameState.playerY,
      });
    }
  }
  if (isKeyPressed(39)) {
    // right arrow
    const newPos = gameState.playerPosition + gameState.playerSpeed * deltaTime;
    if (newPos <= gameState.gameWidth - player.getBoundingClientRect().width) {
      gameState.playerPosition += gameState.playerSpeed * deltaTime;
      setSpritePosition(player, {
        x: gameState.playerPosition,
        y: gameState.playerY,
      });
    }
  }

  gameState.lastTime = timestep;
  window.requestAnimationFrame(animate);
}

// ********************************************************************************************
// setup listeners
// ********************************************************************************************
btnPlay.addEventListener("click", playButton);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", lostFocus);

setSpritePosition(player, {
  x: gameState.playerPosition,
  y: gameState.playerY,
});

setSpritePosition(invadersGrid, gameState.invadersCurrentPosition);

updateScore(gameState.score);
updateLevel(gameState.level);
//setSpritePosition(invadersGrid, { x: 0, y: gameState.invadersInitialTop });

// once all is setup lets get this going!
window.requestAnimationFrame(animate);
