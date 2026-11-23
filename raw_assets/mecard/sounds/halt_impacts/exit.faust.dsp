declare name "exit";
declare description "the floor entered: steps, then the door opening";
declare duration "0.85";

import("sfx.lib");

v0(u) = (sfx.nature.footstep(3,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.nature.footstep(4,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.creak(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1765, v0, t) * 0.8
    +     sfx.sequence.part(0.1765, 0.3529, v1, t) * 0.8
    +     sfx.sequence.part(0.3529, 1.0000, v2, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
