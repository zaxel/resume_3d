import * as THREE from "three";

export class GrassShaderMaterials {
  constructor() {
    this.maxGrassRadius = 400.0;
    this.grassMaskTexture = new THREE.TextureLoader().load("./textures/grass.jpg");
    this.grassDiffTexture = new THREE.TextureLoader().load("./textures/grass_diffuse.jpg");
    this.perlinNoiseTexture = new THREE.TextureLoader().load("./noise/perlin_noise.png");
    this.emptyTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    this.emptyTexture.needsUpdate = true;
  }

  shaderMaterial(shaders) {
    return new THREE.RawShaderMaterial({
      uniforms: {
        time: { value: 0 },
        grassMaskTexture: { value: this.grassMaskTexture },
        grassDiffTexture: { value: this.grassDiffTexture },
        perlinNoiseTexture: { value: this.perlinNoiseTexture },
        heightMap: { value: null },
        terrainHeightScale: { value: 1.0 },
        terrainSize: { value: new THREE.Vector2(1, 1) },
        useHeightMap: { value: false },
        bladeHeightUniform: { value: 1.0 },
        bladeWidthUniform: { value: 1.0 },
        vegetationMaskTexture: { value: this.emptyTexture },
        vegetationMaskSize: { value: new THREE.Vector2(1, 1) },
        fog: true,
        fogColor: { value: new THREE.Color(0xffffff) }, 
        fogDensity: { value: 0.0 }, // For exponential fog
        fogTime: { value: 0.0 },
        grassRadius: { value: this.maxGrassRadius }, 
      },
      vertexShader: shaders.get("grass_VS"),
      fragmentShader: shaders.get("grass_FS"),
      side: THREE.DoubleSide,
      transparent: true,
    });
  }
  
}
