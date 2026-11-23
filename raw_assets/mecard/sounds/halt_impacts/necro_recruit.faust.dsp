declare name "necro_recruit";
declare description "a monster joins: earth splitting, bones assembling";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.noise.brown*sfx.env.fadeio(.2,.5,u)*.4) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(900,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(900,.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.wood(900,.9,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.impact.wood(900,.9,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.6
    +     sfx.sequence.part(0.3077, 0.4615, v1, t) * 0.6
    +     sfx.sequence.part(0.4615, 0.6154, v2, t) * 0.6
    +     sfx.sequence.part(0.6154, 0.7692, v3, t) * 0.6
    +     sfx.sequence.part(0.7692, 0.9231, v4, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
