precision highp float;

uniform sampler2D grassDiffTexture;
uniform sampler2D grassMaskTexture;

varying vec2 vUv;
varying vec3 vWorldPos;

uniform vec3 fogColor;
uniform float fogDensity; // For exponential fog
uniform float fogNear; // For linear fog
uniform float fogFar; // For linear fog

varying float vFogDepth; // Distance from the camera to the vertex

void main() {
    vec3 grassColor = texture2D(grassDiffTexture, vUv).rgb;
    float mask = texture2D(grassMaskTexture, vUv).r;

    // Adjust transparency using the mask texture
    if (mask < 0.2) discard;
    
    // Compute the fog factor
    // float fogFactor = smoothstep(fogNear, fogFar, vFogDepth); // Linear fog
    float fogFactor = 1.0 - exp(-fogDensity * vFogDepth); // Exponential fog

    // Blend the fragment color with the fog color
    vec3 finalColor = mix(grassColor, fogColor, fogFactor);

    gl_FragColor = vec4(finalColor, mask); // Use mask for transparency
}
