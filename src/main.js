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
      gravity: { y: 1500 },
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

let jumpCount = 0;

function preload() {
  this.load.image("background", backgroundImg);
  this.load.image("ground", groundImg);
  this.load.image("obstacle", obstacleImg);

  this.load.spritesheet("player", playerImg, {
    frameWidth: 128,
    frameHeight: 128,
  });
}

let obstacles;
let background;
// 배경과 바닥의 스크롤 속도를 각각 다르게 설정합니다.
const backgroundScrollSpeed = 2; // 배경이 움직이는 속도
const groundScrollSpeed = 10; // 바닥이 움직이는 속도

function create() {
  background = this.add
    .tileSprite(0, 0, config.width, config.height, "background")
    .setOrigin(0, 0);
  const bgImage = this.textures.get("background").getSourceImage();
  const scaleX = config.width / bgImage.width;
  const scaleY = config.height / bgImage.height;
  const scale = Math.max(scaleX, scaleY);
  background.setScale(scale).setScrollFactor(0);

  cursors = this.input.keyboard.createCursorKeys();

  // 바닥 타일 그룹
  groundTiles = this.physics.add.staticGroup();

  // 타일의 크기를 상수로 정의
  const TILE_WIDTH = 120;
  const TILE_HEIGHT = 60;

  // 화면을 채우고 여유를 둘 만큼의 타일 개수 계산
  const numTiles = Math.ceil(config.width / TILE_WIDTH) + 2;

  for (let i = 0; i < numTiles; i++) {
    // 바닥에 맞춰 타일 배치. setOrigin(0, 0)을 사용해 왼쪽 상단을 기준으로 배치
    const tile = groundTiles.create(
      i * TILE_WIDTH,
      config.height - TILE_HEIGHT,
      "ground"
    );
    tile.setDisplaySize(TILE_WIDTH, TILE_HEIGHT); // 크기 설정
    tile.setOrigin(0, 0); // 원점을 왼쪽 상단으로 설정
    tile.refreshBody(); // 물리 바디 업데이트
  }

  // 플레이어
  player = this.physics.add.sprite(100, 500, "player");
  player.setCollideWorldBounds(true);

  this.physics.add.collider(player, groundTiles, () => {
    jumpCount = 0;
  });

  obstacles = this.physics.add.group();

  // 일정 시간마다 장애물 생성 (2초 간격)
  this.time.addEvent({
    delay: 2000, // ms 단위
    callback: spawnObstacle,
    callbackScope: this,
    loop: true,
  });

  // 플레이어와 장애물 충돌 처리
  this.physics.add.collider(player, obstacles, hitObstacle, null, this);
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
  const y = config.height - 100;

  const obstacle = obstacles.create(x, y, "obstacle"); // ✅ key 사용
  obstacle.setOrigin(0.5, 0.5);
  obstacle.setDisplaySize(60, 100);
  obstacle.body.allowGravity = false;
  obstacle.setVelocityX(-500);
}

// 충돌했을 때 실행할 함수
function hitObstacle(player, obstacle) {
  console.log("장애물에 부딪힘!");
  this.physics.pause(); // 게임 정지
  player.setTint(0xff0000); // 플레이어 빨간색으로 변함
  player.anims.stop();
}

function update() {
  // Move the background to the left.
  // const bgWidth = backgrounds[0].displayWidth;
  // backgrounds.forEach((bg) => {
  //   bg.x -= backgroundScrollSpeed;
  //   // When the image goes off-screen, move it to the end.
  //   if (bg.x + bgWidth <= 0) {
  //     bg.x += bgWidth * backgrounds.length;
  //   }
  // });

  background.tilePositionX += backgroundScrollSpeed;
  // ---
  // Scroll the ground tiles.
  const TILE_WIDTH = 120;
  // Calculate the total width of all tiles laid end-to-end.
  const totalGroundWidth = groundTiles.getChildren().length * TILE_WIDTH;

  groundTiles.getChildren().forEach((tile) => {
    tile.x -= groundScrollSpeed;
    tile.body.updateFromGameObject();

    // If a tile is completely off the left side of the screen,
    // move it to the right to create a seamless loop.
    if (tile.x < -TILE_WIDTH) {
      tile.x += totalGroundWidth;
      tile.body.updateFromGameObject();
    }
  });
  // ---

  // Handle player animation and input.
  if (cursors.down.isDown && jumpCount === 0) {
    player.anims.play("slide", true);
    player.body.setSize(player.width, player.height / 2, true);
    player.body.setOffset(0, player.height / 2);
    return;
  } else {
    player.body.setSize(player.width, player.height, true);
    player.body.setOffset(0, 0);
  }

  player.anims.play("run", true);

  if (
    Phaser.Input.Keyboard.JustDown(cursors.up) ||
    Phaser.Input.Keyboard.JustDown(cursors.space)
  ) {
    if (jumpCount < 2) {
      player.setVelocityY(-640);
      jumpCount++;
    }
  }
}
