declare name "dark_mad_doctor";
declare description "a hero fused with a monster: the surgery discharge, the doctor laughs";
declare duration "2.2";

import("sfx.lib");

v0(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.noise.rumble(120) * sfx.env.decay(1.5,u) * 4) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.voice.word_haha(90,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2273, v0, t) * 0.8
    + sfx.sequence.part(0, 0.4545, v1, t) * 0.3
    + sfx.sequence.part(0.4091, 0.8182, v2, t) * 0.6
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.6026);
