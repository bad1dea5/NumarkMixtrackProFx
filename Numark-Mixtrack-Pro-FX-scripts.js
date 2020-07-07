//
//
//

var MixtrackProFX = {};

MixtrackProFX.init = function(id, debug){
	//
	MixtrackProFX.deck = new components.ComponentContainer();
	MixtrackProFX.deck[1] = new MixtrackProFX.Deck(1, 0);
	MixtrackProFX.deck[2] = new MixtrackProFX.Deck(2, 1);
	
	MixtrackProFX.browse = new MixtrackProFX.Browse();
	MixtrackProFX.headphones = new MixtrackProFX.Headphone();
	
	//
	var exitDemoSysex = [0xF0, 0x7e, 0x00, 0x06, 0x01, 0xF7];
	midi.sendSysexMsg(exitDemoSysex, exitDemoSysex.length);
	
	//
	var statusSysex = [0xF0, 0x00, 0x20, 0x7F, 0x03, 0x01, 0xF7];
	midi.sendSysexMsg(statusSysex, statusSysex.length);
	
	// initialize channels
	for(var i = 0; i < 2; i++){
		// LEDS
		midi.sendShortMsg(0x90 | i, 0x00, 0x04);
		midi.sendShortMsg(0x90 | i, 0x01, 0x04);
		midi.sendShortMsg(0x90 | i, 0x02, 0x04);
		midi.sendShortMsg(0x90 | i, 0x07, 0x04);
		midi.sendShortMsg(0x90 | i, 0x1B, 0x04);
		
		midi.sendShortMsg(0x94 | i, 0x00, 0x04);
		midi.sendShortMsg(0x94 | i, 0x0d, 0x04);
		midi.sendShortMsg(0x94 | i, 0x07, 0x04);
		midi.sendShortMsg(0x94 | i, 0x0b, 0x04);
		midi.sendShortMsg(0x94 | i, 0x34, 0x04);
		midi.sendShortMsg(0x94 | i, 0x35, 0x04);
		midi.sendShortMsg(0x94 | i, 0x40, 0x04);
		
		// wheel
		MixtrackProFX.wheel[i] = true;
	}
	
	//
	midi.sendShortMsg(0x88, 0x00, 0x04);	// HPF
	midi.sendShortMsg(0x88, 0x01, 0x04);	// LPF
	midi.sendShortMsg(0x88, 0x02, 0x04);	// Flanger
	midi.sendShortMsg(0x88, 0x09, 0x04);	// Tap
	
	midi.sendShortMsg(0x89, 0x03, 0x04);	// Echo
	midi.sendShortMsg(0x89, 0x04, 0x04);	// Reverb
	midi.sendShortMsg(0x89, 0x05, 0x04);	// Phaser
	
	// vumeters off
	midi.sendShortMsg(0xb0, 0x1f, 0x00);
	midi.sendShortMsg(0xb1, 0x1f, 0x00);
};

MixtrackProFX.shutdown = function(){
	//	shutdown message
	var shutdownSysex = [0xF0, 0x00, 0x20, 0x7F, 0x02, 0xF7];
	midi.sendSysexMsg(shutdownSysex, shutdownSysex.length);
};

