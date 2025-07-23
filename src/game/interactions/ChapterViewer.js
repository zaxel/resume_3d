import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ChapterPagination } from "./ChapterPagination";
import { cv } from "../../const/chaptersPages";
import { degToRad, lerp, radToDeg } from "three/src/math/MathUtils.js";

export class ChapterViewer {
  constructor(markersDistanceHandler, audio, loadManager) {
    this.markersDistanceHandler = markersDistanceHandler;
    this.marker = null;
    this.lastMarker = null;
    this.modal = document.getElementById("modal-chapter-cont");
    this.closeButton = this.modal.querySelector(".chapter-close");
    this.audio = audio;
    this.loadManager = loadManager;

    this.books = {};
    this.currentBook = null;
    this.raycasterPointerMoveHandler = null;

    this.initScene();
    this.preloadTextures()
      .then(() => this.forceTextureUpload())
      .then(() => this.preloadBooks())
      .then(() => this.preprocessGeometries())
      .then(() => this.precompileShaders())
      .then(() => this.animate())
     
  }

  async initScene() {
    this._previousFrame = null;
    this.canvas = document.querySelector(".chapter-canvas");

    this.scene = new THREE.Scene();
    this.scene.rotateX(degToRad(-25));
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 3);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.addLighting();
    this.paginationNumber = 0;

    this.firstLoad = true;

