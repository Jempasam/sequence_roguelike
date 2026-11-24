declare name "butcher";
declare description "fusions cut apart: cleaver, then two cards falling";
declare duration "1.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

v0(u) = voice.filter(sfx.impact.blade(300,1), u);
v1(u) = voice.filter(thud.sound, u);
v2(u) = voice.filter(cloth_05.sound, u);
v3(u) = voice.filter(sfx.impact.wood(400,0.5), u);
v4(u) = voice.filter(cloth_05.sound, u);
v5(u) = voice.filter(sfx.impact.wood(350,0.5), u);

mix(t) = (
    sfx.sequence.part(0, 0.3571, v0, t) * 0.8
    + sfx.sequence.part(0.0143, 0.1571, v1, t) * 0.5
    + sfx.sequence.part(0.3571, 0.5714, v2, t) * 0.5
    + sfx.sequence.part(0.3571, 0.5357, v3, t) * 0.4
    + sfx.sequence.part(0.5357, 0.75, v4, t) * 0.5
    + sfx.sequence.part(0.5357, 0.7143, v5, t) * 0.4
);

sound(t) = category.filter(mix, t) * 1.6218;

process(t) = sound(t);
