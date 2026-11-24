declare name "trainer";
declare description "an ally joins: two dummy blows, the gong";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");

v0(u) = voice.filter(sfx.impact.wood(500,0.8), u);
v1(u) = voice.filter(sfx.impact.wood(500,0.8), u);
v2(u) = voice.filter(sfx.orient.gong(120), u);

mix(t) = (
    sfx.sequence.part(0, 0.1563, v0, t) * 0.7
    + sfx.sequence.part(0.1563, 0.3125, v1, t) * 0.7
    + sfx.sequence.part(0.375, 1, v2, t) * 0.6
);

sound(t) = category.filter(mix, t) * 2.0184;

process(t) = sound(t);
