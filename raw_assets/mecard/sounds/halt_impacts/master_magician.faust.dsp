declare name "master_magician";
declare description "rare cards given: roll, harp and marimba, final flash";
declare duration "1.35";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
pluck_72 = library("../lib/halt_voices/pluck_72.lib.dsp");
pluck_79 = library("../lib/halt_voices/pluck_79.lib.dsp");
tom_150 = library("../lib/halt_voices/tom_150.lib.dsp");

v0(u) = voice.filter(tom_150.sound, u);
v1(u) = voice.filter(tom_150.sound, u);
v2(u) = voice.filter(tom_150.sound, u);
v3(u) = voice.filter(tom_150.sound, u);
v4(u) = voice.filter(pluck_72.sound, u);
v5(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(74)), u);
v6(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(76)), u);
v7(u) = voice.filter(pluck_79.sound, u);
v8(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(81)), u);
v9(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(84)), u);
v10(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(88)), u);
v11(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(91)), u);
v12(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(60)), u);
v13(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(62)), u);
v14(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(64)), u);
v15(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(67)), u);
v16(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(69)), u);
v17(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(72)), u);
v18(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(76)), u);
v19(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(79)), u);
v20(u) = voice.filter(\(u).(sfx.osc.fm(2093,1.41,1)*sfx.env.decay(7,u)*sfx.env.attack(.02,u)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.0741, v0, t) * 0.6
    +     sfx.sequence.part(0.0519, 0.1259, v1, t) * 0.6
    +     sfx.sequence.part(0.1037, 0.1778, v2, t) * 0.6
    +     sfx.sequence.part(0.1556, 0.2296, v3, t) * 0.6
    +     sfx.sequence.part(0.2222, 0.4444, v4, t) * 0.6
    +     sfx.sequence.part(0.2815, 0.5037, v5, t) * 0.6
    +     sfx.sequence.part(0.3407, 0.5630, v6, t) * 0.6
    +     sfx.sequence.part(0.4000, 0.6222, v7, t) * 0.6
    +     sfx.sequence.part(0.4593, 0.6815, v8, t) * 0.6
    +     sfx.sequence.part(0.5185, 0.7407, v9, t) * 0.6
    +     sfx.sequence.part(0.5778, 0.8000, v10, t) * 0.6
    +     sfx.sequence.part(0.6370, 0.8593, v11, t) * 0.6
    +     sfx.sequence.part(0.2222, 0.4444, v12, t) * 0.6
    +     sfx.sequence.part(0.2815, 0.5037, v13, t) * 0.6
    +     sfx.sequence.part(0.3407, 0.5630, v14, t) * 0.6
    +     sfx.sequence.part(0.4000, 0.6222, v15, t) * 0.6
    +     sfx.sequence.part(0.4593, 0.6815, v16, t) * 0.6
    +     sfx.sequence.part(0.5185, 0.7407, v17, t) * 0.6
    +     sfx.sequence.part(0.5778, 0.8000, v18, t) * 0.6
    +     sfx.sequence.part(0.6370, 0.8593, v19, t) * 0.6
    +     sfx.sequence.part(0.5926, 1.0000, v20, t) * 0.3
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
