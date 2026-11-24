declare name "necro_recruit";
declare description "a monster joins: earth splitting, bones assembling";
declare duration "2";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.noise.rumble(120) * sfx.env.decay(1.5,u) * 4 + (sfx.noise.crackle(.05) : sfx.filter.bpf(800,1.2)) * sfx.env.decay(2,u) * 2), u);
v1(u) = voice.filter(sfx.impact.roll_hits(8,5,0.25,sfx.impact.wood,300), u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.5, 1, v1, t) * 0.5
);

sound(t) = category.filter(mix, t) * 0.3715;

process(t) = sound(t);
