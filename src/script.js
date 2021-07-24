// basic elements of game
const gameWindow = document.getElementById("game");
const player = document.getElementById("player");
const shot = document.getElementById("shot");
const invadersGrid = document.getElementById("invaders");
const invaders = document.querySelectorAll(".invader");

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
  invadersInitialTop: 50,
  invadersCurrentPosition: { x: 0, y: 50 },

  //variables
  lastTime: null,
  gameWidth: gameWindow.getBoundingClientRect().width,
  gameHeight: gameWindow.getBoundingClientRect().height,
  playerPosition: 300,
  shotFired: false,
  shotPosition: { x: null, y: null },
};

let keys = [];

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
  sprite.style.bottom = y + "px";
}

function animate(timestep) {
  if (!gameState.lastTime) {
    gameState.lastTime = timestep;
    window.requestAnimationFrame(animate);
    return;
  }

  const deltaTime = (timestep - gameState.lastTime) / 1000; // deltaT in seconds

  // handle other animations first, before player
  // we're moving, check collision before moving again
  // my thinking on the seperation of gameState.shotFired here is to test if the
  // last move loop collided before we continue to move the grid and shot again.
  if (gameState.shotFired) {
    const shotRect = shot.getBoundingClientRect();
    const shotTop = shotRect.top;
    const shotMid = shotRect.left + shotRect.width / 2;
    invaders.forEach((invader) => {
      // do we need to check for the presence of the hidden class to see if it's gone first?
      const rect = invader.getBoundingClientRect();
      if (
        shotTop < rect.bottom &&
        shotTop > rect.top &&
        shotMid > rect.left &&
        shotMid < rect.right
      ) {
        // Hit logic
        if (!invader.classList.contains("hidden")) {
          gameState.shotFired = false;
          shot.classList.add("hidden");
          invader.classList.add("hidden");
        }
      }
    });
  }

  // move grid

  // handle shot
  if (gameState.shotFired) {
    gameState.shotPosition.y += gameState.shotSpeed * deltaTime;
    if (gameState.shotPosition.y >= gameState.gameHeight) {
      gameState.shotFired = false;
      shot.classList.add("hidden");
    } else {
      setSpritePosition(shot, gameState.shotPosition);
    }
  }

  if (isKeyPressed(32)) {
    //space key
    if (!gameState.shotFired) {
      console.log("fire");
      gameState.shotFired = true;
      gameState.shotPosition = {
        x:
          gameState.playerPosition +
          gameState.playerWidth / 2 -
          gameState.shotWidth / 2,
        y: gameState.shotStart,
      };
      setSpritePosition(shot, gameState.shotPosition);
      shot.classList.remove("hidden");
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
    if (newPos <= gameState.gameWidth - gameState.playerWidth) {
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

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", lostFocus);

setSpritePosition(player, {
  x: gameState.playerPosition,
  y: gameState.playerY,
});

//setSpritePosition(invadersGrid, { x: 0, y: gameState.invadersInitialTop });

// once all is setup lets get this going!
window.requestAnimationFrame(animate);
