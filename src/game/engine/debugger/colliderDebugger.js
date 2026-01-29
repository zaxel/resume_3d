import * as THREE from "three";

export class ColliderDebugger {
  constructor(world, scene) {
    this.world = world

    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.LineBasicMaterial({ vertexColors: true })
    this.mesh = new THREE.LineSegments(this.geometry, this.material)

    scene.add(this.mesh)
  }

  update() {
    const debug = this.world.debugRender()

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(debug.vertices, 3)
    )

    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(debug.colors, 4)
    )
  }
}
