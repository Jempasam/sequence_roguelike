declare name "merchant";
declare description "an item given: gold paid, the item handed over";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");

v0(u) = voice.filter(coin.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(79)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3077, v0, t) * 0.6
    +     sfx.sequence.part(0.1538, 0.4615, v1, t) * 0.6
    +     sfx.sequence.part(0.4615, 1.0000, v2, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
