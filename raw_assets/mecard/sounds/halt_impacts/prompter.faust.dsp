declare name "prompter";
declare description "two cards swapped: the whispered permutation, two cards changing place";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
cloth_06 = library("../lib/halt_voices/cloth_06.lib.dsp");

v0(u) = voice.filter(sfx.voice.babble(5,3,180,6), u);
v1(u) = voice.filter(cloth_06.sound, u);
v2(u) = voice.filter(cloth_06.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.6
    +     sfx.sequence.part(0.4615, 0.7692, v1, t) * 0.8
    +     sfx.sequence.part(0.6154, 0.9231, v2, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
