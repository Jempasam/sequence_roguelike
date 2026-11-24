declare name "altar";
declare description "two cards sacrificed, one copied: the gong, then the prayer accepting";
declare duration "1";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.orient.gong(180), u);
v1(u) = voice.filter(sfx.voice.monks(98), u);

mix(t) = (
    sfx.sequence.part(0.0000, 1.0000, v0, t) * 0.8
    +     sfx.sequence.part(0.1000, 0.9000, v1, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
