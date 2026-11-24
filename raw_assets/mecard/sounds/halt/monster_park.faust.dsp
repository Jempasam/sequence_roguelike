declare name "monster_park";
declare description "a monster ally joins: the cage opens, the monster comes out";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");

v0(u) = voice.filter(sfx.impact.metal(700,0.8), u);
v1(u) = voice.filter(latch.sound, u);
v2(u) = voice.filter(creak.sound, u);
v3(u) = voice.filter(sfx.voice.grunt(100), u);
v4(u) = voice.filter(sfx.impact.stone(120,0.8), u);

mix(t) = (
    sfx.sequence.part(0, 0.2222, v0, t) * 0.6
    + sfx.sequence.part(0.1667, 0.3333, v1, t) * 0.5
    + sfx.sequence.part(0.2222, 0.5, v2, t) * 0.4
    + sfx.sequence.part(0.5, 0.7778, v3, t) * 0.6
    + sfx.sequence.part(0.7778, 0.9722, v4, t) * 0.5
);

sound(t) = category.filter(mix, t) * 2.3988;

process(t) = sound(t);
