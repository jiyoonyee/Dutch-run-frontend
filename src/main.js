import Phaser from "phaser";
import playerImg from "./assets/kirbyRunSlide.png";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 1280,
  height: 720,
  backgroundColor: "#87CEEB", // 하늘색
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 800 }, // 아래로 떨어지게
      debug: true, // 충돌 박스 보이게
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

let ground;
let player;
let cursors;

let jumpCount = 0; // 이중 점프 구현용

function preload() {
  this.load.spritesheet("player", playerImg, {
    frameWidth: 128,
    frameHeight: 128,
  });
}

function create() {
  // 캐릭터 움직임
  cursors = this.input.keyboard.createCursorKeys();

  // 바닥 물리 객체
  ground = this.physics.add.staticGroup();
  ground
    .create(640, 700, null)
    .setDisplaySize(1280, 40)
    .setOrigin(0.5, 0.5)
    .refreshBody();

  // 실제로 보이는 건 Graphics로 그림
  const g = this.add.graphics();
  g.fillStyle(0x008000, 1); // 초록색
  g.fillRect(0, 680, 1280, 40);

  player = this.physics.add.sprite(100, 500, "player");
  player.setScale(0.5); // 크기 조절
  // player.se tBounce(0.8); // 튕기는 정도
  player.setCollideWorldBounds(true); // 화면 밖으로 못 나가게
  this.physics.add.collider(player, ground, () => {
    jumpCount = 0; // 바닥에 닿으면 점프 횟수 초기화
  }); // 충돌 설정

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

  // 좌표(x,y,너비,높이)

  // 플레이어 (물리 오브젝트)
}

function update() {
  if (cursors.down.isDown && jumpCount === 0) {
    player.anims.play("slide", true);

    // 몸체 크기 줄이기 (히트박스 낮춤)
    player.body.setSize(player.width, player.height / 2, true);
    player.body.setOffset(0, player.height / 2);

    return; // 다른 입력 무시
  } else {
    // 키에서 손 뗐을 때 원래 크기로 복구
    player.body.setSize(player.width, player.height, true);
    player.body.setOffset(0, 0);
  }
  player.anims.play("run", true);
  // 캐릭터 움직임
  // if (cursors.left.isDown) {
  //   player.setVelocityX(-160);
  //   player.anims.play("run", true);
  //   player.setFlipX(true);
  // } else if (cursors.right.isDown) {
  //   player.setVelocityX(160);
  //   player.anims.play("run", true);
  //   player.setFlipX(false);
  // } else {
  //   player.setVelocityX(0);
  //   // player.anims.play("idle", true);
  // }

  if (
    Phaser.Input.Keyboard.JustDown(cursors.up) ||
    Phaser.Input.Keyboard.JustDown(cursors.space)
  ) {
    if (jumpCount < 2) {
      player.setVelocityY(-440); // 점프 속도

      jumpCount++;
    }
  }
}
