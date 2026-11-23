declare name "witch";
declare description "a potion given: poured, a green flash";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.5385, v0, t) * 0.6
    +     sfx.sequence.part(0.5385, 1.0000, v1, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
