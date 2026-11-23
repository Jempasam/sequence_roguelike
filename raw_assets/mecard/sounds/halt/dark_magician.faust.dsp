declare name "dark_magician";
declare description "a card given: a low drum roll, then a falling minor harp";
declare duration "1.8";

import("sfx.lib");

v0(u) = ((sfx.sequence.euclid(8,8,0,sfx.perc.tom(90),u)) * (.25 + .75 * u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.sequence.arp4(ba.midikey2hz(76),ba.midikey2hz(72),ba.midikey2hz(69),ba.midikey2hz(64),sfx.inst.pluck,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.noise.rumble(120) * sfx.env.decay(1.5,u) * 4) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.6
    + sfx.sequence.part(0.5, 0.9444, v1, t) * 0.5
    + sfx.sequence.part(0, 1, v2, t) * 0.25
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.5559);
