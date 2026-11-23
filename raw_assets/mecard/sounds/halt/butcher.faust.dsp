declare name "butcher";
declare description "fusions cut apart: cleaver, then two cards falling";
declare duration "1.4";

import("sfx.lib");

v0(u) = (sfx.impact.blade(300,1,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.thud(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.wood(400,0.5,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.impact.wood(350,0.5,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3571, v0, t) * 0.8
    + sfx.sequence.part(0.0143, 0.1571, v1, t) * 0.5
    + sfx.sequence.part(0.3571, 0.5714, v2, t) * 0.5
    + sfx.sequence.part(0.3571, 0.5357, v3, t) * 0.4
    + sfx.sequence.part(0.5357, 0.75, v4, t) * 0.5
    + sfx.sequence.part(0.5357, 0.7143, v5, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.6218);
