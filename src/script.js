// basic elements of game
const gameWindow = document.getElementById("game");

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");

const player = document.getElementById("player");
const shot = document.getElementById("shot");

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
  bombSpeed: 500,
  boomTime: 75, // milliseconds boom emoji shown
  invadersBaseSpeed: 1000, // milliseconds per move initially
  invadersInitialTop: 50,
  invadersStartPosition: { x: 0, y: 50 },
  playerWidth: 50,
  playerY: 50,
  playerSpeed: 300,
  rowPoints: [30, 20, 20, 10, 10],
  shotHeight: 40,
  shotStart: 50,
  shotSpeed: 500,
  shotWidth: 10,
  totalInvaders: 55,
  volume: 0.1,

  //variables
  invaders: [],
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
  invadersCurrentPosition: { x: 0, y: 0 },
  rightDirection: true,
  moveAmount: null,
  activeInvaders: 55,
  lastKilled: null,
  lastKilledTime: null,

  bombs: [], // {domBomb: DOMElement, position: {x: ?, y: ?}}
};

const emojis = Object.freeze({
  player: "🌋",
  shot: "🔥",
  bomb: "💣",
  boom: "💥",
  alienShip: "😈",
  deadPlayer: "☠",
  invaders: ["🥳", "😃", "😎", "😮", "😟"],
  brick: "",
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

function calculateInvaderPosition(index) {
  const col = index % 11;
  const row = Math.floor(index / 11);
  const x = gameState.invadersStartPosition.x + gameState.invadersCurrentPosition.x + col * ((window.innerWidth * 7.1) / 100); // 7.1 us going to be vw
  const y = gameState.invadersStartPosition.y + gameState.invadersCurrentPosition.y + row * ((window.innerWidth * 7.1) / 100); //////////////////////////////////////////////////////////////////////
  return { x, y };
}

function recalcInvaders() {
  gameState.invaders.forEach((invader) => setSpritePosition(invader, calculateInvaderPosition(invader.dataset.id)));
}

function handleResize(e) {
  gameState.gameWidth = gameWindow.getBoundingClientRect().width;
  //console.log(gameState.gameWidth);
  gameState.gameHeight = gameWindow.getBoundingClientRect().height;
  recalcInvaders();
  // do player and other things too
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

function isCollided(shot, target) {
  const shotRect = shot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const midX = shotRect.left + shotRect.width / 2;
  const midY = shotRect.top + shotRect.height / 2;

  return targetRect.top <= midY && targetRect.bottom >= midY && targetRect.left <= midX && targetRect.right >= midX;
}

function createInvader(emoji, { x, y }, points, id, classList = []) {
  const newInvader = document.createElement("div");
  newInvader.innerHTML = emoji;
  newInvader.dataset.points = points;
  newInvader.classList.add("invader", ...classList);
  newInvader.style.left = x + "px";
  newInvader.style.top = y + "px";
  newInvader.dataset.id = id;
  return newInvader;
}

function createBomb(emoji, { x, y }) {
  const newBomb = document.createElement("div");
  newBomb.innerHTML = emoji;
  newBomb.classList.add("bomb");
  newBomb.style.left = x + "px";
  newBomb.style.top = y + "px";

  return newBomb;
}

function clearBomb(bomb) {
  bomb.domBomb.remove(); // remove from dom
  gameState.bombs.splice(gameState.bombs.indexOf(bomb), 1); // remove from internal array
}

function addBomb({ x, y }) {
  // adds a new bomb to the array of active bombs
  const newBomb = createBomb(emojis.bomb, { x, y });
  gameState.bombs.push({ domBomb: newBomb, position: { x, y } });
  gameWindow.appendChild(newBomb);
}

// 11 columns x 5 rows

function generateEmojis({ x, y }, childNode) {
  // x,y are initial pixel offsets
  // start: invadersStartPosition: { x: 0, y: 50 },
  const howMany = 55;
  const tempInvaders = [];
  // width in %, height in px?
  for (let i = 0; i < howMany; i++) {
    const row = Math.floor(i / 11);
    tempInvaders[i] = createInvader(emojis.invaders[row], calculateInvaderPosition(i), gameState.rowPoints[row], i);
    childNode.appendChild(tempInvaders[i]);
  }

  return tempInvaders;
}

function killed(element, currentTimestep) {
  gameState.lastKilled = element;
  gameState.lastKilledTime = currentTimestep;
  element.innerHTML = emojis.boom;
}

function clearKilled(currentTimestep) {
  if (gameState.lastKilled !== null && currentTimestep >= gameState.lastKilledTime + gameState.boomTime) {
    gameState.lastKilled.remove(); // remove from DOM
    gameState.invaders.splice(gameState.invaders.indexOf(gameState.lastKilled), 1); // remove from internal array
    gameState.lastKilled = null;
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

    gameState.invaders.some((invader) => {
      // use [].some to return true and break from the loop
      // do we need to check for the presence of the hidden class to see if it's gone first?  -- YES!
      const rect = invader.getBoundingClientRect();
      if (!invader.classList.contains("hidden")) {
        /// collision detection
        if (shotTop < rect.bottom && shotTop > rect.top && shotMid > rect.left && shotMid < rect.right) {
          // Hit logic
          gameState.shotFired = false;
          ///////////////////////////////////////////////////////////////////
          ////////  TODO: REMOVE FROM THE DOM DON'T JUST HIDE ANYMORE!!!!!!!!!!
          ////////////////////////////////////////////
          shot.classList.add("hidden");
          boom.currentTime = 0;
          boom.play();
          // invader.classList.add("hidden");
          gameState.score += parseInt(invader.dataset.points);
          updateScore(gameState.score);
          gameState.activeInvaders--;
          killed(invader, timestep);
          //recalcMoveAmount();
          return true;
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
      gameState.invaders.forEach((invader) => {
        if (!invader.classList.contains("hidden")) {
          if (invader.getBoundingClientRect().x + invader.getBoundingClientRect().width + gameState.moveAmount >= gameWindow.getBoundingClientRect().right) {
            gameState.rightDirection = false;
            swapped = true;
          }
        }
      });
    } else {
      gameState.invaders.forEach((invader) => {
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
    gameState.invaders.forEach((invader) => {
      invader.style.transform = "rotate(" + (360 / 8) * gameState.rollTick + "deg)";
    });
    playSound(gameState.rollTick);

    //setSpritePosition(invadersGrid, gameState.invadersCurrentPosition);
    recalcInvaders();
  }

  // ********************************************************************************************
  // Deal with Bombs
  // ********************************************************************************************
  // check for hits first!
  if (gameState.bombs.length) {
    gameState.bombs.some((bomb) => {
      const bombRect = bomb.domBomb.getBoundingClientRect();

      // check structure hits

      //check player hits
      const playerRect = player.getBoundingClientRect();
      if (bombRect.bottom >= playerRect.top && ((bombRect.left >= playerRect.left && bombRect.left <= playerRect.right) || (bombRect.right <= playerRect.right && bombRect.right >= playerRect.left))) {
        console.log("hit player");
        clearBomb(bomb);
        return true;
      }

      // check bottom screen hits
      if (bombRect.top >= gameState.gameHeight) {
        clearBomb(bomb);
        return true;
      }
    });
  }
  // move any remaining bombs
  if (gameState.bombs.length) {
    gameState.bombs.forEach((bomb) => {
      const x = bomb.position.x;
      const y = bomb.position.y;
      bomb.position.y += gameState.bombSpeed * deltaTime;
      setSpritePosition(bomb.domBomb, { x, y });
    });
  }

  // add new bombs as needed
  // always have 1 dropping or multiple if on higher level
  if (gameState.bombs.length < gameState.level && gameState.invaders.length) {
    // test if we need to add a bomb
    const randomIndex = Math.floor(Math.random() * gameState.activeInvaders); // determine which invader is going to drop it --- later lets 'focus' this closer to player
    const invaderIndex = gameState.invaders[randomIndex].dataset.id;
    addBomb(calculateInvaderPosition(invaderIndex));
  }

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
  if (isKeyPressed(80)) {
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
window.addEventListener("resize", handleResize);

// player initial position
setSpritePosition(player, {
  x: gameState.playerPosition,
  y: gameState.playerY,
});

// setSpritePosition(invadersGrid, gameState.invadersCurrentPosition);
gameState.invaders = generateEmojis(gameState.invadersStartPosition, game);
gameState.append;

//set volume
audioD.volume = gameState.volume;
audioC.volume = gameState.volume;
audioAsharp.volume = gameState.volume;
audioA.volume = gameState.volume;
pew.volume = gameState.volume;
boom.volume = gameState.volume;

updateScore(gameState.score);
updateLevel(gameState.level);
//setSpritePosition(invadersGrid, { x: 0, y: gameState.invadersInitialTop });

// once all is setup lets get this going!
window.requestAnimationFrame(animate);
