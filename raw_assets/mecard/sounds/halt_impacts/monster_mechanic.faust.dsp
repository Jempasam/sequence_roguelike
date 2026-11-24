declare name "monster_mechanic";
declare description "a monster turned into a card: a wrench blow, a beep";
declare duration "0.55";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.perc.clang(200,u)*sfx.env.fadeio(.003,.3,u)), u);
v1(u) = voice.filter(sfx.mech.beep(1200), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.5455, v0, t) * 0.7
    +     sfx.sequence.part(0.4545, 1.0000, v1, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