MixtrackProFX.Deck = function(deckNumber, midiChannel){
	//
	components.Deck.call(this, deckNumber);
	
	var instance = this;
	
	this.playButton = new components.PlayButton([0x90 + midiChannel, 0x00]);
	this.cueButton = new components.CueButton([0x90 + midiChannel, 0x01]);
    this.syncButton = new components.SyncButton([0x90 + midiChannel, 0x02]);
    this.pflButton = new components.Button({
		midi: [0x90 + midiChannel, 0x1B],
		key: 'pfl',
		type: components.Button.prototype.types.toggle,
    });
    
    this.loadButton = new components.Button({
		inKey: 'LoadSelectedTrack',
		shift: function(){
			this.inKey = 'LoadSelectedTrackAndPlay';
		},
		unshift: function(){
			this.inKey = 'LoadSelectedTrack';
		},
	});
    
    this.volume = new components.Pot({
        midi: [0xB0 + midiChannel, 0x1c],
        inKey: 'volume',
    });
    
    this.EqEffect = function(group, in_key){
        components.Pot.call(this, {
            group: group,
            inKey: in_key,
        });
	};
	this.EqEffect.prototype = new components.Pot();
	
	this.treble = new this.EqEffect('[EqualizerRack1_' + this.currentDeck + '_Effect1]', 'parameter3');
    this.mid = new this.EqEffect('[EqualizerRack1_' + this.currentDeck + '_Effect1]', 'parameter2');
	this.bass = new this.EqEffect('[EqualizerRack1_' + this.currentDeck + '_Effect1]', 'parameter1');
	
	this.filter = new this.EqEffect('[QuickEffectRack1_' + this.currentDeck + ']', 'super1', true);
	this.gain = new this.EqEffect(this.currentDeck, 'pregain');
	
	this.pitch = new components.Pot({
		inKey: 'rate',
		invert: true,
	});
	
	this.hotcue = new components.ComponentContainer();
	
	for(var i = 1; i <= 4; i++){
		this.hotcue[i] = new components.HotcueButton({
			midi: [0x94 + midiChannel, 0x14 + i - 1],
			number: i,
			group: this.currentDeck,
		});
	}
	
	this.shiftButton = new components.Button({
		midi: [0x90 + midiChannel, 0x20, 0x80 + midiChannel, 0x20],
		type: components.Button.prototype.types.powerWindow,
		state: false,
		inToggle: function(){
			this.state=!this.state;
			if(this.state){
				instance.shift();
			} else {
				instance.unshift();
			}
		},
	});
	    
    this.reconnectComponents(function(component){
		if(component.group === undefined){
			component.group = this.currentDeck;
		}
	});
};
MixtrackProFX.Deck.prototype = new components.Deck();

MixtrackProFX.Browse = function(){
    this.knob = new components.Encoder({
        group: '[Library]',
        inKey: 'Move',
        input: function (channel, control, value, status, group) {
            if (value === 1) {
                engine.setParameter(this.group, this.inKey + 'Down', 1);
            } else if (value === 127) {
                engine.setParameter(this.group, this.inKey + 'Up', 1);
            }
        },
    });

    this.button = new components.Button({
        group: '[Library]',
        inKey: 'GoToItem',
    });
};
MixtrackProFX.Browse.prototype = new components.ComponentContainer();

MixtrackProFX.Headphone = function(){
	this.gain = new components.Pot({
		group: '[Master]',
		inKey: 'headGain',
	});
};
MixtrackProFX.Headphone.prototype = new components.ComponentContainer();

MixtrackProFX.wheel = [];
MixtrackProFX.wheelToggle = function(channel, control, value, status, group){
	if(value != 0x7F){
		return;
	}
	
	MixtrackProFX.wheel[channel] = !MixtrackProFX.wheel[channel];
	
	var onOff = 0x01;
	
	if(MixtrackProFX.wheel[channel]){
		onOff = 0x7F;
	}
	
	midi.sendShortMsg(0x90 | channel, 0x07, onOff);
};

MixtrackProFX.scratch_timer = [];
MixtrackProFX.scratch_tick = [];
MixtrackProFX.startScratchTimer = function(deck){
	if(MixtrackProFX.scratch_timer[deck]){
		return;
	}
	
	MixtrackProFX.scratch_tick[deck] = 0;
	MixtrackProFX.scratch_timer[deck] = engine.beginTimer(20, function(){
        MixtrackProFX.scratchTimerCallback(deck);
    });
};

MixtrackProFX.stopScratchTimer = function(deck){
	if(MixtrackProFX.scratch_timer[deck]){
        engine.stopTimer(MixtrackProFX.scratch_timer[deck]);
    }
    
    MixtrackProFX.scratch_timer[deck] = null;
};

MixtrackProFX.resetScratchTimer = function(deck, tick){
	if(!MixtrackProFX.scratch_timer[deck]){
		return;
	}
	
	MixtrackProFX.scratch_tick[deck] = tick;
};

