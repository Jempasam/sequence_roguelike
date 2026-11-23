declare name "master_inventor";
declare description "cards given: a stronger machine, a double success";
declare duration "1.15";

import("sfx.lib");

v0(u) = (sfx.mech.engine(110,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.click(u)*.4) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4783, v0, t) * 0.5
    +     sfx.sequence.part(0.2609, 0.5217, v1, t) * 0.5
    +     sfx.sequence.part(0.4783, 0.5652, v2, t) * 0.6
    +     sfx.sequence.part(0.6087, 0.8696, v3, t) * 0.5
    +     sfx.sequence.part(0.7391, 1.0000, v4, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
