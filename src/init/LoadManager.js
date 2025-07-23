import * as THREE from "three";

export class LoadManager {
  constructor(helpMenu) {
    this.loadPage = document.getElementById("loading");
    this.progressBar = document.getElementById("ld-progress");
    this.manager = new THREE.LoadingManager();
    this.helpMenu = helpMenu;
    this._setupEventHandlers();
  }

  getManager() {
    return this.manager;
  }

  _setupEventHandlers() {
    this.manager.onStart = this._onStart.bind(this);
    this.manager.onProgress = this._onProgress.bind(this);
    this.manager.onLoad = this._onLoad.bind(this);
    this.manager.onError = this._onError.bind(this);
  }

  _onStart(url, itemsLoaded, itemsTotal) {
    if (this.loadPage) this.loadPage.classList.add("loading-show");
    this.helpMenu.hide();
  }

  _onProgress(url, itemsLoaded, itemsTotal) {
    if (this.progressBar) {
      this.progressBar.value = (itemsLoaded / itemsTotal) * 100;
    }
  }

  _onLoad() {
    if (this.loadPage) this.loadPage.classList.remove("loading-show");
    this.helpMenu.show();
  }

  _onError(url) {
    console.error(`Error loading: ${url}`);
  }
}
