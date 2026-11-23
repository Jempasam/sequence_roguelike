declare name "master_chest";
declare description "rare cards given: combination lock, vault, gems";
declare duration "1.25";

import("sfx.lib");

v0(u) = (sfx.mech.click(u)*.4) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.click(u)*.4) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.click(u)*.4) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.stone(120,.8,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.osc.fm(3000,1.41,1)*sfx.env.decay(7,u)*sfx.env.attack(.02,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.0800, v0, t) * 0.5
    +     sfx.sequence.part(0.1200, 0.2000, v1, t) * 0.5
    +     sfx.sequence.part(0.2400, 0.3200, v2, t) * 0.5
    +     sfx.sequence.part(0.3600, 0.6000, v3, t) * 0.8
    +     sfx.sequence.part(0.4800, 1.0000, v4, t) * 0.3
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
