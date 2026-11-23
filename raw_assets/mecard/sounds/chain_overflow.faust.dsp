declare name "chain_overflow";
declare description "a soft refusal: two short square notes, the second lower";
declare duration "0.28";

import("sfx.lib");

note(f, u) = sfx.osc.square(f) : fi.lowpass(2, 1500) : *(sfx.env.fadeio(0.05, 0.5, u));

process(t) = (note(330, min(t / 0.45, 1)) * (t < 0.45) + note(247, max((t - 0.45) / 0.55, 0)) * (t >= 0.45)) * 0.45;
