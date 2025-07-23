import RAPIER from "@dimforge/rapier3d";

export class VegetationPhysics {
  constructor(worldPhysics) {
    this.worldPhysics = worldPhysics;
  }

  createVegetationCollider(position = { x: 0, y: 0, z: 0 }, scale = 1, rotation = { w: 1, x: 0, y: 0, z: 0 }, type) {
    const collider = this._setCollider(position, scale, rotation, type);
    return collider;
  }

  _setCollider(position, scale, rotation, type) {
    let size = 0.5 * scale; 

    let colliderBuilder;
    if ( type.startsWith("stump")) {
        colliderBuilder = RAPIER.ColliderDesc.ball(scale * .6); 
    }else if(type.startsWith("stone")){
      colliderBuilder = RAPIER.ColliderDesc.ball(scale * 3)
    }else {
        colliderBuilder = RAPIER.ColliderDesc.cylinder(scale, scale * 0.2);
    }
    colliderBuilder.setTranslation(position.x, position.y, position.z);
    return this.worldPhysics.createCollider(colliderBuilder); 
  }
}
