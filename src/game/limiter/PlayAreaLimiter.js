export class PlayAreaLimiter{
    constructor(limits, character){
        this.limits = limits;
        this.character = character;
        this.limitAnimationPlaying = false;
        this.keys = this.character.basicController._input.keys;
        this.btnPressedController = this.character.basicController._input;
        this.updated = 0;
    }
    
    setLimitAreaReachedAct(){
        if(!this.keys.limitAreaReachedAct){
            this.btnPressedController.limitAreaReachedAct = true;
        }
    }
   
    update(deltaTime){
        this.updated++;
        if(this.updated%30) return;
        if(this.limitAnimationPlaying) return;
        const position = this.character.rigidBody.translation();
        
        if(position.x < this.limits.maxX && position.x > this.limits.minX && position.z < this.limits.maxZ && position.z > this.limits.minZ)
            return;

        this.setLimitAreaReachedAct();
    }
}