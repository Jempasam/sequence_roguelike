declare name "magician";
declare description "a card given: drum roll, then the card appears in a shimmer";
declare duration "1.8";

import("sfx.lib");

v0(u) = ((sfx.sequence.euclid(8,8,0,sfx.perc.tom(180),u)) * (.25 + .75 * u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.openhat(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.orient.gliss(ba.midikey2hz(72),ba.midikey2hz(84),sfx.inst.bell,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.noise.crackle(.06) : sfx.filter.hpf(5000,.7)) * sfx.env.decay(3,u) * 2) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.6
    + sfx.sequence.part(0.5, 0.7222, v1, t) * 0.4
    + sfx.sequence.part(0.5, 0.8333, v2, t) * 0.5
    + sfx.sequence.part(0.5556, 1, v3, t) * 0.3
) : sfx.fx.reverb(0.8, 0.2) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.4791);
