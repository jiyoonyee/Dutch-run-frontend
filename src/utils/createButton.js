export default function createButton(scene, x, y, text, originX, originY) {
  const bg = scene.add.graphics();
  bg.fillStyle(0xffffff, 0.2);
  bg.fillRoundedRect(-80, -30, 160, 60, 30);
  bg.lineStyle(2, 0xffffff, 0.3);
  bg.strokeRoundedRect(-80, -30, 160, 60, 100);

  const label = scene.add
    .text(0, 0, text, {
      fontSize: "32px",
      fontFamily: "Arial",
      color: "#fff",
    })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [bg, label]);
  button.setSize(220, 80);
  button.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, 220, 80),
    Phaser.Geom.Rectangle.Contains
  );

  button.setOrigin?.(originX, originY);
  button.setScrollFactor(0);

  return button;
}
