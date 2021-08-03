/**
 * @author Jennifer Fix <jfix@example.com>
 */

/** TODO LIST:
 * Timestep issue when un pausing. bombs disappear.
 *  Missed shots blow up at top of screen
 *  Missed bombs blow up at bottom of screen
 *  High score stored in localStorage
 *  Bombs make circles in bunker
 *  Player makes laser like marks in bunker
 *  Animate out the explosion, opacity fade and shrink?
 *
 */

// basic elements of game
const gameWindow = document.getElementById('game');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');

const player = document.getElementById('player');
const shot = document.getElementById('shot');

const audioD = document.getElementById('audio-d');
const audioC = document.getElementById('audio-c');
const audioAsharp = document.getElementById('audio-asharp');
const audioA = document.getElementById('audio-a');
const pew = document.getElementById('pew');
const boom = document.getElementById('boom');

const btnPlay = document.getElementById('play-btn');
// const heading = document.getElementById('head');

// some game variable we need
const gameState = {
  // static settings
  bombSpeed: 500,
  boomTime: 75, // milliseconds boom emoji shown

  bunkerWidth: 32,
  bunkerHeight: 24,

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
  ufoMinTime: 10000, // minimum milliseconds between ufo's

  // variables
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
  shotPosition: { x: 0, y: 0 },
  invadersCurrentPosition: { x: 0, y: 0 },
  rightDirection: true,
  moveAmount: { x: null, y: 40 },
  moveAmountX: null,
  moveAmountY: 40,
  activeInvaders: 55,
  lastKilled: null,
  lastKilledTime: null,

  bombs: [], // {domBomb: DOMElement, position: {x: ?, y: ?}}

  bunkers: [], // [...{bunker: bunkerElement, bunkerElements: [bunkerElements]}]

  ufoActive: false,
  ufoLastTime: null,
  ufoPosition: 0,
};

const emojis = Object.freeze({
  player: '🌋',
  shot: '🔥',
  bomb: '💣',
  boom: '💥',
  alienShip: '😈',
  deadPlayer: '☠',
  invaders: ['🥳', '😃', '😎', '😮', '😟'],
  brick: '',
  ufo: '🛸',
  bunker: '👾',
});

const keys = [];

function recalcMoveAmountX() {
  gameState.moveAmount.x = gameState.gameWidth / (14 * 8 * 1); // (11 chars + 3spaces)* 8 moves per char // (active cols + 3) * 8/col
  // gameState.moveAmount.x = gameState.gameWidth / (14 * 8 * (gameState.activeInvaders / gameState.totalInvaders)); // (11 chars + 3spaces)* 8 moves per char // (active cols + 3) * 8/col
}

function gameInit() {
  // set volume
  audioD.volume = gameState.volume;
  audioC.volume = gameState.volume;
  audioAsharp.volume = gameState.volume;
  audioA.volume = gameState.volume;
  pew.volume = gameState.volume;
  boom.volume = gameState.volume;

  // player initial position
  gameState.playerY = gameState.gameHeight - 50 - player.getBoundingClientRect().height;
  playerTranslate(player, gameState.playerPosition);

  recalcMoveAmountX();
}

