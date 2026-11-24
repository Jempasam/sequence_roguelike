declare name "butcher";
declare description "fusions cut apart: cleaver, then two cards falling";
declare duration "0.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.impact.blade(500,.9), u);
v1(u) = voice.filter(sfx.impact.wood(300,.9), u);
v2(u) = voice.filter(\(u).(sfx.impact.tick(3000,.9,u)*2), u);
v3(u) = voice.filter(\(u).(sfx.impact.tick(2400,.9,u)*2), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.5000, v0, t) * 0.7
    +     sfx.sequence.part(0.0000, 0.2500, v1, t) * 0.6
    +     sfx.sequence.part(0.3333, 0.5000, v2, t) * 0.6
    +     sfx.sequence.part(0.5000, 0.6667, v3, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
