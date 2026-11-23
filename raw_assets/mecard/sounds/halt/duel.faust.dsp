declare name "duel";
declare description "a duel won: blades crossing, the victory gong";
declare duration "2";

import("sfx.lib");

v0(u) = (sfx.impact.clash(700,.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.clash(900,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.orient.gong(130,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.25, v0, t) * 0.8
    + sfx.sequence.part(0.09, 0.34, v1, t) * 0.7
    + sfx.sequence.part(0.35, 1, v2, t) * 0.6
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.7378);
