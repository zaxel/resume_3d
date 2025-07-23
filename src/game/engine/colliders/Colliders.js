import RAPIER from "@dimforge/rapier3d";
import { makeQuaternion } from "../../utils/makeQuaternion";

export class Colliders {
  constructor(worldPhysics) {
    this.worldPhysics = worldPhysics;
  }
  toRadian(degrees) {
    return THREE.MathUtils.degToRad(degrees);
  }

  createColliders(colliders=[]) {
    if(!Array.isArray(colliders))
      throw Error("Colliders data must be an array.");
    return this._setColliders(colliders);
  }

  _setColliders(colliders){
    colliders.forEach(({name, positions, dimensions, rotations, figure, group})=>{
        const rotation = makeQuaternion(rotations);
        this._initCollider(positions, rotation, dimensions, figure, name, group);
      })
    return true;
  }

  _initCollider(position = { x: 0, y: 0, z: 0 }, rotation = { w: 1.0, x: 0.0, y: 0.0, z: 0.0 }, size = { x: 0, y: 0, z: 0 }, type = "cylinder", name="unknown", group="") {

    let colliderBuilder;
    switch (type) {
      case "ball":
        colliderBuilder = RAPIER.ColliderDesc.ball(size.x * 0.6);
        break;
      case "cylinder":
        colliderBuilder = RAPIER.ColliderDesc.cylinder(size.y, size.x);
        break;
      case "cuboid":
        colliderBuilder = RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z);
        break;
      default:
        throw new Error(`Unsupported collider type: ${type}`);
    }

    colliderBuilder.setTranslation(position.x, position.y, position.z);
    colliderBuilder.setRotation(rotation);

    const collider =  this.worldPhysics.createCollider(colliderBuilder);
    collider.userData = { name, group };
    return collider;
  }
}
