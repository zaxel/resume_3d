import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { chicksActions } from "../../../const/chickActions";
import { ChickFSM } from "./chickActionState";
import { chickMovementLimits } from "../../../const/game";

class ChickControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }
  get animations() {
    return this._animations;
  }
}

class AIController {
  constructor() {
    this._init();
  }

  _init() {
    this._actions = {};
    chicksActions.forEach(({ action }) => (this._actions[action] = false));
    this._actions["Swim"] = false;
  }
  get actions() {
    return this._actions;
  }
}

export class ChickController {
  constructor(
    params,
    loadingManager,
    loader,
    chickPhysics,
    terrainMeshes,
    chickInitPosition,
    maxChickOffset,
    actionDisplay,
    isFoggy,
    mainCharStatus,
    mainCharPosition
  ) {
    this._loadingManager = loadingManager;
    this.terrainMeshes = terrainMeshes;
    this.loader = loader;
    this.actionDisplay = actionDisplay;
    this.maxChickOffset = maxChickOffset;
    this.isFoggy = isFoggy;
    this.mainCharStatus = mainCharStatus;
    this.mainCharPosition = mainCharPosition;
    this.chickPhysics = chickPhysics;
    this.actionDurationBase = 500;
    this.speed = 10;
    this.waterLevel = -8.5;
    this.maxAllowedDepthPos = -50;
    this.safeDistance = {min: 0, max: 30};
    this.maxChickPosition = { minX: 500, maxX: 500, minZ: 500, maxZ: 500 };
    this.chickInitPosition = chickInitPosition;
    this.dummyTimerNumber = 1;
    this.turnToTimer = this.dummyTimerNumber;
    this.chickOutAllowedArea = false;
    this.nextActionNoCharTimer = null;
    this.charBehaviorInitiated = false;
    this.noCharBehaviorInitiated = false;
    this.isCharMoving = false;

    this.chickCharDistance = null;
    this._initChickControl(params);
  }

  _initChickControl(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);
    this._position = new THREE.Vector3();

