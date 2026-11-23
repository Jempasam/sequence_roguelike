declare name "great_magician";
declare description "cards given: drum roll, a boom, a harp and a choir";
declare duration "2.4";

import("sfx.lib");

v0(u) = ((sfx.sequence.euclid(8,8,0,sfx.perc.tom(160),u)) * (.25 + .75 * u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.boom(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.sequence.arp6(ba.midikey2hz(72),ba.midikey2hz(76),ba.midikey2hz(79),ba.midikey2hz(84),ba.midikey2hz(88),ba.midikey2hz(91),sfx.inst.pluck,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.voice.ooh(ba.midikey2hz(60),u) + sfx.voice.ooh(ba.midikey2hz(64),u) + sfx.voice.ooh(ba.midikey2hz(67),u)) * 0.47) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.4583, v0, t) * 0.6
    + sfx.sequence.part(0.4583, 0.875, v1, t) * 0.5
    + sfx.sequence.part(0.4583, 0.7917, v2, t) * 0.5
    + sfx.sequence.part(0.5833, 1, v3, t) * 0.3
) : sfx.fx.reverb(0.8, 0.2) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.1135);
