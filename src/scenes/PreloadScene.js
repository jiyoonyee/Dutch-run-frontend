import playerImg from "../assets/kirbyRunSlide.png";
import backgroundImg from "../assets/background.png";
import groundImg from "../assets/groundTile.png";
import obstacleImg from "../assets/obstacle.png";
import slideObstacleImg from "../assets/potato.png";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.image("background", backgroundImg);
    this.load.image("ground", groundImg);
    this.load.image("obstacle_high", obstacleImg);
    this.load.image("obstacle_low", slideObstacleImg);

    this.load.spritesheet("player", playerImg, {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  create() {
    this.scene.start("GameScene");
  }
}
