import * as THREE from "three";
import RAPIER, { Quaternion } from "@dimforge/rapier3d";
import { ChickController } from "./chickAI";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const getTerrainMesh = (terrain) => {
  if (!terrain) throw new Error("No mesh found");
  const terrainMesh = terrain.getObjectByName("Plane");
  if (!terrainMesh) throw new Error("❌ Terrain 'Plane' not found!");

  let meshes = [];
  if (terrainMesh.type === "Mesh") {
    meshes.push(terrainMesh);
  } else {
    meshes = terrainMesh.children.filter((child) => child.isMesh);
  }
  if (meshes.length === 0)
    throw new Error("❌ No meshes found inside 'Plane'!");

  const geometries = meshes.map((mesh) => {
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geo.scale(2, 2, 2);
    return geo;
  });

  const mergedGeometry = mergeGeometries(geometries, false);
  if (!mergedGeometry) throw new Error("❌ Terrain mesh not found!");
  const newMesh = new THREE.Mesh(
    mergedGeometry,
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
  );
  return newMesh;
};

export const loadChickModel = (
  scene,
  LoadingManager,
  loader,
  worldPhysics,
  initChickPosition,
  maxChickOffset,
  terrain,
  size,
  wareFrameEnabled,
  actionDisplay,
  isFoggy,
  mainCharStatus,
  mainCharPosition
) => {
  const params = {
    scene,
    chickenSize: size,
  };

  const chickPhysics = createChicksPhysics(
    worldPhysics,
    scene,
    initChickPosition,
    wareFrameEnabled
  );
  const controls = new ChickController(
    params,
    LoadingManager,
    loader,
    chickPhysics,
    terrain,
    initChickPosition,
    maxChickOffset,
    actionDisplay,
    isFoggy,
    mainCharStatus,
    mainCharPosition
  );
  return { controls, chickPhysics };
};

export const displayLimitArea = (scene, initChickPosition, maxChickOffset) => {
  const { x: chickX, y: chickY = 0, z: chickZ } = initChickPosition;
  const { minX, maxX, minZ, maxZ } = maxChickOffset;

  const absMinX = chickX - Math.abs(minX);
  const absMaxX = chickX + Math.abs(maxX);
  const absMinZ = chickZ - Math.abs(minZ);
  const absMaxZ = chickZ + Math.abs(maxZ);

  const width = absMaxX - absMinX;
  const depth = absMaxZ - absMinZ;
  const height = 30;

  if (width <= 0 || depth <= 0) {
    console.warn("Invalid area dimensions");
    return null;
  }

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });

  const box = new THREE.Mesh(geometry, material);

  box.position.set(absMinX + width / 2, chickY - 15, absMinZ + depth / 2);

  const wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x00ff00 })
  );
  wireframe.position.copy(box.position);
  scene.add(box);
  scene.add(wireframe);

  return { box, wireframe };
};

export const loadChickModels = (
  scene,
  LoadingManager,
  loader,
  worldPhysics,
  terrain,
  initChickPosition,
  size,
  instances,
  wareFrameEnabled,
  actionDisplay,
  isFoggy,
  maxChickOffset,
  isLimitAreaDisplayed,
  mainCharStatus,
  mainCharPosition
) => {
  if (isLimitAreaDisplayed)
    displayLimitArea(scene, initChickPosition, maxChickOffset);

  const chicks = [];
  
  const terrainMeshes = getTerrainMesh(terrain);
  for (let i = 0; i < instances; i++) {
    const chickenSize = Math.max(
      0.1,
      size - 2 + Math.floor(Math.random() * 3)
    );
    chicks.push(
      loadChickModel(
        scene,
        LoadingManager,
        loader,
        worldPhysics,
        initChickPosition,
        maxChickOffset,
        terrainMeshes,
        chickenSize,
        wareFrameEnabled,
        actionDisplay,
        isFoggy,
        mainCharStatus,
        mainCharPosition
      )
    );
  }
  return chicks;
};

export const createChicksPhysics = (
  worldPhysics,
  scene,
  position,
  wareFrameEnabled = true
) => {
  const radius = 2;
  const rotationY = Math.random() * 2 * Math.PI;

const quat = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0), // Y-axis
  rotationY
);
  const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(position.x, position.y, position.z)
    .setRotation(quat.x, quat.y, quat.z, quat.w); 

  const rigidBody = worldPhysics.createRigidBody(rigidBodyDesc);
  const character = { rigidBody };

  // 🔴 Visual representation
  const geometry = new THREE.SphereGeometry(radius);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    wireframe: wareFrameEnabled,
  });

  const mesh = new THREE.Mesh(geometry, material);
  if (wareFrameEnabled) scene.add(mesh);

  character.mesh = mesh;
  return character;
};
