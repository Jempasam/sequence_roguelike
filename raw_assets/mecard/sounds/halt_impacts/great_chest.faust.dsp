declare name "great_chest";
declare description "cards given: a bigger chest with a longer rolling";
declare duration "1.15";

import("sfx.lib");

v0(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(200,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.roll_hits(14,3,.35,sfx.impact.bar,2200,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2174, v0, t) * 0.8
    +     sfx.sequence.part(0.1304, 0.2609, v1, t) * 0.6
    +     sfx.sequence.part(0.2174, 1.0000, v2, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
