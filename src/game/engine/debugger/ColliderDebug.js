import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d";

export class ColliderDebug {
  constructor(worldPhysics, scene) {
    this.worldPhysics = worldPhysics;
    this._scene = scene;
    this.colliderMeshes = new Map(); // Store meshes for updating positions later
  }

  _createColliderMesh(collider) {
    let shapeType = collider.shapeType();
    let geometry;

    if (shapeType === RAPIER.ShapeType.Cuboid) {
      let he = collider.halfExtents();
      geometry = new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2);
    } else if (shapeType === RAPIER.ShapeType.Ball) {
      geometry = new THREE.SphereGeometry(collider.radius(), 16, 16);
    } else if (shapeType === RAPIER.ShapeType.Cylinder) {
      geometry = new THREE.CylinderGeometry(collider.radius(), collider.radius(), collider.halfHeight() * 2, 16);
    } else {
      console.warn("Unsupported shape type:", shapeType);
      return null;
    }

    let material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    let mesh = new THREE.Mesh(geometry, material);

    // Set initial position and rotation
    this._updateColliderMesh(mesh, collider);
    
    return mesh;
  }

  _updateColliderMesh(mesh, collider) {
    let pos = collider.translation();
    let rot = collider.rotation();

    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }

  visualizeColliders(delay) {
    setTimeout(()=>{

        this.worldPhysics.forEachCollider((collider) => {
            if (!this.colliderMeshes.has(collider.handle)) {
                let colliderMesh = this._createColliderMesh(collider);
                if (colliderMesh) {
                    this._scene.add(colliderMesh);
                    this.colliderMeshes.set(collider.handle, colliderMesh);
                    console.log(colliderMesh);
                  }
            }
        });
    }, delay)
  }

  updateColliders() {
    this.worldPhysics.forEachCollider((collider) => {
      let mesh = this.colliderMeshes.get(collider.handle);
      if (mesh) {
        this._updateColliderMesh(mesh, collider);
      }
    });
  }
}
