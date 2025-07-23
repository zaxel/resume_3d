import * as THREE from "three";
import { loadShader } from "./utils/loadShaders.js";
import { InitializeGrass } from "./terrain/initializeGrass.js";
import RAPIER from "@dimforge/rapier3d";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DirectionalLight } from "./light/directionalLight.js";
import { CreateWater } from "./water/WaterCreator.js";
import { Fog } from "./fog/Fog.js";
import { Vegetation } from "./vegetation/Vegetation.js";
import { Stat } from "../stat/Stat.js";
import { Colliders } from "./engine/colliders/Colliders.js";
import { colliders } from "../const/manualColliders.js";
import { ModalMarker } from "./interactions/ModalMarker.js";
import { DistanceHandler } from "./interactions/DistanceHandler.js";
import { ModalChapter } from "./interactions/ModalChapter.js";
import { ChapterViewer } from "./interactions/ChapterViewer.js";
import { Audio } from "./audio/Audio.js";
import { audioFiles } from "../const/audio.js";
import { RiverCurve } from "./water/RiverCurve.js";
import { SkyBox } from "./skybox/SkyBox.js";
import { LoadManager } from "../init/LoadManager.js";
import { HelpMenu } from "./helpMenu/HelpMenu.js";
import { PlayAreaLimiter } from "./limiter/PlayAreaLimiter.js";
import { ColliderDebug } from "./engine/debugger/ColliderDebug.js";
import { degToRad } from "three/src/math/MathUtils.js";
import {
  charMovementLimits,
  gravity,
  initCharPosition,
  initChickPosition,
  mapScaleFactor,
  maxChickOffset
} from "../const/game.js";
import {
  loadCompressedModel,
  loadTerrainMesh,
} from "./engine/loaders/loaders.js";
import { setupTerrainPhysic } from "./engine/mesh/mesh.js";
import {
  createCharacterPhysics,
  initFreeCamera,
  loadAnimatedModel,
} from "./characterController/character.js";
import { objectsShadersFogReady } from "./fog/objectsShadersFogReady.js";
import { WindMill } from "./windMill/WindMill.js";
import { SimpleWater } from "./water/SimpleWater.js";
import { createChicksPhysics, loadChickModels } from "./fauna/chicks/chick.js";

export class InitApp {
  constructor(initSettings) {
    this.initSettings = initSettings;
    this.shaders = [];
    if (this.initSettings.stats) this.stats = new Stat();

    this.helpMenu = this.initHelpMenu();

    this.LoadingManager = new LoadManager(this.helpMenu).getManager();

    this.GLTFLoader = new GLTFLoader(this.LoadingManager);

    this.terrain = null;
    //animation
    this.cameraState = {
      thirdPersonCameraEnabled: false,
      freeCameraInstance: null,
      thirdPersonCameraInstance: null,
    };
    this._previousFrame = null;
    this.grassField = null;

    //physics
    this.RAPIER = RAPIER;
    this._eventQueue = new this.RAPIER.EventQueue(true);
    this.movement = new this.RAPIER.Vector3(0, 0, 0);

    this.worldPhysics = new this.RAPIER.World(gravity);
    this.simpleObjects = [];

    this.keys = {};
    this.markersDistanceHandler = null;

    this._init();
  }
  async _init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(-30, 50, 70);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    new SkyBox(this.initSettings.fog, this.scene).addSkyBox();

    this.initLighting();
    initFreeCamera(this.cameraState, this.camera, this.renderer);

    this.riverCurveMesh = this.createRiverCurveMesh();

    this.groundMeshToScene = true;
    this.terrain = await loadTerrainMesh(
      this.GLTFLoader,
      this.scene,
      this.groundMeshToScene
    );
    await this._loadStructures();
    if (this.initSettings.blades) this._windMillBlades();
    //must be loaded after all objects where fog expected
    this.shaders = objectsShadersFogReady(this.scene);

    setupTerrainPhysic(this.worldPhysics, this.terrain);
    
    if (this.initSettings.grass) this._addGrass(this.terrain);
    
    if (this.initSettings.fog) this.addExpImprovedFog(0xdfe9f3, 0.0006);
    
    
    
    this.character = createCharacterPhysics(
      this.worldPhysics,
      this.scene,
      initCharPosition,
      false
    ); //last parameter - helper grid

    this._loadAnimatedModel();

    this.loadPlayerAreaLimiter();

    if(this.initSettings.chicks)
      this._loadAnimatedChicks();

    this.audio = this._initAudio();

    this.setInteractions();

    this.setVegetation();

    this.initSettings.water ? this._addWater() : this._addSimpleWater();

