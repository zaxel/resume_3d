import * as THREE from "three";
export class RiverCurve {
  constructor(scene, visible = false) {
    this.scene = scene;
    this.visible = visible;
    this.riverCurve = new THREE.Curve();
    this.initRiverCurve();
  }

  initRiverCurve() {
    const riverPoints = [
      new THREE.Vector3(140, -13, -690),
      new THREE.Vector3(140, -13, -500),
      new THREE.Vector3(70, -13, -400),
      new THREE.Vector3(70, -13, 0),
      new THREE.Vector3(0, -13, 90),
      new THREE.Vector3(50, -13, 140),
      new THREE.Vector3(230, -13, 190),
      new THREE.Vector3(230, -13, 290),
      new THREE.Vector3(130, -13, 390),
      new THREE.Vector3(-175, -13, 690),
    ];

    const riverCatmullCurve = new THREE.CatmullRomCurve3(riverPoints);

    const riverGeometry = new THREE.TubeGeometry(riverCatmullCurve, 100, 0.5, 8, false);

    const riverMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.5,
    });

    this.riverCurveMesh = new THREE.Mesh(riverGeometry, riverMaterial);
    this.riverCurveMesh.visible = this.visible;
    this.scene.add(this.riverCurveMesh);
    this.riverCatmullCurve = riverCatmullCurve;
  }
}
