import { colliders } from "../../const/manualColliders";
import * as THREE from "three";

export class DistanceHandler{
    constructor(character){
        this.markers = (colliders || [])
            .filter(collider=>collider.group === "markers")
            .map(collider=>({vec: new THREE.Vector3(collider.positions?.x ?? 0, collider.positions?.y ?? 0, collider.positions?.z ?? 0), ...collider}));
        
            this.activeMarker = null;
            this.character = character;
            this.interactDistance = 30;
        }
    updateCharPositionDistance(){
        const characterPosition = this.character.mesh.position;
        this.activeMarker = this.markers.find(marker => 
            characterPosition.distanceTo(marker.vec) < this.interactDistance
        ) || null;
    }

}