import Phaser from "phaser";
import playerImg from "./assets/kirbyRunSlide.png";
import backgroundImg from "./assets/background.png";
import groundImg from "./assets/groundTile.png";
import obstacleImg from "./assets/obstacle.png";
import slideObstacleImg from "./assets/potato.png";
import heartImg from "./assets/heart.png";

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

document.querySelector(".my-high-score").textContent =
  "High Score: " + window.localStorage.getItem("MaxScore");

let player;
let cursors;
let groundTiles;
let obstacles;
let background;
let lives = 3; // ❤️ 초기 목숨 개수
let heartsUI = [];

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

let isInvincible = false;
let invincibleTimer = null;

function preload() {
  this.load.image("background", backgroundImg);
  this.load.image("ground", groundImg);
  this.load.image("obstacle_high", obstacleImg);
  this.load.image("obstacle_low", slideObstacleImg);
  this.load.spritesheet("heart", heartImg, {
    frameWidth: 150,
    frameHeight: 150,
  });
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

  // 하트

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

  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

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
    lives = 3;
    heartsUI = [];
    isInvincible = false;
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
    delay: 10,
    callback: () => {
      if (!gameOver) {
        score += 1;
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

  this.anims.create({
    key: "heart_pulse",
    frames: this.anims.generateFrameNumbers("heart", { start: 0, end: 1 }),
    frameRate: 2, // 깜박이는 속도 (1~10 정도 조절 가능)
    repeat: -1,
  });

  // 하트 UI
  for (let i = 0; i < lives; i++) {
    let heart = this.add.sprite(config.width - 70 - i * 130, 60, "heart");
    heart.setScrollFactor(0);
    heart.setScale(0.8);
    heart.setDepth(1000);

    // ✅ 각 하트에 애니메이션 실행
    heart.anims.play("heart_pulse");

    heartsUI.push(heart);
  }
}

function spawnObstacle() {
  const x = config.width + 150;

  // 0: 점프용 장애물 / 1: 슬라이드용 장애물
  const type = Phaser.Math.Between(0, 1);

  let width, y, height, key;

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
    width = 80;
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
  if (gameOver || isInvincible) return; // ✅ 무적이면 충돌 무시

  console.log("장애물에 부딪힘!");
  lives--;

  // 하트 UI 업데이트
  if (heartsUI[lives]) {
    heartsUI[lives].setVisible(false);
  }

  // 무적 상태 진입
  isInvincible = true;

  // 깜빡임 효과
  player.setTint(0xff0000);
  this.tweens.add({
    targets: player,
    alpha: 0.3,
    yoyo: true,
    repeat: -1,
    duration: 150,
  });

  // 1.5초 뒤 무적 해제
  this.time.delayedCall(1500, () => {
    isInvincible = false;
    player.clearTint();
    player.setAlpha(1);
    this.tweens.killTweensOf(player);
  });

  // 라이프 다 닳으면 게임오버
  if (lives <= 0) {
    gameOver = true;
    restartButton.setVisible(true);
    this.physics.pause();
    player.setTint(0xff0000);
    player.setAlpha(1);
    scoreText.setText("Game Over! Final Score: " + score);

    if (score > (window.localStorage.getItem("MaxScore") || 0)) {
      window.localStorage.setItem("MaxScore", score);
      document.querySelector(".my-high-score").textContent =
        "High Score: " + score;
    }
  }
}
function update(time, delta) {
  if (!gameOver) {
    // this.anims.play("heart_pulse", true);
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
        console.log("점수 획득!");
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
        this.physics.add.overlap(player, obstacles, hitObstacle, null, this);
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

    // update 안
    if (!isInvincible) {
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
    }
  } else {
    player.anims.stop();
  }
}
