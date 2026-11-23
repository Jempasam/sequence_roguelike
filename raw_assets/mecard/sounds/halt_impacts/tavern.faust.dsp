declare name "tavern";
declare description "a hero joins: two glasses bumping, a short hubbub around them";
declare duration "0.7";

import("sfx.lib");

v0(u) = (sfx.impact.bar(3300,.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.bar(2800,.8,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = ((sfx.voice.babble(5,3,190,5,u) : sfx.filter.lpf(2200,.7)) * .6) * sfx.env.fadeio(.1, .35, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.35
    + sfx.sequence.part(0.14, 0.64, v1, t) * 0.3
    + sfx.sequence.part(0, 1, v2, t) * 0.45
) : sfx.fx.reverb(.5,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.8);
