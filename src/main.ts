import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { PreloadScene } from "./game/scenes/PreloadScene";
import { GameScene } from "./game/scenes/GameScene";
import { UIScene } from "./game/scenes/UIScene";

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "app",
  backgroundColor: "#07071a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene]
});

// Expose for debugging in devtools if needed
(window as any).__GAME__ = game;
(window as any).render_game_to_text = () => {
  const scene = game.scene.getScene("Game") as GameScene | undefined;
  return scene?.renderGameToText?.() ?? JSON.stringify({ mode: "booting" });
};
(window as any).advanceTime = async (ms: number) => {
  const scene = game.scene.getScene("Game") as GameScene | undefined;
  scene?.advanceTime?.(ms);
  await new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
};
