declare name "demon";
declare description "the deck glued in pairs: the pact spoken, the fire roaring, the seal burning";
declare duration "2.2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
boom = library("../lib/halt_voices/boom.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

v0(u) = voice.filter(sfx.sequence.seq3(sfx.voice.deep_say(7,0,80),sfx.voice.deep_say(1,4,75),sfx.voice.deep_say(10,0,70)), u);
v1(u) = voice.filter(sfx.fire.roar, u);
v2(u) = voice.filter(boom.sound, u);
v3(u) = voice.filter(sizzle.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.3636, v0, t) * 0.6
    + sfx.sequence.part(0.2727, 0.8182, v1, t) * 0.5
    + sfx.sequence.part(0.4545, 0.8182, v2, t) * 0.5
    + sfx.sequence.part(0.4545, 0.8182, v3, t) * 0.4
);

sound(t) = category.filter(mix, t) * 1.6218;

process(t) = sound(t);
