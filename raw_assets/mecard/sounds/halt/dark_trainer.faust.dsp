declare name "dark_trainer";
declare description "a boss ally joins: a muffled blow, chains put on";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.perc.kick(u) : sfx.filter.lpf(200,.7)), u);
v1(u) = voice.filter(sfx.sequence.euclid(6,8,0,sfx.impact.metal(2000,0.6)), u);
v2(u) = voice.filter(sfx.perc.clang(120), u);

mix(t) = (
    sfx.sequence.part(0, 0.2222, v0, t) * 0.8
    + sfx.sequence.part(0.2222, 0.7778, v1, t) * 0.4
    + sfx.sequence.part(0.7222, 1, v2, t) * 0.6
);

sound(t) = category.filter(mix, t) * 1.4289;

process(t) = sound(t);
