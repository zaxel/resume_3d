import * as THREE from "three";

export const objectsShadersFogReady = (scene) => {
    const loader = new THREE.TextureLoader();
    const perlinTexture = loader.load("./noise/perlin_noise.png"); // better when it's power-of-2 for mipmaps

    perlinTexture.wrapS = perlinTexture.wrapT = THREE.RepeatWrapping;

    const shaders = [];
    scene.children.forEach((objects) => {
      if (objects._forShadersModifiable) {
        objects.traverse((obj) => {
          if (obj.isMesh) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach((material) => {
              if (material.isMeshStandardMaterial) {
                material.onBeforeCompile = (shader) => {
                  shader.uniforms.fogTime = { value: 0.0 };
                  shader.uniforms.perlinNoise = { value: perlinTexture };
                  shaders.push(shader);
                };
              }
            });
          }
        });
      }
    });
    return shaders;
  }