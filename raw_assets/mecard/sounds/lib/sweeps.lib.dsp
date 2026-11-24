declare name "sweeps";
declare description "a sine gliding from f0 to f1, fading out at the given rate: thumps, booms and echoes";

import("sfx.lib");

sweep_sine(f0, f1, rate, u) = sfx.osc.sine(sfx.env.sweep(f0, f1, u)) * sfx.env.decay(rate, u);
