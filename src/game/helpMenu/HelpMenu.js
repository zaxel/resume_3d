export class HelpMenu {
  constructor(soundsStatus, musicStatus) {
    this.helpModule = document.getElementById("help-menu");
    this.btns = this.helpModule.querySelector(".help-menu__wrapper");
    this.body = document.body;
    this.lastSuitableBodyCont = document.getElementById("modal-chapter-cont");
    this.soundsBtn = null;
    this.musicBtn = null;
    this.soundsStatus = soundsStatus;
    this.musicStatus = musicStatus;
    this.initBtns();
    this.helpModal = this.makeAndAddModal();
  }
  makeAndAddModal() {
    const help = document.createElement("div");
    help.classList.add("help__modal");
    const modal = document.createElement("div");
    modal.classList.add("help__container");

    modal.innerHTML = `<fieldset class="c-main__right">
            <legend class="c-main__title">Controls</legend>
            <div class="c-main__controls-kbd">
              <dl class="c-main__kbd wasd">
                <dt class="wasd__buttons">
                  <div class="wasd__btns">
                    <div class="wasd__top-line">
                      <kbd>w</kbd>
                    </div>
                    <div class="wast__bottom-line">
                      <kbd>a</kbd>
                      <kbd>s</kbd>
                      <kbd>d</kbd>
                    </div>
                  </div>
                  <span> or </span>
                  <div class="wasd__arrs">
                    <div class="wasd__top-line">
                      <kbd>↑</kbd>
                    </div>
                    <div class="wasd__bottom-line">
                      <kbd>←</kbd>
                      <kbd>↓</kbd>
                      <kbd>→</kbd>
                    </div>
                  </div>
                </dt>
                <dd>- movement</dd>
              </dl>
              <dl class="c-main__kbd rand-action-kbd">
                <dt>
                  <kbd>f</kbd>
                </dt>
                <dd>- random action</dd>
              </dl>
              <dl class="c-main__kbd jump-kbd">
                <dt>
                  <kbd>ctrl</kbd>
                </dt>
                <dd>- jump</dd>
              </dl>
              <dl class="c-main__kbd run-kbd">
                <dt>hold <kbd>shift</kbd></dt>
                <dd>- run</dd>
              </dl>
              <dl class="c-main__kbd help-kbd">
                <dt>
                  <kbd>h</kbd>
                </dt>
                <dd>- help</dd>
              </dl>
              <dl class="c-main__kbd sounds-kbd">
                <dt>
                  <kbd>n</kbd>
                </dt>
                <dd>- sounds</dd>
              </dl>
              <dl class="c-main__kbd music-kbd">
                <dt>
                  <kbd>m</kbd>
                </dt>
                <dd>- music</dd>
              </dl>
              <dl class="c-main__kbd chapter-kbd">
                <dt>
                  <kbd>r</kbd>
                </dt>
                <dd>- open/close chapter</dd>
              </dl>
            </div>
          </fieldset>`;

    help.append(modal);

    this.close = document.createElement("button");
    this.close.textContent = "close";
    this.close.classList.add("help__close");
    this.close.addEventListener("click", (event) => {
      this.hideModal();
      this.show();
    });
    help.append(this.close);

    this.body.append(help);
    this.setBtnListener();

    return help;
  }
  setBtnListener() {
    window.addEventListener("keydown", (event) => {
      const code = event.keyCode;
      if (code !== 72) return;
      if (this.helpModal.classList.contains("helpModal-show")) {
        this.hideModal();
        this.show();
      } else {
        this.showModal();
        this.hide();
      }
    });
  }
  initBtns() {
    Array.from(this.btns.children).forEach((btn) => {
      const img = btn.firstElementChild;
      const baseImgUri = img.baseURI;
      const name = img.dataset.group;

      if (name === "sound") {
        this.soundsBtn = btn;
        img.src = baseImgUri + `icons/${name}-${this.soundsStatus ? "on" : "off"}.svg`;
        if (!this.soundsStatus) this.soundsBtn.classList.add("active");
      } else if (name === "music") {
        this.musicBtn = btn;
        img.src = baseImgUri + `icons/${name}-${this.musicStatus ? "on" : "off"}.svg`;
        if (!this.musicStatus) this.musicBtn.classList.add("active");
      }
      btn.addEventListener("click", (event) => {
        if (btn.classList.contains("help-menu__help")) {
          this.showModal();
          this.hide();
        } else {
          if (event.currentTarget.classList.contains("active")) {
            this[`${name}On`](true);
          } else {
            this[`${name}Off`](true);
          }
        }
      });
    });
  }
  showModal() {
    this.helpModal.classList.add("helpModal-show");
  }
  hideModal() {
    this.helpModal.classList.remove("helpModal-show");
  }
  show() {
    this.helpModule.classList.add("help-menu-show");
  }
  hide() {
    this.helpModule.classList.remove("help-menu-show");
  }

  toggleAudio(type, status, callCb) {
    const btn = type === "sound" ? this.soundsBtn : this.musicBtn;
    const img = btn.firstElementChild;
    const baseURI = img.baseURI;
    img.src = `${baseURI}icons/${type}-${status ? "on" : "off"}.svg`;
    btn.classList.toggle("active", !status);
    this[`${type}Status`] = status;
    if (callCb) this[`on${type.charAt(0).toUpperCase() + type.slice(1)}${status ? "On" : "Off"}`]();
  }

  soundOn(callCb) {
    this.toggleAudio("sound", true, callCb);
  }
  soundOff(callCb) {
    this.toggleAudio("sound", false, callCb);
  }
  musicOn(callCb) {
    this.toggleAudio("music", true, callCb);
  }
  musicOff(callCb) {
    this.toggleAudio("music", false, callCb);
  }

  onSoundOn(cb) {
    if (cb) cb();
  }
  onSoundOff(cb) {
    if (cb) cb();
  }
  onMusicOn(cb) {
    if (cb) cb();
  }
  onMusicOff(cb) {
    if (cb) cb();
  }
}
