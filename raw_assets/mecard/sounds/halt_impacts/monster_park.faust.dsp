declare name "monster_park";
declare description "a monster ally joins: the cage opens, the monster comes out";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.impact.metal(500,.8,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.voice.grunt(110,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.7692, v0, t) * 0.6
    +     sfx.sequence.part(0.2308, 0.9231, v1, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
