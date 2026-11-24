declare name "demon";
declare description "the deck glued in pairs: the pact spoken, the seal burning";
declare duration "1";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
boom = library("../lib/halt_voices/boom.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

v0(u) = voice.filter(sfx.voice.deep_say(0,4,80), u);
v1(u) = voice.filter(sfx.voice.deep_say(0,0,72), u);
v2(u) = voice.filter(sfx.voice.deep_say(0,5,66), u);
v3(u) = voice.filter(boom.sound, u);
v4(u) = voice.filter(sizzle.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2000, v0, t) * 1
    +     sfx.sequence.part(0.1700, 0.3700, v1, t) * 1
    +     sfx.sequence.part(0.3400, 0.5400, v2, t) * 1
    +     sfx.sequence.part(0.5000, 1.0000, v3, t) * 0.8
    +     sfx.sequence.part(0.5000, 0.9000, v4, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
