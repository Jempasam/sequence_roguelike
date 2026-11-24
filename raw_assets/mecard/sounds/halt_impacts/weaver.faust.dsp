declare name "weaver";
declare description "two cards woven: the shuttle, then the thread plucked taut";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
cloth_06 = library("../lib/halt_voices/cloth_06.lib.dsp");
pluck_67 = library("../lib/halt_voices/pluck_67.lib.dsp");

v0(u) = voice.filter(cloth_06.sound, u);
v1(u) = voice.filter(cloth_06.sound, u);
v2(u) = voice.filter(pluck_67.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2000, v0, t) * 0.8
    +     sfx.sequence.part(0.2000, 0.4000, v1, t) * 0.8
    +     sfx.sequence.part(0.4667, 1.0000, v2, t) * 1
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
