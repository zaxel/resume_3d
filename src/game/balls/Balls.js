import * as THREE from "three";
import { getRandomHexColor } from "../utils/getRandomHexColor";
import { charMovementLimits } from "../../const/game";
import { getRandPositionWithinArea } from "../utils/getRandPositionWithinArea";


export class Balls {
    constructor(simpleObjects, RAPIER, worldPhysics, scene) {
        this.simpleObjects = simpleObjects;
        this.RAPIER = RAPIER;
        this.worldPhysics = worldPhysics
        this.scene = scene;
    }
    addBalls(n){
        if(!this.scene) return;
        new Array(n).fill(null).forEach(el=>{
            const randomPos = getRandPositionWithinArea(charMovementLimits);
            const maxRadius = 6;
            const minRadius = 2;
            const radius = Math.floor(Math.random() * (maxRadius - minRadius +1)) + minRadius; 
            this._addBall({radius, position: [randomPos[0], 50, randomPos[2]]})
        });
    }

    _addBall = ({radius=4, position= [3, 5, 3]}) => {
        
        const ballGeometry = new THREE.SphereGeometry(radius, 12, 12)
        const ballMaterial = new THREE.MeshStandardMaterial({ color: getRandomHexColor() })

        const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial)
        ballMesh.castShadow = true
        ballMesh.receiveShadow = true
        ballMesh.position.set(position[0], position[1], position[2]) // start above ground
        this.scene.add(ballMesh)

        /* ---------- RAPIER ---------- */
        const bodyDesc = this.RAPIER.RigidBodyDesc
            .dynamic()
            .setTranslation(position[0], position[1], position[2])

        const rigidBody = this.worldPhysics.createRigidBody(bodyDesc)
        rigidBody.setAngularDamping(0.3)
        rigidBody.setLinearDamping(0.3)

        const colliderDesc = this.RAPIER.ColliderDesc
            .ball(radius)
            .setRestitution(0.2)
            .setFriction(0.4)
            .setDensity(1.5)

        this.worldPhysics.createCollider(colliderDesc, rigidBody)

        /* ---------- REGISTER ---------- */
        this.simpleObjects.push({
            mesh: ballMesh,
            rigidBody
        })
    }
}