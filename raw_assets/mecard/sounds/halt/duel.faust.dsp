declare name "duel";
declare description "a duel won: blades crossing, the victory gong";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");

v0(u) = voice.filter(sfx.impact.clash(700,.9), u);
v1(u) = voice.filter(sfx.impact.clash(900,.9), u);
v2(u) = voice.filter(sfx.orient.gong(130), u);

mix(t) = (
    sfx.sequence.part(0, 0.25, v0, t) * 0.8
    + sfx.sequence.part(0.09, 0.34, v1, t) * 0.7
    + sfx.sequence.part(0.35, 1, v2, t) * 0.6
);

sound(t) = category.filter(mix, t) * 1.7378;

process(t) = sound(t);
