declare name "great_chest";
declare description "cards given: a bigger chest, a longer rolling, a glint";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/chest.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");

v0(u) = voice.filter(latch.sound, u);
v1(u) = voice.filter(creak.sound, u);
v2(u) = voice.filter(sfx.impact.wood(160,0.8), u);
v3(u) = voice.filter(sfx.impact.roll_hits(9,4,0.3,sfx.impact.plastic,800), u);
v4(u) = voice.filter(bell_88.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.125, v0, t) * 0.7
    + sfx.sequence.part(0.1, 0.45, v1, t) * 0.5
    + sfx.sequence.part(0.425, 0.575, v2, t) * 0.6
    + sfx.sequence.part(0.5, 1, v3, t) * 0.5
    + sfx.sequence.part(0.65, 1, v4, t) * 0.3
);

sound(t) = category.filter(mix, t) * 1.7378;

process(t) = sound(t);
