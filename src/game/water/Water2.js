import { Clock, Color, Matrix4, Mesh, RepeatWrapping, ShaderMaterial, TextureLoader, UniformsLib, UniformsUtils, Vector2, Vector4, Texture } from "three";
import { Reflector } from "./Reflector.js";
import { Refractor } from "./Refractor.js";

/**
 * References:
 *	https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf
 *	http://graphicsrunner.blogspot.de/2010/08/water-using-flow-maps.html
 *
 */

class Water extends Mesh {
  constructor(geometry, options = {}) {
    super(geometry);

    this.isWater = true;
    this.type = "Water";

    const scope = this;
    const color = options.color !== undefined ? new Color(options.color) : new Color(0xffffff);
    const textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
    const textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;
    const clipBias = options.clipBias !== undefined ? options.clipBias : 0;
    const flowDirection = options.flowDirection !== undefined ? options.flowDirection : new Vector2(1, 0);
    const flowSpeed = options.flowSpeed !== undefined ? options.flowSpeed : 0.03;
    const reflectivity = options.reflectivity !== undefined ? options.reflectivity : 0.02;
    const scale = options.scale !== undefined ? options.scale : 1;
    const shader = options.shader !== undefined ? options.shader : Water.WaterShader;
    const isFoggy = options.isFoggy !== undefined ? options.isFoggy : true;

    const textureLoader = new TextureLoader();

    const flowMap = options.flowMap || undefined;
    const normalMap0 = options.normalMap0 || textureLoader.load("./water/Water_1_M_Normal.jpg");
    const normalMap1 = options.normalMap1 || textureLoader.load("./water/Water_2_M_Normal.jpg");

    const cycle = 0.15;
    const halfCycle = cycle * 0.5;
    const textureMatrix = new Matrix4();
    const clock = new Clock();

    // internal components
    if (Reflector === undefined) {
      console.error("THREE.Water: Required component Reflector not found.");
      return;
    }

    if (Refractor === undefined) {
      console.error("THREE.Water: Required component Refractor not found.");
      return;
    }

    const reflector = new Reflector(geometry, {
      textureWidth: textureWidth,
      textureHeight: textureHeight,
      clipBias: clipBias,
    });

    const refractor = new Refractor(geometry, {
      textureWidth: textureWidth,
      textureHeight: textureHeight,
      clipBias: clipBias,
    });

    reflector.matrixAutoUpdate = false;
    refractor.matrixAutoUpdate = false;

    // Create modified shader with fog support
    const modifiedShader = this.createFogCompatibleShader(shader, isFoggy);

    // material
    this.material = new ShaderMaterial({
      name: modifiedShader.name,
      uniforms: UniformsUtils.merge([UniformsLib["fog"], modifiedShader.uniforms]),
      vertexShader: modifiedShader.vertexShader,
      fragmentShader: modifiedShader.fragmentShader,
      transparent: true,
      fog: true,
    });
    
    // Add fog uniforms
    this.material.uniforms.fogTime = { value: 0 };
    this.material.uniforms.perlinNoise = { value: options.perlinNoise || new Texture() };
    
    if (flowMap !== undefined) {
      this.material.defines.USE_FLOWMAP = "";
      this.material.uniforms["tFlowMap"] = {
        type: "t",
        value: flowMap,
      };
    } else {
      this.material.uniforms["flowDirection"] = {
        type: "v2",
        value: flowDirection,
      };
    }

    // maps
    normalMap0.wrapS = normalMap0.wrapT = RepeatWrapping;
    normalMap1.wrapS = normalMap1.wrapT = RepeatWrapping;

    this.material.uniforms["tReflectionMap"].value = reflector.getRenderTarget().texture;
    this.material.uniforms["tRefractionMap"].value = refractor.getRenderTarget().texture;
    this.material.uniforms["tNormalMap0"].value = normalMap0;
    this.material.uniforms["tNormalMap1"].value = normalMap1;

    // water
    this.material.uniforms["color"].value = color;
    this.material.uniforms["reflectivity"].value = reflectivity;
    this.material.uniforms["textureMatrix"].value = textureMatrix;

    // initial values
    this.material.uniforms["config"].value.x = 0;
    this.material.uniforms["config"].value.y = halfCycle;
    this.material.uniforms["config"].value.z = halfCycle;
    this.material.uniforms["config"].value.w = scale;

    // functions
    function updateTextureMatrix(camera) {
      textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
      textureMatrix.multiply(camera.projectionMatrix);
      textureMatrix.multiply(camera.matrixWorldInverse);
      textureMatrix.multiply(scope.matrixWorld);
    }

    function updateFlow() {
      const delta = clock.getDelta();
      const config = scope.material.uniforms["config"];

      config.value.x += flowSpeed * delta;
      config.value.y = config.value.x + halfCycle;

      if (config.value.x >= cycle) {
        config.value.x = 0;
        config.value.y = halfCycle;
      } else if (config.value.y >= cycle) {
        config.value.y = config.value.y - cycle;
      }
    }

    this.onBeforeRender = function (renderer, scene, camera) {
      updateTextureMatrix(camera);
      updateFlow();

      scope.visible = false;

      reflector.matrixWorld.copy(scope.matrixWorld);
      refractor.matrixWorld.copy(scope.matrixWorld);

      reflector.onBeforeRender(renderer, scene, camera);
      refractor.onBeforeRender(renderer, scene, camera);

      scope.visible = true;
    };
  }

