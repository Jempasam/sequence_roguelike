declare name "master_trainer";
declare description "a master ally joins: three blows, a horn and a chord";
declare duration "1.25";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.impact.wood(170,.9), u);
v1(u) = voice.filter(sfx.impact.wood(170,.9), u);
v2(u) = voice.filter(sfx.impact.wood(170,.9), u);
v3(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(55)), u);
v4(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(55),u)+sfx.inst.pad(ba.midikey2hz(59),u)+sfx.inst.pad(ba.midikey2hz(62),u)+sfx.inst.pad(ba.midikey2hz(67),u))*.5), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1600, v0, t) * 0.8
    +     sfx.sequence.part(0.1600, 0.3200, v1, t) * 0.8
    +     sfx.sequence.part(0.3200, 0.4800, v2, t) * 0.8
    +     sfx.sequence.part(0.4800, 1.0000, v3, t) * 0.6
    +     sfx.sequence.part(0.4800, 1.0000, v4, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
