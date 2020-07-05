//
//
//

var MixtrackProFX = {};

//
//
//
MixtrackProFX.init = function(){
	
	//
	MixtrackProFX.deck = new components.ComponentContainer();
    MixtrackProFX.deck[1] = new MixtrackProFX.Deck(1, 0x00);
    MixtrackProFX.deck[2] = new MixtrackProFX.Deck(2, 0x01);
    
    MixtrackProFX.headGainMaster = new MixtrackProFX.headGain();
    
    //
    var ControllerStatusSysex = [0xF0, 0x00, 0x20, 0x7F, 0x03, 0x01, 0xF7];
	midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);
	
	ControllerStatusSysex = [0xF0, 0x7e, 0x00, 0x06, 0x01, 0xF7];
	midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);
	
	ControllerStatusSysex = [0xF0, 0x00, 0x20, 0x7f, 0x13, 0xF7];
	midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);
	
	midi.sendShortMsg(0x90, 0x00, 0x04);
	midi.sendShortMsg(0x90, 0x01, 0x04);
	midi.sendShortMsg(0x90, 0x02, 0x04);
	midi.sendShortMsg(0x90, 0x07, 0x04);
	midi.sendShortMsg(0x90, 0x1b, 0x04);
	
	midi.sendShortMsg(0x91, 0x00, 0x04);
	midi.sendShortMsg(0x91, 0x01, 0x04);
	midi.sendShortMsg(0x91, 0x02, 0x04);
	midi.sendShortMsg(0x91, 0x07, 0x04);
	midi.sendShortMsg(0x91, 0x1b, 0x04);
	
	midi.sendShortMsg(0x94, 0x00, 0x04);
	midi.sendShortMsg(0x94, 0x0d, 0x04);
	midi.sendShortMsg(0x94, 0x07, 0x04);
	midi.sendShortMsg(0x94, 0x0b, 0x04);
	midi.sendShortMsg(0x94, 0x34, 0x04);
	midi.sendShortMsg(0x94, 0x35, 0x04);
	midi.sendShortMsg(0x94, 0x40, 0x04);
	
	midi.sendShortMsg(0x95, 0x00, 0x04);
	midi.sendShortMsg(0x95, 0x0d, 0x04);
	midi.sendShortMsg(0x95, 0x07, 0x04);
	midi.sendShortMsg(0x95, 0x0b, 0x04);
	midi.sendShortMsg(0x95, 0x34, 0x04);
	midi.sendShortMsg(0x95, 0x35, 0x04);
	midi.sendShortMsg(0x95, 0x40, 0x04);
	
	midi.sendShortMsg(0x88, 0x00, 0x04);
	midi.sendShortMsg(0x88, 0x01, 0x04);
	midi.sendShortMsg(0x88, 0x02, 0x04);
	midi.sendShortMsg(0x88, 0x09, 0x04);
	
	midi.sendShortMsg(0x89, 0x03, 0x04);
	midi.sendShortMsg(0x89, 0x04, 0x04);
	midi.sendShortMsg(0x89, 0x05, 0x04);
	
	midi.sendShortMsg(0xb0, 0x1f, 0x00);
	midi.sendShortMsg(0xb1, 0x1f, 0x00);
	
	MixtrackProFX.browse = new MixtrackProFX.BrowseKnob();
	
	ControllerStatusSysex = [0xF0, 0x00, 0x20, 0x7F, 0x03, 0x01, 0xF7];
	midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);
	
	engine.makeConnection('[Channel1]', 'VuMeter', MixtrackPlatinum.vuCallback);
	engine.makeConnection('[Channel2]', 'VuMeter', MixtrackPlatinum.vuCallback);
	engine.makeConnection('[Master]', 'VuMeterL', MixtrackPlatinum.vuCallback);
    engine.makeConnection('[Master]', 'VuMeterR', MixtrackPlatinum.vuCallback);
};

//
//
//
MixtrackProFX.shutdown = function(){
	var byteArray = [0xF0, 0x00, 0x20, 0x7F, 0x02, 0xF7];
    midi.sendSysexMsg(byteArray, byteArray.length);
};

