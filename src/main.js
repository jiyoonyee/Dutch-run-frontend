import Phaser from "phaser";
import playerImg from "./assets/kirbyRunSlide.png";
import backgroundImg from "./assets/background.png";
import groundImg from "./assets/groundTile.png";
import obstacleImg from "./assets/obstacle.png";
import slideObstacleImg from "./assets/slideObstacle.png";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 1280,
  height: 720,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 2000 },
      debug: true,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

var isMobile = /Mobi/i.test(window.navigator.userAgent);

console.log("isMobile:", isMobile);

// document.querySelector(".my-high-score").textContent =
//   "High Score: " + window.localStorage.getItem("MaxScore");

let player;
let cursors;
let groundTiles;
let obstacles;
let background;

let jumpCount = 0;
let score = 0;
let scoreText;
let gameOver = false;

let jumpButton;
let slideButton;
let restartButton;

const BACKGROUND_SCROLL_SPEED = 2;
const GROUND_SCROLL_SPEED = 600; // px/sec (속도 일치용)

let gameSpeed = 1; // 전체 게임 속도 배율
const SPEED_INCREMENT = 0.001; // 매 프레임마다 증가량 (delta 기반)

function preload() {
  this.load.image("background", backgroundImg);
  this.load.image("ground", groundImg);
  this.load.image("obstacle_high", obstacleImg);
  this.load.image("obstacle_low", slideObstacleImg);

  this.load.spritesheet("player", playerImg, {
    frameWidth: 128,
    frameHeight: 128,
  });
}

function create() {
  // 배경
  background = this.add
    .tileSprite(0, 0, config.width, config.height, "background")
    .setOrigin(0, 0);
  // const bgImage = this.textures.get("background").getSourceImage();
  // background.setDisplaySize(config.width, config.height);
  // background.setOrigin(0, 0);

  cursors = this.input.keyboard.createCursorKeys();

  // 바닥
  groundTiles = this.physics.add.staticGroup();
  const TILE_WIDTH = 120;
  const TILE_HEIGHT = 100;
  const numTiles = Math.ceil(config.width / TILE_WIDTH) + 2;
  for (let i = 0; i < numTiles; i++) {
    const tile = groundTiles.create(
      i * TILE_WIDTH,
      config.height - TILE_HEIGHT,
      "ground"
    );
    tile.setDisplaySize(TILE_WIDTH, TILE_HEIGHT);
    tile.setOrigin(0, 0);
    tile.refreshBody();
  }

  // 플레이어
  player = this.physics.add.sprite(100, 500, "player");
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groundTiles, () => {
    jumpCount = 0;
  });

  // 장애물 그룹
  obstacles = this.physics.add.group();

  this.time.addEvent({
    delay: 2000,
    callback: spawnObstacle,
    callbackScope: this,
    loop: true,
  });

  this.physics.add.collider(player, obstacles, hitObstacle, null, this);

  // 점수 표시
  score = 0;
  scoreText = this.add.text(16, 16, "Score: 0", {
    fontSize: "32px",
    fill: "#fff",
    fontFamily: "Arial",
  });
  scoreText.setScrollFactor(0); // 카메라 이동 무시
  scoreText.setDepth(1000);

  function createButton(scene, x, y, text, originX, originY) {
    // 배경 (둥근 사각형)
    const bg = scene.add.graphics();
    bg.fillStyle(0xffffff, 0.2); // 흰색, 투명도 0.2
    bg.fillRoundedRect(-80, -30, 160, 60, 30); // x, y, width, height, radius
    bg.lineStyle(2, 0xffffff, 0.3); // 테두리 약간
    bg.strokeRoundedRect(-80, -30, 160, 60, 100);

    // 텍스트
    const label = scene.add
      .text(0, 0, text, {
        fontSize: "32px",
        fontFamily: "Arial",
        color: "#fff",
      })
      .setOrigin(0.5);

    // 컨테이너로 묶기
    const button = scene.add.container(x, y, [bg, label]);
    button.setSize(220, 80); // 원하는 크기
    button.setInteractive(
      new Phaser.Geom.Rectangle(-0, -0, 220, 80),
      Phaser.Geom.Rectangle.Contains
    );

    button.setOrigin?.(originX, originY); // 안전하게 origin 지원 여부 확인
    button.setScrollFactor(0);

    return button;
  }

  restartButton = createButton(
    this,
    config.width / 2,
    config.height / 2,
    "RESTART",
    0.5,
    0.5
  );
  restartButton.setVisible(false);

  restartButton.setInteractive();
  restartButton.on("pointerdown", () => restartGame.call(this));

  // 키보드 입력으로도 재시작
  this.input.keyboard.on("keydown-SPACE", () => {
    if (gameOver) restartGame.call(this);
  });
  this.input.keyboard.on("keydown-ENTER", () => {
    if (gameOver) restartGame.call(this);
  });

  function restartGame() {
    this.scene.restart();
    jumpCount = 0;
    score = 0;
    gameOver = false;
    gameSpeed = 1;
  }
  // 왼쪽 하단 (Jump)
  if (isMobile) {
    jumpButton = createButton(this, 100, config.height - 50, "JUMP", 0.5, 1);
    slideButton = createButton(
      this,
      config.width - 100,
      config.height - 50,
      "SLIDE",
      0.5,
      1
    );
  }

  // 1초마다 점수 증가
  this.time.addEvent({
    delay: 1000,
    callback: () => {
      if (!gameOver) {
        score += 10;
        scoreText.setText("Score: " + score);
      }
    },
    loop: true,
  });

  // 애니메이션
  this.anims.create({
    key: "run",
    frames: this.anims.generateFrameNumbers("player", { start: 0, end: 9 }),
    frameRate: gameSpeed * 10,
    repeat: -1,
  });

  this.anims.create({
    key: "idle",
    frames: [{ key: "player", frame: 0 }],
    frameRate: 10,
  });

  this.anims.create({
    key: "slide",
    frames: this.anims.generateFrameNumbers("player", { start: 10, end: 10 }),
    frameRate: 10,
    repeat: -1,
  });
}

