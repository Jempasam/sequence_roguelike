declare name "great_witch";
declare description "a potion given three times: three vials, a green flash";
declare duration "0.95";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
pour = library("../lib/halt_voices/pour.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(pour.sound, u);
v1(u) = voice.filter(pour.sound, u);
v2(u) = voice.filter(pour.sound, u);
v3(u) = voice.filter(zap.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3158, v0, t) * 0.5
    +     sfx.sequence.part(0.2105, 0.5263, v1, t) * 0.5
    +     sfx.sequence.part(0.4211, 0.7368, v2, t) * 0.5
    +     sfx.sequence.part(0.6316, 1.0000, v3, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
