import Stats from 'stats.js';

export class Stat {
  constructor() {
    this.stats = new Stats();

    this.stats.showPanel(0); // 0: FPS, 1: MS, 2: MB, 3+: Custom
    document.body.appendChild(this.stats.dom);
  }
}
