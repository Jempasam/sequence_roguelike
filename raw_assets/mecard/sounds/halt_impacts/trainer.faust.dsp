declare name "trainer";
declare description "an ally joins: two dummy blows, the gong";
declare duration "0.95";

import("sfx.lib");

v0(u) = (sfx.impact.wood(180,.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(160,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.orient.gong(200,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2105, v0, t) * 0.8
    +     sfx.sequence.part(0.2105, 0.4211, v1, t) * 0.8
    +     sfx.sequence.part(0.4211, 1.0000, v2, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
