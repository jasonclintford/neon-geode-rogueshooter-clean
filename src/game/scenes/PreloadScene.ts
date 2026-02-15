import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload(): void {
    // Minimal: the rest are generated textures.
    // Keep this for future sprite sheets or audio.
  }

  create(): void {
    this.scene.start("Game");
    this.scene.start("UI");
  }
}
