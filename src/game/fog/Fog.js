import * as THREE from "three";
export class Fog {
  constructor(terrain, shaders) {
    this.terrain = terrain;
    this.totalTime = 0;
    this.shaders = shaders;
  }
  fogHuck() {
    
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  vec3 fogOrigin = cameraPosition;
  vec3 fogDirection = normalize(vWorldPosition - fogOrigin);
  float fogDepth = distance(vWorldPosition, fogOrigin);

  // Sample Perlin noise texture using world position
  // vec2 uv_m = vWorldPosition.xz * 0.0001; // Scale for large terrain
  vec2 uv_m = vWorldPosition.xz * 0.00005 + vec2(fogTime * 0.000000001, 0.0);
  float noiseSample = texture2D(perlinNoise, uv_m).r; // Grayscale sample

  // Modulate fog depth with noise
  fogDepth *= mix(noiseSample, 1.0, saturate((fogDepth - 5000.0) / 5000.0));
  fogDepth *= fogDepth;

  float heightFactor = 0.05;
  float fogFactor = heightFactor * exp(-fogOrigin.y * fogDensity) * (
      1.0 - exp(-fogDepth * fogDirection.y * fogDensity)) / fogDirection.y;
  fogFactor = saturate(fogFactor);

  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;

// THREE.ShaderChunk.fog_pars_fragment = _NOISE_GLSL + `
THREE.ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform float fogTime;
  uniform vec3 fogColor;
  uniform sampler2D perlinNoise;
  varying vec3 vWorldPosition;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;

// THREE.ShaderChunk.fog_vertex = `
// #ifdef USE_FOG
//   vWorldPosition = worldPosition.xyz;
// #endif`;

THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  #ifdef CUSTOM_FOG_POSITION
    vWorldPosition = worldPosition.xyz;
  #else
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  #endif
#endif`;

THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying vec3 vWorldPosition;
#endif`;
}

  
  fogStep(timeElapsed) {
    this.totalTime += timeElapsed;
    for (let s of this.shaders) {
      s.uniforms.fogTime.value = this.totalTime;
      s.needsUpdate = true;
    }
  }
}