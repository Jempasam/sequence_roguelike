declare name "mad_doctor";
declare description "two heroes fused: discharge and flask, operation done";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.water.bubble(300,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.water.bubble(420,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2222, v0, t) * 0.7
    + sfx.sequence.part(0.2778, 0.4444, v1, t) * 0.5
    + sfx.sequence.part(0.3611, 0.5278, v2, t) * 0.5
    + sfx.sequence.part(0.7222, 0.9444, v3, t) * 0.5
) : sfx.fx.reverb(0.8, 0.2) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.7989);