function gameReset(leveledUp) {
  if (leveledUp) {
    gameState.level += 1;
  }
  gameState.invadersCurrentPosition.x = gameState.invadersStartPosition.x;
  gameState.invadersCurrentPosition.y =
    gameState.invadersStartPosition.y + (gameState.level - 1) * gameState.moveAmount.y;

  updateScore(gameState.score);
  updateLevel(gameState.level);

  clearOldBunkers(gameState.bunkers);
  gameState.bunkers = createBunkers(gameWindow);

  gameState.invaders = generateEmojis(gameState.invadersStartPosition, gameWindow);
  recalcInvaders();
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

function lostFocus() {
  // clear keys so things don't keep happening
  keys.forEach((key, i) => {
    keys[i] = false;
  }); // not sure why just setting key=false doesn't work?!
}

function spriteTranslate(element, { x, y }, rotation = 0, scale = 1) {
  element.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
}

function playerTranslate(playerElement, playerPosition) {
  spriteTranslate(playerElement, { x: playerPosition, y: 0 }, 0);
}

function calculateInvaderPosition(index) {
  const col = index % 11;
  const row = Math.floor(index / 11);
  const x = gameState.invadersCurrentPosition.x + col * ((gameState.gameWidth * 7.1) / 100); // 7.1 us going to be vw
  const y = gameState.invadersCurrentPosition.y + row * ((gameState.gameWidth * 7.1) / 100);
  return { x, y };
}

function recalcInvaders() {
  // gameState.invaders.forEach((invader) => spriteTranslate(invader, calculateInvaderPosition(invader.dataset.id), (360 / 8) * gameState.rollTick));
  gameState.invaders.forEach((invader) =>
    spriteTranslate(
      invader,
      calculateInvaderPosition(invader.dataset.id),
      (360 / 8) * gameState.rollTick
    )
  );
}

function resizePlayer(lastWidth) {
  const lastPlayerPercent = gameState.playerPosition / lastWidth;
  gameState.playerPosition = gameState.gameWidth * lastPlayerPercent;
  spriteTranslate(player, { x: gameState.playerPosition, y: 0 });
}

function handleResize() {
  const lastWidth = gameState.gameWidth;
  gameState.gameWidth = gameWindow.getBoundingClientRect().width;
  gameState.gameHeight = gameWindow.getBoundingClientRect().height;
  recalcInvaders();
  resizePlayer(lastWidth);
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

function isCollided(testShot, target) {
  const shotRect = testShot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const midX = shotRect.left + shotRect.width / 2;
  const midY = shotRect.top + shotRect.height / 2;

  return (
    targetRect.top <= midY &&
    targetRect.bottom >= midY &&
    targetRect.left <= midX &&
    targetRect.right >= midX
  );
}

function createInvader(emoji, { x, y }, points, id, classList = []) {
  const newInvader = document.createElement('div');
  newInvader.innerHTML = emoji;
  newInvader.dataset.points = points;
  newInvader.classList.add('invader', ...classList);
  newInvader.style.left = `${x}px`;
  newInvader.style.top = `${y}px`;
  newInvader.dataset.id = id;
  return newInvader;
}

function createBomb(emoji) {
  const newBomb = document.createElement('div');
  newBomb.innerHTML = emoji;
  newBomb.classList.add('bomb');

  return newBomb;
}

function clearBomb(bomb) {
  bomb.domBomb.remove(); // remove from dom
  gameState.bombs.splice(gameState.bombs.indexOf(bomb), 1); // remove from internal array
}

function addBomb({ x, y }) {
  // adds a new bomb to the array of active bombs
  const newBomb = createBomb(emojis.bomb);
  gameState.bombs.push({ domBomb: newBomb, position: { x, y } });
  spriteTranslate(newBomb, { x, y });
  gameWindow.appendChild(newBomb);
}

// 11 columns x 5 rows

function generateEmojis({ x, y }, childNode) {
  // x,y are initial pixel offsets
  // start: invadersStartPosition: { x: 0, y: 50 },
  const howMany = 55;
  const tempInvaders = [];
  // width in %, height in px?
  for (let i = 0; i < howMany; i += 1) {
    const row = Math.floor(i / 11);
    // tempInvaders[i] = createInvader(emojis.invaders[row], calculateInvaderPosition(i), gameState.rowPoints[row], i);
    tempInvaders[i] = createInvader(
      emojis.invaders[row],
      { x: 0, y: 0 },
      gameState.rowPoints[row],
      i
    );
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
  if (
    gameState.lastKilled !== null &&
    currentTimestep >= gameState.lastKilledTime + gameState.boomTime
  ) {
    gameState.lastKilled.remove(); // remove from DOM
    gameState.invaders.splice(gameState.invaders.indexOf(gameState.lastKilled), 1); // remove from internal array
    gameState.lastKilled = null;
  }
}

function percentToGameWidthPixels(positionPercent) {
  return (positionPercent * gameState.gameWidth) / 100;
}

const bunkerMap = [
  0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
];
const bunkerMapHiRes = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
  0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 1, 1,
];
function setBunkerElementSize(el) {
  // bunkers need to be 11.1% of the game window width
  // each bunker is 16 pixels wide 12 pixels tall
  // each 'pixel' in bunker needs to be 11.1% / 16 = 0.69375%
  const bunkerPixel = (0.69375 * gameState.gameWidth) / 100;
  el.style.width = `${bunkerPixel}px`;
  el.style.height = `${bunkerPixel}px`;
  // el.style.width = `${((10 * gameState.gameWidth) / 100 / 16) * 1.0}px`;
  // el.style.height = `${((8 * gameState.gameWidth) / 100 / 16) * 1.15}px`;
}

function setBunkerElementPosition(el) {}

function createBunker({ x: xPercent, y: screenY }) {
  // bunkers need to be 11.1% of the game window width
  // each bunker is 16 pixels wide 12 pixels tall
  // each 'pixel' in bunker needs to be 11.1% / 16 = 0.69375%
  const bunkerPixel = (0.69375 * gameState.gameWidth) / 100;
  // const height = (0.5 * gameState.gameHeight) / 100;
  const div = document.createElement('div');
  div.classList.add('bunker');
  div.style.width = '11.1%';
  div.style.left = `${xPercent}%`;
  div.append(
    ...bunkerMapHiRes.map((activePixel, index) => {
      const newPixel = document.createElement('div');
      newPixel.dataset.index = index;
      newPixel.classList.add('bunker-element');
      if (activePixel) newPixel.classList.add('bunker-element--filled');
      return newPixel;
    })
  );

  // let bunkerID = 0;
  // for (let j = 0; j < 12; j += 1) {
  //   for (let i = 0; i < 16; i += 1) {
  //     if (bunkerMap[bunkerID] === 1) {
  //       const currentElement = document.createElement('div');
  //       currentElement.classList.add('bunker-element');
  //       currentElement.dataset.id = bunkerID;
  //       // currentElement.innerHTML = emojis.alienShip;
  //       setBunkerElementSize(currentElement);
  //       // currentElement.style.width = `${((10 * gameState.gameWidth) / 100 / 16) * 1.0}px`;
  //       // currentElement.style.height = `${((8 * gameState.gameWidth) / 100 / 16) * 1.15}px`;
  //       const left = screenX + i * bunkerPixel;
  //       const top = screenY + j * bunkerPixel;
  //       spriteTranslate(currentElement, { x: left, y: top });
  //       div.appendChild(currentElement);
  //     }
  //     bunkerID += 1;
  //   }
  // }

  return div;
}

function clearOldBunkers(bunkerArray) {
  bunkerArray.forEach((bunker) => {
    bunker.remove();
  });
}

//
function createBunkersArray() {
  const newBunkers = [];
  newBunkers.push(createBunker({ x: 11.1, y: 700 }));
  newBunkers.push(createBunker({ x: 33.3, y: 700 }));
  newBunkers.push(createBunker({ x: 55.5, y: 700 }));
  newBunkers.push(createBunker({ x: 77.7, y: 700 }));
  return newBunkers;
}

function createBunkers(container) {
  const bunks = createBunkersArray();
  container.append(...bunks);
  return bunks;
}

function resizeBunker(theBunker) {}

function resizeBunkers() {}

function isBunkerCollision({ x: shotX, y: shotY }, testElement) {
  const testRect = testElement.getBoundingClientRect();
  if (
    shotX >= testRect.left &&
    shotX <= testRect.right &&
    shotY >= testRect.top &&
    shotY <= testRect.bottom
  )
    return true;
  return false;
}

function getDistance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
  const xDistance = x1 > x2 ? x1 - x2 : x2 - x1;
  const yDistance = y1 > y2 ? y1 - y2 : y2 - y1;
  return Math.sqrt(xDistance ** 2 + yDistance ** 2);
}

function isInRadius(radius, bomb, bunkerPixel) {
  const bombRect = bomb.getBoundingClientRect();
  const bunkerPixRect = bunkerPixel.getBoundingClientRect();
  const bombCenterX = bombRect.x + bombRect.width / 2;
  const bombCenterY = bombRect.y + bombRect.height / 2;
  const bunkerCenterX = bunkerPixRect.x + bunkerPixRect.width / 2;
  const bunkerCenterY = bunkerPixRect.y + bunkerPixRect.height / 2;
  if (
    getDistance({ x: bombCenterX, y: bombCenterY }, { x: bunkerCenterX, y: bunkerCenterY }) <=
    radius
  )
    return true;
  return false;
}

/** ******************************************************************************************* */
/** *********************************  MAIN GAME LOOP ***************************************** */
/** ******************************************************************************************* */
function animate(timestep) {
  if (gameState.paused) return;
  if (!gameState.lastTime) {
    gameState.lastTime = timestep;
    gameState.lastAnimationTick = timestep;
    window.requestAnimationFrame(animate);
    return;
  }
  let doAnimate = false;
  // if (timestep >= gameState.lastAnimationTick + gameState.invadersBaseSpeed * (gameState.activeInvaders / gameState.totalInvaders)) {
  if (
    timestep >=
    gameState.lastAnimationTick +
      gameState.invadersBaseSpeed * (gameState.invaders.length / gameState.totalInvaders)
  ) {
    gameState.lastAnimationTick = timestep;
    doAnimate = true;
    if (gameState.rollTick < 8) gameState.rollTick += 1;
    else gameState.rollTick = 1;
  }
  const deltaTime = (timestep - gameState.lastTime) / 1000; // deltaT in seconds

  // clear off screen what isn't needed first
  clearKilled(timestep);

  if (!gameState.invaders.length) {
    console.log('WIN');
    // gameState.paused = true;

    gameReset(true);
  }

  // handle other animations first, before player
  // we're moving, check collision before moving again
  // my thinking on the seperation of gameState.shotFired here is to test if the
  // last move loop collided before we continue to move the grid and shot again.
  if (gameState.shotFired) {
    gameState.invaders.some((invader) => {
      // use [].some to return true and break from the loop
      // do we need to check for the presence of the hidden class to see if it's gone first?  -- YES!
      if (!invader.classList.contains('hidden')) {
        /// collision detection
        if (isCollided(shot, invader)) {
          // Hit logic
          gameState.shotFired = false;
          shot.classList.add('hidden');
          boom.currentTime = 0;
          boom.play();
          // invader.classList.add("hidden");
          gameState.score += parseInt(invader.dataset.points, 10);
          updateScore(gameState.score);
          gameState.activeInvaders -= 1;
          killed(invader, timestep);
          // recalcMoveAmount();
          return true;
        }
      }
      return false;
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
        if (!invader.classList.contains('hidden')) {
          if (
            invader.getBoundingClientRect().x +
              invader.getBoundingClientRect().width +
              gameState.moveAmount.x >=
            gameWindow.getBoundingClientRect().right
          ) {
            gameState.rightDirection = false;
            swapped = true;
          }
        }
      });
    } else {
      gameState.invaders.forEach((invader) => {
        if (!invader.classList.contains('hidden')) {
          if (
            invader.getBoundingClientRect().x - gameState.moveAmount.x <=
            gameWindow.getBoundingClientRect().left
          ) {
            gameState.rightDirection = true;
            swapped = true;
          }
        }
      });
    }
    if (swapped) {
      gameState.invadersCurrentPosition.y += gameState.moveAmount.y;
    } else if (gameState.rightDirection) {
      gameState.invadersCurrentPosition.x += gameState.moveAmount.x;
    } else {
      gameState.invadersCurrentPosition.x -= gameState.moveAmount.x;
    }
    gameState.invaders.forEach((invader) => {
      invader.style.transform = `rotate(${(360 / 8) * gameState.rollTickdeg})`;
    });
    playSound(gameState.rollTick);

    recalcInvaders();
  }

  // ********************************************************************************************
  // UFO Update
  // ********************************************************************************************

  if (!gameState.ufoActive) {
    const test = Math.floor(Math.random() * 1000);
    if (test === 420) {
      console.error('startUFO');
    }
  }

  // ********************************************************************************************
  // Deal with Bombs
  // ********************************************************************************************
  // check for hits first!
  if (gameState.bombs.length) {
    gameState.bombs.forEach((bomb) => {
      const bombRect = bomb.domBomb.getBoundingClientRect();

      // for later if we get a hit
      let pixelIndex = null;
      let hitBunkerPixels = null;
      // check structure hits
      gameState.bunkers.some((bunker) => {
        // test if shot and bunker are colliding before we see which individual pieces are effected
        const bombBottomMiddle = bombRect.left + bombRect.width / 2;
        const bombVerticalMiddle = bombRect.top + bombRect.height / 2;

        if (isBunkerCollision({ x: bombBottomMiddle, y: bombVerticalMiddle }, bunker)) {
          // We are inside a bunker, test which individual part is effected
          const bunkerPixels = [...bunker.childNodes];
          bunkerPixels.some((bunkerPixel) => {
            if (bunkerPixel.classList.contains('bunker-element--filled')) {
              if (isBunkerCollision({ x: bombBottomMiddle, y: bombVerticalMiddle }, bunkerPixel)) {
                // hit an active pixel
                // now that we have a hit pixel, lets set what pixel whas hit, stop collision testing and then figure out which other pixels are in radius of the bomb and remove them
                // get pixel index
                pixelIndex = bunkerPixel.dataset.index;
                hitBunkerPixels = bunkerPixels;
                bunkerPixel.classList.remove('bunker-element--filled');
                return true; // leave collision testing
              }
            }
            return false; // continue looping
          });
          // calculate radius from center of bomb
          return true; // should be done with this bomb in this bunker
        }
        return false;
      });

      // explode out part of hit bunker (if one was hit)
      if (pixelIndex !== null) {
        // console.log('make big boom', pixelIndex, hitBunkerPixels);
        const radius = bombRect.height / 2;
        hitBunkerPixels.forEach((bunkerPixel) => {
          if (
            isInRadius(radius, bomb.domBomb, bunkerPixel) &&
            bunkerPixel.classList.contains('bunker-element--filled')
          ) {
            bunkerPixel.classList.remove('bunker-element--filled');
          }
        });
        clearBomb(bomb); // when we do this we need to leave this bomb forEach right away somehow.
      }

      // check player hits
      const playerRect = player.getBoundingClientRect();
      if (
        bombRect.bottom >= playerRect.top &&
        ((bombRect.left >= playerRect.left && bombRect.left <= playerRect.right) ||
          (bombRect.right <= playerRect.right && bombRect.right >= playerRect.left))
      ) {
        console.log('hit player');
        clearBomb(bomb);
        return true;
      }

      // check bottom screen hits
      if (bombRect.top >= gameState.gameHeight) {
        clearBomb(bomb);
        return true;
      }
      return false;
    });
  }

  // move any remaining bombs
  if (gameState.bombs.length) {
    gameState.bombs.forEach((bomb) => {
      const { x } = bomb.position;
      const { y } = bomb.position;
      bomb.position.y += gameState.bombSpeed * deltaTime;
      spriteTranslate(bomb.domBomb, { x, y });
    });
  }

  // add new bombs as needed
  // always have 1 dropping or multiple if on higher level
  if (gameState.bombs.length < gameState.level && gameState.invaders.length) {
    // test if we need to add a bomb
    const randomIndex = Math.floor(Math.random() * gameState.invaders.length); // determine which invader is going to drop it --- later lets 'focus' this closer to player
    const invaderIndex = gameState.invaders[randomIndex].dataset.id;
    addBomb(calculateInvaderPosition(invaderIndex));
  }

  // ********************************************************************************************
  // handle shot move
  // ********************************************************************************************
  if (gameState.shotFired) {
    gameState.shotPosition.y -= gameState.shotSpeed * deltaTime;
    if (gameState.shotPosition.y <= 0) {
      gameState.shotFired = false;
      shot.classList.add('hidden');
    } else {
      spriteTranslate(shot, gameState.shotPosition);
    }
  }

  // ********************************************************************************************
  // handle keys
  // ********************************************************************************************

  if (isKeyPressed(32)) {
    // space key
    if (!gameState.shotFired) {
      gameState.shotFired = true;
      gameState.shotPosition = {
        x: gameState.playerPosition + gameState.playerWidth / 2 - gameState.shotWidth / 2,
        y: gameState.playerY - shot.getBoundingClientRect().height / 2,
      };
      spriteTranslate(shot, gameState.shotPosition);
      shot.classList.remove('hidden');
      pew.currentTime = 0;
      pew.play();
    }
  }
  if (isKeyPressed(37)) {
    // left arrow
    const newPos = gameState.playerPosition - gameState.playerSpeed * deltaTime;
    if (newPos > 0) {
      gameState.playerPosition = newPos;
      playerTranslate(player, gameState.playerPosition);
    }
  }
  if (isKeyPressed(39)) {
    // right arrow
    const newPos = gameState.playerPosition + gameState.playerSpeed * deltaTime;
    if (newPos <= gameState.gameWidth - player.getBoundingClientRect().width) {
      gameState.playerPosition += gameState.playerSpeed * deltaTime;
      playerTranslate(player, gameState.playerPosition);
    }
  }
  if (isKeyPressed(80)) {
    playButton(); // need to debounce
  }

  gameState.lastTime = timestep;
  window.requestAnimationFrame(animate);
}

function playButton() {
  gameState.paused = !gameState.paused;
  btnPlay.innerHTML = gameState.paused ? 'Play!' : 'Pause';

  if (!gameState.paused) {
    // heading.classList.add("to-top");
    this.blur();
    window.requestAnimationFrame(animate);
  }
}

// ********************************************************************************************
// setup listeners
// ********************************************************************************************
btnPlay.addEventListener('click', playButton);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', lostFocus);
window.addEventListener('resize', handleResize);

gameInit(); // setup begining stuff once

gameReset(false); // build level and stuff

// gameWindow.append(...createBunkers());

// once all is setup lets get this going!
window.requestAnimationFrame(animate);
