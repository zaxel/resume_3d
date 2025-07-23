precision highp float;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform float time;
uniform sampler2D perlinNoiseTexture;
uniform sampler2D heightMap;
uniform float terrainHeightScale;
uniform vec2 terrainSize;
uniform bool useHeightMap;
uniform vec3 cameraPosition;
uniform float bladeHeightUniform;
uniform float bladeWidthUniform;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 terPos;
attribute float bladeHeight;

uniform float minX;
uniform float minZ;
uniform sampler2D vegetationMaskTexture; // Black & White mask
uniform vec2 vegetationMaskSize; // Size of the mask in world units
uniform float grassRadius; // Maximum radius where grass appears

varying vec2 vUv;
varying vec3 vWorldPos;
varying float vFogDepth; // Distance from the camera to the vertex

vec4 quaterFromAxisAngle(vec3 axis, float angle) {
    float halfAngle = angle * 0.5;
    float s = sin(halfAngle);
    return vec4(axis * s, cos(halfAngle));
}

vec3 applyQuaternion(vec3 v, vec4 q) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec2 rotateUV(vec2 uv) {
    vec2 flippedUV = vec2(uv.x, 1.0 - uv.y);
    return flippedUV;
}

void main() {
    vUv = uv;

    // --- Sample the Grass Mask Texture --- //
    vec2 maskUV = (terPos.xz - vec2(minX, minZ)) / vegetationMaskSize;
    maskUV = clamp(maskUV, 0.0, 1.0); // Ensure it's within valid UV range

    // Rotate UVs by 180 degrees 
    maskUV = rotateUV(maskUV);

    float maskValue = texture2D(vegetationMaskTexture, maskUV).r; // Get grayscale value

    // --- Discard Grass if in a Forbidden Area --- //
    if (maskValue < 0.1) {
        gl_Position = vec4(1e6, 1e6, 1e6, 1.0); // Move vertex far away
        return;
    }

    // --- Calculate Distance from Camera --- //
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    worldPosition.xyz += terPos; // Apply instance position
    float distanceToCamera = length(worldPosition.xyz - cameraPosition);

    // --- Discard Grass if Outside Radius --- //
    float fadeDistance = 30.0; // Distance over which grass fades out
    float fadeFactor = smoothstep(grassRadius - fadeDistance, grassRadius, distanceToCamera);

    if (fadeFactor >= 1.0) {
        gl_Position = vec4(1e6, 1e6, 1e6, 1.0); // Move vertex far away
        return;
    }

    // --- SAMPLE HEIGHT MAP --- //
    vec2 terrainUV = (terPos.xz - vec2(minX, minZ)) / terrainSize;
    float terrainHeight = 0.0;
    if (useHeightMap) {
        terrainHeight = texture2D(heightMap, terrainUV).r * terrainHeightScale;
    }

    // --- SET BASE POSITION --- //
    vec3 basePos = vec3(0.0, terrainHeight, 0.0); // Bottom locked to terrain
    vec3 bladePos = position;

    // --- COMBINE BLADE HEIGHT ATTRIBUTE AND UNIFORM --- //
    float totalBladeHeight = bladeHeight * bladeHeightUniform;
    totalBladeHeight *= (1.0 - fadeFactor); // Apply fade-out to blade height
    bladePos.y *= totalBladeHeight; // Scale height
    bladePos.xz *= bladeWidthUniform; // Make the blade thinner

    // --- WIND BENDING --- //
    float noise = texture2D(perlinNoiseTexture, terPos.xz * 0.1).r;
    float phaseShift = (terPos.x + terPos.z) * 0.06;
    float wave = sin(time * 0.005 + phaseShift) * 0.3;
    float windStrength = (wave * 0.5) + (noise - 0.5) * 2.0; //0.8 

    vec3 bendingDirection = normalize(vec3(
        cos(terPos.x * 0.1 + time * 0.002 + noise * 2.0),
        0.0,
        sin(terPos.z * 0.1 + time * 0.002 + noise * 2.0)
    ));

    // Only bend the top part of the blade
    float bendFactor = smoothstep(0.0, 1.0, bladePos.y / totalBladeHeight);
    bendFactor = pow(bendFactor, 1.4); // Adjust strength of bending

    vec4 q = quaterFromAxisAngle(bendingDirection, windStrength * bendFactor);
    vec3 bentPos = applyQuaternion(bladePos, q);

    // Ensure the base remains fixed
    vec3 finalPos = mix(bladePos, bentPos, bendFactor);
    finalPos.y += terrainHeight;

    // --- BILLBOARDING --- //
    vec3 toCamera = normalize(cameraPosition - terPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
    if (abs(dot(toCamera, vec3(0.0, 1.0, 0.0))) > 0.99) {
        right = mix(vec3(1.0, 0.0, 0.0), right, smoothstep(0.0, 0.99, abs(dot(toCamera, vec3(0.0, 1.0, 0.0)))));
    }
    vec3 up = cross(toCamera, right);
    vec3 billboardedPos = finalPos.x * right + finalPos.z * up;
    billboardedPos.y = finalPos.y;

    // --- FINAL TRANSFORMATION --- //
    worldPosition = modelMatrix * vec4(billboardedPos, 1.0);
    worldPosition.xyz += terPos; // Apply instance position

    vFogDepth = length(worldPosition.xyz - cameraPosition); // Distance to camera

    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
}