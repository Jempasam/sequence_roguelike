declare name "great_hospital";
declare description "full heal: monitor, then a long healing chord";
declare duration "1.25";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
beep_880 = library("../lib/halt_voices/beep_880.lib.dsp");

v0(u) = voice.filter(sfx.mech.beep(660), u);
v1(u) = voice.filter(beep_880.sound, u);
v2(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(60),u)+sfx.inst.pad(ba.midikey2hz(64),u)+sfx.inst.pad(ba.midikey2hz(67),u)+sfx.inst.pad(ba.midikey2hz(72),u))*.5), u);
v3(u) = voice.filter(\(u).((sfx.inst.bell(ba.midikey2hz(72),u)+sfx.inst.bell(ba.midikey2hz(79),u))*.5), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1600, v0, t) * 0.5
    +     sfx.sequence.part(0.1600, 0.3200, v1, t) * 0.5
    +     sfx.sequence.part(0.3200, 1.0000, v2, t) * 0.7
    +     sfx.sequence.part(0.3200, 1.0000, v3, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
