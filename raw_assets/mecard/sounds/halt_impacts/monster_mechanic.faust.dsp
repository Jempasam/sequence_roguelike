declare name "monster_mechanic";
declare description "a monster turned into a card: a wrench blow, a beep";
declare duration "0.55";

import("sfx.lib");

v0(u) = (sfx.perc.clang(200,u)*sfx.env.fadeio(.003,.3,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.beep(1200,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.5455, v0, t) * 0.7
    +     sfx.sequence.part(0.4545, 1.0000, v1, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
