import * as THREE from 'three';

export class ThirdPersonViewCamera {
    constructor(params) {
        this._params = params;
        this._camera = params.camera;
        this._position = new THREE.Vector3();
        this._lookAt = new THREE.Vector3();
        this._keys = params.target._input._keys;
        
        this._thirdPersonOffset = new THREE.Vector3(-20, 20, -30);
        this._selfieOffset = new THREE.Vector3(-15, 15, -20);
        this._lookAtHeight = 10; // How high to look at character
    }

    _calcTransformedPosition(offset) {
        const transformed = offset.clone();
        transformed.applyQuaternion(this._params.target.rotation);
        transformed.add(this._params.target.position);
        return transformed;
    }

    _calcTransformedSelfiePosition(offset) {
        const flipRotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            Math.PI
        );
        const rotatedOffset = offset.clone()
            .applyQuaternion(flipRotation)
            .applyQuaternion(this._params.target.rotation);
        
        return this._params.target.position.clone().add(rotatedOffset);
    }
    
    _calcIdealOffset() {
        return this._keys.selfieMode
            ? this._calcTransformedSelfiePosition(this._selfieOffset)
            : this._calcTransformedPosition(this._thirdPersonOffset);
    }

    _calcIdealLookAt() {
        const targetPos = this._params.target.position;
        return this._keys.selfieMode
            ? new THREE.Vector3(targetPos.x, targetPos.y + this._lookAtHeight, targetPos.z)
            : this._calcTransformedPosition(new THREE.Vector3(0, this._lookAtHeight, 40));
    }

    _update(timeElapsedS) {
        const idealOffset = this._calcIdealOffset();
        const idealLookAt = this._calcIdealLookAt();
        const t = 1 - Math.pow(0.001, timeElapsedS);
        
        this._position.lerp(idealOffset, t);
        this._lookAt.lerp(idealLookAt, t);
        
        this._camera.position.copy(this._position);
        this._camera.lookAt(this._lookAt);
    }
}