    this.setCollidersManually(colliders);
    // new ColliderDebug(this.worldPhysics, this.scene).visualizeColliders(3000);

    this.animate();
  }

   _loadAnimatedChicks(){
    const chickSize = 4;
    const chicksAmount = 5;
    const showLimitArea = false;
    const mainCharStatus = this.controls._input._keys;
    const mainCharPosition = this.character.mesh.position;
    const chickPhysicFrameEnabled = false;
    const chickActionToolTip = false;

    const chicks = loadChickModels(
      this.scene, this.LoadingManager, GLTFLoader, 
      this.worldPhysics, this.terrain, initChickPosition, 
      chickSize, chicksAmount, chickPhysicFrameEnabled, chickActionToolTip, this.initSettings.fog,
      maxChickOffset, showLimitArea, mainCharStatus, mainCharPosition
    ); 
    this.chicks = chicks;
  }

  _windMillBlades() {
    this.windMill = new WindMill(this.scene);
  }

  loadPlayerAreaLimiter() {
    this.playerAreaLimiter = new PlayAreaLimiter(
      charMovementLimits,
      this.character
    );
  }
  _loadAnimatedModel() {
    const { controls, keys } = loadAnimatedModel(
      this.camera,
      this.scene,
      this.cameraState,
      this.LoadingManager,
      this.GLTFLoader,
      this.character,
      this.renderer
    );
    this.controls = controls;
    this.keys = keys;
  }
 
  initHelpMenu() {
    const helpMenu = new HelpMenu(
      this.initSettings.sounds,
      this.initSettings.music
    );
    return helpMenu;
  }

  _initAudio() {
    const audio = new Audio(
      this.initSettings,
      this.riverCurveMesh,
      this.camera,
      this.keys,
      this.controls._stateMachine,
      audioFiles,
      this.scene,
      this.initSettings.music,
      this.initSettings.sounds,
      this.helpMenu,
      this.chicks
    );
    return audio;
  }

  setInteractions() {
    this.markersDistanceHandler = new DistanceHandler(this.character);
    this.chapterViewer = new ChapterViewer(
      this.markersDistanceHandler,
      this.audio,
      this.LoadingManager
    );
    this.modalMarkers = new ModalMarker(this.markersDistanceHandler);
    this.modalChapter = new ModalChapter(
      this.markersDistanceHandler,
      this.chapterViewer,
      this.audio
    );
  }

  setCollidersManually(colliders) {
    new Colliders(this.worldPhysics).createColliders(colliders);
  }

  initLighting() {
    const amLight = new THREE.AmbientLight(0xffffff, 0.25);

    this.dirLight = new DirectionalLight();

    const dirLightHelper = new THREE.DirectionalLightHelper(
      this.dirLight.dirLight,
      5
    );
    dirLightHelper.visible = false;
    this.scene.add(dirLightHelper);

    this.scene.add(amLight);
    this.scene.add(this.dirLight.dirLight);
    this.scene.add(this.dirLight.dirLight.target);
  }

  setVegetation() {
    if (!this.vegetation)
      this.vegetation = new Vegetation(
        this.scene,
        this.renderer,
        this.LoadingManager,
        this.terrain,
        this.worldPhysics,
        this.shaders
      );
    this.vegetation.preloadModels(() => {
      this.vegetation.setVegetation();
    });
  }

  addExpImprovedFog(color, density) {
    this._fogController = new Fog(this.terrain, this.shaders);
    this._fogController.fogHuck();
    this.scene.fog = new THREE.FogExp2(color, density);
  }

  createRiverCurveMesh() {
    const riverCurve = new RiverCurve(this.scene);
    return riverCurve;
  }

  _addWater() {
    const water = new CreateWater(this.scene, this.initSettings.fog);
  }

  _addSimpleWater() {
    const simpleWaterBuilder = new SimpleWater(this.initSettings.fog);
    this.scene.add(simpleWaterBuilder.simpleWater);
  }

  _addGrass = async (terrain) => {
    await loadShader();
    this.grassField = new InitializeGrass(terrain);
    this.grassField.createParticles();
    this.scene.add(this.grassField);
  };

  async _loadStructures() {
    await loadCompressedModel(
      this.LoadingManager,
      this.renderer,
      this.groundMeshToScene,
      "./map/bridges_c.glb",
      this.scene
    );
    await loadCompressedModel(
      this.LoadingManager,
      this.renderer,
      this.groundMeshToScene,
      "./map/signs_c.glb",
      this.scene
    );
    await loadCompressedModel(
      this.LoadingManager,
      this.renderer,
      this.groundMeshToScene,
      "./map/structures_no_wind_blade_c.glb",
      this.scene
    );
    await loadCompressedModel(
      this.LoadingManager,
      this.renderer,
      this.groundMeshToScene,
      "./map/wind_mill_blade_c.glb",
      this.scene,
      { x: -147.7, y: 77.4, z: 398 },
      { x: 8, y: 8, z: 8 },
      { x: degToRad(90), y: 0, z: degToRad(215) },
      (name = "blade")
    );
  }

  _createPlaneGround(x = 100, y = 0.1, z = 100) {
    console.log("Ground Created");

    const groundRigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    const groundRigidBody =
      this.worldPhysics.createRigidBody(groundRigidBodyDesc);

    const groundColliderDesc = this.RAPIER.ColliderDesc.cuboid(x, y, z);
    this.worldPhysics.createCollider(groundColliderDesc, groundRigidBody);
  }

  _physicsFrameSkip = 2;
  _frameCount = 0;
  _previousFrame = null;
  _fixedTimeStep = 1 / 60; // 60 FPS physics

  _updateCharacterMovement(deltaTime) {
    if (!this.character) return;

    const baseSpeed = this.keys.shift ? 36 : 18;
    const frameRateFactor = 60;
    const maxAllowedDepthPos = -100;
    const speed = baseSpeed * deltaTime * frameRateFactor;

    this._acceleration = new THREE.Vector3(0.25, 0.5, 0.25);
    this._deceleration = new THREE.Vector3(-0.5, -0.0001, -0.5);
    this._rotationSpeed = 4.0 * Math.PI * deltaTime * this._acceleration.y;
    this._rotationAxis = new THREE.Vector3(0, 1, 0);
    this.rotation = new THREE.Quaternion();

    const decelerationFactor = Math.exp(
      this._deceleration.x * deltaTime * frameRateFactor
    );

    if (!this.keys.forward && !this.keys.backward) {
      this.movement.x *= decelerationFactor;
      this.movement.z *= decelerationFactor;
    }

    if (
      (this.keys.left && this.keys.actionsAllowed) ||
      (this.keys.right && this.keys.actionsAllowed)
    ) {
      this.rotation.setFromAxisAngle(
        this._rotationAxis,
        this.keys.left ? this._rotationSpeed : -this._rotationSpeed
      );
      this.character.mesh.quaternion.multiply(this.rotation);
    }

    let direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.character.mesh.quaternion);
    direction.normalize();

    if (this.keys.backward && this.keys.actionsAllowed) {
      this.movement.x +=
        (-direction.x * speed - this.movement.x) * this._acceleration.x;
      this.movement.z +=
        (-direction.z * speed - this.movement.z) * this._acceleration.z;
    }
    if (this.keys.forward && this.keys.actionsAllowed) {
      this.movement.x +=
        (direction.x * speed - this.movement.x) * this._acceleration.x;
      this.movement.z +=
        (direction.z * speed - this.movement.z) * this._acceleration.z;
    }

    let velocity = this.character.rigidBody.linvel();
    velocity.y += gravity.y * deltaTime;

    this.character.rigidBody.setLinvel(
      new this.RAPIER.Vector3(this.movement.x, velocity.y, this.movement.z),
      true
    );

    let position = this.character.rigidBody.translation();

    //reset y position
    if (position.y < maxAllowedDepthPos) {
      this.character.rigidBody.setTranslation(
        new this.RAPIER.Vector3(
          initCharPosition.x,
          initCharPosition.y,
          initCharPosition.z
        ),
        true
      );
      this.character.rigidBody.setLinvel(
        new this.RAPIER.Vector3(0, 0, 0),
        true
      ); // Reset velocity to prevent falling again
    }
    //helper position
    this.character.mesh.position.set(position.x, position.y, position.z);

    const updatedRotation = this.character.mesh.quaternion;
    this.character.rigidBody.setRotation(
      new this.RAPIER.Quaternion(
        updatedRotation.x,
        updatedRotation.y,
        updatedRotation.z,
        updatedRotation.w
      ),
      true
    );
  }

  _updateCharacterMesh() {
    if (!this.character) return;
    const position = this.character.rigidBody.translation();
    this.character.mesh.position.set(position.x, position.y, position.z);
  }

  _updateLimitedAreaMovement(deltaTime) {
    const turnTowardsCenter = () => {
      const character = this.character.mesh;

      const characterPos = new THREE.Vector3();
      character.getWorldPosition(characterPos);

      const targetPos = new THREE.Vector3(0, characterPos.y, 0);
      const directionToCenter = new THREE.Vector3()
        .subVectors(targetPos, characterPos)
        .normalize();

      const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        directionToCenter
      );

      character.quaternion.slerp(targetQuaternion, this._rotationSpeed);

      this.character.rigidBody.setRotation(
        new this.RAPIER.Quaternion(
          character.quaternion.x,
          character.quaternion.y,
          character.quaternion.z,
          character.quaternion.w
        ),
        true
      );

      const angleDiff = character.quaternion.angleTo(targetQuaternion);
      if (angleDiff < 0.01) {
        this.keys.limitAreaTurn = false;
      }
    };
    const stepBack = () => {
      const baseSpeed = 20;
      const frameRateFactor = 60;
      const speed = baseSpeed * deltaTime * frameRateFactor;
      const stepBackDistance = 30;

      let direction = new THREE.Vector3(0, 0, 1);
      direction.applyQuaternion(this.character.mesh.quaternion);
      direction.normalize();

      this.movement.x +=
        (direction.x * speed - this.movement.x) * this._acceleration.x;
      this.movement.z +=
        (direction.z * speed - this.movement.z) * this._acceleration.z;

      let velocity = this.character.rigidBody.linvel();
      velocity.y += gravity.y * deltaTime;

      this.character.rigidBody.setLinvel(
        new this.RAPIER.Vector3(this.movement.x, velocity.y, this.movement.z),
        true
      );

      let position = this.character.rigidBody.translation();
      this.character.mesh.position.set(position.x, position.y, position.z);

      const updatedRotation = this.character.mesh.quaternion;
      this.character.rigidBody.setRotation(
        new this.RAPIER.Quaternion(
          updatedRotation.x,
          updatedRotation.y,
          updatedRotation.z,
          updatedRotation.w
        ),
        true
      );

      if (
        Math.abs(position.x) < charMovementLimits.maxX - stepBackDistance &&
        Math.abs(position.z) < charMovementLimits.maxZ - stepBackDistance
      ) {
        this.keys.limitAreaWalk = false;
        this.keys.limitAreaReachedAct = false;
        this.keys.actionsAllowed = true;
      }
    };

    if (this.keys.limitAreaTurn) {
      turnTowardsCenter();
      // return;
    }
    stepBack();
  }

  animate(t = 0) {
    requestAnimationFrame(this.animate.bind(this));
    if (this.stats) this.stats.stats.begin();
    if (this._previousFrame === null) this._previousFrame = t;

    const deltaTime = (t - this._previousFrame) * 0.001; // Convert to seconds
    this._previousFrame = t;

    //update fog movement
    if (this._fogController) this._fogController.fogStep(t);

    // Update animations, rendering, and movement
    if (this.grassField) this.grassField.update(t);
    this.renderer.render(this.scene, this.camera);
    this.step(deltaTime);

    // **Only update physics every `_physicsFrameSkip` frames**
    if (this._frameCount % this._physicsFrameSkip === 0) {
      if (this.keys.limitAreaWalk || this.keys.limitAreaTurn) {
        this._updateLimitedAreaMovement(deltaTime);
      } else {
        this._updateCharacterMovement(deltaTime);
      }
      // update windmill blades
      if (this.windMill) this.windMill.updateBlades(deltaTime);

      // this._updateCharacterMesh();
      if(this.playerAreaLimiter)
        this.playerAreaLimiter.update();

      //update markers
      if (this.markersDistanceHandler) {
        this.markersDistanceHandler.updateCharPositionDistance();
        this.modalMarkers.updateMarkerModalStatus();
      }
      //update directional light
      if (this.controls && this.dirLight) {
        this.dirLight.updateDirLightPosition(this.controls.position);
      }
      // Use fixed timestep for physics to ensure consistent behavior
      this.worldPhysics.step(this._eventQueue, this._fixedTimeStep);

      //update sounds data
      if (this.audio) this.audio.updateSoundsState();

      // Sync simpleObjects with physics
      this.simpleObjects.forEach((obj) => {
        const position = obj.rigidBody.translation();
        obj.mesh.position.set(position.x, position.y, position.z);
      });
    }

    this._frameCount++;
    if (this.stats) this.stats.stats.end();
  }

  step(deltaTime) {
    if (this.controls) this.controls.updateController(deltaTime);
      if (this.chicks && this.chicks.length){
        for(let i=0; i<this.chicks.length; i++){
          this.chicks[i].controls.updateChickController(deltaTime);
        }
      }
    if (this.cameraState.thirdPersonCameraEnabled) {
      this.cameraState.thirdPersonCameraInstance._update(deltaTime);
    }
  }
}
