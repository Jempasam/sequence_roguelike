declare name "tavern";
declare description "a hero joins: two glasses bumping, a short hubbub around them";
declare duration "0.7";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
finish = library("../filters/finish.lib.dsp");

v0(u) = voice.filter(sfx.impact.bar(3300,.9), u);
v1(u) = voice.filter(sfx.impact.bar(2800,.8), u);
v2(u) = ((sfx.voice.babble(5,3,190,5,u) : sfx.filter.lpf(2200,.7)) * .6) * sfx.env.fadeio(.1, .35, u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.35
    + sfx.sequence.part(0.14, 0.64, v1, t) * 0.3
    + sfx.sequence.part(0, 1, v2, t) * 0.45
);

sound(t) = finish.filter(.5, .08, mix, t) * 2.8;

process(t) = sound(t);
