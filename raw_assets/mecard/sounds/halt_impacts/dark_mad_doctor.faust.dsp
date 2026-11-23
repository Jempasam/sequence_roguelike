declare name "dark_mad_doctor";
declare description "a hero fused with a monster: the surgery discharge, the doctor laughs";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.mech.zap(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.voice.word_haha(260,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4000, v0, t) * 0.6
    +     sfx.sequence.part(0.4000, 1.0000, v1, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
