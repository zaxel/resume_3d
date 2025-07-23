import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { VegetationPhysics } from "./VegetationPhysics";
import { ShadersModifier } from "./ShadersModifier";
import { degToRad } from "three/src/math/MathUtils.js";
import { loadCompressedModel } from "../engine/loaders/loaders";

export class Vegetation {
  constructor(scene, renderer, loadingManager, terrain, worldPhysics, shaders) {
    this.shaders = shaders;
    this.worldPhysics = worldPhysics;
    this.mapScaleFactor = { x: 1, y: 1, z: 1 };
    this.renderer = renderer;
    this.loadingManager = loadingManager;
    this.scene = scene;
    this.toRadian = degToRad;
    this.terrain = terrain;
    this.objectsTypesSrc = [
      { type: "tree1", src: "./models/trees/scene_c1.glb" },
      { type: "tree2", src: "./models/trees/scene_c2.glb" },
      { type: "tree3", src: "./models/trees/scene_c3.glb" },
      { type: "tree4", src: "./models/trees/scene_c4.glb" },
      { type: "tree5", src: "./models/trees/scene_c5.glb" },
      { type: "tree6", src: "./models/trees/scene_c6.glb" },
      { type: "tree7", src: "./models/trees/scene_c7.glb" },
      { type: "tree8", src: "./models/trees/scene_c8.glb" },
      { type: "tree9", src: "./models/trees/scene_c9.glb" },
      { type: "tree10", src: "./models/trees/scene_c10.glb" },
      { type: "rottenTree1", src: "./models/trees/scene_c11.glb" },
      { type: "stump1", src: "./models/trees/scene_c12.glb" },
      { type: "stone1", src: "./models/trees/scene_c13.glb" },
    ];
    this.vegetationGroup = new THREE.Group();
    this.vegetationGroup.name = "vegetation";
    this.loadedModels = {};

    this.heightData = null;
    this.sizeX = 0;
    this.sizeZ = 0;
    this.minX = 0;
    this.minZ = 0;
    this.maxX = 0;
    this.maxZ = 0;

    this.maskData = null;

    this.scene.add(this.vegetationGroup);
    this.colliderBuilder = new VegetationPhysics(this.worldPhysics);

    this.vegetationShaderModifiers = new ShadersModifier(this.vegetationGroup, this.shaders);
  }

  async preloadModels(cb) {
    const promises = this.objectsTypesSrc.map(({ type, src }) => 
        loadCompressedModel(this.loadingManager, this.renderer, false, src, this.scene)
        .then((model) => {
            this.loadedModels[type] = model;
        })
        .catch((error) => {
            console.error(`Error loading model ${type}:`, error);
            return null;
        })
    );
    await Promise.allSettled(promises);
    cb();
}

