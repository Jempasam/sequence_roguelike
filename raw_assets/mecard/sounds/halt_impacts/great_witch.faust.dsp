declare name "great_witch";
declare description "a potion given three times: three vials, a green flash";
declare duration "0.95";

import("sfx.lib");

v0(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3158, v0, t) * 0.5
    +     sfx.sequence.part(0.2105, 0.5263, v1, t) * 0.5
    +     sfx.sequence.part(0.4211, 0.7368, v2, t) * 0.5
    +     sfx.sequence.part(0.6316, 1.0000, v3, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
