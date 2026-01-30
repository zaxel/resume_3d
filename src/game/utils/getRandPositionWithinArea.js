export const getRandPositionWithinArea = ({ maxX = 400, minX = -400, maxY = 400, minY = -400, maxZ= 400, minZ= -400 }) => {
    const randX = Math.floor(Math.random() * (maxX - minX +1)) + minX ; 
    const randY = Math.floor(Math.random() * (maxY - minY +1)) + minY ; 
    const randZ = Math.floor(Math.random() * (maxZ - minZ +1)) + minZ ; 

    return [randX, randY, randZ];
}