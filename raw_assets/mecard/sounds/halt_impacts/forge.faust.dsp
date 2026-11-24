declare name "forge";
declare description "two cards welded: hammer blow with sparks, then the quench";
declare duration "0.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.perc.clang(300,u)*sfx.env.fadeio(.003,.3,u)), u);
v1(u) = voice.filter(\(u).(sfx.noise.crackle(0.08)*sfx.env.decay(4,u)*1.6), u);
v2(u) = voice.filter(sizzle.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4375, v0, t) * 0.7
    +     sfx.sequence.part(0.0000, 0.3750, v1, t) * 0.5
    +     sfx.sequence.part(0.3750, 1.0000, v2, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
