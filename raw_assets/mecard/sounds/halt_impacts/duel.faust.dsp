declare name "duel";
declare description "a duel won: blades crossing, the victory gong";
declare duration "1.05";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.impact.clash(600,.9), u);
v1(u) = voice.filter(sfx.orient.gong(250), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3810, v0, t) * 0.7
    +     sfx.sequence.part(0.3810, 1.0000, v1, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
