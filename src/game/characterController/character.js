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
  const halfHeight = 4; // Half of the capsule height
  const radius = 4;

  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
  const rigidBody = worldPhysics.createRigidBody(rigidBodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius);
  colliderDesc.setRestitution(0.1);
  colliderDesc.setMass(500);
  worldPhysics.createCollider(colliderDesc, rigidBody);
  // .setFriction(1000);

  const characterController = worldPhysics.createCharacterController(0.01);
  const character = { rigidBody, controller: characterController };
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
