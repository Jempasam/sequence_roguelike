declare name "butcher";
declare description "fusions cut apart: cleaver, then two cards falling";
declare duration "0.6";

import("sfx.lib");

v0(u) = (sfx.impact.blade(500,.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(300,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.tick(3000,.9,u)*2) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.tick(2400,.9,u)*2) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.5000, v0, t) * 0.7
    +     sfx.sequence.part(0.0000, 0.2500, v1, t) * 0.6
    +     sfx.sequence.part(0.3333, 0.5000, v2, t) * 0.6
    +     sfx.sequence.part(0.5000, 0.6667, v3, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
