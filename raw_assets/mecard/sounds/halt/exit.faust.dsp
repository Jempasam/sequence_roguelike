declare name "exit";
declare description "the floor entered: three steps, the door opening and shutting";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");

v0(u) = voice.filter(sfx.nature.footstep(3), u);
v1(u) = voice.filter(sfx.nature.footstep(4), u);
v2(u) = voice.filter(sfx.nature.footstep(5), u);
v3(u) = voice.filter(creak.sound, u);
v4(u) = voice.filter(latch.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.1563, v0, t) * 0.7
    + sfx.sequence.part(0.175, 0.3312, v1, t) * 0.7
    + sfx.sequence.part(0.35, 0.5062, v2, t) * 0.7
    + sfx.sequence.part(0.5, 0.875, v3, t) * 0.5
    + sfx.sequence.part(0.8125, 1, v4, t) * 0.5
);

sound(t) = category.filter(mix, t) * 1.6218;

process(t) = sound(t);
