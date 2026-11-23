declare name "strategist";
declare description "a plan taught: the order given, the pieces moved";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.perc.tom(110,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(400,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(400,.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.wood(400,.9,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3846, v0, t) * 0.7
    +     sfx.sequence.part(0.3077, 0.4923, v1, t) * 0.6
    +     sfx.sequence.part(0.4615, 0.6462, v2, t) * 0.6
    +     sfx.sequence.part(0.6154, 0.8000, v3, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
