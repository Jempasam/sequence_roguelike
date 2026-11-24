declare name "conductor";
declare description "a card moved to the start or end: baton tap, the orchestra retuning";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.impact.tick(3500,.9,u)*2), u);
v1(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(60),u)+sfx.inst.pad(ba.midikey2hz(64),u)+sfx.inst.pad(ba.midikey2hz(67),u)+sfx.inst.pad(ba.midikey2hz(72),u))*.5), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1231, v0, t) * 0.8
    +     sfx.sequence.part(0.1538, 1.0000, v1, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
