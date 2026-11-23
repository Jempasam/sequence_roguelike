declare name "chest";
declare description "a card given: latch, lid, contents rolling";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(220,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.roll_hits(7,3,.35,sfx.impact.bar,2200,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3333, v0, t) * 0.8
    +     sfx.sequence.part(0.2667, 0.4000, v1, t) * 0.6
    +     sfx.sequence.part(0.4000, 1.0000, v2, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
