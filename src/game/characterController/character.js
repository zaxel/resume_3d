import * as THREE from "three";
import RAPIER, { Quaternion } from "@dimforge/rapier3d";
import { FreeCamera } from "../camera/freeCamera";
import { ThirdPersonViewCamera } from "../camera/thirdPersonCamera";
import { CharacterController } from "./controller";

export const initFreeCamera = (cameraState, camera, renderer) => {
  cameraState.freeCameraInstance = new FreeCamera(camera, renderer.domElement);
};

const disableThirdCameraView = (cameraState, camera, renderer) => {
  initFreeCamera(cameraState, camera, renderer);
  cameraState.thirdPersonCameraEnabled = false;
};
const enableThirdCameraView = (cameraState) => {
  cameraState.freeCameraInstance._freeCamera.dispose();
  cameraState.thirdPersonCameraEnabled = true;
};

export const loadAnimatedModel = (freeCamera, scene, cameraState, LoadingManager, loader, character, renderer) => {
  const params = {
    camera: freeCamera,
    scene,
    cameraState,
    disableThirdCameraView: () => disableThirdCameraView(cameraState, freeCamera, renderer),
    enableThirdCameraView: () => enableThirdCameraView(cameraState),
    characterRigidBody: character.rigidBody,
  };
  const controls = new CharacterController(params, LoadingManager, loader);
  cameraState.thirdPersonCameraInstance = new ThirdPersonViewCamera({
    camera: freeCamera,
    target: controls,
  });
  const keys = controls._input.keys;
  character.basicController = controls;
  return { controls, keys };
};


export const createCharacterPhysics = (worldPhysics, scene, position, wareFrameEnabled = true) => {
  const halfHeight = 4;
  const radius = 4;

  // REDUCE DAMPING SIGNIFICANTLY
  const rigidBodyDesc = RAPIER.RigidBodyDesc
    .dynamic()
    .setTranslation(position.x, position.y, position.z)
    .lockRotations()
    // .setLinearDamping(0.15)     
    // .setAngularDamping(0.15);   

  const rigidBody = worldPhysics.createRigidBody(rigidBodyDesc);
  
  // INCREASE DENSITY for proper falling
  const colliderDesc = RAPIER.ColliderDesc
    .capsule(halfHeight, radius)
    .setRestitution(0.0)

  worldPhysics.createCollider(colliderDesc, rigidBody);
  
  // Log the actual mass
  // console.log(`Character mass: ${rigidBody.mass().toFixed(1)}kg`);
  
  const character = { rigidBody };
  const geometry = new THREE.CapsuleGeometry(radius, halfHeight * 2, 8, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  if (wareFrameEnabled) scene.add(mesh);
  character.mesh = mesh;
  
  return character;
};
