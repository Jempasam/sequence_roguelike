declare name "dark_tavern";
declare description "a monster joins: a mug breaking, an out of tune fiddle";
declare duration "0.85";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.impact.plastic(300,.8), u);
v1(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(63.6)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2941, v0, t) * 0.8
    +     sfx.sequence.part(0.2353, 1.0000, v1, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
