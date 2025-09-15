import Phaser from "phaser";
import playerImg from "./assets/kirbyRunSlide.png";
import backgroundImg from "./assets/backimg.png";
import groundImg from "./assets/groundTile.png";
import obstacleImg from "./assets/obstacle.png";

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

const BACKGROUND_SCROLL_SPEED = 2;
const GROUND_SCROLL_SPEED = 600; // px/sec (속도 일치용)

function preload() {
  this.load.image("background", backgroundImg);
  this.load.image("ground", groundImg);
  this.load.image("obstacle", obstacleImg);

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
  const bgImage = this.textures.get("background").getSourceImage();
  const scaleX = config.width / bgImage.width;
  const scaleY = config.height / bgImage.height;
  const scale = Math.max(scaleX, scaleY);
  background.setScale(scale).setScrollFactor(0);

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
    fill: "#000",
    fontFamily: "Arial",
  });
  scoreText.setScrollFactor(0); // 카메라 이동 무시

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
    button.setSize(160, 60);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-80, -30, 160, 60),
      Phaser.Geom.Rectangle.Contains
    );

    button.setOrigin?.(originX, originY); // 안전하게 origin 지원 여부 확인
    button.setScrollFactor(0);

    return button;
  }

  // 왼쪽 하단 (Jump)
  jumpButton = createButton(this, 100, config.height - 50, "JUMP", 0.5, 1);

  // 오른쪽 하단 (Slide)
  slideButton = createButton(
    this,
    config.width - 100,
    config.height - 50,
    "SLIDE",
    0.5,
    1
  );

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
    frameRate: 10,
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
  const x = config.width + 100;
  const y = config.height - 150;

  const obstacle = obstacles.create(x, y, "obstacle");
  obstacle.setOrigin(0.5, 0.5);
  obstacle.setDisplaySize(60, 100);
  obstacle.body.allowGravity = false;
  obstacle.setVelocityX(-GROUND_SCROLL_SPEED);
  obstacle.scored = false;
}

function hitObstacle(player, obstacle) {
  console.log("장애물에 부딪힘!");
  this.physics.pause();
  player.setTint(0xff0000);
  gameOver = true;
  scoreText.setText("Game Over! Final Score: " + score);
}

function update(time, delta) {
  if (!gameOver) {
    // 배경 스크롤
    background.tilePositionX += BACKGROUND_SCROLL_SPEED;

    // 바닥 스크롤
    const TILE_WIDTH = 120;
    const totalGroundWidth = groundTiles.getChildren().length * TILE_WIDTH;
    const move = (GROUND_SCROLL_SPEED * delta) / 1000;

    groundTiles.getChildren().forEach((tile) => {
      tile.x -= move;
      tile.body.updateFromGameObject();

      if (tile.x < -TILE_WIDTH) {
        tile.x += totalGroundWidth;
        tile.body.updateFromGameObject();
      }
    });

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
      }
    }

    if (
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
  } else {
    player.anims.stop();
  }
}
