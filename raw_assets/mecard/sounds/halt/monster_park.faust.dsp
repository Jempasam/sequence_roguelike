declare name "monster_park";
declare description "a monster ally joins: the cage opens, the monster comes out";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.impact.metal(700,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.creak(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.voice.grunt(100,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.impact.stone(120,0.8,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2222, v0, t) * 0.6
    + sfx.sequence.part(0.1667, 0.3333, v1, t) * 0.5
    + sfx.sequence.part(0.2222, 0.5, v2, t) * 0.4
    + sfx.sequence.part(0.5, 0.7778, v3, t) * 0.6
    + sfx.sequence.part(0.7778, 0.9722, v4, t) * 0.5
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.3988);
