declare name "necro_chest";
declare description "a cursed card given: a slow groan, bones falling";
declare duration "2";

import("sfx.lib");

v0(u) = (sfx.mech.creak(u) : sfx.filter.lpf(600,.8)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.noise.rumble(120) * sfx.env.decay(1.5,u) * 4) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.stone(90,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.roll_hits(8,6,0.3,sfx.impact.wood,300,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.9
    + sfx.sequence.part(0, 1, v1, t) * 0.3
    + sfx.sequence.part(0.45, 0.6, v2, t) * 0.6
    + sfx.sequence.part(0.55, 1, v3, t) * 0.5
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.3311);
