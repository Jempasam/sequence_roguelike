declare name "dark_strategist";
declare description "cards swapped with a monster: the order, two cards exchanged";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.perc.tom(80), u);
v1(u) = voice.filter(sfx.impact.wood(350,.9), u);
v2(u) = voice.filter(sfx.impact.wood(300,.9), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.8
    +     sfx.sequence.part(0.3846, 0.6154, v1, t) * 0.7
    +     sfx.sequence.part(0.6154, 0.8462, v2, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
