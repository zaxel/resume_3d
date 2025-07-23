import * as THREE from "three";

export class Audio {
  constructor(
    initSettings,
    riverCurve,
    camera,
    keys,
    controls,
    audioFiles,
    scene,
    musicStatus,
    soundsStatus,
    btnsController,
    chicks
  ) {
    this.scene = scene;
    this.camera = camera;
    this.audioLoader = new THREE.AudioLoader();
    this.btnsController = btnsController;
    this.chicks = chicks;
    this.updatesCount = 0;

    this.audioFiles = audioFiles;
    this.riverCurve = riverCurve.riverCatmullCurve;
    this.musicStatus = musicStatus;
    this.soundsStatus = soundsStatus;

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.keys = keys;
    this.charStateMachine = controls;
    this.prevState = null;
    this.prevExternLoadedSoundLink = null;
    this.externLoadedSound = null;

    this.walkFwdSound = new THREE.Audio(this.listener);
    this.runFwdSound = new THREE.Audio(this.listener);
    this.walkBwdSound = new THREE.Audio(this.listener);
    this.runBwdSound = new THREE.Audio(this.listener);
    this.jumpStandSound = new THREE.Audio(this.listener);
    this.jumpBwdSound = new THREE.Audio(this.listener);
    this.movementSounds = [
      this.walkFwdSound,
      this.runFwdSound,
      this.walkBwdSound,
      this.runBwdSound,
      this.jumpStandSound,
      this.jumpBwdSound,
    ];

    this.idleTheme = new THREE.Audio(this.listener);
    this.walkTheme = new THREE.Audio(this.listener);
    this.runTheme = new THREE.Audio(this.listener);
    this.themeSounds = [this.idleTheme, this.walkTheme, this.runTheme];

    this.parkSounds = new THREE.Audio(this.listener);

    this.riverSounds = new THREE.PositionalAudio(this.listener);
    this.scene.add(this.riverSounds);

    this.ambienceSounds = [this.parkSounds, this.riverSounds];

    if (initSettings.blades) {
      this.windmillSounds = new THREE.PositionalAudio(this.listener);
      this.ambienceSounds.push(this.windmillSounds);
      const bladesGroup = this.scene.children.find(
        (child) => child.name === "blade"
      );
      const bladesMesh = bladesGroup.children[0].children[0];
      bladesMesh.add(this.windmillSounds);
    }

    if (initSettings.chicks) {
      this.chicksSounds = new THREE.PositionalAudio(this.listener);
      this.ambienceSounds.push(this.chicksSounds);
      this.scene.add(this.chicksSounds);
    }

    this.initAudioFiles();
    this.soundsManager();

    this.updateRiverSound();
    this.updateChicksSound();
    this.initHelpBtnsHandler();
  }

  updateRiverSound() {
    const closestPoint = this.getClosestPointToRiver(this.camera.position);
    this.riverSounds.position.copy(closestPoint);
  }
  updateChicksSound() {
    const centerPoint = this.getCenterPointToChicks();
    this.chicksSounds.position.copy(centerPoint);
  }

  getClosestPointToRiver(point) {
    let closestPoint = null;
    let closestDistance = Infinity;

    // Sample points along the curve to find the closest one
    const numSamples = 100;
    for (let i = 0; i <= 1; i += 1 / numSamples) {
      const curvePoint = this.riverCurve.getPoint(i);
      const distance = point.distanceTo(curvePoint);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = curvePoint;
      }
    }

