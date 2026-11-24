declare name "dark_tavern";
declare description "a monster joins: a mug breaking, an out of tune fiddle";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");

v0(u) = voice.filter(sfx.impact.plastic(450,0.9), u);
v1(u) = voice.filter(\(u).(sfx.noise.hiss(4000) * sfx.env.decay(8,u) * 2), u);
v2(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(66.4)), u);
v3(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(71.4)), u);
v4(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(67.6)), u);

mix(t) = (
    sfx.sequence.part(0, 0.1875, v0, t) * 0.7
    + sfx.sequence.part(0, 0.1875, v1, t) * 0.5
    + sfx.sequence.part(0.3125, 0.5625, v2, t) * 0.5
    + sfx.sequence.part(0.5, 0.75, v3, t) * 0.5
    + sfx.sequence.part(0.6875, 1, v4, t) * 0.5
);

sound(t) = category.filter(mix, t) * 0.8222;

process(t) = sound(t);