//
//
//
MixtrackProFX.Deck = function(deckNumber, midiChannel){
	
	this.active = (deckNumber == 1 || deckNumber == 2);
	
    components.Deck.call(this, deckNumber);
    
    this.playButton = new components.PlayButton([0x90 + midiChannel, 0x00]);
    this.cueButton = new components.CueButton([0x90 + midiChannel, 0x01]);
    this.syncButton = new components.SyncButton([0x90 + midiChannel, 0x02]);
    
    this.pflButton = new components.Button({
		midi: [0x90 + midiChannel, 0x1b],
		group: '[Channel'+ deckNumber +']',
		key: 'pfl',
		type: components.Button.prototype.types.toggle
    });
    
    this.loadButton = new components.Button({
        inKey: 'LoadSelectedTrack',
        shift: function() {
			this.inKey = 'LoadSelectedTrackAndPlay';
        },
        unshift: function() {
            this.inKey = 'LoadSelectedTrack';
        },
    });
    
    this.pitch = new components.Pot({
        inKey: 'rate',
        invert: true,
    });
    
    this.shiftButton = new components.Button({
		midi: [0x90, 0x20],
		type: components.Button.prototype.types.powerWindow,
		state: false,
		inToggle: function(){
			this.state=!this.state;
			
			if(this.state){
				MixtrackProFX.deck.shift();
				MixtrackProFX.browse.shift();
			} else {
				MixtrackProFX.deck.unshift();
				MixtrackProFX.browse.unshift();
			}
		},
	});
    
    this.hotcueButtons = new components.ComponentContainer();
    
    for(var i = 1; i <= 4; ++i){
		this.hotcueButtons[i] = new components.HotcueButton({
			midi: [0x94 + midiChannel, 0x14 + i - 1],
			number: i,
			group: '[Channel'+ deckNumber +']',
		});
	}
	this.hotcues = this.hotcueButtons;
    
    this.EqEffectKnob = function(group, in_key, fx_key){
		this.unshift_group = group;
        this.unshift_key = in_key;
        this.fx_key = fx_key;
        this.ignore_next = null;
        components.Pot.call(this, {
            group: group,
            inKey: in_key,
        });
	};
	this.EqEffectKnob.prototype = new components.Pot({
		input: function (channel, control, value, status, group){
			if (this.ignore_next) {
                engine.softTakeoverIgnoreNextValue(this.ignore_next.group, this.ignore_next.key);
                this.ignore_next = null;
            }
            components.Pot.prototype.input.call(this, channel, control, value, status, group);
		},
		connect: function(){
			for (var i = 1; i <= 3; i ++) {
                var group = '[EffectRack1_EffectUnit' + deckNumber + '_Effect' + i + ']';
                engine.softTakeover(group, this.fx_key, true);
            }
            components.Pot.prototype.connect.call(this);
		},
		unshift: function() {
            this.switchControl(this.unshift_group, this.unshift_key);
        },
        switchControl: function(group, key) {
            if (this.group != group || this.inKey != key) {
                this.ignore_next = { 'group': this.group, 'key': this.inKey };
            }
            this.group = group;
            this.inKey = key;
        },
	});
	
    this.eqTreble = new this.EqEffectKnob('[EqualizerRack1_[Channel' + deckNumber + ']_Effect1]', 'parameter3', 'parameter3');
    this.eqMid = new this.EqEffectKnob('[EqualizerRack1_[Channel' + deckNumber + ']_Effect1]', 'parameter2', 'parameter4');
	this.eqBass = new this.EqEffectKnob('[EqualizerRack1_[Channel' + deckNumber + ']_Effect1]', 'parameter1', 'parameter5');
	
	this.filter = new this.EqEffectKnob('[QuickEffectRack1_[Channel' + deckNumber + ']]', 'super1', 'parameter1', true);
	
    this.reconnectComponents(function(c){
		if(c.group === undefined){
			c.group = this.currentDeck;
		}
	});
};

MixtrackProFX.Deck.prototype = new components.Deck();

//
//
//
MixtrackProFX.BrowseKnob = function(){
    this.knob = new components.Encoder({
        group: '[Library]',
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

MixtrackProFX.BrowseKnob.prototype = new components.ComponentContainer();

//
//
//
MixtrackProFX.headGain = function(){
	components.Pot.call(this);
};
MixtrackProFX.headGain.prototype = new components.Pot({
	group: '[Master]',
	inKey: 'headGain',
});

//
//
//
MixtrackProFX.wheelTouch = function(channel, control, value, status, group){
	var direction;
	var newValue;
	
	if(value < 64){
		direction = true;
	} else {
		direction = false;
	}
	
	if(direction){
		newValue = value;
	} else {
		newValue = value - 128;
	}
	
	engine.setValue(group, 'jog', newValue * 0.1);
};

//
//
//
MixtrackProFX.vuCallback = function(value, group, control){
	var level = value * 80;
	
	print("====");
	print(level);
	
	midi.sendShortMsg(0xB0, 0x1F, level);
};