function spawnObstacle() {
  const x = config.width + 150;

  // 0: 점프용 장애물 / 1: 슬라이드용 장애물
  const type = Phaser.Math.Between(0, 1);

  let y, height, key;

  if (type === 0) {
    // 🟥 점프해야 피하는 장애물
    key = "obstacle_high";
    y = config.height - 100; // 바닥 근처
    height = 100;
  } else {
    // 🟦 슬라이딩해야 피하는 장애물 (머리쪽 위치)
    key = "obstacle_low";
    y = config.height - 180; // 플레이어 머리 정도 위치
    height = 1000;
  }

  const obstacle = obstacles.create(x, y, key);
  obstacle.setOrigin(0.5, 1); // 아랫부분 기준
  obstacle.setDisplaySize(80, height); // 크기 지정
  obstacle.body.allowGravity = false;
  obstacle.setVelocityX(-GROUND_SCROLL_SPEED);
  obstacle.scored = false;
  obstacle.type = type;

  // 🚩 body 다시 계산
  obstacle.refreshBody();
}
function hitObstacle(player, obstacle) {
  if (!gameOver) {
    console.log("장애물에 부딪힘!");
    restartButton.setVisible(true);
    this.physics.pause();
    player.setTint(0xff0000);
    gameOver = true;
    scoreText.setText("Game Over! Final Score: " + score);
    if (score > (window.localStorage.getItem("MaxScore") || 0)) {
      window.localStorage.setItem("MaxScore", score);

      // document.querySelector(".my-high-score").textContent =
      //   "High Score: " + window.localStorage.getItem("MaxScore");
    }

    console.log("MaxScore:", window.localStorage.getItem("MaxScore"));
  }
}

function update(time, delta) {
  if (!gameOver) {
    // 매 프레임마다 게임 속도 조금씩 증가
    gameSpeed += SPEED_INCREMENT * (delta / 16.67);
    // (delta/16.67 → 60fps 보정)

    // 배경 스크롤
    background.tilePositionX += BACKGROUND_SCROLL_SPEED * gameSpeed;

    // 바닥 스크롤
    const TILE_WIDTH = 120;
    const totalGroundWidth = groundTiles.getChildren().length * TILE_WIDTH;
    const move = (GROUND_SCROLL_SPEED * gameSpeed * delta) / 1000;

    groundTiles.getChildren().forEach((tile) => {
      tile.x -= move;
      tile.body.updateFromGameObject();

      if (tile.x < -TILE_WIDTH) {
        tile.x += totalGroundWidth;
        tile.body.updateFromGameObject();
      }
    });

    obstacles.getChildren().forEach((obstacle) => {
      obstacle.setVelocityX(-GROUND_SCROLL_SPEED * gameSpeed);
    });

    player.anims.timeScale = gameSpeed;

    // 장애물 통과 점수
    obstacles.getChildren().forEach((obstacle) => {
      if (!obstacle.scored && obstacle.x + obstacle.displayWidth < player.x) {
        score += 50;
        scoreText.setText("Score: " + score);
        obstacle.scored = true;
      }
    });

    player.anims.play("run", true);

    // 플레이어 조작
    if (cursors.down.isDown && jumpCount === 0) {
      player.anims.play("slide", true);
      player.body.setSize(player.width, player.height / 2, true);
      player.body.setOffset(0, player.height / 2);
      return;
    } else {
      player.body.setSize(player.width, player.height, true);
      player.body.setOffset(0, 0);
    }

    if (
      Phaser.Input.Keyboard.JustDown(cursors.up) ||
      Phaser.Input.Keyboard.JustDown(cursors.space)
    ) {
      if (jumpCount < 2) {
        player.setVelocityY(-800);
        jumpCount++;

        // 슬라이드 상태 복구
        player.body.setSize(player.width, player.height, true);
        player.body.setOffset(0, 0);
        player.anims.play("run", true);

        // ✅ 점프 순간 강제로 충돌 재검사
        this.physics.world.collide(player, obstacles, hitObstacle, null, this);
      }
    }

    if (
      isMobile &&
      jumpButton
        .getBounds()
        .contains(this.input.activePointer.x, this.input.activePointer.y) &&
      this.input.activePointer.isDown
    ) {
      if (jumpCount < 2) {
        console.log(jumpCount);
        player.setVelocityY(-800);
        setTimeout(() => {
          this.input.activePointer.isDown = false;
          jumpCount++; // 버튼 누른 상태 초기화
        }, 0); // 0.1초 후에 초기화
      }
    }

    if (
      isMobile &&
      slideButton
        .getBounds()
        .contains(this.input.activePointer.x, this.input.activePointer.y) &&
      this.input.activePointer.isDown &&
      jumpCount === 0
    ) {
      player.anims.play("slide", true);
      player.body.setSize(player.width, player.height / 2, true);
      player.body.setOffset(0, player.height / 2);
      return;
    }

    // update 안에 추가
    obstacles.getChildren().forEach((obstacle) => {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          player.getBounds(),
          obstacle.getBounds()
        )
      ) {
        hitObstacle.call(this, player, obstacle);
      }
    });
  } else {
    player.anims.stop();
  }
}