    this._animations = {};
    this._input = new AIController();
    this._chickStateMachine = new ChickFSM(
      new ChickControllerProxy(this._animations),
      this._input.actions
    );
    this.size = params.chickenSize;
    this._getMaxChickPosition();
    this._loadModels();
  }
  _getMaxChickPosition() {
    this.maxChickPosition.maxX =
      this.chickInitPosition.x + this.maxChickOffset.maxX;
    this.maxChickPosition.minX =
      this.chickInitPosition.x - this.maxChickOffset.minX;
    this.maxChickPosition.maxZ =
      this.chickInitPosition.z + this.maxChickOffset.maxZ;
    this.maxChickPosition.minZ =
      this.chickInitPosition.z - this.maxChickOffset.minZ;
  }
  _createStatusLabel() {
    const canvas = document.createElement("canvas");
    canvas.width = 348;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.font = "100px Arial";
    ctx.fillText("Loading...", 50, 90);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    this.statusLabel = new THREE.Sprite(material);
    this.statusLabel.scale.set(0.5, 0.25, 1);
    this.statusLabel.position.set(0, 1, 0);

    this.model.add(this.statusLabel);
  }
  getRandom(from, to) {
    const rand = Math.floor(Math.random() * (to - from + 1)) + from;
    return rand;
  }
  _resetChickPosition(chick, initPosition) {
    console.log(chick);
    const { x, y, z } = initPosition;
    chick.rigidBody.setTranslation(new RAPIER.Vector3(x, y, z), true);
    chick.rigidBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
  }
  _loadModels() {
    const loader = new GLTFLoader(this._loadingManager);
    loader.load("./models/characters/animals/chick/Chick_LOD0.glb", (gltf) => {
      this.model = gltf.scene;
      // this.model.quaternion.copy(this.chickPhysics.mesh.quaternion);
      // console.log(this.chickPhysics.mesh.quaternion)
      gltf.scene.scale.setScalar(this.size);
      this._params.scene.add(this.model);

      const textureLoader = new THREE.TextureLoader();
      const perlinTexture = textureLoader.load("./noise/perlin_noise.png");
      perlinTexture.wrapS = perlinTexture.wrapT = THREE.RepeatWrapping;

      //this block important for correct fog behavior.
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((mat, idx) => {
            if (mat.isMeshStandardMaterial) {
              const fogMat = mat.clone();
              fogMat.fog = true;

              fogMat.onBeforeCompile = (shader) => {
                shader.uniforms.fogTime = { value: 0.0 };
                shader.uniforms.perlinNoise = { value: perlinTexture }; 

                if (!this.isFoggy) {
                  shader.vertexShader = `#define USE_FOG
                  varying vec3 vWorldPosition;
                  ${shader.vertexShader}`;
                }

                shader.vertexShader = shader.vertexShader.replace(
                  "#include <project_vertex>",
                  `#include <project_vertex>
                    #ifndef CUSTOM_FOG_POSITION
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    #endif`
                );
              };

              if (Array.isArray(child.material)) {
                child.material[idx] = fogMat;
              } else {
                child.material = fogMat;
              }
              fogMat.needsUpdate = true;
            }
          });
        }
      });
      //this block important for correct fog behavior.

      this.mixer = new THREE.AnimationMixer(this.model);
      const originalOnLoad = this._loadingManager.onLoad;

      if (this.actionDisplay) {
        this._createStatusLabel();
        this.showStatus();
      }

      this._loadingManager.onLoad = () => {
        if (originalOnLoad) originalOnLoad();
        if (this._chickStateMachine) {
          this._chickStateMachine.setState("Idle_A");
          this._input.actions["Idle_A"] = true;
        }
      };

      const _onLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this.mixer.clipAction(clip);

        this._animations[animName] = { clip, action };
      };

      const animationLoader = new GLTFLoader(this._loadingManager);
      animationLoader.setPath("./models/animations/chick/");
      chicksActions.forEach(({ action }) =>
        animationLoader.load("Chick_" + action + ".glb", (anim) => {
          _onLoad(action, anim);
        })
      );
      animationLoader.load("Chick_Swim.glb", (anim) => _onLoad("Swim", anim));
    });
  }
  _chickSpeed(baseSpeed) {
    if (!baseSpeed) return 0;
    const speed = this.getRandom(baseSpeed - 1, baseSpeed + 2);
    return speed <= 0 ? 0.5 : speed;
  }
  _resetActionsStatus() {
    const keys = Object.keys(this._input.actions);
    keys.forEach((key) => {
      this._input.actions[key] = false;
    });
  }
  _chickBehaviorNoCharAround() {
    if (this.nextActionNoCharTimer) {
      clearTimeout(this.nextActionNoCharTimer);
      this.nextActionNoCharTimer = null;
    }
    const getNextAction = (rand) => {
      let filtered = chicksActions
        .map((el, i) => [el, i])
        .filter(([obj, i]) => obj.probFactor >= rand);
      if (filtered.length === 0)
        filtered = chicksActions.map((el, i) => [el, i]);
      const actionWithinFactorIdx = this.getRandom(0, filtered.length - 1);
      const idx = filtered[actionWithinFactorIdx][1];
      return idx;
    };
    const getDuration = (actIdx) => {
      const randTime = this.getRandom(0, 9);
      return (
        randTime * this.actionDurationBase * chicksActions[actIdx].maxDurFactor
      );
    };

    const nextAction = () => {
      const rand = this.getRandom(0, chicksActions.length - 1);
      const idx = getNextAction(rand);
      const duration = getDuration(idx);
      this.speed = this._chickSpeed(chicksActions[idx].speed);
      if (this._chickStateMachine) {
        this._resetActionsStatus();
        this._input.actions[chicksActions[idx].action] = true;
      }
      this.nextActionNoCharTimer = setTimeout(nextAction, duration);
    };
    nextAction();
    setTimeout(() => {
      this.setTurnSpeed();
      this.startTurnTo();
    }, 200);
  }

  _chickBehaviorCharAround(charPosition, chick) {
    const inSafeDistStates = [
      {
        action: "Fly",
        probFactor: 3,
        maxDurFactor: 2,
        speed: 3,
        rotatable: true,
      },
      {
        action: "Jump",
        probFactor: 2,
        maxDurFactor: 1,
        speed: 2,
        rotatable: true,
      },
      {
        action: "Walk",
        probFactor: 2,
        maxDurFactor: 5,
        speed: 2,
        rotatable: true,
      },
      {action: "Eat", probFactor: 8, maxDurFactor: 5, speed: 1, rotatable: true},
    ];
    const outSafeDistStates = [
      {
        action: "Run",
        probFactor: 3,
        maxDurFactor: 4,
        speed: 7,
        rotatable: true,
      },
      {
        action: "Fly",
        probFactor: 3,
        maxDurFactor: 2,
        speed: 8,
        rotatable: true,
      },
      {
        action: "Jump",
        probFactor: 2,
        maxDurFactor: 1,
        speed: 4,
        rotatable: true,
      },
      {
        action: "Roll",
        probFactor: 1,
        maxDurFactor: 3,
        speed: 5,
        rotatable: true,
      },
      {
        action: "Walk",
        probFactor: 9,
        maxDurFactor: 5,
        speed: 4,
        rotatable: true,
      },
    ];
    const getNextAction = (rand, actions) => {
      let filtered = actions
        .map((el, i) => [el, i])
        .filter(([obj, i]) => obj.probFactor >= rand);
      if (filtered.length === 0)
        filtered = filtered.map((el, i) => [el, i]);

      const actionWithinFactorIdx = this.getRandom(
        0,
        filtered.length - 1
      );
      const idx = filtered[actionWithinFactorIdx][1];
      return idx;
    };

    if (this.nextActionNoCharTimer) {
      clearTimeout(this.nextActionNoCharTimer);
      this.nextActionNoCharTimer = null;
    }
    if (this.turnToTimer) {
      clearTimeout(this.turnToTimer);
      this.turnToTimer = null;
    }
    if (this.speed) this.speed = 0;

    const getDuration = (actIdx, actions) => {
      const randTime = this.getRandom(2, 9);
      return (
        randTime * this.actionDurationBase * actions[actIdx].maxDurFactor
      );
    };

    const nextAction = () => {
      let duration = 0;
      if (this.chickCharDistance > this.safeDistance.max || this.chickCharDistance < this.safeDistance.min) {

        const rand = this.getRandom(0, outSafeDistStates.length - 1);
        const idx = getNextAction(rand, outSafeDistStates);
        duration = getDuration(idx, outSafeDistStates);
        this.speed = this._chickSpeed(outSafeDistStates[idx].speed);

      // this.speed = 10;

        if (this._chickStateMachine) {
          this._resetActionsStatus();
          this._input.actions[outSafeDistStates[idx].action] = true;
        }
      }else{
        
        const rand = this.getRandom(0, inSafeDistStates.length - 1);
        const idx = getNextAction(rand, inSafeDistStates);
        duration = getDuration(idx, inSafeDistStates);
        this.speed = this._chickSpeed(inSafeDistStates[idx].speed);

      // this.speed = 10;

        if (this._chickStateMachine) {
          this._resetActionsStatus();
          this._input.actions[inSafeDistStates[idx].action] = true;
        }
      }

      this.nextActionNoCharTimer = setTimeout(nextAction, duration);
    };
    nextAction();
  }

  showStatus() {
    const state = this._chickStateMachine._chickCurState?.Name || "Unknown";

    const canvas = this.statusLabel.material.map.image;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "100px Arial";
    ctx.fillText(state, 50, 90);
    this.statusLabel.material.map.needsUpdate = true;
  }
  setTurnSpeed(from = 0.1, to = 5) {
    this.turnSpeed = this.getRandom(from, to); // radians per second
    setTimeout(() => this.setTurnSpeed(), this.getRandom(100, 5000));
  }

  updateRotation(delta) {
    if (this.targetRotationY === undefined) return;

    const currentY = this.chickPhysics.mesh.rotation.y;
    const diff = this.targetRotationY - currentY;
    const step = Math.sign(diff) * this.turnSpeed * delta;

    if (Math.abs(step) >= Math.abs(diff)) {
      this.chickPhysics.mesh.rotation.y = this.targetRotationY;
      this.targetRotationY = undefined;
    } else {
      this.chickPhysics.mesh.rotation.y += step;
    }

    // Sync rotation to rigid body
    const euler = new THREE.Euler(0, this.chickPhysics.mesh.rotation.y, 0);
    const quat = new THREE.Quaternion().setFromEuler(euler);
    this.chickPhysics.rigidBody.setNextKinematicRotation(
      new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w)
    );

    this.model.quaternion.copy(this.chickPhysics.mesh.quaternion);
  }
  swimHandler(delta, y) {
    if (y <= this.waterLevel && !this._input.actions.Swim) {
      this._resetActionsStatus();
      this._input.actions.Swim = true;
    } else if (y > this.waterLevel && this._input.actions.Swim) {
      this._resetActionsStatus();
      this._input.actions.Walk = true;
    }
  }
  startTurnTo() {
    this.targetRotationY = this.getRandom(-Math.PI / 4, Math.PI / 4);
    this.turnToTimer = setTimeout(
      () => this.startTurnTo(),
      this.getRandom(100, 3000)
    );
  }
  checkBoundaryAndAdjustRotation(position, rotationY) {
    const { maxX, minX, maxZ, minZ } = this.maxChickPosition;
    const BOUNDARY_MARGIN = 2;

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const dx = centerX - position.x;
    const dz = centerZ - position.z;

    const outOfBounds =
      position.x >= maxX - BOUNDARY_MARGIN ||
      position.x <= minX + BOUNDARY_MARGIN ||
      position.z >= maxZ - BOUNDARY_MARGIN ||
      position.z <= minZ + BOUNDARY_MARGIN;

    if (outOfBounds) {
      this.chickOutAllowedArea = true;
      this.targetRotationY = (Math.atan2(dx, dz) + 2 * Math.PI) % (2 * Math.PI);

      if (this.turnToTimer) {
        clearTimeout(this.turnToTimer);
        this.turnToTimer = null;
      }
    } else if (!outOfBounds) {
      this.chickOutAllowedArea = false;
      if (!this.turnToTimer) {
        this.turnToTimer = this.dummyTimerNumber;
        this.startTurnTo();
      }
    }
  }

  charAreaInteractionHandler() {
    const { maxX, minX, maxZ, minZ } = this.maxChickPosition;
    const { x, z } = this.mainCharPosition;
    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      return true;
    }
    return false;
  }
  charMovingChecker() {
    const { action, backward, ctrl, forward, left, right, space } =
      this.mainCharStatus;
    if (action || backward || ctrl || forward || left || right || space) {
      this.isCharMoving = true;
    } else {
      this.isCharMoving = false;
    }
  }
  _charChickDistanceHandler(charPosition, chick) {
    const chickPosition = chick.rigidBody.translation();
    const charD = new THREE.Vector3(
      charPosition.x,
      charPosition.y,
      charPosition.z
    );
    const chickD = new THREE.Vector3(
      chickPosition.x,
      chickPosition.y,
      chickPosition.z
    );

    this.chickCharDistance = charD.distanceTo(chickD);
  }

  _getAndSetAngleToChar(charPosition, chick) {
    const chickPosition = chick.rigidBody.translation();
    const dx = charPosition.x - chickPosition.x;
    const dz = charPosition.z - chickPosition.z;
    if (this.chickCharDistance > this.safeDistance.max) {
      this.targetRotationY = (Math.atan2(dx, dz) + 2 * Math.PI) % (2 * Math.PI);
    } else if(this.chickCharDistance < this.safeDistance.min){
      this.targetRotationY = (Math.atan2(dz, dx) + 2 * Math.PI) % (2 * Math.PI);
    } else {
      this.targetRotationY = this.getRandom(-Math.PI / 4, Math.PI / 4);
    }
  }
  _safeDistancePositionHandler(){
    if(this.isCharMoving){
      this.safeDistance.max = 60;
      this.safeDistance.min = 30;
    }else{
      this.safeDistance.max = 30;
      this.safeDistance.min = 0;
    }
  }

  frameCounter = 0;

  updateChickController(delta) {
    this.frameCounter++;

    if (!this.model) {
      return;
    }
    if (this.actionDisplay) this.showStatus();

    this._chickStateMachine.update(delta, this._input.actions);
    //--------------------------------------------------------
    if (this.chickPhysics.rigidBody && this.model) {
      const speedMultiplier = 2;
      const moveDistance = this.speed * speedMultiplier * delta;

      // Get current position
      const position = this.chickPhysics.rigidBody.translation();
      if (!this.charAreaInteractionHandler()) {
        this.checkBoundaryAndAdjustRotation(
          position,
          this.chickPhysics.mesh.rotation.y
        );

        if (!this.noCharBehaviorInitiated) {
          this.noCharBehaviorInitiated = true;
          this.charBehaviorInitiated = false;
          this._chickBehaviorNoCharAround();
        }
      } else {
        if (!this.charBehaviorInitiated) {
          this.noCharBehaviorInitiated = false;
          this.charBehaviorInitiated = true;

          this._chickBehaviorCharAround(
            this.mainCharPosition,
            this.chickPhysics
          );
        }
      }

      // Get forward direction from model
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.chickPhysics.mesh.rotation.y
      );
      forward.normalize();

      // Predict next XZ position
      const newX = position.x + forward.x * moveDistance;
      const newZ = position.z + forward.z * moveDistance;

      // Raycast down from predicted position to get terrain height
      const downRay = new THREE.Raycaster();
      const origin = new THREE.Vector3(newX, position.y + 10, newZ); // start ray from above
      const direction = new THREE.Vector3(0, -1, 0); // downwards
      downRay.set(origin, direction);

      let newY = position.y;
      const intersects = downRay.intersectObjects([this.terrainMeshes], true);
      if (intersects.length > 0) {
        const terrainY = intersects[0].point.y;
        const offset = 0.1; // prevent clipping
        newY = terrainY + offset;
        newY = Math.max(newY, this.waterLevel - 1);
      }
      if (this.frameCounter % 4 === 0) {
        this.charAreaInteractionHandler();
        this.updateRotation(delta);
        this.swimHandler(delta, newY);

        if (
          position.y < this.maxAllowedDepthPos ||
          position.x < chickMovementLimits.minX ||
          position.x > chickMovementLimits.maxX ||
          position.z < chickMovementLimits.minZ ||
          position.z > chickMovementLimits.maxZ
        ) {
          this._resetChickPosition(this.chickPhysics, this.chickInitPosition);
        }
        this.charMovingChecker();
        if (this.charBehaviorInitiated) {
          this._charChickDistanceHandler(
            this.mainCharPosition,
            this.chickPhysics
          );

          this._getAndSetAngleToChar(this.mainCharPosition, this.chickPhysics);
          this._safeDistancePositionHandler();
        }
      }
      // Set new translation for kinematic rigid body
      this.chickPhysics.rigidBody.setNextKinematicTranslation(
        new RAPIER.Vector3(newX, newY, newZ)
      );

      // Optional: Sync mesh/model
      this.model.position.set(newX, newY, newZ);
      this.chickPhysics.mesh.position.set(newX, newY, newZ);
    }

    //--------------------------------------------------------
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}
