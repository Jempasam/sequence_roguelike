declare name "witch";
declare description "a potion given: poured, a green flash";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
pour = library("../lib/halt_voices/pour.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(pour.sound, u);
v1(u) = voice.filter(zap.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.5385, v0, t) * 0.6
    +     sfx.sequence.part(0.5385, 1.0000, v1, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
