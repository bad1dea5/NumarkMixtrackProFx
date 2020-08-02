//
//
//

var MixtrackProFX = {};

//
//	initialization
//
MixtrackProFX.init = function(id, debug){
	//
	MixtrackProFX.effect = new components.ComponentContainer();
	MixtrackProFX.effect[1] = new MixtrackProFX.EffectUnit(1);
	MixtrackProFX.effect[2] = new MixtrackProFX.EffectUnit(2);
	
	//
	MixtrackProFX.deck = new components.ComponentContainer();
	MixtrackProFX.deck[1] = new MixtrackProFX.Deck(1, 0, MixtrackProFX.effect[1]);
	MixtrackProFX.deck[2] = new MixtrackProFX.Deck(2, 1, MixtrackProFX.effect[2]);
	
	MixtrackProFX.browse = new MixtrackProFX.Browse();
	MixtrackProFX.headGain = new MixtrackProFX.HeadGain();
	
	//
	var exitDemoSysex = [0xF0, 0x7E, 0x00, 0x06, 0x01, 0xF7];
	midi.sendSysexMsg(exitDemoSysex, exitDemoSysex.length);
	
	//
	var statusSysex = [0xF0, 0x00, 0x20, 0x7F, 0x03, 0x01, 0xF7];
	midi.sendSysexMsg(statusSysex, statusSysex.length);
	
	//	initialize channels
	for(var i = 0; i < 2; i++){
		//	LEDS
		midi.sendShortMsg(0x90 | i, 0x00, 0x01);	//	play
		midi.sendShortMsg(0x90 | i, 0x01, 0x01);	//	cue
		midi.sendShortMsg(0x90 | i, 0x02, 0x01);	//	sync
		midi.sendShortMsg(0x90 | i, 0x07, 0x01);	//	scratch
		midi.sendShortMsg(0x90 | i, 0x1B, 0x01);	//	pfl
		
		midi.sendShortMsg(0x94 | i, 0x00, 0x01);	//	cue
		midi.sendShortMsg(0x94 | i, 0x0D, 0x01);	//	auto
		midi.sendShortMsg(0x94 | i, 0x07, 0x01);	//	fader
		midi.sendShortMsg(0x94 | i, 0x0B, 0x01);	//	sample
		
		midi.sendShortMsg(0x94 | i, 0x34, 0x04);	//	half
		midi.sendShortMsg(0x94 | i, 0x35, 0x04);	//	double
		midi.sendShortMsg(0x94 | i, 0x40, 0x01);	//	loop
		
		//	wheel
		MixtrackProFX.wheel[i] = true;
	}
	
	//
	midi.sendShortMsg(0x88, 0x09, 0x01);	//	tap
	
	midi.sendShortMsg(0x88, 0x00, 0x01);	//	hpf
	midi.sendShortMsg(0x88, 0x01, 0x01);	//	lpf
	midi.sendShortMsg(0x88, 0x02, 0x01);	//	flanger	
	midi.sendShortMsg(0x89, 0x03, 0x01);	//	echo
	midi.sendShortMsg(0x89, 0x04, 0x01);	//	reverb
	midi.sendShortMsg(0x89, 0x05, 0x01);	//	phaser
	
	//	vumeters off
	midi.sendShortMsg(0xB0, 0x1F, 0x00);
	midi.sendShortMsg(0xB1, 0x1F, 0x00);
	
	//
	engine.makeConnection("[Channel1]", "VuMeter", MixtrackProFX.vuCallback);
    engine.makeConnection("[Channel2]", "VuMeter", MixtrackProFX.vuCallback);
};

//
//	shutdown
//
MixtrackProFX.shutdown = function(){
	var shutdownSysex = [0xF0, 0x00, 0x20, 0x7F, 0x02, 0xF7];
	midi.sendSysexMsg(shutdownSysex, shutdownSysex.length);
};

//
//	effect
//
MixtrackProFX.EffectUnit = function(unitNumber) {
	var eu = this;
    this.unitNumber = unitNumber;

    this.setCurrentUnit = function(newNumber) {
		this.currentUnitNumber = newNumber;
		this.group = '[EffectRack1_EffectUnit' + newNumber + ']';
		
		this.reconnectComponents(function(component) {
			var unitMatch = component.group.match(script.effectUnitRegEx);
			if (unitMatch !== null) {
				component.group = eu.group;
			} else {
				var effectMatch = component.group.match(script.individualEffectRegEx);
				if (effectMatch !== null) {
					component.group = '[EffectRack1_EffectUnit' +
					eu.currentUnitNumber +
					'_Effect' + effectMatch[2] + ']';
				}
			}
		});
	};
	
	this.setCurrentUnit(unitNumber);
	
	this.EffectEnableButton = function(number) {
		this.number = number;
		this.group = '[EffectRack1_EffectUnit' + eu.currentUnitNumber + '_Effect' + this.number + ']';
		this.midi = [0xB0 + eu.currentUnitNumber, this.number - 1];
		components.Button.call(this);
	};
	
	this.EffectEnableButton.prototype = new components.Button({
		type: components.Button.prototype.types.powerWindow,
		outKey: 'enabled',
		inKey: 'enabled',
	});
	
	this.enableButton = new this.EffectEnableButton(1);
	
	this.dryWetKnob = new components.Pot({
		group: this.group,
		inKey: 'mix',
	});
	
	this.forEachComponent(function(component) {
		if(component.group === undefined) {
			component.group = eu.group;
		}
	});
	
};
MixtrackProFX.EffectUnit.prototype = new components.ComponentContainer();

