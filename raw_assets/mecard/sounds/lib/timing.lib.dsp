declare name "timing";
declare description "cutting the 0 to 1 of a sound: a local ramp and a gate, in proportion or in seconds";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

loc(start, length) = min(max(sfx.env.secs - start, 0) / length, 1);
on(start) = sfx.env.secs >= start;
