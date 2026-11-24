declare name "chest";
declare description "a card given: latch, lid, the contents rolling";
declare duration "1.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/chest.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");

v0(u) = voice.filter(latch.sound, u);
v1(u) = voice.filter(creak.sound, u);
v2(u) = voice.filter(sfx.impact.wood(200,0.8), u);
v3(u) = voice.filter(sfx.impact.roll_hits(5,3,0.3,sfx.impact.plastic,900), u);

mix(t) = (
    sfx.sequence.part(0, 0.1786, v0, t) * 0.7
    + sfx.sequence.part(0.1429, 0.4286, v1, t) * 0.5
    + sfx.sequence.part(0.3929, 0.5714, v2, t) * 0.6
    + sfx.sequence.part(0.5, 1, v3, t) * 0.5
);

sound(t) = category.filter(mix, t) * 2.0417;

process(t) = sound(t);
