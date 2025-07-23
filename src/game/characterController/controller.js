import * as THREE from 'three';
import { CharacterFSM, JumpState } from './actionStates';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { characterActions, reachMapBoardActions } from '../../const/characterActions';

class CharacterControllerProxy {
	constructor(animations) {
		this._animations = animations;
	}

	get animations() {
		return this._animations;
	}
};

class ButtonPressedController {
	constructor() {
		this._init();
	}

	_init() {
		this._keys = {
			forward: false,
			backward: false,
			left: false,
			right: false,
			space: false,
			shift: false,
			esc: false,
			action: false,
			read: false,

			limitAreaReachedAct: false,
			limitAreaTurn: false,
			limitAreaWalk: false,
			selfieMode: false,
			
			thirdPersonCamera: true,
			freeCamera: false,
			actionsAllowed: true
		};
		document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
		document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
	}

	_onKeyDown(event) {
		switch (event.keyCode) {
			case 87: // w
			case 38: // arrow up
				this._keys.forward = true;
				break;
			case 65: // a
			case 37: // arrow left
				this._keys.left = true;
				break;
			case 83: // s
			case 40: // arrow down
				this._keys.backward = true;
				break;
			case 68: // d
			case 39: // arrow right
				this._keys.right = true;
				break;
			case 32: // SPACE
				this._keys.space = true;
				break;
			case 17: // CTRL
				this._keys.ctrl = true;
				break;
			case 82: // r
				this._keys.read = true;
				break;
			case 16: // SHIFT
				this._keys.shift = true;
				break;
			case 84: // t
				this._keys.thirdPersonCamera = true;
				break;
			case 70: // f
				this._keys.action = true;
				break;
			case 89: // y
				this._keys.freeCamera = true;
				break;
			case 27: // esc
				this._keys.esc = true;
				break;
		}
	}

	_onKeyUp(event) {
		switch (event.keyCode) {
			case 87: // w
			case 38: // arrow up
				this._keys.forward = false;
				break;
			case 65: // a
			case 37: // arrow left
				this._keys.left = false;
				break;
			case 83: // s
			case 40: // arrow down
				this._keys.backward = false;
				break;
			case 68: // d
			case 39: // arrow right
				this._keys.right = false;
				break;
			case 32: // SPACE
				this._keys.space = false;
				break;
			case 17: // CTRL
				this._keys.ctrl = false;
				break;
			case 82: // r
				this._keys.read = false;
				break;
			case 16: // SHIFT
				this._keys.shift = false;
				break;
			case 84: // t
				this._keys.thirdPersonCamera = false;
				break;
			case 70: // f
				this._keys.action = false;
				break;
			case 89: // y
				this._keys.freeCamera = false;
				break;
			case 27: // esc
			this._keys.esc = false;
			break;
		}
	}
	set actionsAllowed(status = true){
		if(this._keys.actionsAllowed !== status)
			this._keys.actionsAllowed = status;
	}
	set limitAreaReachedAct(state){
		this._keys.limitAreaReachedAct = state;
	}
	get keys(){
		return this._keys;
	}
};

export class CharacterController {
	constructor(params, loadingManager) {
		this.characterHeight = 16;
		this._loadingManager = loadingManager;
		this._initCharControl(params);		
	}

	_initCharControl(params) {
		this._params = params;
		this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
		this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
		this._velocity = new THREE.Vector3(0, 0, 0);
		this._position = new THREE.Vector3();

		this._animations = {};
		this.thirdCameraViewEnabled = params.thirdPersonCameraEnabled;
		this._input = new ButtonPressedController();
		this._stateMachine = new CharacterFSM(new CharacterControllerProxy(this._animations), this._input._keys);
		this._loadModels();
	}

	_loadModels() {
		const loader = new FBXLoader(this._loadingManager);
		loader.load('./models/characters/Big_Vegas.fbx', (fbx) => {
			fbx.scale.setScalar(.1);
			fbx.traverse(c => {
				c.castShadow = true;
			});

			const box = new THREE.Box3().setFromObject(fbx);
    		const height = box.max.y - box.min.y; 
    		fbx.userData.height = height; 

			this._target = fbx;
			this._params.scene.add(this._target);

			this._mixer = new THREE.AnimationMixer(this._target);

			const originalOnLoad = this._loadingManager.onLoad;
  
			this._loadingManager.onLoad = () => {
			  if (originalOnLoad) 
				originalOnLoad();
			  if(this._stateMachine)
			  	this._stateMachine.setState('idle');
			};

			const _onLoad = (animName, anim) => {
				const clip = anim.animations[0];
				const action = this._mixer.clipAction(clip);

				this._animations[animName] = {
					clip: clip,
					action: action,
				};
			};

			const jumpStates = JumpState._jumpStates;

			loader.setPath('./models/animations/');
			loader.load('walk_fwd.fbx', anim => { _onLoad('walk_fwd', anim); });
			loader.load('walk_bwd.fbx', anim => { _onLoad('walk_bwd', anim); });
			loader.load('run_fwd.fbx', anim => { _onLoad('run_fwd', anim); });
			loader.load('run_bwd.fbx', anim => { _onLoad('run_bwd', anim); });
			loader.load('idle.fbx', anim => { _onLoad('idle', anim); });

			loader.load('arguing.fbx', anim => { _onLoad('end_area', anim); });
			loader.load('walk_fwd.fbx', anim => { _onLoad('lim_area_walk_fwd', anim); });
			
			characterActions.forEach(actionName => loader.load(actionName + '.fbx', anim => { _onLoad(actionName, anim); }))
			jumpStates.forEach(actionName => loader.load(actionName + '.fbx', anim => { _onLoad(actionName, anim); }))
			reachMapBoardActions.forEach(actionName => loader.load(actionName + '.fbx', anim => { _onLoad(actionName, anim); }))
		});
	}
 
	updateController(timeInSeconds) {
		if (!this._target) {
			return;
		}
		if (this._input._keys.thirdPersonCamera) {
			if(!this._params.cameraState.thirdPersonCameraEnabled){
				this._params.enableThirdCameraView();
				return;
			}
		}
		if (this._input._keys.freeCamera) {
			if(this._params.cameraState.thirdPersonCameraEnabled){
				this._params.disableThirdCameraView();
				return;
			}
		}
		this._stateMachine.update(timeInSeconds, this._input);
		//--------------------------------------------------------
		const position = this._params.characterRigidBody.translation();

    	this._target.position.set(position.x, position.y-this.characterHeight/2, position.z);

		this._position.copy(this._target.position);

		let rapierQuat = this._params.characterRigidBody.rotation();
		this._target.quaternion.set(rapierQuat.x, rapierQuat.y, rapierQuat.z, rapierQuat.w);

		//--------------------------------------------------------
		if (this._mixer) {
			this._mixer.update(timeInSeconds);
		}
	}
	get position() {
		return this._position;
	  }
	
	get rotation() {
		if (!this._target) {
		  return new THREE.Quaternion();
		}
		return this._target.quaternion;
	}
};