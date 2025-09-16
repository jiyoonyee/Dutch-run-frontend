import createButton from "../utils/createButton";

const BACKGROUND_SCROLL_SPEED = 2;
const GROUND_SCROLL_SPEED = 600;
const SPEED_INCREMENT = 0.001;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.player = null;
    this.cursors = null;
    this.groundTiles = null;
    this.obstacles = null;
    this.background = null;
    this.jumpCount = 0;
    this.score = 0;
    this.scoreText = null;
    this.gameOver = false;
    this.gameSpeed = 1;
    this.restartButton = null;
  }

  create() {
    // 배경
    this.background = this.add
      .tileSprite(
        0,
        0,
        this.sys.game.config.width,
        this.sys.game.config.height,
        "background"
      )
      .setOrigin(0, 0);

    // 키 입력
    this.cursors = this.input.keyboard.createCursorKeys();

    // 바닥
    this.groundTiles = this.physics.add.staticGroup();
    const TILE_WIDTH = 120;
    const TILE_HEIGHT = 100;
    const numTiles = Math.ceil(this.sys.game.config.width / TILE_WIDTH) + 2;

    for (let i = 0; i < numTiles; i++) {
      const tile = this.groundTiles.create(
        i * TILE_WIDTH,
        this.sys.game.config.height - TILE_HEIGHT,
        "ground"
      );
      tile.setDisplaySize(TILE_WIDTH, TILE_HEIGHT);
      tile.setOrigin(0, 0);
      tile.refreshBody();
    }

    // 플레이어
    this.player = this.physics.add.sprite(100, 500, "player");
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.groundTiles, () => {
      this.jumpCount = 0;
    });

    // 장애물 그룹
    this.obstacles = this.physics.add.group();

    this.time.addEvent({
      delay: 2000,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.collider(
      this.player,
      this.obstacles,
      this.hitObstacle,
      null,
      this
    );

    // 점수 표시
    this.score = 0;
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "32px",
      fill: "#fff",
      fontFamily: "Arial",
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(1000);

    // 재시작 버튼
    this.restartButton = createButton(
      this,
      this.sys.game.config.width / 2,
      this.sys.game.config.height / 2,
      "RESTART",
      0.5,
      0.5
    );
    this.restartButton.setVisible(false);

    this.restartButton.on("pointerdown", () => this.restartGame());

    // 키보드 입력으로도 재시작
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.gameOver) this.restartGame();
    });
    this.input.keyboard.on("keydown-ENTER", () => {
      if (this.gameOver) this.restartGame();
    });

    // 1초마다 점수 증가
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.gameOver) {
          this.score += 10;
          this.scoreText.setText("Score: " + this.score);
        }
      },
      loop: true,
    });

    // 애니메이션
    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 9 }),
      frameRate: this.gameSpeed * 10,
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

  spawnObstacle() {
    const x = this.sys.game.config.width + 150;
    const type = Phaser.Math.Between(0, 1);

    let width = 80,
      y,
      height,
      key;

    if (type === 0) {
      key = "obstacle_high";
      y = this.sys.game.config.height - 100;
      height = 100;
    } else {
      key = "obstacle_low";
      y = this.sys.game.config.height - 180;
      height = 1000;
    }

    const obstacle = this.obstacles.create(x, y, key);
    obstacle.setOrigin(0.5, 1);
    obstacle.setDisplaySize(width, height);
    obstacle.body.allowGravity = false;
    obstacle.setVelocityX(-GROUND_SCROLL_SPEED);
    obstacle.scored = false;
    obstacle.type = type;

    obstacle.refreshBody();
  }

  hitObstacle(player, obstacle) {
    if (!this.gameOver) {
      console.log("장애물에 부딪힘!");
      this.restartButton.setVisible(true);
      this.physics.pause();
      this.player.setTint(0xff0000);
      this.gameOver = true;
      this.scoreText.setText("Game Over! Final Score: " + this.score);

      if (this.score > (window.localStorage.getItem("MaxScore") || 0)) {
        window.localStorage.setItem("MaxScore", this.score);
      }

      console.log("MaxScore:", window.localStorage.getItem("MaxScore"));
    }
  }

  restartGame() {
    this.scene.restart();
    this.jumpCount = 0;
    this.score = 0;
    this.gameOver = false;
    this.gameSpeed = 1;
  }

  update(time, delta) {
    if (!this.gameOver) {
      // 속도 증가
      this.gameSpeed += SPEED_INCREMENT * (delta / 16.67);

      // 배경 스크롤
      this.background.tilePositionX += BACKGROUND_SCROLL_SPEED * this.gameSpeed;

      // 바닥 스크롤
      const TILE_WIDTH = 120;
      const totalGroundWidth =
        this.groundTiles.getChildren().length * TILE_WIDTH;
      const move = (GROUND_SCROLL_SPEED * this.gameSpeed * delta) / 1000;

      this.groundTiles.getChildren().forEach((tile) => {
        tile.x -= move;
        tile.body.updateFromGameObject();

        if (tile.x < -TILE_WIDTH) {
          tile.x += totalGroundWidth;
          tile.body.updateFromGameObject();
        }
      });

      // 장애물 이동
      this.obstacles.getChildren().forEach((obstacle) => {
        obstacle.setVelocityX(-GROUND_SCROLL_SPEED * this.gameSpeed);
      });

      // 플레이어 애니메이션 속도 조절
      this.player.anims.timeScale = this.gameSpeed;
      this.player.anims.play("run", true);

      // 슬라이드 상태
      if (this.cursors.down.isDown && this.jumpCount === 0) {
        this.player.anims.play("slide", true);
        this.player.body.setSize(
          this.player.width,
          this.player.height / 2,
          true
        );
        this.player.body.setOffset(0, this.player.height / 2);
        return;
      } else {
        this.player.body.setSize(this.player.width, this.player.height, true);
        this.player.body.setOffset(0, 0);
      }

      // 점프
      if (
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space)
      ) {
        if (this.jumpCount < 2) {
          this.player.setVelocityY(-800);
          this.jumpCount++;

          this.player.body.setSize(this.player.width, this.player.height, true);
          this.player.body.setOffset(0, 0);
          this.player.anims.play("run", true);

          this.physics.world.collide(
            this.player,
            this.obstacles,
            this.hitObstacle,
            null,
            this
          );
        }
      }

      // 모바일 점프 버튼
      if (
        window.isMobile &&
        this.jumpButton &&
        this.jumpButton
          .getBounds()
          .contains(this.input.activePointer.x, this.input.activePointer.y) &&
        this.input.activePointer.isDown
      ) {
        if (this.jumpCount < 2) {
          this.player.setVelocityY(-800);
          setTimeout(() => {
            this.input.activePointer.isDown = false;
            this.jumpCount++;
          }, 0);
        }
      }

      // 모바일 슬라이드 버튼
      if (
        window.isMobile &&
        this.slideButton &&
        this.slideButton
          .getBounds()
          .contains(this.input.activePointer.x, this.input.activePointer.y) &&
        this.input.activePointer.isDown &&
        this.jumpCount === 0
      ) {
        this.player.anims.play("slide", true);
        this.player.body.setSize(
          this.player.width,
          this.player.height / 2,
          true
        );
        this.player.body.setOffset(0, this.player.height / 2);
        return;
      }

      // 수동 충돌 판정
      this.obstacles.getChildren().forEach((obstacle) => {
        if (
          Phaser.Geom.Intersects.RectangleToRectangle(
            this.player.getBounds(),
            obstacle.getBounds()
          )
        ) {
          this.hitObstacle(this.player, obstacle);
        }
      });
    } else {
      this.player.anims.stop();
    }
  }
}
