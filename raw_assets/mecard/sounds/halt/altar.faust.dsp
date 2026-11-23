declare name "altar";
declare description "two cards sacrificed, one copied: the gong, the prayer accepting";
declare duration "2.2";

import("sfx.lib");

v0(u) = (sfx.orient.gong(98,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(70,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(70,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.voice.ooh(ba.midikey2hz(55),u) + sfx.voice.ooh(ba.midikey2hz(58),u) + sfx.voice.ooh(ba.midikey2hz(62),u)) * 0.47) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.6364, v0, t) * 0.7
    + sfx.sequence.part(0.0909, 0.2045, v1, t) * 0.5
    + sfx.sequence.part(0.1818, 0.2955, v2, t) * 0.5
    + sfx.sequence.part(0.3636, 1, v3, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.9512);
