declare name "chest";
declare description "a card given: latch, lid, contents rolling";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");

v0(u) = voice.filter(latch.sound, u);
v1(u) = voice.filter(sfx.impact.wood(220,.9), u);
v2(u) = voice.filter(sfx.impact.roll_hits(7,3,.35,sfx.impact.bar,2200), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3333, v0, t) * 0.8
    +     sfx.sequence.part(0.2667, 0.4000, v1, t) * 0.6
    +     sfx.sequence.part(0.4000, 1.0000, v2, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
