declare name "trainer";
declare description "an ally joins: two dummy blows, the gong";
declare duration "0.95";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.impact.wood(180,.9), u);
v1(u) = voice.filter(sfx.impact.wood(160,.9), u);
v2(u) = voice.filter(sfx.orient.gong(200), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2105, v0, t) * 0.8
    +     sfx.sequence.part(0.2105, 0.4211, v1, t) * 0.8
    +     sfx.sequence.part(0.4211, 1.0000, v2, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
