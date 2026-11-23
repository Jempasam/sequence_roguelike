declare name "trainer";
declare description "an ally joins: two dummy blows, the gong";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.impact.wood(500,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(500,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.orient.gong(120,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1563, v0, t) * 0.7
    + sfx.sequence.part(0.1563, 0.3125, v1, t) * 0.7
    + sfx.sequence.part(0.375, 1, v2, t) * 0.6
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.0184);
