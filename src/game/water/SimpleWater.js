import * as THREE from "three";
import { degToRad } from "three/src/math/MathUtils.js";
export class SimpleWater {
  constructor(isFoggy) {
    this.simpleWater = null;
    this.isFoggy = isFoggy;
    this._init();
    this.waterLevel = -9;
  }
   _init() {
    const textureLoader = new THREE.TextureLoader();
    const perlinTexture = textureLoader.load("./noise/perlin_noise.png"); 
    perlinTexture.wrapS = perlinTexture.wrapT = THREE.RepeatWrapping;
    const simpleWaterGeometry = new THREE.PlaneGeometry(400, 1300, 10, 10);
    
    const simpleWaterMaterial = new THREE.MeshStandardMaterial({
      color: 0x184d72,
      transparent: true,
      opacity: 0.7,
      fog: true,
      metalness: 0.1,
      roughness: 0.5
    });

    simpleWaterMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.fogTime = { value: 0.0 };
      shader.uniforms.perlinNoise = { value: perlinTexture};

      if (!this.isFoggy){ 
       shader.vertexShader = `#define USE_FOG
      varying vec3 vWorldPosition;
      ${shader.vertexShader}`;
    }

      shader.vertexShader = shader.vertexShader.replace(
        "#include <fog_vertex>",
        `vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
         #include <fog_vertex>`
      );
    };

    this.simpleWater = new THREE.Mesh(simpleWaterGeometry, simpleWaterMaterial);
    simpleWaterGeometry.rotateX(THREE.MathUtils.degToRad(-90));
    simpleWaterGeometry.translate(90, -9, 0);
  }
}

