
export class ChapterPagination {
    constructor(pages, marker, audioPlayer, onPageChange) {
        this.pages = pages;
        this.marker = marker;
        this.currentSpread = 0; 
        this.onPageChange = onPageChange;
        this.audioPlayer = audioPlayer;

        this.frontBtn = document.getElementById("btn-front");
        this.backBtn = document.getElementById("btn-back");
        this.pageContainer = document.getElementById("page-buttons");
        this.asideLinkContainer = document.querySelector(".chapter-aside");

        this.setFirstButtonHandler = this.setFirstButtonHandler.bind(this);
        this.setLastButtonHandler = this.setLastButtonHandler.bind(this);

        this.frontBtn.addEventListener("click", this.setFirstButtonHandler);
        this.backBtn.addEventListener("click", this.setLastButtonHandler);
        this.generateSideButtons();
        this.generatePageButtons();
        this.updateUI();
    }
    generateSideButtons(){
        const links = this.asideLinkContainer.children;
        if(links.length>1){
            Array.from(links).forEach((oldLink, i, links)=> i!==links.length-1 && oldLink.remove());
        }
        const initLinks = (n) => {
            for(let i=0; i<n; i++){
                const link = document.createElement("a");
                this.asideLinkContainer.prepend(link);
            }
        } 
        switch(this.marker){
            case "portfolio":
                initLinks(1);
                break;
            case "credits":
                initLinks(2);
                break;
            case "contacts":
                initLinks(3);
                break;
            default:
                initLinks(0);

        }
    }
    generatePageButtons() {
        this.pageContainer.innerHTML = "";
        for (let i = 1; i < this.pages.length; i++) {
            const btn = document.createElement("button");
            btn.classList.add("page-btn");
            btn.textContent = `Pages ${i * 2 - 1}-${i * 2}`;
            btn.addEventListener("click", () => this.setPage(i));
            this.pageContainer.appendChild(btn);
        }
    }
    setFirstButtonHandler(){
        this.setPage(0);
    }
    setLastButtonHandler(){
        this.setPage(this.pages.length);
    }
    
    destroy() {
        // Remove event listeners to avoid memory leaks
        this.frontBtn.removeEventListener("click", this.setFirstButtonHandler);
        this.backBtn.removeEventListener("click", this.setLastButtonHandler);
    
        // Remove all page buttons
        this.pageContainer.innerHTML = "";
      }
    updateUI() {
        this.frontBtn.disabled = this.currentSpread === 0;
        this.backBtn.disabled = this.currentSpread >= this.pages.length;

        [...this.pageContainer.children].forEach((btn, index) => {
            btn.classList.toggle("active", index === this.currentSpread-1);
        });
    }

    setPage(spread) {
        this.currentSpread = spread;
        this.onPageChange(spread);
        this.updateUI();
        this.playFlipSound();
    }
    playFlipSound(){
        if(this.audioPlayer)
            this.audioPlayer.playSound("./sounds/page-flip.mp3");
    }
}
