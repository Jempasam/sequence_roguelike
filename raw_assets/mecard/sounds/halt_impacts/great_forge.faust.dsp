declare name "great_forge";
declare description "two or three cards welded: big fire, a blow per card, the quench";
declare duration "1";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.fire.roar(u)*sfx.env.fadeio(.2,.3,u)), u);
v1(u) = voice.filter(\(u).(sfx.perc.clang(260,u)*sfx.env.fadeio(.003,.3,u)), u);
v2(u) = voice.filter(\(u).(sfx.perc.clang(260,u)*sfx.env.fadeio(.003,.3,u)), u);
v3(u) = voice.filter(\(u).(sfx.perc.clang(260,u)*sfx.env.fadeio(.003,.3,u)), u);
v4(u) = voice.filter(sizzle.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.6000, v0, t) * 0.5
    +     sfx.sequence.part(0.0000, 0.3500, v1, t) * 0.7
    +     sfx.sequence.part(0.2000, 0.5500, v2, t) * 0.7
    +     sfx.sequence.part(0.4000, 0.7500, v3, t) * 0.7
    +     sfx.sequence.part(0.6000, 1.0000, v4, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
