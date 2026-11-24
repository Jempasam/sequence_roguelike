declare name "necro_chest";
declare description "a cursed card given: a slow groan, bones falling";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.mech.creak(u) : sfx.filter.lpf(600,.8)), u);
v1(u) = voice.filter(rumble_120.sound, u);
v2(u) = voice.filter(sfx.impact.stone(90,0.8), u);
v3(u) = voice.filter(sfx.impact.roll_hits(8,6,0.3,sfx.impact.wood,300), u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.9
    + sfx.sequence.part(0, 1, v1, t) * 0.3
    + sfx.sequence.part(0.45, 0.6, v2, t) * 0.6
    + sfx.sequence.part(0.55, 1, v3, t) * 0.5
);

sound(t) = category.filter(mix, t) * 0.3311;

process(t) = sound(t);
