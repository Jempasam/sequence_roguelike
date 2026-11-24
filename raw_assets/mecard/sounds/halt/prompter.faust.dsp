declare name "prompter";
declare description "two cards swapped: the whispered permutation, two cards changing place";
declare duration "1.5";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");

v0(u) = voice.filter(\(u).((sfx.voice.babble(5,3,180,4,u) : sfx.filter.lpf(1800,.7)) * .6 + sfx.noise.hiss(2500) * .05), u);
v1(u) = voice.filter(cloth_05.sound, u);
v2(u) = voice.filter(cloth_05.sound, u);
v3(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(64)), u);

mix(t) = (
    sfx.sequence.part(0, 0.5333, v0, t) * 0.3
    + sfx.sequence.part(0.5333, 0.7333, v1, t) * 0.5
    + sfx.sequence.part(0.6333, 0.8333, v2, t) * 0.5
    + sfx.sequence.part(0.6667, 1, v3, t) * 0.4
);

sound(t) = category.filter(mix, t) * 2.3442;

process(t) = sound(t);
