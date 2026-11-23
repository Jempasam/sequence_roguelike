declare name "forge";
declare description "two cards welded: hammer blow with sparks, then the quench";
declare duration "0.8";

import("sfx.lib");

v0(u) = (sfx.perc.clang(300,u)*sfx.env.fadeio(.003,.3,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.noise.crackle(0.08)*sfx.env.decay(4,u)*1.6) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.fire.sizzle(u)*sfx.env.decay(3,u)*sfx.env.attack(.05,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4375, v0, t) * 0.7
    +     sfx.sequence.part(0.0000, 0.3750, v1, t) * 0.5
    +     sfx.sequence.part(0.3750, 1.0000, v2, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
