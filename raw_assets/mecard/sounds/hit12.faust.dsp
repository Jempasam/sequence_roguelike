declare name "hit12";
declare description "a crushing blow, 9 hearts or more: a deep boom, a hard crack, rubble and a lower echo";
declare duration "0.7";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

loc(start, length) = min(max(sfx.env.secs - start, 0) / length, 1);
on(start) = sfx.env.secs >= start;

click(u) = (sfx.rand.noise(seed + 3) : fi.highpass(2, 5000)) * sfx.env.decay(7, u) * 0.8;
slap(u) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, 4300, 4700))) * sfx.env.decay(7, u) * 0.8;
thump(u) = sfx.osc.sine(sfx.env.sweep(sfx.rand.pick(seed, 2, 100, 120), 45, u)) * sfx.env.decay(7, u);
boom(u) = sfx.osc.sine(sfx.env.sweep(85, 28, u)) * sfx.env.decay(7, u);
rubble(u) = (sfx.rand.noise(seed + 11) : fi.lowpass(2, 700)) * sfx.env.decay(7, u) * 0.8;
echo(u) = sfx.osc.sine(sfx.env.sweep(60, 30, u)) * sfx.env.decay(7, u) * 0.5;

process(t) = (click(loc(0, 0.01)) + slap(loc(0, 0.1)) + thump(loc(0, 0.35)) + boom(loc(0, 0.6))
    + rubble(loc(0.06, 0.55)) * on(0.06) + echo(loc(0.18, 0.25)) * on(0.18))
    : sfx.fx.drive(2.6) : sfx.fx.dcblock : *(0.64);
