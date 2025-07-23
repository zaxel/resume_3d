export class ModalMarker{
    constructor(markersDistanceHandler){
        this.markerModalContainer = document.getElementById('modal-marker-cont');
        if (!this.markerModalContainer) {
            console.error("Modal container #modal-marker-cont not found!");
            return;
        }
        this._initModalMarker();

        this.markersDistanceHandler = markersDistanceHandler;
        this.markersDistanceHandler.modalMarker = this;
        this.activeMarker = null;
    }
    _initModalMarker(){
        this.modal = document.createElement('div');
        this.modal.className = 'modal-marker';
        this.markerModalContainer.append(this.modal);
    }
    updateMarkerModalStatus(){
        if(this.markersDistanceHandler.activeMarker && this.markersDistanceHandler.activeMarker!==this.activeMarker){
            this.activeMarker = this.markersDistanceHandler.activeMarker;
            this.modal.innerHTML = `
                press <kbd>R</kbd> to read <strong> ${this.activeMarker.name}</strong>
            `
            this.modal.classList.add('show-marker-modal');
        }
        if(!this.markersDistanceHandler.activeMarker && this.activeMarker){
            this.activeMarker = null;
            this.modal.classList.remove('show-marker-modal');
        }
    }
}