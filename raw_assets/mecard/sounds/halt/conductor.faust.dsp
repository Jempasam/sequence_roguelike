declare name "conductor";
declare description "a card moved to the start or end: baton tap, the orchestra retuning";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");

v0(u) = voice.filter(sfx.impact.wood(900,0.8), u);
v1(u) = voice.filter(\(u).((sfx.inst.organ(ba.midikey2hz(69),u)) * (.25 + .75 * u)), u);
v2(u) = voice.filter(\(u).((sfx.inst.pad(ba.midikey2hz(69.4),u)) * (.25 + .75 * u)), u);

mix(t) = (
    sfx.sequence.part(0, 0.1563, v0, t) * 0.7
    + sfx.sequence.part(0.1875, 1, v1, t) * 0.4
    + sfx.sequence.part(0.1875, 1, v2, t) * 0.3
);

sound(t) = category.filter(mix, t) * 3.4674;

process(t) = sound(t);
