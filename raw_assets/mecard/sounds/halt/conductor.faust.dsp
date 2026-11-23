declare name "conductor";
declare description "a card moved to the start or end: baton tap, the orchestra retuning";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.impact.wood(900,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((sfx.inst.organ(ba.midikey2hz(69),u)) * (.25 + .75 * u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = ((sfx.inst.pad(ba.midikey2hz(69.4),u)) * (.25 + .75 * u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1563, v0, t) * 0.7
    + sfx.sequence.part(0.1875, 1, v1, t) * 0.4
    + sfx.sequence.part(0.1875, 1, v2, t) * 0.3
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(3.4674);
