declare name "strategist";
declare description "a plan taught: the order given, the pieces moved";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
pluck_67 = library("../lib/halt_voices/pluck_67.lib.dsp");
pluck_72 = library("../lib/halt_voices/pluck_72.lib.dsp");
tom_150 = library("../lib/halt_voices/tom_150.lib.dsp");

v0(u) = voice.filter(tom_150.sound, u);
v1(u) = voice.filter(sfx.sequence.euclid(3,4,0,sfx.impact.wood(500,0.6)), u);
v2(u) = voice.filter(pluck_67.sound, u);
v3(u) = voice.filter(pluck_72.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.1875, v0, t) * 0.7
    + sfx.sequence.part(0.3125, 0.6875, v1, t) * 0.5
    + sfx.sequence.part(0.6875, 0.875, v2, t) * 0.5
    + sfx.sequence.part(0.8125, 1, v3, t) * 0.5
);

sound(t) = category.filter(mix, t) * 1.4622;

process(t) = sound(t);
