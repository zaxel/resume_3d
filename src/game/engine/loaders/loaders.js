import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mapScaleFactor } from "../../../const/game";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export const loadModel = (url, scene, position = { x: 0, y: 0, z: 0 }, scale = 1, rotation = { x: 0, y: 0, z: 0 }) => {
  this.GLTFLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.position.set(position.x, position.y, position.z);
      model.scale.set(scale, scale, scale);
      model.rotateX(rotation.x);
      model.rotateY(rotation.y);
      model.rotateZ(rotation.z);
      scene.add(model);
    },
    undefined,
    (error) => {
      console.error("Error loading model:", error);
    }
  );
};

export const loadTerrainMesh = async (loader, scene, isAddToScene) => {
  return new Promise((resolve, reject) => {
    loader.load(
      "./map/map.glb",
      (gltf) => {
        const terrain = gltf.scene;
        terrain.scale.set(mapScaleFactor.x, mapScaleFactor.y, mapScaleFactor.z);
        terrain.translateY(0);
        terrain._forShadersModifiable = true;

        terrain.traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
          }
        });

        if (isAddToScene) scene.add(terrain);

        resolve(terrain);
      },
      undefined,
      (error) => {
        console.error("Error loading terrain:", error);
        reject(error);
      }
    );
  });
};

export const loadCompressedModel = (() => {
  let gLoader = null;
  let ktx2Loader = null;

  return async (
    loadingManager,
    renderer,
    isAddToScene,
    url,
    scene,
    position = { x: 0, y: 0, z: 0 },
    scale = { x: mapScaleFactor.x, y: mapScaleFactor.y, z: mapScaleFactor.z },
    rotation = { x: 0, y: 0, z: 0 },
    name = ''
  ) => {
    return new Promise((resolve, reject) => {
      if (!gLoader) {
        gLoader = new GLTFLoader(loadingManager);
        ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath("./libs/basis/");
        ktx2Loader.detectSupport(renderer);

        gLoader.setKTX2Loader(ktx2Loader);
        gLoader.setMeshoptDecoder(MeshoptDecoder);
      }

      gLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(position.x, position.y, position.z);
          model.scale.set(scale.x, scale.y, scale.z);
          model.rotateX(rotation.x);
          model.rotateY(rotation.y);
          model.rotateZ(rotation.z);
          model._forShadersModifiable = true;
          if(name)
            model.name = name;

          model.traverse((child) => {
            if (child.isMesh) {
              child.receiveShadow = true;
              child.castShadow = true;
            }
          });

          if (isAddToScene) scene.add(model);
          resolve(model);
        },
        undefined,
        (error) => {
          console.error("Error loading terrain:", error);
          reject(error);
        }
      );
    });
  };
})();
