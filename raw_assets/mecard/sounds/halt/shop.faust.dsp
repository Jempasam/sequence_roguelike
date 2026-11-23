declare name "shop";
declare description "a good bought: the counter bell, the drawer, two coins";
declare duration "1.4";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5714, v0, t) * 0.6
    + sfx.sequence.part(0.2143, 0.4286, v1, t) * 0.4
    + sfx.sequence.part(0.3214, 0.6071, v2, t) * 0.5
    + sfx.sequence.part(0.5, 0.7857, v3, t) * 0.5
) : sfx.fx.reverb(0.5, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(3.3884);
