declare name "dark_demon";
declare description "a monster taken for the deck: the demon speaks, the bargain chord";
declare duration "0.95";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.voice.deep_say(0,4,75), u);
v1(u) = voice.filter(sfx.voice.deep_say(0,0,70), u);
v2(u) = voice.filter(sfx.voice.deep_say(0,5,65), u);
v3(u) = voice.filter(\(u).((sfx.inst.organ(ba.midikey2hz(48),u)+sfx.inst.organ(ba.midikey2hz(51),u)+sfx.inst.organ(ba.midikey2hz(55),u))*.5), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1579, v0, t) * 1
    +     sfx.sequence.part(0.1368, 0.2947, v1, t) * 1
    +     sfx.sequence.part(0.2737, 0.4211, v2, t) * 1
    +     sfx.sequence.part(0.4211, 1.0000, v3, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
