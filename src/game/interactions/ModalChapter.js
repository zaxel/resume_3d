export class ModalChapter {
  constructor(markersDistanceHandler, chapterViewer, audioPlayer) {
    this.audioPlayer = audioPlayer;
    this.chapterModalContainer = document.getElementById("modal-chapter-cont");
    if (!this.chapterModalContainer) {
      console.error("Modal container #modal-chapter-cont not found!");
      return;
    }
    this.chapterViewer = chapterViewer;
    this.markersDistanceHandler = markersDistanceHandler;
    this.activeModalChapter = null;
    this._initModalChapter();
    document.addEventListener("keydown", (event) => this.handleKeyPress(event));
  }
  _initModalChapter() {
    this.modal = this.chapterViewer.modal.firstElementChild;
    this.chapterViewer.closeButton.addEventListener("click", () => this.hideChapterModal());
  }
  updateChapterModalStatus() {
    const keys = this.markersDistanceHandler.character.basicController._input._keys;

    if (this.markersDistanceHandler.activeMarker && !this.activeModalChapter && keys.read) {
      this.showChapterModal();
      keys.read = false;
    }

    if (this.activeModalChapter && (keys.esc || keys.read)) {
      this.hideChapterModal();
      keys.esc = false;
      keys.read = false;
    }
  }
  handleKeyPress(event) {
    if (this.markersDistanceHandler.activeMarker && !this.activeModalChapter && event.keyCode === 82) {
        this.showChapterModal();
    }else if (this.activeModalChapter && (event.code === "Escape" || event.keyCode === 82)) {
      this.hideChapterModal();
    }
  }
  showChapterModal() {
    const btnsPressedController = this.markersDistanceHandler.character.basicController._input;
    this.modal.classList.add("show-chapter-modal");
    this.activeModalChapter = this.markersDistanceHandler.activeMarker;
    this.markersDistanceHandler.modalMarker.modal.classList.remove("show-marker-modal");
    btnsPressedController.actionsAllowed = false;
    this.playOpenInventorySound();
    this.chapterViewer.open();
  }
  hideChapterModal() {
    const btnsPressedController = this.markersDistanceHandler.character.basicController._input;
    this.modal.classList.remove("show-chapter-modal");
    this.markersDistanceHandler.modalMarker.modal.classList.add("show-marker-modal");
    this.activeModalChapter = null;
    btnsPressedController.actionsAllowed = true;
    this.playOpenInventorySound();
    this.chapterViewer.close();
  }
  playOpenInventorySound(){
    if(this.audioPlayer)
      this.audioPlayer.playSound("./sounds/leather_inventory.wav");
  }
}
