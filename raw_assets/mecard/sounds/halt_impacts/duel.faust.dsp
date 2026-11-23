declare name "duel";
declare description "a duel won: blades crossing, the victory gong";
declare duration "1.05";

import("sfx.lib");

v0(u) = (sfx.impact.clash(600,.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.orient.gong(250,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3810, v0, t) * 0.7
    +     sfx.sequence.part(0.3810, 1.0000, v1, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
