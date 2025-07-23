class FiniteStateMachine {
    constructor() {
        this._chickStates = {};
        this._chickCurState = null;
    }

    _addState(name, type) {
        this._chickStates[name] = type;
    }
    
    setState(name) {
        const chickPrevState = this._chickCurState;

        if (chickPrevState) {
            if (chickPrevState.Name == name) {
                return;
            }
            chickPrevState.exit();
        }
        const state = new this._chickStates[name](this);

        this._chickCurState = state;
        state.enter(chickPrevState);
    }

    update(timeElapsed, input) {

        if (this._chickCurState) {
            this._chickCurState.update(timeElapsed, input);
        }
    }
};

export class ChickFSM extends FiniteStateMachine {
    constructor(proxy, action) {
        super();
        this._proxy = proxy;
        this.chickAction = action;
        this._initStates();
    }

    _initStates() {
        this._addState('Idle_A', Idle_AState);
        this._addState('Idle_B', Idle_BState);
        this._addState('Idle_C', Idle_CState);
        this._addState('Run', RunState);
        this._addState('Eat', EatState);
        this._addState('Fly', FlyState);
        this._addState('Jump', JumpState);
        this._addState('Roll', RollState);
        this._addState('Sit', SitState);
        this._addState('Swim', SwimState);
        this._addState('Walk', WalkState);
    }
};

class State {
    constructor(parent) {
        this._parent = parent;
    }
    
    enter() { }
    exit() { }
    update(_, input) { 
        const nextAction = Object.keys(input).find(key=>input[key]);
        if(nextAction === this.Name) return;
        this._parent.setState(nextAction);
    }
};


class Idle_AState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Idle_A';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Idle_A'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class Idle_BState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Idle_B';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Idle_B'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class Idle_CState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Idle_C';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Idle_C'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};


class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Run';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Run'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class EatState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Eat';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Eat'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class FlyState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Fly';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Fly'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};


class JumpState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Jump';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Jump'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class RollState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Roll';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Roll'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class SitState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Sit';
    }

    enter(chickPrevState) {
        const idle_AAction = this._parent._proxy._animations['Sit'].action;
        
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};
class SwimState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'Swim';
    }

    enter(chickPrevState) {
     const idle_AAction = this._parent._proxy._animations['Swim'].action;   
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			idle_AAction.time = 0.0;
			idle_AAction.enabled = true;
			idle_AAction.setEffectiveTimeScale(1.0);
			idle_AAction.setEffectiveWeight(1.0);
			idle_AAction.crossFadeFrom(prevAction, 0.5, true);
			idle_AAction.play();
		} else {
			idle_AAction.play();
		}
    }

    exit() {
    }

    update(_, input) {
        super.update(_, input);
    }
};

class WalkState extends State {
	constructor(parent) {
		super(parent);
	}

	get Name() {
		return 'Walk';
	}

	enter(chickPrevState) {
		const curAction = this._parent._proxy._animations['Walk'].action;
		if (chickPrevState) {
			const prevAction = this._parent._proxy._animations[chickPrevState.Name].action;
			curAction.time = 0.0;
			curAction.enabled = true;
			curAction.setEffectiveTimeScale(1.0);
			curAction.setEffectiveWeight(1.0);
			curAction.crossFadeFrom(prevAction, 0.5, true);
			curAction.play();
		} else {
			curAction.play();
            console.log(curAction)
		}
	}

	exit() {
	}

	update(_, input) {
		super.update(_, input);
	}
};