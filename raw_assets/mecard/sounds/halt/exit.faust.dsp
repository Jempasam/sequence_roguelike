declare name "exit";
declare description "the floor entered: three steps, the door opening and shutting";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.nature.footstep(3,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.nature.footstep(4,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.nature.footstep(5,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.mech.creak(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1563, v0, t) * 0.7
    + sfx.sequence.part(0.175, 0.3312, v1, t) * 0.7
    + sfx.sequence.part(0.35, 0.5062, v2, t) * 0.7
    + sfx.sequence.part(0.5, 0.875, v3, t) * 0.5
    + sfx.sequence.part(0.8125, 1, v4, t) * 0.5
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.6218);
