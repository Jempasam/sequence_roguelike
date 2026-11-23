declare name "enchanter";
declare description "a card enchanted: a chime rising, then a flash";
declare duration "1.4";

import("sfx.lib");

v0(u) = (sfx.sequence.arp3(ba.midikey2hz(84),ba.midikey2hz(88),ba.midikey2hz(91),sfx.inst.bell,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((no.noise : sfx.filter.sweep_bp(500,6000,2,u)) * sfx.env.decay(2.5,u) * 8) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.powerup(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5714, v0, t) * 0.5
    + sfx.sequence.part(0.5, 0.8571, v1, t) * 0.4
    + sfx.sequence.part(0.5, 0.8571, v2, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.5821);
