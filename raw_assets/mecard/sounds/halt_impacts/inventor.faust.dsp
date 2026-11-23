declare name "inventor";
declare description "a card given: the machine turns, the card comes out, success";
declare duration "0.85";

import("sfx.lib");

v0(u) = (sfx.mech.servo(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.click(u)*.4) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4118, v0, t) * 0.6
    +     sfx.sequence.part(0.4118, 0.5294, v1, t) * 0.6
    +     sfx.sequence.part(0.5882, 1.0000, v2, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
