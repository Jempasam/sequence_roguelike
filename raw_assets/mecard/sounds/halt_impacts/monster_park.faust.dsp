declare name "monster_park";
declare description "a monster ally joins: the cage opens, the monster comes out";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.impact.metal(500,.8), u);
v1(u) = voice.filter(sfx.voice.grunt(110), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.7692, v0, t) * 0.6
    +     sfx.sequence.part(0.2308, 0.9231, v1, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
