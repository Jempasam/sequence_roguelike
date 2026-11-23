declare name "great_forge";
declare description "two or three cards welded: big fire, a blow per card, the quench";
declare duration "2.4";

import("sfx.lib");

v0(u) = (sfx.fire.roar(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.metal(250,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.metal(250,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.metal(250,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = ((sfx.fire.sizzle(u) * sfx.env.decay(3,u) * sfx.env.attack(.05,u) + sfx.nature.splash(u))) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.4
    + sfx.sequence.part(0.125, 0.2917, v1, t) * 0.7
    + sfx.sequence.part(0.2917, 0.4583, v2, t) * 0.7
    + sfx.sequence.part(0.4583, 0.625, v3, t) * 0.7
    + sfx.sequence.part(0.5833, 1, v4, t) * 0.7
) : sfx.fx.reverb(0.5, 0.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.5668);