    return closestPoint;
  }
  getCenterPointToChicks(point) {
    const chickPositions = this.chicks.map(pos=>pos.chickPhysics.mesh.position);

    const center = chickPositions.reduce(
      (acc, p) => {
        acc.x += p.x;
        acc.y += p.y;
        acc.z += p.z;
        return acc;
      },
      { x: 0, y: 0, z: 0 }
    );

    center.x /= chickPositions.length;
    center.y /= chickPositions.length;
    center.z /= chickPositions.length;

    return center;
  }
  playSound(link, volume = 0.5) {
    if (!this.soundsStatus) return;

    if (this.prevExternLoadedSoundLink === link && this.externLoadedSound) {
      this.externLoadedSound.setVolume(volume);
      this.externLoadedSound.play();
      return;
    }

    if (this.externLoadedSound) {
      this.externLoadedSound.stop();
      this.externLoadedSound.disconnect();
    }

    this.prevExternLoadedSoundLink = link;
    this.externLoadedSound = new THREE.Audio(this.listener);

    this.audioLoader.load(
      link,
      (buffer) => {
        this.externLoadedSound.setBuffer(buffer);
        this.externLoadedSound.setVolume(volume);
        this.externLoadedSound.play();
      },
      undefined,
      (error) => console.error("Failed to load sound:", error)
    );
  }

  initAudioFiles() {
    this.audioLoader.load(this.audioFiles.park, (buffer) => {
      this.parkSounds.setBuffer(buffer);
      this.parkSounds.setLoop(true);
      this.parkSounds.setVolume(0.3);
      if (this.soundsStatus) this.parkSounds.play();
    });

    this.audioLoader.load(this.audioFiles.walkFwdSound, (buffer) => {
      this.walkFwdSound.setBuffer(buffer);
      this.walkFwdSound.setLoop(true);
      this.walkFwdSound.setVolume(0.6);
    });
    this.audioLoader.load(this.audioFiles.runFwdSound, (buffer) => {
      this.runFwdSound.setBuffer(buffer);
      this.runFwdSound.setLoop(true);
      this.runFwdSound.setVolume(0.6);
      this.runFwdSound.setPlaybackRate(1.6);
    });
    this.audioLoader.load(this.audioFiles.walkBwdSound, (buffer) => {
      this.walkBwdSound.setBuffer(buffer);
      this.walkBwdSound.setLoop(true);
      this.walkBwdSound.setVolume(0.6);
      this.walkBwdSound.setPlaybackRate(0.8);
    });
    this.audioLoader.load(this.audioFiles.runBwdSound, (buffer) => {
      this.runBwdSound.setBuffer(buffer);
      this.runBwdSound.setLoop(true);
      this.runBwdSound.setVolume(0.6);
      this.runBwdSound.setPlaybackRate(1.6);
    });
    this.audioLoader.load(this.audioFiles.jumpStandSound, (buffer) => {
      this.jumpStandSound.setBuffer(buffer);
      this.jumpStandSound.setVolume(0.6);
    });
    this.audioLoader.load(this.audioFiles.jumpBwdSound, (buffer) => {
      this.jumpBwdSound.setBuffer(buffer);
      this.jumpBwdSound.setVolume(0.6);
    });

    this.audioLoader.load(this.audioFiles.idleTheme, (buffer) => {
      this.idleTheme.setBuffer(buffer);
      this.idleTheme.setLoop(true);
      this.idleTheme.setVolume(0.3);
    });
    this.audioLoader.load(this.audioFiles.walkTheme, (buffer) => {
      this.walkTheme.setBuffer(buffer);
      this.walkTheme.setLoop(true);
      this.walkTheme.setVolume(0.3);
    });
    this.audioLoader.load(this.audioFiles.runTheme, (buffer) => {
      this.runTheme.setBuffer(buffer);
      this.runTheme.setLoop(true);
      this.runTheme.setVolume(0.3);
    });

    this.audioLoader.load(this.audioFiles.river, (buffer) => {
      this.riverSounds.setBuffer(buffer);
      this.riverSounds.setLoop(true);
      this.riverSounds.setVolume(1);
      this.riverSounds.setRefDistance(10);
      this.riverSounds.setRolloffFactor(2);
      if (this.soundsStatus) this.riverSounds.play();
    });

    if (this.windmillSounds) {
      this.audioLoader.load(this.audioFiles.windmill, (buffer) => {
        this.windmillSounds.setBuffer(buffer);
        this.windmillSounds.setLoop(true);
        this.windmillSounds.setVolume(1);
        this.windmillSounds.setRefDistance(8);
        this.windmillSounds.setRolloffFactor(2);
        if (this.soundsStatus) this.windmillSounds.play();
      });
    }
    if (this.chicksSounds) {
      this.audioLoader.load(this.audioFiles.chicks, (buffer) => {
        this.chicksSounds.setBuffer(buffer);
        this.chicksSounds.setLoop(true);
        this.chicksSounds.setVolume(3);
        this.chicksSounds.setRefDistance(6);
        this.chicksSounds.setRolloffFactor(3);
        if (this.soundsStatus) this.chicksSounds.play();
      });
    }
  }
  initHelpBtnsHandler() {
    this.btnsController.onSoundOn = this.btnsController.onSoundOn.bind(
      null,
      this.soundOn.bind(this)
    );
    this.btnsController.onSoundOff = this.btnsController.onSoundOff.bind(
      null,
      this.soundOff.bind(this)
    );
    this.btnsController.onMusicOn = this.btnsController.onMusicOn.bind(
      null,
      this.musicOn.bind(this)
    );
    this.btnsController.onMusicOff = this.btnsController.onMusicOff.bind(
      null,
      this.musicOff.bind(this)
    );
  }
  clearMovementSounds() {
    this.movementSounds.forEach((sound) => {
      if (sound.isPlaying) sound.stop();
    });
  }
  clearThemeSounds() {
    this.themeSounds.forEach((sound) => {
      if (sound.isPlaying) sound.pause();
    });
  }
  clearAmbienceSounds() {
    this.ambienceSounds.forEach((sound) => {
      if (sound.isPlaying) sound.pause();
    });
  }
  fadeIn(audio, targetVolume = 1, duration = 1000, delay = 0) {
    audio.setVolume(0);
    audio.play(delay / 1000);

    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;

    function step() {
      const newVolume = (currentStep / steps) * targetVolume;
      audio.setVolume(newVolume);
      currentStep++;

      if (currentStep <= steps) {
        setTimeout(step, stepTime);
      }
    }

    step();
  }

  fadeOut(audio, duration = 1000, action = "stop") {
    const initialVolume = audio.getVolume();
    const steps = 30;
    const stepTime = duration / steps;
    let currentStep = 0;

    function step() {
      const newVolume = initialVolume * (1 - currentStep / steps);
      audio.setVolume(Math.max(newVolume, 0));
      currentStep++;

      if (currentStep <= steps) {
        setTimeout(step, stepTime);
      } else {
        audio.setVolume(0);
        if (action === "stop") {
          audio.stop();
        } else {
          audio.pause();
        }
      }
    }

    step();
  }
  soundsManager() {
    window.addEventListener("keydown", (event) => {
      switch (event.keyCode) {
        case 77:
          if (!this.musicStatus) {
            this.musicOn();
          } else {
            this.musicOff();
          }
          break;
        case 78:
          if (!this.soundsStatus) {
            this.soundOn();
          } else {
            this.soundOff();
          }
          break;
      }
    });
  }
  musicOn() {
    this.musicStatus = true;
    this.idleTheme.play();
    this.btnsController.musicOn(false);
  }
  musicOff() {
    this.musicStatus = false;
    this.clearThemeSounds();
    this.btnsController.musicOff(false);
  }
  soundOn() {
    this.soundsStatus = true;
    this.ambienceSounds.forEach((sound) => {
      sound.play();
    });
    this.btnsController.soundOn(false);
  }
  soundOff() {
    this.soundsStatus = false;
    this.clearMovementSounds();
    this.clearAmbienceSounds();
    this.btnsController.soundOff(false);
  }

  updateSoundsState() {
    this.updatesCount ++;
    if(this.updatesCount %10)
      this.updateChicksSound();
    if (!this.charStateMachine._currentState) return;
    const state = this.charStateMachine._currentState.Name;
    if (this.camera.position.distanceTo(this.riverSounds.position) > 2)
      this.updateRiverSound();
    if (state === this.prevState) return;

    if (!this.soundsStatus && !this.musicStatus) {
      this.clearMovementSounds();
      this.clearThemeSounds();
      return;
    }
    this.clearMovementSounds();

    const fadeInDelay = 800;
    switch (state) {
      case "walk_fwd":
        this.clearThemeSounds();
        if (this.musicStatus) this.fadeIn(this.walkTheme, 0.3, fadeInDelay);
        if (this.soundsStatus) this.walkFwdSound.play();
        break;
      case "run_fwd":
        this.clearThemeSounds();
        if (this.soundsStatus) this.runFwdSound.play();
        if (this.musicStatus) this.fadeIn(this.runTheme, 0.3, fadeInDelay);
        break;
      case "walk_bwd":
        this.clearThemeSounds();
        if (this.musicStatus) this.fadeIn(this.walkTheme, 0.3, fadeInDelay);
        if (this.soundsStatus) this.walkBwdSound.play();
        break;
      case "run_bwd":
        this.clearThemeSounds();
        if (this.soundsStatus) this.runBwdSound.play();
        if (this.musicStatus) this.fadeIn(this.runTheme, 0.3, fadeInDelay);
        break;
      case "jumpStand":
      case "jumpFwd":
        if (this.soundsStatus) this.jumpStandSound.play(0.3);
        break;
      case "jumpBwd":
        if (this.soundsStatus) this.jumpBwdSound.play();
        break;
      case "idle":
        this.clearThemeSounds();
        if (this.musicStatus) this.fadeIn(this.idleTheme, 0.3, fadeInDelay);
        break;
    }
    this.prevState = state;
  }
}
