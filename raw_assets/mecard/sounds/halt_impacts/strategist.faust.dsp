declare name "strategist";
declare description "a plan taught: the order given, the pieces moved";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.perc.tom(110), u);
v1(u) = voice.filter(sfx.impact.wood(400,.9), u);
v2(u) = voice.filter(sfx.impact.wood(400,.9), u);
v3(u) = voice.filter(sfx.impact.wood(400,.9), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.3846, v0, t) * 0.7
    +     sfx.sequence.part(0.3077, 0.4923, v1, t) * 0.6
    +     sfx.sequence.part(0.4615, 0.6462, v2, t) * 0.6
    +     sfx.sequence.part(0.6154, 0.8000, v3, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
