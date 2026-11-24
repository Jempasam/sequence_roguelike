declare name "altar";
declare description "two cards sacrificed, one copied: the gong, the prayer accepting";
declare duration "2.2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");

v0(u) = voice.filter(sfx.orient.gong(98), u);
v1(u) = voice.filter(sfx.impact.wood(70,0.9), u);
v2(u) = voice.filter(sfx.impact.wood(70,0.9), u);
v3(u) = voice.filter(\(u).((sfx.voice.ooh(ba.midikey2hz(55),u) + sfx.voice.ooh(ba.midikey2hz(58),u) + sfx.voice.ooh(ba.midikey2hz(62),u)) * 0.47), u);

mix(t) = (
    sfx.sequence.part(0, 0.6364, v0, t) * 0.7
    + sfx.sequence.part(0.0909, 0.2045, v1, t) * 0.5
    + sfx.sequence.part(0.1818, 0.2955, v2, t) * 0.5
    + sfx.sequence.part(0.3636, 1, v3, t) * 0.4
);

sound(t) = category.filter(mix, t) * 2.9512;

process(t) = sound(t);
