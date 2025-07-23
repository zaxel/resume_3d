import * as THREE from "three";

export class ShadersModifier {
  constructor(vegetationGroup, shaders) {
    this.vegetationGroup = vegetationGroup;
    this.shaders = shaders;
    this.perlinTexture = this.createPerlinTexture();
  }
  createPerlinTexture() {
    const loader = new THREE.TextureLoader();
    const perlinTexture = loader.load("./noise/perlin_noise.png");
    perlinTexture.wrapS = perlinTexture.wrapT = THREE.RepeatWrapping;
    return perlinTexture;
  }
  modify() {
    this.vegetationGroup.traverse((obj) => {
      if (obj.isMesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => {
          if (material.isMeshStandardMaterial) {
            material.onBeforeCompile = (shader) => {
              shader.uniforms.fogTime = { value: 0.0 };
              shader.uniforms.perlinNoise = { value: this.perlinTexture };
              this.shaders.push(shader);
            };
          }
        });
      }
    });
  }
}
