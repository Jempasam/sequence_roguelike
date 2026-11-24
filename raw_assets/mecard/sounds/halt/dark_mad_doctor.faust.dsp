declare name "dark_mad_doctor";
declare description "a hero fused with a monster: the surgery discharge, the doctor laughs";
declare duration "2.2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(zap.sound, u);
v1(u) = voice.filter(rumble_120.sound, u);
v2(u) = voice.filter(sfx.voice.word_haha(90), u);

mix(t) = (
    sfx.sequence.part(0, 0.2273, v0, t) * 0.8
    + sfx.sequence.part(0, 0.4545, v1, t) * 0.3
    + sfx.sequence.part(0.4091, 0.8182, v2, t) * 0.6
);

sound(t) = category.filter(mix, t) * 0.6026;

process(t) = sound(t);