MixtrackProFX.scratchTimerCallback = function(deck){
	if((MixtrackProFX.scratch_direction[deck]
		&& Math.abs(MixtrackProFX.scratch_tick[deck]) > 2)
        || (!MixtrackProFX.scratch_direction[deck]
            && Math.abs(MixtrackProFX.scratch_tick[deck]) > 1))
    {
        MixtrackProFX.scratch_tick[deck] = 0;
        return;
    }
    
    MixtrackProFX.scratchDisable(deck);
};

MixtrackProFX.scratchEnable = function(deck){
	var alpha = 1.0/8;
	var beta = alpha/32;
	
	engine.scratchEnable(deck, 1240, 33+1/3, alpha, beta);
	
	MixtrackProFX.stopScratchTimer(deck);
};

MixtrackProFX.scratchDisable = function(deck){
	MixtrackProFX.searching[deck] = false;
	MixtrackProFX.stopScratchTimer(deck);
	engine.scratchDisable(deck, false);
};

MixtrackProFX.scratch_direction = [null, null, null];
MixtrackProFX.scratch_accumulator = [0, 0, 0];
MixtrackProFX.last_scratch_tick = [0, 0, 0];
MixtrackProFX.wheelTurn = function(channel, control, value, status, group){
	var deck = channel + 1;
	var direction;
	var newValue;
	
	if(value < 64){
		direction = true;
	} else {
		direction = false;
	}
	
	var delta = Math.abs(MixtrackProFX.last_scratch_tick[deck] - value);
    if (MixtrackProFX.scratch_direction[deck] !== null && MixtrackProFX.scratch_direction[deck] != direction && delta < 64) {
        direction = !direction;
    }
    
    if (direction) {
        newValue = value;
    } else {
        newValue = value - 128;
    }
    
    if(MixtrackProFX.searching[deck]){
		var position = engine.getValue(group, 'playposition');
		
		if(position <= 0){
			position = 0;
		}
		if(position >= 1){
			position = 1;
		}
		
		engine.setValue(group, 'playposition', position + newValue * 0.0001);
		MixtrackProFX.resetScratchTimer(deck, newValue);
		
		return;
	}
	
	if(MixtrackProFX.scratch_direction[deck] === null){
		MixtrackProFX.scratch_direction[deck] = direction;
	}
	else if(MixtrackProFX.scratch_direction[deck] != direction){
		if(!MixtrackProFX.touching[deck]){
			MixtrackProFX.scratchDisable(deck);
		}
		
		MixtrackProFX.scratch_accumulator[deck] = 0;
	}
	
	MixtrackProFX.last_scratch_tick[deck] = value;
    MixtrackProFX.scratch_direction[deck] = direction;
    MixtrackProFX.scratch_accumulator[deck] += Math.abs(newValue);
    
    //
    //
    //
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, newValue);
        MixtrackProFX.resetScratchTimer(deck, newValue);
	}
	else if(MixtrackProFX.shift){
		if (MixtrackProFX.scratch_accumulator[deck] > 61) {
            MixtrackProFX.scratch_accumulator[deck] -= 61;
            if (direction) { // forward
                engine.setParameter(group, 'beatjump_1_forward', 1);
            } else {
                engine.setParameter(group, 'beatjump_1_backward', 1);
            }
        }
	} else {
		engine.setValue(group, 'jog', newValue * 0.1);
	}
};

MixtrackProFX.touching = [false, false, false];
MixtrackProFX.searching = [false, false, false];
MixtrackProFX.wheelTouch = function(channel, control, value, status, group){
	var deck = channel + 1;
	
	if(!MixtrackProFX.shift
		&& !MixtrackProFX.searching[deck]
		&& !MixtrackProFX.wheel[channel]
		&& value != 0)
	{
		return;
	}
	
	MixtrackProFX.touching[deck] = 0x7F == value;
	
	if(value === 0x7F
		&& !MixtrackProFX.shift
		&& !MixtrackProFX.searching[deck])
	{
		MixtrackProFX.scratchEnable(deck);
	}
	else if(value === 0x7F
		&& (MixtrackProFX.shift
		|| MixtrackProFX.searching[deck]))
	{
		MixtrackProFX.scratchDisable(deck);
		MixtrackProFX.searching[deck] = true;
		MixtrackProFX.stopScratchTimer(deck);
	}
	else {
		MixtrackProFX.startScratchTimer(deck);
	}
};
