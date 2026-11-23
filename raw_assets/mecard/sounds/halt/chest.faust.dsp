declare name "chest";
declare description "a card given: latch, lid, the contents rolling";
declare duration "1.4";

import("sfx.lib");

v0(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.creak(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(200,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.roll_hits(5,3,0.3,sfx.impact.plastic,900,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1786, v0, t) * 0.7
    + sfx.sequence.part(0.1429, 0.4286, v1, t) * 0.5
    + sfx.sequence.part(0.3929, 0.5714, v2, t) * 0.6
    + sfx.sequence.part(0.5, 1, v3, t) * 0.5
) : sfx.fx.reverb(0.6, 0.12) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.0417);
