import * as THREE from "three";
import { GrassShaderMaterials } from "./grassShaderMaterials";
import { shadersMap } from "../utils/loadShaders";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export class InitializeGrass extends THREE.Group {
  constructor(terrain, dirLight) {
    super();
    this.minX = 0;
    this.maxX = 0;
    this.minZ = 0;
    this.maxZ = 0;

    this.instances = 200000;
    this.w = 1315;
    this.d = 1300;
    this.h = 0;

    this.terrain = terrain;
    this.mapScaleFactor = { x: 1, y: 1, z: 1 };
    this.terrainHeightScale = 1;
    this.bladeHeight = 0.9;
    this.bladeWidth = 0.4;

    this.terrainPositions = [];
    this.positions = [];
    this.indices = [];
    this.uvs = [];
    this.angles = [];
    this.bladeHeights = [];

    this.grassMask = null;
    this.fog = terrain?.parent?.fog;

    this.geo;
    this.particles;

    this.dirLight = dirLight;
  }

  createParticles() {
    this.positions.push(4, -4, 0);
    this.positions.push(-4, -4, 0);
    this.positions.push(-4, 4, 0);
    this.positions.push(4, 4, 0);

    this.indices.push(0, 1, 2, 2, 3, 0);
    this.uvs.push(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0);
    for (let i = 0; i < this.instances; i++) {
      let posX = Math.random() * this.w - this.w / 2;
      let posY = this.h;
      let posZ = Math.random() * this.d - this.d / 2;
      let angle = Math.random() * 360;

      let bladeHeight = THREE.MathUtils.randFloat(0.7, 1.3);

      this.terrainPositions.push(posX, posY, posZ);
      this.angles.push(angle);
      this.bladeHeights.push(bladeHeight);
    }

    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.instanceCount = this.instances;

    this.geo.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    this.geo.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    this.geo.setIndex(new THREE.BufferAttribute(new Uint16Array(this.indices), 1));
    this.geo.setAttribute("terPos", new THREE.InstancedBufferAttribute(new Float32Array(this.terrainPositions), 3));
    this.geo.setAttribute("angle", new THREE.InstancedBufferAttribute(new Float32Array(this.angles), 1));
    this.geo.setAttribute("bladeHeight", new THREE.InstancedBufferAttribute(new Float32Array(this.bladeHeights), 1));
    this.geo.setAttribute("worldPos", new THREE.InstancedBufferAttribute(new Float32Array(this.terrainPositions), 3));

    const grassMaterialInstance = new GrassShaderMaterials(this.dirLight);
    const grassMaterial = grassMaterialInstance.shaderMaterial(shadersMap);

    this._setVegetationAreas(grassMaterial);
    this.heightsFromTerrain(grassMaterial);

    this.grassParticles = new THREE.Mesh(this.geo, grassMaterial);
    this.grassParticles.castShadow = true; 
    this.grassParticles.receiveShadow = true; 
    this.grassParticles.frustumCulled = false;

    this.add(this.grassParticles);
  }
 
  async heightsFromTerrain(grassMaterial) {
    const heightTexture = await this._createHeightTexture();

    if (!heightTexture) {
      console.error("❌ Failed to generate height texture from terrain.");
      grassMaterial.uniforms.useHeightMap.value = false;
      return;
    }

    heightTexture.minFilter = THREE.LinearFilter;
    heightTexture.magFilter = THREE.LinearFilter;
    heightTexture.wrapS = THREE.ClampToEdgeWrapping;
    heightTexture.wrapT = THREE.ClampToEdgeWrapping;
    heightTexture.needsUpdate = true;

    grassMaterial.uniforms.heightMap.value = heightTexture;
    grassMaterial.uniforms.terrainHeightScale.value = this.terrainHeightScale;
    grassMaterial.uniforms.terrainSize.value = new THREE.Vector2(this.w, this.d);
    grassMaterial.uniforms.useHeightMap.value = true;
    grassMaterial.uniforms.minX = { value: this.minX };
    grassMaterial.uniforms.minZ = { value: this.minZ };
    grassMaterial.uniforms.bladeHeightUniform = { value: this.bladeHeight };
    grassMaterial.uniforms.bladeWidthUniform = { value: this.bladeWidth };
    if (this.fog) {
      grassMaterial.uniforms.fogColor = { value: this.fog.color };
      grassMaterial.uniforms.fogDensity = { value: this.fog.density };
    }
  }

  _setVegetationAreas(grassMaterial) {
    const k = 1;
    this.grassMask = new THREE.TextureLoader().load("./map/vegetation_map.jpeg");
    this.grassMask.wrapS = this.grassMask.wrapT = THREE.ClampToEdgeWrapping;
    this.grassMask.minFilter = THREE.LinearFilter;
    this.grassMask.magFilter = THREE.LinearFilter;

    grassMaterial.uniforms.vegetationMaskTexture.value = this.grassMask;
    grassMaterial.uniforms.vegetationMaskSize.value = new THREE.Vector2(this.w * k, this.d * k);
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
    const heightScale = 1;
    const higherOn = 4;
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

    // Set a reasonable grid resolution
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
      const y = positions[i + 1] / heightScale + higherOn;

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
    return { heightData, sizeX, sizeZ, minX, minZ };
  }

  async _createHeightTexture() {
    const data = await this._extractHeightData();
    if (!data) {
      console.error("Failed to extract height data!");
      return null;
    }

    const { heightData, sizeX, sizeZ, minX, minZ } = data;
    this.minX = minX;
    this.minZ = minZ;

    const texture = new THREE.DataTexture(heightData, sizeX, sizeZ, THREE.RedFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
  }

  update(t) {
    this.grassParticles.material.uniforms.time.value = t;
  }
}
