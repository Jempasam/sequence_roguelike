declare name "monster_mechanic";
declare description "a monster turned into a card: a wrench blow, a motor, two beeps";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.perc.clang(500,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.servo(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.beep(1200,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.mech.beep(1500,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.25, v0, t) * 0.8
    + sfx.sequence.part(0.1875, 0.5, v1, t) * 0.5
    + sfx.sequence.part(0.625, 0.7813, v2, t) * 0.5
    + sfx.sequence.part(0.75, 0.9062, v3, t) * 0.5
) : sfx.fx.reverb(0.5, 0.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.6218);
