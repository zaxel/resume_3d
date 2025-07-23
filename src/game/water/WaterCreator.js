import { Water } from "./Water2";
import * as THREE from "three";

export class CreateWater {
    constructor(scene, isFoggy) {
        this._scene = scene;
        this._waterMeshWidth = 1220;
        this._waterMeshHeight = 1220;
        this._s = 1; // Scaling factor for textures
        this.tLoader = new THREE.TextureLoader();
        this.isFoggy = isFoggy;
        this._initialize();
    }

    _initialize() {
        // Load height map
        const heightMap = this.tLoader.load('./map/heights_map.jpg', () => {
            heightMap.needsUpdate = true;
            this.initializeWater(heightMap);
        });
        heightMap.wrapS = heightMap.wrapT = THREE.RepeatWrapping;
        heightMap.repeat.set(this._s, this._s);
        
        this.waterFlowDirMap = this.tLoader.load('./map/water_flow_map.jpeg');
        this.waterFlowDirMap.wrapS = this.waterFlowDirMap.wrapT = THREE.RepeatWrapping;
        this.waterFlowDirMap.repeat.set(this._s, this._s);
    }
    
    initializeWater(heightMap) {
        const textureLoader = new THREE.TextureLoader();
        const perlinTexture = textureLoader.load("./noise/perlin_noise.png"); 
        perlinTexture.wrapS = perlinTexture.wrapT = THREE.RepeatWrapping;
        this.waterGeometry = new THREE.PlaneGeometry(this._waterMeshWidth, this._waterMeshHeight, 512, 512);
        this.water = new Water(this.waterGeometry, {
            scale: 1,
            flowSpeed: 0.04,
            reflectivity: 0.35,
            flowMap: this.waterFlowDirMap,
            perlinNoise: perlinTexture 
        });

        if (this.water.material && this.water.material.uniforms) {
            this.water.material.uniforms.heightMap = { value: heightMap };
            this.water.material.uniforms.heightMap.needsUpdate = true;
            this.water.material.uniforms.fogTime = { value: 0.0 };
            this.water.material.uniforms.perlinNoise = { value: perlinTexture };
        } else {
            console.warn("Water material or uniforms are undefined.");
        }
        this.water.position.y = -9;
        this.water.rotation.x = -Math.PI / 2;
        this._scene.add(this.water);
    }
}
