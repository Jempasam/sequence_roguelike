declare name "master_magician";
declare description "rare cards given: roll, harp and marimba, a final flash and a pad";
declare duration "3";

import("sfx.lib");

v0(u) = ((sfx.sequence.euclid(8,8,0,sfx.perc.tom(150),u)) * (.25 + .75 * u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.sequence.arp6(ba.midikey2hz(72),ba.midikey2hz(76),ba.midikey2hz(79),ba.midikey2hz(84),ba.midikey2hz(88),ba.midikey2hz(91),sfx.inst.pluck,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.sequence.arp4(ba.midikey2hz(84),ba.midikey2hz(88),ba.midikey2hz(91),ba.midikey2hz(96),sfx.inst.marimba,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((no.noise : sfx.filter.sweep_bp(400,6000,2,u)) * sfx.env.decay(2.5,u) * 8 + sfx.inst.bell(ba.midikey2hz(95),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = ((sfx.inst.pad(ba.midikey2hz(60),u) + sfx.inst.pad(ba.midikey2hz(64),u) + sfx.inst.pad(ba.midikey2hz(67),u) + sfx.inst.pad(ba.midikey2hz(72),u)) * 0.35) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.4, v0, t) * 0.6
    + sfx.sequence.part(0.4, 0.6667, v1, t) * 0.5
    + sfx.sequence.part(0.4667, 0.7333, v2, t) * 0.5
    + sfx.sequence.part(0.7333, 1, v3, t) * 0.6
    + sfx.sequence.part(0.6, 1, v4, t) * 0.35
) : sfx.fx.reverb(0.8, 0.2) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.2884);