  addObject(position = { x: 0, y: 0, z: 0 }, scale = 1, rotation = { x: 0, y: 0, z: 0 }, type) {
    const originalModel = this.loadedModels[type];
    if (!originalModel) {
      console.warn(`Model ${type} not loaded yet!`);
      return;
    }

    const model = originalModel.clone();
    model.position.set(position.x, position.y, position.z);
    model.scale.set(scale, scale, scale);
    model.rotation.set(rotation.x, rotation.y, rotation.z);
    model.layers.enable(Object.keys(this.loadedModels).indexOf(type) % 32); 

    model.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });

    this.vegetationGroup.add(model);
  }

  async setVegetation() {
    let amount = 200;
    const MAP_SIZE = 640;
    const SCALE_FACTOR = 30;
    const heightScale = 1;
    const higherOn = 0;
    const mask_threshold = 0.5;

    await this.setVegetationAreas();
    await this.createHeightsTexture();

    for (let i = 0; i < amount; i++) {
      const randomType = this.objectsTypesSrc[Math.floor(Math.random() * this.objectsTypesSrc.length)].type;
      const x = THREE.MathUtils.randFloatSpread(MAP_SIZE * 2);
      const z = THREE.MathUtils.randFloatSpread(MAP_SIZE * 2) / heightScale + higherOn;
      const maskValue = this._sampleVegetationMask(x, z);
      if (maskValue < mask_threshold) {
        i--;
        continue; 
      }
      const y = this.getHeightAt(x, z);
      const rotateY = this.toRadian(Math.random() * 360);
      let scale = (Math.random() + 0.5) * SCALE_FACTOR;
      if (randomType === "stone1") scale /= 5;

      this.colliderBuilder.createVegetationCollider({ x, y, z }, scale * 0.5, { w: 1, x: 0, y: rotateY, z: 0 }, randomType);

      this.addObject({ x, y, z }, scale, { x: 0, y: rotateY, z: 0 }, randomType);
    }
    this.vegetationShaderModifiers.modify();
  }

  getTerrainMesh() {
    if (!this.terrain) throw new Error("No mesh found");

    this.terrainMesh = this.terrain.getObjectByName("Plane");
    if (!this.terrainMesh) throw new Error("❌ Terrain 'Plane' not found!");

    let meshes = [];
    if (this.terrainMesh.type === "Mesh") {
      meshes.push(this.terrainMesh);
    } else {
      meshes = this.terrainMesh.children.filter((child) => child.isMesh);
    }
    if (meshes.length === 0) throw new Error("❌ No meshes found inside 'Plane'!");

    const geometries = meshes.map((mesh) => {
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geo.scale(this.mapScaleFactor.x, this.mapScaleFactor.y, this.mapScaleFactor.z);
      return geo;
    });

    const mergedGeometry = mergeGeometries(geometries, false);
    if (!mergedGeometry) throw new Error("❌ Terrain mesh not found!");
    const newMesh = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
    return newMesh;
  }

  async _extractHeightData() {
    let terrainMesh;

    try {
      terrainMesh = this.getTerrainMesh();
    } catch (error) {
      console.error(error.message);
      return null;
    }

    const geometry = terrainMesh.geometry;
    const positions = geometry.attributes.position.array;

    // Calculate the number of unique X and Z values
    const uniqueX = new Set();
    const uniqueZ = new Set();
    for (let i = 0; i < positions.length; i += 3) {
      uniqueX.add(positions[i]); // X
      uniqueZ.add(positions[i + 2]); // Z
    }

    const sizeX = 100;
    const sizeZ = 100;

    const minX = Math.min(...uniqueX);
    const maxX = Math.max(...uniqueX);
    const minZ = Math.min(...uniqueZ);
    const maxZ = Math.max(...uniqueZ);

    // Create a 2D array to store height data
    const heightData = new Float32Array(sizeX * sizeZ);
    const count = new Float32Array(sizeX * sizeZ).fill(0); // Track number of vertices per cell

    // Map vertices to the 2D grid
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const y = positions[i + 1];

      // Normalize X and Z to [0, 1] range
      const normalizedX = (x - minX) / (maxX - minX) || 1;
      const normalizedZ = (z - minZ) / (maxZ - minZ) || 1;

      // Map to grid cells
      const col = Math.floor(normalizedX * (sizeX - 1));
      const row = Math.floor(normalizedZ * (sizeZ - 1));

      // Accumulate heights and count vertices
      const index = row * sizeX + col;
      heightData[index] += y;
      count[index] += 1;
    }

    // Average heights
    for (let i = 0; i < heightData.length; i++) {
      if (count[i] > 0) {
        heightData[i] /= count[i];
      }
    }

    return { heightData, sizeX, sizeZ, minX, minZ, maxX, maxZ };
  }

  async createHeightsTexture() {
    const data = await this._extractHeightData();
    if (!data) {
      console.error("Failed to extract height data!");
      return null;
    }
    const { heightData, sizeX, sizeZ, minX, minZ, maxX, maxZ } = data;

    this.heightData = heightData;
    this.sizeX = sizeX;
    this.sizeZ = sizeZ;
    this.minX = minX;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxZ = maxZ;

    return data;
  }

  getHeightAt(x, z) {
    const col = Math.floor(((x - this.minX) / (this.maxX - this.minX)) * (this.sizeX - 1));
    const row = Math.floor(((z - this.minZ) / (this.maxZ - this.minZ)) * (this.sizeZ - 1));

    const safeCol = Math.max(0, Math.min(this.sizeX - 1, col));
    const safeRow = Math.max(0, Math.min(this.sizeZ - 1, row));
    const index = safeRow * this.sizeX + safeCol;
    return this.heightData[index] || 0;
  }

  _precomputeVegetationMask() {
    if (!this.vegMask) {
      console.warn("Vegetation mask not loaded!");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = this.vegMask.image.width;
    canvas.height = this.vegMask.image.height;
    ctx.drawImage(this.vegMask.image, 0, 0);

    this.maskData = new Uint8Array(canvas.width * canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 0; i < imageData.length; i += 4) {
      const pixelIndex = i / 4;
      this.maskData[pixelIndex] = imageData[i];
    }
  }

  _sampleVegetationMask(x, z) {
    if (this.maskData === null) this._precomputeVegetationMask();
    if (!this.maskData) {
      console.warn("Vegetation mask not loaded!");
      return 1; // Default to allowing vegetation if no mask is loaded
    }

    let u = (x - this.minX) / (this.maxX - this.minX);
    let v = (z - this.minZ) / (this.maxZ - this.minZ);

    u = Math.min(Math.max(u, 0), 1); // Clamp to [0,1]
    v = Math.min(Math.max(v, 0), 1); // Clamp to [0,1]

    const pixelX = Math.floor(u * this.vegMask.image.width);
    const pixelY = Math.floor(v * this.vegMask.image.height);
    const pixelIndex = pixelY * this.vegMask.image.width + pixelX;

    return this.maskData[pixelIndex] / 255; // Normalize to [0, 1]
  }
  async setVegetationAreas() {
    return new Promise((res, rej) => {
      this.vegMask = new THREE.TextureLoader().load(
        "./map/vegetation_map.jpeg",
        (texture) => {
          console.log("Vegetation mask loaded successfully!");
          this.vegMask = texture;
          this.vegMask.wrapS = this.vegMask.wrapT = THREE.ClampToEdgeWrapping;
          this.vegMask.minFilter = THREE.LinearFilter;
          this.vegMask.magFilter = THREE.LinearFilter;
          res(this.vegMask);
        },
        undefined,
        (error) => {
          console.error("Failed to load vegetation mask:", error);
        }
      );
    });
  }
}
