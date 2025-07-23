export function makeQuaternion({ x = 0, y = 0, z = 0 } = {}) {
    // Convert degrees to radians
    const toRad = (deg) => (deg * Math.PI) / 180;
    const cx = Math.cos(toRad(x) / 2);
    const sx = Math.sin(toRad(x) / 2);
    const cy = Math.cos(toRad(y) / 2);
    const sy = Math.sin(toRad(y) / 2);
    const cz = Math.cos(toRad(z) / 2);
    const sz = Math.sin(toRad(z) / 2);

    // Quaternion calculation (XYZ order)
    return {
        w: cx * cy * cz + sx * sy * sz,
        x: sx * cy * cz - cx * sy * sz,
        y: cx * sy * cz + sx * cy * sz,
        z: cx * cy * sz - sx * sy * cz,
    };
}