  createFogCompatibleShader(originalShader, isFoggy) {
    const fogVertexShader = /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      
      uniform mat4 textureMatrix;
      
      varying vec4 vCoord;
      varying vec2 vUv;
      varying vec3 vToEye;
      
      void main() {
        vUv = uv;
        vCoord = textureMatrix * vec4( position, 1.0 );
        
        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vToEye = cameraPosition - worldPosition.xyz;
        
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        
        #include <logdepthbuf_vertex>
        #include <fog_vertex>
      }
    `;

    const fogFragmentShader = /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      #include <logdepthbuf_pars_fragment>

      uniform sampler2D tReflectionMap;
      uniform sampler2D tRefractionMap;
      uniform sampler2D tNormalMap0;
      uniform sampler2D tNormalMap1;
      uniform sampler2D heightMap;
      
      #ifdef USE_FLOWMAP
          uniform sampler2D tFlowMap;
      #else
          uniform vec2 flowDirection;
      #endif
      
      uniform vec3 color;
      uniform float reflectivity;
      uniform vec4 config;
      
      varying vec4 vCoord;
      varying vec2 vUv;
      varying vec3 vToEye;

      void main() {
          #include <logdepthbuf_fragment>

          float flowMapOffset0 = config.x;
          float flowMapOffset1 = config.y;
          float halfCycle = config.z;
          float scale = config.w;

          vec3 toEye = normalize( vToEye );

          // Sample height map and discard high areas
          float height = texture2D(heightMap, vUv).r;  
          if (height > 0.5) {
              discard;
          }  

          // Determine flow direction
          vec2 flow;
          #ifdef USE_FLOWMAP
              flow = texture2D( tFlowMap, vUv ).rg * 2.0 - 1.0;
          #else
              flow = flowDirection;
          #endif
          flow.x *= - 1.0;

          // Sample normal maps (distort UVs with flow data)
          vec4 normalColor0 = texture2D( tNormalMap0, ( vUv * scale ) + flow * flowMapOffset0 );
          vec4 normalColor1 = texture2D( tNormalMap1, ( vUv * scale ) + flow * flowMapOffset1 );

          // Linear interpolate to get the final normal color
          float flowLerp = abs( halfCycle - flowMapOffset0 ) / halfCycle;
          vec4 normalColor = mix( normalColor0, normalColor1, flowLerp );

          // Calculate normal vector
          vec3 normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );

          // Calculate the fresnel term to blend reflection and refraction maps
          float theta = max( dot( toEye, normal ), 0.0 );
          float reflectance = reflectivity + ( 1.0 - reflectivity ) * pow( ( 1.0 - theta ), 5.0 );

          // Calculate final UV coords
          vec3 coord = vCoord.xyz / vCoord.w;
          vec2 uv = coord.xy + coord.z * normal.xz * 0.05;

          vec4 reflectColor = texture2D( tReflectionMap, vec2( 1.0 - uv.x, uv.y ) );
          vec4 refractColor = texture2D( tRefractionMap, uv );

          // Multiply water color with the mix of both textures
          gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );

          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
      }
    `;

    return {
      name: "WaterShaderWithFog",
      uniforms: originalShader.uniforms,
      vertexShader: fogVertexShader,
      fragmentShader: fogFragmentShader
    };
  }
}

Water.WaterShader = {
  name: "WaterShader",
  uniforms: {
    color: { type: "c", value: null },
    reflectivity: { type: "f", value: 0 },
    tReflectionMap: { type: "t", value: null },
    tRefractionMap: { type: "t", value: null },
    tNormalMap0: { type: "t", value: null },
    tNormalMap1: { type: "t", value: null },
    textureMatrix: { type: "m4", value: null },
    config: { type: "v4", value: new Vector4() },
  },
  vertexShader: ``, // Will be replaced
  fragmentShader: `` // Will be replaced
};

export { Water };