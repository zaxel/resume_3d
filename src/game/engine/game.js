export class Game {
    constructor(grassField, renderer, scene, camera, updateCharacterMovement, updateCharacterMesh, objects, controls, cameraState, world) {
    
      this._physicsFrameSkip = 2; // Run physics every 2nd frame
      this._frameCount = 0;
      this._previousFrame = null;

        this._grassField = grassField;
        this._renderer = renderer;
        this._scene = scene;
        this._camera = camera;
        this._updateCharacterMovement = updateCharacterMovement;
        this._updateCharacterMesh = updateCharacterMesh;
        this._objects = objects;
        this._controls = controls;
        this._cameraState = cameraState;
        this._world = world;
        console.log(world)
    }
  
    animate(t) {
      requestAnimationFrame(this.animate.bind(this));
  
      if (this._previousFrame === null) this._previousFrame = t;
  
      const deltaTime = (t - this._previousFrame) * 0.001; 
      this._previousFrame = t;
  
      
      if (this._grassField) this._grassField.update(t);
      this._renderer.render(this._scene, this._camera);
      this.step(deltaTime);
  
      // **Only update physics every `_physicsFrameSkip` frames**
      if (this._frameCount % this._physicsFrameSkip === 0) {
        this._updateCharacterMovement(deltaTime);
        this._updateCharacterMesh();
  
        // Use fixed timestep for physics to ensure consistent behavior
        const fixedTimeStep = 1 / 60; // 60 FPS physics
        this._world.step(fixedTimeStep);
  
        // Sync objects with physics
        this._objects.forEach((obj) => {
          const position = obj.rigidBody.translation();
          obj.mesh.position.set(position.x, position.y, position.z);
        });
      }
  
      this._frameCount++;
    }
  
    step(deltaTime) {
      if (this._controls) this._controls._update(deltaTime);
      if (this._cameraState.thirdPersonCameraEnabled) {
        this._cameraState.thirdPersonCameraInstance._update(deltaTime);
      }
    }
  }
  