declare name "master_chest";
declare description "rare cards given: combination lock, the vault door, gems";
declare duration "2.6";

import("sfx.lib");

v0(u) = (sfx.sequence.euclid(4,4,0,sfx.mech.click,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.mech.servo(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.clang(90,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.sequence.arp3(ba.midikey2hz(88),ba.midikey2hz(91),ba.midikey2hz(95),sfx.inst.bell,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3077, v0, t) * 0.5
    + sfx.sequence.part(0.3462, 0.4615, v1, t) * 0.7
    + sfx.sequence.part(0.3846, 0.6538, v2, t) * 0.5
    + sfx.sequence.part(0.3846, 0.6538, v3, t) * 0.6
    + sfx.sequence.part(0.6538, 1, v4, t) * 0.4
) : sfx.fx.reverb(0.6, 0.12) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.6026);
