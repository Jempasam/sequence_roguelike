declare name "mad_doctor";
declare description "two heroes fused: discharge and flask, operation done";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.water.bubble(500,u)*1.5) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.water.bubble(600,u)*1.5) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.6
    +     sfx.sequence.part(0.0000, 0.2308, v1, t) * 0.5
    +     sfx.sequence.part(0.2308, 0.4615, v2, t) * 0.5
    +     sfx.sequence.part(0.5385, 1.0000, v3, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
