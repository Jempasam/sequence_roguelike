declare name "tavern";
declare description "a hero joins: a light tavern hubbub, glasses bumping together here and there";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/trade.lib.dsp");

v0(u) = ((sfx.voice.babble(8,3,190,5,u) : sfx.filter.lpf(2200,.7)) * .6) * sfx.env.fadeio(.15, .25, u);
v1(u) = ((sfx.voice.babble(7,11,140,4,u) : sfx.filter.lpf(1500,.7)) * .6) * sfx.env.fadeio(.2, .25, u);
v2(u) = ((no.pink_noise : sfx.filter.bpf(900,.8)) * .5) * sfx.env.fadeio(.2, .3, u);
v3(u) = voice.filter(sfx.impact.bar(3300,.9), u);
v4(u) = voice.filter(sfx.impact.bar(2700,.8), u);
v5(u) = voice.filter(sfx.impact.bar(3800,.9), u);
v6(u) = voice.filter(sfx.impact.bar(3000,.7), u);

mix(t) = (
    sfx.sequence.part(0, 1, v0, t) * 0.5
    + sfx.sequence.part(0.05, 1, v1, t) * 0.45
    + sfx.sequence.part(0, 1, v2, t) * 0.3
    + sfx.sequence.part(0.12, 0.3, v3, t) * 0.35
    + sfx.sequence.part(0.33, 0.5, v4, t) * 0.3
    + sfx.sequence.part(0.52, 0.7, v5, t) * 0.3
    + sfx.sequence.part(0.72, 0.9, v6, t) * 0.3
);

sound(t) = category.filter(mix, t) * 2.8;

process(t) = sound(t);
