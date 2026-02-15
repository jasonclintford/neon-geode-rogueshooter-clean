import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    // A single place to tweak rendering defaults
    this.game.renderer.resize(1280, 720);
    this.scene.start("Preload");
  }
}
