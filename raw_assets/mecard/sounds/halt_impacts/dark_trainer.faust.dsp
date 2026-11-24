declare name "dark_trainer";
declare description "a boss ally joins: a muffled blow, chains put on";
declare duration "0.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

v0(u) = voice.filter(thud.sound, u);
v1(u) = voice.filter(sfx.impact.scrape(900), u);
v2(u) = voice.filter(sfx.impact.metal(700,.8), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2500, v0, t) * 0.8
    +     sfx.sequence.part(0.2500, 0.9167, v1, t) * 0.6
    +     sfx.sequence.part(0.2500, 1.0000, v2, t) * 0.4
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
