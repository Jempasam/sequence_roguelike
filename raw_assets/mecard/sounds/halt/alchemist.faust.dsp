declare name "alchemist";
declare description "two upgraded copies: the potion bubbles, a glass note per copy";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

v0(u) = voice.filter(sfx.water.bubbling(8,2), u);
v1(u) = voice.filter(bell_88.sound, u);
v2(u) = voice.filter(sfx.inst.bell(ba.midikey2hz(91)), u);
v3(u) = voice.filter(sizzle.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.6667, v0, t) * 0.5
    + sfx.sequence.part(0.3889, 0.6111, v1, t) * 0.5
    + sfx.sequence.part(0.5556, 0.7778, v2, t) * 0.5
    + sfx.sequence.part(0.7222, 1, v3, t) * 0.4
);

sound(t) = category.filter(mix, t) * 2.138;

process(t) = sound(t);
