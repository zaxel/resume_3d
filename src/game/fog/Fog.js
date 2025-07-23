import * as THREE from "three";

export class Fog {
  static patched = false;
    constructor(terrain, shaders) {
        this.terrain = terrain;
        this.totalTime = 0;
        this.shaders = shaders;
    }

    setupFog() {
       if (Fog.patched) return;
        Fog.patched = true;
        
        // Custom fog fragment shader
        THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
    vec3 fogOrigin = cameraPosition;
    vec3 fogDirection = normalize(vWorldPosition - fogOrigin);
    float fogDepth = distance(vWorldPosition, fogOrigin);
    
    // Sample Perlin noise texture using world position
    float fogSpeed =  0.000000001; 
    vec2 fogOffset = vec2(sin(fogTime * fogSpeed) * 0.1, cos(fogTime * fogSpeed * 0.7) * 0.1);
    vec2 uv_m = vWorldPosition.xz * 0.00005 + fogOffset;
    float noiseSample = texture2D(perlinNoise, uv_m).r;
    
    // Modulate fog depth with noise
    fogDepth *= mix(noiseSample, 1.0, saturate((fogDepth - 5000.0) / 5000.0));
    fogDepth *= fogDepth;
    
    float heightFactor = 0.05;
    float fogFactor = heightFactor * exp(-fogOrigin.y * fogDensity) * 
                     (1.0 - exp(-fogDepth * fogDirection.y * fogDensity)) / fogDirection.y;
    fogFactor = saturate(fogFactor);
    
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
        `;

        // Custom fog parameters for fragment shader
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
#endif
        `;

        // Custom fog vertex shader
        THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG
    #ifdef CUSTOM_FOG_POSITION
        vWorldPosition = worldPosition.xyz;
    #else
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    #endif
#endif
        `;

        // Custom fog parameters for vertex shader
        THREE.ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
    varying vec3 vWorldPosition;
#endif
        `;
    }

    fogStep(timeElapsed) {
        this.totalTime += timeElapsed;
        
        for (let s of this.shaders) {
            if (s.uniforms && s.uniforms.fogTime) {
                s.uniforms.fogTime.value = this.totalTime;
            }
        }
    }
}