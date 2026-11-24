declare name "great_chest";
declare description "cards given: a bigger chest with a longer rolling";
declare duration "1.15";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");

v0(u) = voice.filter(latch.sound, u);
v1(u) = voice.filter(sfx.impact.wood(200,.9), u);
v2(u) = voice.filter(sfx.impact.roll_hits(14,3,.35,sfx.impact.bar,2200), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2174, v0, t) * 0.8
    +     sfx.sequence.part(0.1304, 0.2609, v1, t) * 0.6
    +     sfx.sequence.part(0.2174, 1.0000, v2, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
