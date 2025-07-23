export class Settings {
    constructor(Game){
        this._config = document.getElementById('config');
        this._features = document.querySelector('.c-main__features');
        this._lowPCBtn = document.querySelector('.c-main__lowPC-button');
        this._startBtn = document.querySelector('.c-footer__start-btn');
        
        this.settings = {
            fog: false,
            water: false,
            grass: false,
            sounds: false,
            music: false,
            stats: false,
            blades: false, 
            chicks: false
        };

        this.Game = Game;

        this._init();
    }
    _init(){
        
        this._startBtn.addEventListener("click", event=>{
            this._getSettings();
            this._config.classList.add("config-hide");

            if(this.Game)
                new this.Game(this.settings);
        })
        this._lowPCBtn.addEventListener("click", event=>{
            event.target.classList.toggle("config-active");
            if(event.target.classList.contains("config-active")){
                this._setCheckBoxes(false);
            }else{
                this._setCheckBoxes(true);
            }
        })
    }
    _getSettings(){
        Array.from(this._features.children).forEach(li=>{
            const checkbox = li.children[0];
            this.settings[checkbox.value] = checkbox.checked;
        })
    }
    _setCheckBoxes(status){
        Array.from(this._features.children).forEach(li=>{
            const checkbox = li.children[0];
            checkbox.checked = status;
        })
    }
    
}