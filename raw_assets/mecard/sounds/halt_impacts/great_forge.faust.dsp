declare name "great_forge";
declare description "two or three cards welded: big fire, a blow per card, the quench";
declare duration "1";

import("sfx.lib");

v0(u) = (sfx.fire.roar(u)*sfx.env.fadeio(.2,.3,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.clang(260,u)*sfx.env.fadeio(.003,.3,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.perc.clang(260,u)*sfx.env.fadeio(.003,.3,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.clang(260,u)*sfx.env.fadeio(.003,.3,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.fire.sizzle(u)*sfx.env.decay(3,u)*sfx.env.attack(.05,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.6000, v0, t) * 0.5
    +     sfx.sequence.part(0.0000, 0.3500, v1, t) * 0.7
    +     sfx.sequence.part(0.2000, 0.5500, v2, t) * 0.7
    +     sfx.sequence.part(0.4000, 0.7500, v3, t) * 0.7
    +     sfx.sequence.part(0.6000, 1.0000, v4, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
