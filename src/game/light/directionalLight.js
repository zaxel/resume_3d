import * as THREE from "three";

export class DirectionalLight {
	constructor(color = 0xFFFFFF, intensity = 1.0, charPosition = new THREE.Vector3(0, 0, 0)) {
	  this.dirLight = new THREE.DirectionalLight(color, intensity);
	  this.offset = new THREE.Vector3(60, 100, 0);
	  this.targetPosition = charPosition;
  
	  this.dirLight.target = new THREE.Object3D(); 
	  this._initDirLight();
	}
  
	_initDirLight() {
	  const { x, y, z } = new THREE.Vector3().addVectors(this.targetPosition, this.offset);
	  this.dirLight.position.set(x, y, z);
  
	  this.dirLight.target.position.copy(this.targetPosition);
  
	  this.dirLight.castShadow = true;
	  this.dirLight.shadow.bias = -0.001;
	//   this.dirLight.shadow.mapSize.set(4096, 4096);
	//   this.dirLight.shadow.mapSize.set(2048, 2048);
	  this.dirLight.shadow.mapSize.set(1024, 1024);
	  this.dirLight.shadow.camera.near = 0.5;
	  this.dirLight.shadow.camera.far = 500.0;
	  this.dirLight.shadow.camera.left = -100;
	  this.dirLight.shadow.camera.right = 100;
	  this.dirLight.shadow.camera.top = 100;
	  this.dirLight.shadow.camera.bottom = -100;
	}
  
	updateDirLightPosition(characterPosition) {
	  const { x, y, z } = new THREE.Vector3().addVectors(characterPosition, this.offset);
	  this.dirLight.position.set(x, y, z);
  
	  this.dirLight.target.position.copy(characterPosition);
	  this.dirLight.target.updateMatrixWorld();
	}
  }
  