    this.close();
  }

  async preloadBooks() {
    const bookNames = Object.keys(cv);
    for (const bookName of bookNames) {
      const chapterContent = cv[bookName];
      const bookGroup = await this.createBook(chapterContent);
      bookGroup.visible = true;
      this.scene.add(bookGroup);
      this.books[bookName] = bookGroup;
    }
  }
  
  async preloadTextures() {
    const textureLoader = new THREE.TextureLoader(this.loadManager);
    this.textureCache = new Map(); // Store textures in a cache

    const texturePromises = [];

    Object.values(cv).forEach((chapterContent) => {
      chapterContent.forEach((pageData) => {
        if (pageData.front) {
          const promise = new Promise((resolve) => {
            textureLoader.load(`./book/${pageData.front}.jpg`, (texture) => {
              this.textureCache.set(pageData.front, texture); // Cache the texture
              resolve();
            });
          });
          texturePromises.push(promise);
        }
        if (pageData.back) {
          const promise = new Promise((resolve) => {
            textureLoader.load(`./book/${pageData.back}.jpg`, (texture) => {
              this.textureCache.set(pageData.back, texture); // Cache the texture
              resolve();
            });
          });
          texturePromises.push(promise);
        }
      });
    });

    await Promise.all(texturePromises);
  }
  precompileShaders() {
    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.Camera();
    const dummyMaterial = new THREE.MeshBasicMaterial(); // Use a simple material

    const geometries = [];
    Object.values(this.books).forEach((book) => {
      book.traverse((child) => {
        if (child.isMesh) {
          geometries.push(child.geometry);
        }
      });
    });

    geometries.forEach((geometry) => {
      const mesh = new THREE.Mesh(geometry, dummyMaterial);
      dummyScene.add(mesh);
    });

    this.renderer.render(dummyScene, dummyCamera);
  }
  forceTextureUpload() {
    const dummyScene = new THREE.Scene();
    const dummyCamera = new THREE.Camera();
    const dummyMaterial = new THREE.MeshBasicMaterial({ map: this.textureCache.values().next().value });
  
    const dummyGeometry = new THREE.PlaneGeometry();
    const dummyMesh = new THREE.Mesh(dummyGeometry, dummyMaterial);
    dummyScene.add(dummyMesh);
  
    this.renderer.render(dummyScene, dummyCamera);
  }
  preprocessGeometries() {
    Object.values(this.books).forEach((book) => {
      book.traverse((child) => {
        if (child.isMesh && child.geometry) {
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
      });
    });
  }

  async createBook(chapterContent) {
    const bookGroup = new THREE.Group();

    const pageWidth = 1.28;
    const pageHeight = 1.71; //  4/3
    const pageDepth = 0.003;
    const pageSegments = 30;
    const segmentWidth = pageWidth / pageSegments;

    const pageGeometry = new THREE.BoxGeometry(pageWidth, pageHeight, pageDepth, pageSegments, 2);

    this.pageParams = {
      pageWidth,
      pageHeight,
      pageDepth,
      pageSegments,
      segmentWidth,
    };

    const textureLoader = new THREE.TextureLoader();
    const initBook = () => {
      const position = pageGeometry.attributes.position;

      const vertex = new THREE.Vector3();

      const skinIndices = [];
      const skinWeights = [];

      for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        const x = vertex.x + pageWidth / 2;
        const skinIndex = Math.max(0, Math.floor(x / segmentWidth));
        const skinWeight = (x % segmentWidth) / segmentWidth;
        skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
        skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
      }
      pageGeometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
      pageGeometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
      pageGeometry.translate(pageWidth / 2, 0, 0);
    };

    const chapterSkinnedMesh = ({ front, back }, index) => {
      const bones = [];
      for (let i = 0; i <= pageSegments; i++) {
        let bone = new THREE.Bone();
        bones.push(bone);
        if (i === 0) {
          bone.position.x = 0;
        } else {
          bone.position.x = segmentWidth;
        }
        if (i > 0) {
          bones[i - 1].add(bone);
        }
      }
      const whiteColor = new THREE.Color("white");
      const emissiveColor = new THREE.Color("orange");
      const blackColor = new THREE.Color("black");
      const coverColor = new THREE.Color(0xe2e2e2);
      const pageColor = new THREE.Color(0xd9d9d9);

      const skinMaterial = [
        new THREE.MeshStandardMaterial({ color: pageColor }), //opening side
        new THREE.MeshStandardMaterial({ color: coverColor }), //cover side
        new THREE.MeshStandardMaterial({ color: pageColor }), //top side
        new THREE.MeshStandardMaterial({ color: pageColor }), //bottom side
        new THREE.MeshStandardMaterial({ color: coverColor, emissive: emissiveColor, emissiveIntensity: 0 }), //top cover
        new THREE.MeshStandardMaterial({ color: coverColor, emissive: emissiveColor, emissiveIntensity: 0 }), //back cover
      ];

      if (front) {
        const texture = this.textureCache.get(front);
        if (texture) {
          skinMaterial[4].map = texture;
          skinMaterial[4].needsUpdate = true;
          texture.colorSpace = THREE.SRGBColorSpace;
        } else {
          console.error(`Texture not found in cache: ${front}`);
        }
      }
      if (back) {
        const texture = this.textureCache.get(back);
        if (texture) {
          skinMaterial[5].map = texture;
          skinMaterial[5].needsUpdate = true;
          texture.colorSpace = THREE.SRGBColorSpace;
        } else {
          console.error(`Texture not found in cache: ${back}`);
        }
      }

      const skeleton = new THREE.Skeleton(bones);

      const mesh = new THREE.SkinnedMesh(pageGeometry, skinMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const posZ = -index * pageDepth;
      mesh.position.set(0, 0, posZ);
      mesh.add(skeleton.bones[0]);
      mesh.bind(skeleton);
      mesh.index = index;
      const helper = new THREE.SkeletonHelper(mesh);
      helper.visible = false;
      this.scene.add(helper);
      return mesh;
    };

    const setUpChapterMesh = (chapterPages = []) => {
      (chapterPages || []).forEach((pageData, index, arr) => {
        const page = chapterSkinnedMesh(pageData, index);
        page.isOpen = false;
        page.isLastOpen = false;
        page.turnedAt = Date.now();
        page.isHighlighted = false;
        page.onClick = (event) => {
          page.isOpen ? this.pagination.setPage(this.paginationNumber - 1) : this.pagination.setPage(this.paginationNumber + 1);
        };
        page.onPointerenter = (event) => {
          page.isHighlighted = true;
        };
        page.onPointerleave = (event) => {
          page.isHighlighted = false;
        };
        bookGroup.add(page);
      });
      bookGroup.position.z = 0.28;
    };
    initBook();
    setUpChapterMesh(chapterContent);

    return bookGroup;
  }
  
  addSceneContent() {
    if (this.currentBook) {
      this.currentBook.visible = false; 
    }
    const book = this.books[this.marker];
    if (book) {
      if(this.firstLoad){
        Object.values(this.books).forEach(book=>{
          book.visible = false;
        })
        this.firstLoad = false;
      }
      book.visible = true; 
      this.currentBook = book;
      this.resetPageStates(book);
      this.resetPageTransforms(book);

      const pages = cv[this.marker];
      this.addPagination(pages, this.marker);
    }

    this.setRaycaster();
  }
  resetPageStates(book) {
    book.children.forEach((page) => {
      page.isOpen = false;
      page.isLastOpen = false;
      page.turnedAt = Date.now();
      page.isHighlighted = false;
    });
  }
  resetPageTransforms(book) {
    const { pageWidth, pageHeight, pageDepth, pageSegments, segmentWidth } = this.pageParams;

    book.children.forEach((page) => {
      page.rotation.set(0, 0, 0);

      page.position.set(0, 0, -page.index * pageDepth);

      if (page.skeleton) {
        page.skeleton.bones.forEach((bone, i) => {
          bone.rotation.set(0, 0, 0);
          if (i === 0 || i % (pageSegments + 1) === 0) {
            bone.position.set(0, 0, 0);
          } else {
            bone.position.set(segmentWidth, 0, 0);
          }
        });
      }
    });
  }

  addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(ambientLight, directionalLight);
  }

  setRaycaster() {
    // Remove existing event listeners if they exist
    if (this.raycasterClickHandler) {
      this.renderer.domElement.removeEventListener("click", this.raycasterClickHandler);
    }
    if (this.raycasterPointerMoveHandler) {
      this.renderer.domElement.removeEventListener("pointermove", this.raycasterPointerMoveHandler);
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredPage = null;

    // Define the click handler
    this.raycasterClickHandler = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);

      const intersects = raycaster.intersectObjects(this.currentBook.children, true);

      if (intersects.length > 0) {
        const page = intersects[0].object;

        if (page.onClick) {
          page.onClick(event);
        }
      }
    };

    // Define the pointermove handler
    this.raycasterPointerMoveHandler = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);

      const intersects = raycaster.intersectObjects(this.currentBook.children, true);

      if (intersects.length > 0) {
        const page = intersects[0].object;

        if (page !== hoveredPage) {
          if (hoveredPage && hoveredPage.onPointerleave) {
            hoveredPage.onPointerleave(event);
          }
          if (page.onPointerenter) {
            page.onPointerenter(event);
          }
          hoveredPage = page;
          this.renderer.domElement.style.cursor = "pointer";
        }
      } else {
        if (hoveredPage && hoveredPage.onPointerleave) {
          hoveredPage.onPointerleave(event);
        }
        hoveredPage = null;
        this.renderer.domElement.style.cursor = "default";
      }
    };

    // Add the new event listeners
    this.renderer.domElement.addEventListener("click", this.raycasterClickHandler);
    this.renderer.domElement.addEventListener("pointermove", this.raycasterPointerMoveHandler);
  }

  updatePageRotation(delta) {
    const book = this.currentBook;
    if (!book) {
      console.error("Book group not found in the scene.");
      return;
    }

    const bookIsOpen = this.paginationNumber !== 0 && this.paginationNumber !== book.children.length;

    book.children.forEach((page) => {
      if (page.index === undefined) {
        console.error("Page index is undefined:", page);
        return;
      }
      const emissiveIntensity = page.isHighlighted ? 0.20 : 0;
      page.material[4].emissiveIntensity = page.material[5].emissiveIntensity = this.lerp(page.material[4].emissiveIntensity, emissiveIntensity, delta, 3);

      page.isOpen = page.index < this.paginationNumber;

      if (page.isLastOpen !== page.isOpen) {
        page.turnedAt = new Date();
        page.isLastOpen = page.isOpen;
      }
      let turningTime = Math.min(400, new Date() - page.turnedAt) / 400;
      turningTime = Math.sin(turningTime * Math.PI);

      let rotation = page.isOpen ? -Math.PI / 2 : Math.PI / 2;
      if (bookIsOpen) {
        rotation += (page.index - this.paginationNumber) * 0.015; //add more rotation to avoid pages fight
      }
      const skeleton = page.skeleton;
      if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) {
        console.error("Page skeleton is missing bones:", page);
        return;
      }
      const bones = skeleton.bones;

      bones.forEach((bone, i) => {
        const target = i === 0 ? book : bone;
        const insideCurveIntensity = i < 9 ? Math.sin(i * 0.2 + 0.23) : 0;
        const insideCurveStrength = 0.17;

        const outsideCurveIntensity = i >= 9 ? Math.cos(i * 0.3 + 0.1) : 0;
        const outsideCurveStrength = 0.028;

        const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
        const turningStrength = 0.08;

        let rotateAngleY = insideCurveIntensity * insideCurveStrength * rotation - outsideCurveIntensity * outsideCurveStrength * rotation + turningIntensity * turningStrength * rotation;

        const rotateXIntensity = i >= 9 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0;
        let rotateAngleX = degToRad(Math.sin(rotation) * 2);

        if (!bookIsOpen) {
          rotateAngleY = i == 0 ? rotation * 0.9999 : 0;
          rotateAngleX = 0;
        }
        const lerpXFactor = 3;
        let lerpYFactor = 1.5;
        if (target === book) {
          const pages = book.children.length;
          if(pages<2){
            lerpYFactor = 0.7;
          }else if(pages<4){
            lerpYFactor = 0.5;
          }else if(pages<6){
            lerpYFactor = 0.3;
          }else if(pages<10){
            lerpYFactor = 0.2
          }else{
            lerpYFactor = 0.1;
          }
          rotateAngleY -= Math.PI / 2; //rotate book facing to screen
        }
        target.rotation.y = this.lerp(target.rotation.y, rotateAngleY, delta, lerpYFactor);
        target.rotation.x = this.lerp(target.rotation.x, rotateAngleX * rotateXIntensity, delta, lerpXFactor);
      });
    });
  }

  lerp(start, end, delta, lerpFactor) {
    const t = 1 - Math.exp(-delta * lerpFactor); // Adjust multiplier for speed
    return start * (1 - t) + end * t;
  }
  updatePaginationLinks(chapterPages){
    if(this.marker!=="contacts" && this.marker!=="portfolio" && this.marker!=="credits") return;

    const linksContainer = this.pagination.asideLinkContainer.children;
    const currentSpread = this.pagination.currentSpread;

    if(this.pagination.currentSpread === 0 || this.pagination.currentSpread === this.pagination.pages.length){
      for(let i=0; i<linksContainer.length-1; i++){
        linksContainer[i].classList.remove("chapter-link-show");
      }
      return;
    }
    for(let i=0; i<linksContainer.length-1; i++){
      linksContainer[i].textContent = chapterPages[currentSpread].links[i].text;
      linksContainer[i].href = chapterPages[currentSpread].links[i].link;
      linksContainer[i].target = "blank";

      linksContainer[i].classList.add("chapter-link-show");
    }
  }

  addPagination(chapterPages, marker) {
    if (!chapterPages) return;
    if (this.pagination) {
      this.pagination.destroy();
    }
    this.paginationNumber = 0;
    this.pagination = new ChapterPagination(chapterPages, marker, this.audio, (number) => {
      let timeout = null;
      const setDelayedNumber = () => {
        if (this.paginationNumber === number) {
          clearTimeout(timeout);
          return;
        }
        timeout = setTimeout(setDelayedNumber, Math.abs(number - this.paginationNumber) > 2 ? 50 : 150);
        if (number < this.paginationNumber) this.paginationNumber--;
        else if (number > this.paginationNumber) this.paginationNumber++;
        this.updatePaginationLinks(chapterPages);
      };
      setDelayedNumber();
    });
  }
  getChapterContent(marker) {
    const chapterContent = cv[marker] ?? cv["portfolio"];
    return chapterContent;
  }
  updateMarkerStatus() {
    const marker = this.markersDistanceHandler?.activeMarker?.name;
    if (marker === this.lastMarker || marker === null || marker === undefined) return;
    this.lastMarker = this.marker;
    this.marker = marker;
  }
  updateChapterContent() {
    if (this.marker === this.lastMarker || this.marker === null || this.marker === undefined) return;
    this.addSceneContent();
  }

  animate(t = 0) {
    requestAnimationFrame(this.animate.bind(this));

    if (this._previousFrame === null) this._previousFrame = t;
    const deltaTime = (t - this._previousFrame) * 0.001; // Convert to seconds
    this._previousFrame = t;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.currentBook && this.currentBook.visible) {
      this.updatePageRotation(deltaTime);
    }

    this.updateMarkerStatus();
    this.updateChapterContent();
  }

  open() {
    this.renderer.setAnimationLoop(() => this.renderer.render(this.scene, this.camera));
  }

  close() {
    this.renderer.setAnimationLoop(null);
  }
}
