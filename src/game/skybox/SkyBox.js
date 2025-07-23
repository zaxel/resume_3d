import * as THREE from "three";
import { skyboxesList } from "../../const/skyboxes";

export class SkyBox {
  constructor(isFoggy, scene) {
    this.isFoggy = isFoggy;
    this.scene = scene;
    this.cubeTextureLoader = new THREE.CubeTextureLoader();
}
  addSkyBox() {
    let texture = null;
    if(this.isFoggy){
        texture = this.cubeTextureLoader.load(skyboxesList.blizzard); 
    }
    else{
        // texture = this.cubeTextureLoader.load(skyboxesList.meadow); 
        texture = this.cubeTextureLoader.load(skyboxesList.yonder); 
    }
    if(!texture) return;
    texture.encoding = THREE.sRGBEncoding;
    this.scene.background = texture;
  }
}
