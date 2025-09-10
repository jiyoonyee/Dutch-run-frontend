import Phaser from "phaser";
import playerImg from "./assets/kirbyRunSlide.png";
import backgroundImg from "./assets/backimg.png";
import groundImg from "./assets/groundTile.png";

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

  this.load.spritesheet("player", playerImg, {
    frameWidth: 128,
    frameHeight: 128,
  });
}

let backgrounds;
// 배경과 바닥의 스크롤 속도를 각각 다르게 설정합니다.
const backgroundScrollSpeed = 2; // 배경이 움직이는 속도
const groundScrollSpeed = 10; // 바닥이 움직이는 속도

function create() {
  // 배경을 나란히 배치하여 무한 스크롤 준비
  backgrounds = [];
  const scale =
    config.height / this.textures.get("background").source[0].height;
  const bgWidth = this.textures.get("background").source[0].width * scale;

  for (let i = 0; i < 4; i++) {
    const bg = this.add
      .image(i * bgWidth, 0, "background")
      .setOrigin(0, 0)
      .setScale(scale);
    backgrounds.push(bg);
  }

  // 배경 이미지 반전
  backgrounds[0].setFlipX(true);
  backgrounds[2].setFlipX(true);

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

function update() {
  // Move the background to the left.
  const bgWidth = backgrounds[0].displayWidth;
  backgrounds.forEach((bg) => {
    bg.x -= backgroundScrollSpeed;
    // When the image goes off-screen, move it to the end.
    if (bg.x + bgWidth <= 0) {
      bg.x += bgWidth * backgrounds.length;
    }
  });

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
