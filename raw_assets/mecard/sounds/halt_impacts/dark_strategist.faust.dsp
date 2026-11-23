declare name "dark_strategist";
declare description "cards swapped with a monster: the order, two cards exchanged";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.perc.tom(80,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(350,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(300,.9,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.8
    +     sfx.sequence.part(0.3846, 0.6154, v1, t) * 0.7
    +     sfx.sequence.part(0.6154, 0.8462, v2, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
