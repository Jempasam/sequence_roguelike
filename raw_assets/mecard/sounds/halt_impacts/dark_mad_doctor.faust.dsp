declare name "dark_mad_doctor";
declare description "a hero fused with a monster: the surgery discharge, the doctor laughs";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(zap.sound, u);
v1(u) = voice.filter(sfx.voice.word_haha(260), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4000, v0, t) * 0.6
    +     sfx.sequence.part(0.4000, 1.0000, v1, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
