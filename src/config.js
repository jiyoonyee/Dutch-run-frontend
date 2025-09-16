import PreloadScene from "./scenes/PreloadScene";
import GameScene from "./scenes/GameScene";
// import MenuScene from "./scenes/MenuScene"; // 나중에 추가 가능

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
  scene: [PreloadScene, GameScene],
};

export default config;
