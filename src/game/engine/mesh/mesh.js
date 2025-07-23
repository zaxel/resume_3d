import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";
import { mapScaleFactor } from "../../../const/game";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const setMeshTerrainCollider = (terrainMesh, worldPhysics) => {
    const vertices = terrainMesh.geometry.attributes.position.array;
    const indices = terrainMesh.geometry.index.array;

    const mapColliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
      .setRestitution(0.1)
      .setFriction(0.8)
      .setCollisionGroups(0x00010001);

    worldPhysics.createCollider(mapColliderDesc);

    console.log("✅ Physics Collider Set for Terrain");
  }

const getTerrainMesh = (terrain) => {
    if (!terrain) throw new Error("No mesh found");
    const terrainMesh = terrain.getObjectByName("Plane");

    if (!terrainMesh) return new Error("Terrain 'Plane' not found!");
    let meshes = [];
    if (terrainMesh.type === "Mesh") {
      meshes.push(terrainMesh);
    } else {
      meshes = terrainMesh.children.filter((child) => child.isMesh);
    }
    if (meshes.length === 0) return new Error("No meshes found inside 'Plane'!");

    const geometries = meshes.map((mesh) => {
      const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geo.scale(mapScaleFactor.x, mapScaleFactor.y, mapScaleFactor.z);
      return geo;
    });
    const mergedGeometry = mergeGeometries(geometries, false);
    const mergedMesh = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial({ color: 0x00ff00 }));

    if (mergedMesh) return mergedMesh;
    else return new Error("Terrain mesh not found");
  }
  export const setupTerrainPhysic = (worldPhysics, terrain) => {
    try {
      const terrainMesh = getTerrainMesh(terrain);
      console.log("✅ Terrain Mesh Loaded.");
      setMeshTerrainCollider(terrainMesh, worldPhysics);
    } catch (error) {
      console.error(error);
    }
  }