import * as THREE from "three";
import { degToRad } from "three/src/math/MathUtils.js";

export class WindMill {
    constructor(scene) {
        this.scene = scene;
        this.blades = null;
        this._initRotation();
        this.speed = .4; 
        this.rotationAngle = 0; 
    }

    _initRotation() {
        const bladeGroup = this.scene.children.find(el => el.name === "blade");
        if (!bladeGroup || bladeGroup.children.length === 0) {
            console.warn("Windmill blades not found!");
            return;
        }
        
        this.blades = bladeGroup.children[0];
    }

    updateBlades(delta) {
        if (!this.blades) return;

        this.rotationAngle += delta * this.speed;
        this.blades.rotation.y = this.rotationAngle;
    }
}