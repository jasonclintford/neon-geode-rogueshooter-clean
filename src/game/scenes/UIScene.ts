import Phaser from "phaser";
import type { RunState } from "../types";
import { roomKey } from "../types";
import { UpgradeById } from "../data/upgrades";
import { WeaponById } from "../data/weapons";
import { Tuning } from "../tuning";

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private depthText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private upgradesText!: Phaser.GameObjects.Text;
  private healthPips: Phaser.GameObjects.Rectangle[] = [];
  private mapGfx!: Phaser.GameObjects.Graphics;
  private overlayText!: Phaser.GameObjects.Text;
  private transientText!: Phaser.GameObjects.Text;
  private helpButtonBg!: Phaser.GameObjects.Rectangle;
  private helpButtonText!: Phaser.GameObjects.Text;
  private helpPanelBg!: Phaser.GameObjects.Rectangle;
  private helpPanelText!: Phaser.GameObjects.Text;
  private helpVisible = false;

  private lastRun: RunState | null = null;

  constructor() {
    super("UI");
  }

  create(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Courier New, monospace",
      fontSize: "24px",
      color: "#8efcff",
      stroke: "#05051b",
      strokeThickness: 4
    };

    this.scoreText = this.add.text(18, 14, "SCORE: 000000", style).setDepth(1000);
    this.bestText = this.add.text(18, 44, "BEST: 000000", style).setDepth(1000);
    this.depthText = this.add.text(18, 74, "DEPTH: 0  ROOMS: 0", style).setDepth(1000);
    this.weaponText = this.add.text(18, 104, "WEAPON: Ion Pistol  AMMO: 000", style).setDepth(1000);
    this.statusText = this.add.text(18, 134, "STREAK x1  KILLS: 0", style).setDepth(1000);

    this.add.text(18, 168, "HEALTH:", style).setDepth(1000);
    this.rebuildHealthPips(5);

    this.mapGfx = this.add.graphics().setDepth(1000);
    this.drawMinimap(null);

    this.upgradesText = this.add.text(840, 14, "UPGRADES:\nnone", {
      ...style,
      align: "left",
      fontSize: "20px"
    }).setDepth(1000);

    this.overlayText = this.add.text(640, 360, "", {
      fontFamily: "Courier New, monospace",
      fontSize: "36px",
      color: "#ffffff",
      stroke: "#090920",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5).setDepth(2000).setVisible(false);

    this.transientText = this.add.text(640, 666, "", {
      fontFamily: "Courier New, monospace",
      fontSize: "24px",
      color: "#ffb25c",
      stroke: "#0c0d22",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(2000).setVisible(false);

    this.createHelpUi();
    this.showIntroOverlay();

    const gameScene = this.scene.get("Game");
    gameScene.events.on("run:update", (run: RunState) => this.onRunUpdate(run));
    gameScene.events.on("room:changed", (run: RunState) => this.drawMinimap(run));
    gameScene.events.on("run:pause", (paused: boolean) => this.showPause(paused));
    gameScene.events.on("run:message", (message: string) => this.flashMessage(message));
    this.events.on("ui:gameover", (run: RunState) => this.showGameOver(run));
    this.input.keyboard?.on("keydown-H", () => this.toggleHelp());

    const initial = (gameScene as any).getRunState?.() as RunState | undefined;
    if (initial) {
      this.onRunUpdate(initial);
      this.drawMinimap(initial);
    }
  }

  private createHelpUi(): void {
    this.helpButtonBg = this.add.rectangle(1214, 32, 108, 32, 0x1a214a, 0.92)
      .setStrokeStyle(2, 0x31ebff, 1)
      .setDepth(2100)
      .setInteractive({ useHandCursor: true });
    this.helpButtonText = this.add.text(1214, 32, "HELP", {
      fontFamily: "Courier New, monospace",
      fontSize: "20px",
      color: "#8efcff"
    }).setOrigin(0.5).setDepth(2101);

    this.helpPanelBg = this.add.rectangle(640, 360, 860, 420, 0x0b1032, 0.94)
      .setStrokeStyle(3, 0x31ebff, 1)
      .setDepth(2200)
      .setVisible(false);
    this.helpPanelText = this.add.text(250, 188,
      [
        "HOW TO PROGRESS",
        "",
        "1. Clear every enemy in the current room.",
        "2. Neon gate locks disappear when the room is cleared.",
        "3. Move to a room edge to transition deeper.",
        "4. Press E near drops: weapons, ammo, health, shrines.",
        "5. Use shrines to stack permanent run upgrades.",
        "6. Keep kill streaks alive to raise score multiplier.",
        "",
        "Controls: WASD/Arrows move, mouse aim/fire,",
        "Space dash, R reload, Esc pause, F fullscreen.",
        "",
        "Press HELP again (or H) to close."
      ].join("\n"),
      {
        fontFamily: "Courier New, monospace",
        fontSize: "26px",
        color: "#d6f9ff",
        stroke: "#05081f",
        strokeThickness: 4,
        lineSpacing: 4
      })
      .setDepth(2201)
      .setVisible(false);

    this.helpButtonBg.on("pointerdown", () => this.toggleHelp());
  }

  private toggleHelp(): void {
    this.helpVisible = !this.helpVisible;
    this.helpPanelBg.setVisible(this.helpVisible);
    this.helpPanelText.setVisible(this.helpVisible);
  }

  private onRunUpdate(run: RunState): void {
    this.lastRun = run;

    this.scoreText.setText(`SCORE: ${String(run.score).padStart(6, "0")}`);
    this.bestText.setText(`BEST: ${String(run.bestScore).padStart(6, "0")}  BEST DEPTH: ${run.bestDepth}`);
    this.depthText.setText(`DEPTH: ${run.depth}  ROOMS: ${run.roomsCleared}  SEED: ${run.runSeed}`);

    const w = WeaponById[run.weaponId];
    this.weaponText.setText(`WEAPON: ${w.name}  AMMO: ${String(run.ammo).padStart(3, "0")}`);
    this.statusText.setText(
      `STREAK x${run.multiplier}  K:${run.kills}  E:${run.enemyRemaining}  ROOM:${run.room.x},${run.room.y}`
    );

    if (this.healthPips.length !== run.maxHealth) {
      this.rebuildHealthPips(run.maxHealth);
    }
    for (let i = 0; i < this.healthPips.length; i++) {
      this.healthPips[i].setVisible(i < run.health);
    }

    const upgrades = run.upgrades.length > 0
      ? run.upgrades.map(id => `- ${UpgradeById[id]?.name ?? id}`).join("\n")
      : "none";
    this.upgradesText.setText(`UPGRADES:\n${upgrades}`);
    this.drawMinimap(run);
  }

  private rebuildHealthPips(maxHealth: number): void {
    for (const pip of this.healthPips) pip.destroy();
    this.healthPips = [];
    for (let i = 0; i < maxHealth; i++) {
      const pip = this.add.rectangle(112 + i * 18, 180, 14, 14, 0xffa657, 1).setDepth(1000);
      pip.setStrokeStyle(2, 0x2de9ff, 1);
      this.healthPips.push(pip);
    }
  }

  private drawMinimap(run: RunState | null): void {
    const g = this.mapGfx;
    g.clear();

    const x0 = 18;
    const y0 = 208;
    const size = 12;
    const pad = 3;

    g.lineStyle(2, 0x2de9ff, 1);
    g.strokeRect(x0, y0, 180, 180);
    if (!run) return;

    const cx = run.room.x;
    const cy = run.room.y;

    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const key = roomKey({ x: cx + dx, y: cy + dy });
        if (!run.visited.has(key)) continue;

        const px = x0 + 10 + (dx + 6) * (size + pad);
        const py = y0 + 10 + (dy + 6) * (size + pad);
        const isCurrent = dx === 0 && dy === 0;
        g.fillStyle(isCurrent ? 0xffa246 : 0x7857ff, 1);
        g.fillRect(px, py, size, size);

        const portal = run.portalRooms.get(key);
        if (portal) {
          g.fillStyle(portal.active ? 0x2dffb7 : 0xff9f4d, 1);
          g.fillCircle(px + size - 2, py + 2, 3);
          g.lineStyle(1, 0xffffff, 0.8);
          g.strokeCircle(px + size - 2, py + 2, 3);

          if (isCurrent) {
            const localX = Phaser.Math.Clamp(portal.x / Tuning.room.width, 0, 1);
            const localY = Phaser.Math.Clamp(portal.y / Tuning.room.height, 0, 1);
            g.fillStyle(portal.active ? 0x2dffb7 : 0xff9f4d, 0.9);
            g.fillRect(
              px + Math.floor(localX * (size - 3)),
              py + Math.floor(localY * (size - 3)),
              3,
              3
            );
          }
        }
      }
    }
  }

  private showPause(paused: boolean): void {
    if (!paused) {
      if (!this.overlayText.text.includes("GAME OVER")) this.overlayText.setVisible(false);
      return;
    }
    this.overlayText.setText("PAUSED\n\nEsc to resume\nF for fullscreen");
    this.overlayText.setVisible(true);
  }

  private flashMessage(message: string): void {
    this.transientText.setText(message);
    this.transientText.setVisible(true);
    this.tweens.killTweensOf(this.transientText);
    this.transientText.alpha = 1;
    this.tweens.add({
      targets: this.transientText,
      alpha: 0,
      duration: 1600,
      ease: "Quad.Out",
      onComplete: () => {
        this.transientText.setVisible(false);
      }
    });
  }

  private showIntroOverlay(): void {
    this.overlayText.setText(
      "NEON GEODE ROGUESHOOTER\n\nWASD/Arrows move\nMouse aim + fire\nSpace dash  E interact\nEsc pause  F fullscreen"
    );
    this.overlayText.setVisible(true);
    this.time.delayedCall(3000, () => {
      if (!this.overlayText.text.includes("GAME OVER")) this.overlayText.setVisible(false);
    });
  }

  private showGameOver(run: RunState): void {
    this.overlayText.setText(
      `GAME OVER\n\nSCORE: ${run.score}\nBEST: ${run.bestScore}\nDEPTH: ${run.depth}\nBEST DEPTH: ${run.bestDepth}\n\nClick to restart`
    );
    this.overlayText.setVisible(true);
  }
}