//
//	deck
//
MixtrackProFX.Deck = function(number, channel, effect){
	var deck = this;
	var eu = effect;
	
	components.Deck.call(this, number);
	
	this.playButton = new components.PlayButton({
		midi: [0x90 + channel, 0x00],
		off: 0x01,
		unshift: function() {
			components.PlayButton.prototype.unshift.call(this);
            this.type = components.Button.prototype.types.toggle;
		},
		shift: function() {
			this.inKey = 'play_stutter';
            this.type = components.Button.prototype.types.push;
		},
	});
	
	this.cueButton = new components.CueButton({
		midi: [0x90 + channel, 0x01],
		off: 0x01,
	});
	
	this.syncButton = new components.SyncButton({
		midi: [0x90 + channel, 0x02],
		off: 0x01,
	});
	
	this.pflButton = new components.Button({
		type: components.Button.prototype.types.toggle,
		midi: [0x90 + channel, 0x1B],
		off: 0x01,
		key: 'pfl',
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
		midi: [0xB0 + channel, 0x1C],
		group: this.currentDeck,
		inKey: 'volume',
	});
	
	this.EqEffectKnob = function(group, inKey, fxKey, filter){
		this.unshiftGroup = group;
		this.unshiftKey = inKey;
		this.fxKey = fxKey;
		
		if(filter) {
			this.shiftKey = 'super1';
		}
		
		this.ignoreNext = null;
		
		components.Pot.call(this, {
			group: group,
			inKey: inKey,
		});
	};
	this.EqEffectKnob.prototype = new components.Pot({
	});
	
	this.treble = new this.EqEffectKnob('[EqualizerRack1_' + this.currentDeck + '_Effect1]', 'parameter3', 'parameter3');
	this.mid = new this.EqEffectKnob('[EqualizerRack1_' + this.currentDeck + '_Effect1]', 'parameter2', 'parameter4');
	this.bass = new this.EqEffectKnob('[EqualizerRack1_' + this.currentDeck + '_Effect1]', 'parameter1', 'parameter5');
	
	this.filter = new this.EqEffectKnob(
		'[QuickEffectRack1_' + this.currentDeck + ']',
		'super1',
		'parameter1',
		true
	);
	
	this.gain = new this.EqEffectKnob(
		this.currentDeck,
		'pregain',
		'parameter2'
	);
	
	this.pitch = new components.Pot({
		inKey: 'rate',
		invert: true,
	});
	
	this.hotcueButton = new components.ComponentContainer();
	
	for(var i = 1; i <= 4; i++){
		this.hotcueButton[i] = new components.HotcueButton({
			midi: [0x94 + channel, 0x14 + i - 1],
			number: i,
			group: this.currentDeck,
			off: 0x01,
		});
	}
	
	this.shiftButton = new components.Button({
		midi: [0x90 + channel, 0x20, 0x80 + channel, 0x20],
		type: components.Button.prototype.types.powerWindow,
		state: false,
		inToggle: function(){
			this.state=!this.state;
			if(this.state){
				deck.shift();
				MixtrackProFX.browse.shift();
				//MixtrackProFX.headGain.shift();
				MixtrackProFX.effect.shift();
			} else {
				deck.unshift();
				MixtrackProFX.browse.unshift();
				//MixtrackProFX.headGain.unshift();
				MixtrackProFX.effect.unshift();
			}
		},
	});
	
	this.loop = new components.Button({
		group: this.currentDeck,
		off: 0x01,
		inKey: 'beatloop_4_toggle',
		unshift: function() {
			this.inKey = 'beatloop_4_toggle';
		},
		shift: function() {
			this.inKey = 'loop_enabled';
		},
	});
	
	this.loopHalf = new components.Button({
		group: this.currentDeck,
		inKey: 'loop_halve',
		unshift: function() {
			this.inKey = 'loop_halve';
		},
		shift: function() {
			this.inKey = 'loop_in';
		},
	});
	
	this.loopDouble = new components.Button({
		group: this.currentDeck,
		inKey: 'loop_double',
		unshift: function() {
			this.inKey = 'loop_double';
		},
		shift: function() {
			this.inKey = 'loop_out';
		},
	});
		
	this.reconnectComponents(function(component){
		if(component.group === undefined){
			component.group = this.currentDeck;
		}
	});
};
MixtrackProFX.Deck.prototype = new components.Deck();

//
//	browse
//
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
		unshift: function() {
			this.inKey = 'Move';
		},
		shift: function() {
			this.inKey = 'Scroll';
		},
	});

	this.button = new components.Button({
		group: '[Library]',
		inKey: 'GoToItem',
		unshift: function() {
			this.inKey = 'GoToItem';
		},
		shift: function() {
			this.inKey = 'MoveFocusForward';
		},
	});
};
MixtrackProFX.Browse.prototype = new components.ComponentContainer();

//
//
//
MixtrackProFX.HeadGain = function(){
	components.Pot.call(this);
};
MixtrackProFX.HeadGain.prototype = new components.Pot({
	group: '[Master]',
	inKey: 'headGain',
});

//
//
//
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

//
//
//
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

//
//
//
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

//
//
//
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

//
//
//
MixtrackProFX.vuCallback = function(value, group, control) {
	var level = value * 90;
	
	if(engine.getValue('[Channel1]', 'pfl')
		|| engine.getValue('[Channel2]', 'pfl'))
	{		
		if (group == '[Channel1]') {
			midi.sendShortMsg(0xB0, 0x1F, level);
		}
        else if (group == '[Channel2]') {
			midi.sendShortMsg(0xB1, 0x1F, level);
		}
	}
	else if (group == '[Channel1]') {
		midi.sendShortMsg(0xB0, 0x1F, level);
    }
    else if (group == '[Channel2]') {
		midi.sendShortMsg(0xB1, 0x1F, level);
    }
};
