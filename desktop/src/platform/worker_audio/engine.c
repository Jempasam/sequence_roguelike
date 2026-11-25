/*
 * The audio engine of the desktop: sounds as float samples, voices that play them through a chain of
 * stages, and a mixer that renders blocks of interleaved stereo float samples.
 *
 * It runs in a worker and knows nothing of the device: whoever owns it asks for the next block when the
 * device runs low. Only `engine_*`, `sound_*`, `voice_*` and `stage_*` are exported.
 */

#include <math.h>
#include <stdlib.h>
#include <string.h>

#define MAX_VOICES 64
#define MAX_STAGES 8
#define MAX_BLOCK 4096
#define SILENCE 0.001
#define MAX_ECHO_TAIL 5.0
#define ROOM_RATE 44100.0
#define STEREO_SPREAD 23
#define ROOM_LEVEL 0.25f
#define COMBS 4
#define ALLPASSES 2
#define LINES_PER_SIDE (COMBS + ALLPASSES)
#define KNEE 0.8f
#define PI 3.14159265358979323846

enum StageKind {
    STAGE_BIQUAD,
    STAGE_GAIN,
    STAGE_PAN,
    STAGE_DELAY,
    STAGE_REVERB,
    STAGE_COMPRESSOR,
    STAGE_DISTORTION,
};

/** The kinds of biquad filter, in the order the TypeScript side numbers them. */
enum BiquadKind {
    BIQUAD_LOWPASS,
    BIQUAD_HIGHPASS,
    BIQUAD_BANDPASS,
    BIQUAD_LOWSHELF,
    BIQUAD_HIGHSHELF,
    BIQUAD_PEAKING,
    BIQUAD_NOTCH,
    BIQUAD_ALLPASS,
};

static const int COMB_DELAYS[COMBS] = { 1116, 1188, 1277, 1356 };
static const int ALLPASS_DELAYS[ALLPASSES] = { 556, 441 };

/** A sound: samples of one or two sides, kept as they were decoded. */
typedef struct {
    float *left;
    float *right;
    int frames;
    int rate;
} Sound;

/** A delay line: a comb or an allpass filter of a room, or the echo of a delay. */
typedef struct {
    float *data;
    int size;
    int at;
    float feedback;
} Line;

/** One piece of the chain of a voice, with what it keeps between two blocks. */
typedef struct {
    int kind;
    /** How long it goes on sounding after what enters it has stopped, in seconds. */
    double tail;
    /* Biquad. */
    double b0, b1, b2, a1, a2;
    double memory[2][4];
    /* Gain, pan and distortion. */
    float volume;
    float pan_left, pan_right;
    int pan_to_right;
    float amount;
    /* Delay and reverb. */
    Line lines[2 * LINES_PER_SIDE];
    int line_count;
    /* Compressor. */
    float threshold, knee, ratio, attack, release, reduction;
} Stage;

typedef struct {
    int open;
    int started;
    long age;
    int sound;
    float volume;
    double position;
    double step;
    long rendered;
    long total;
    Stage stages[MAX_STAGES];
    int stage_count;
} Voice;

static Sound *sounds = NULL;
static int sound_count = 0;
static int sound_capacity = 0;
static Voice voices[MAX_VOICES];
static long clock_ticks = 0;
static int rate = 48000;
static float left_mix[MAX_BLOCK];
static float right_mix[MAX_BLOCK];
static float left_voice[MAX_BLOCK];
static float right_voice[MAX_BLOCK];
static float output[MAX_BLOCK * 2];


//// LIFE ////

/** Set the rate of the blocks rendered, in frames per second. */
void engine_init(int frames_per_second)
{
    rate = frames_per_second;
}

/** Memory for samples, which the caller fills and hands to {@link sound_add}. */
void *engine_alloc(int bytes)
{
    return calloc(1, (size_t)bytes);
}

/** How many voices are sounding. */
int engine_voices(void)
{
    int count = 0;
    for(int i = 0; i < MAX_VOICES; i++) if(voices[i].open && voices[i].started) count++;
    return count;
}

/** How many frames at most a block holds. */
int engine_block(void)
{
    return MAX_BLOCK;
}


//// SOUNDS ////

/**
 * Keep a sound, whose buffers the engine now owns. `right` is null for a mono sound.
 * Returns its id, or -1 when it has no frame.
 */
int sound_add(float *left, float *right, int frames, int sound_rate)
{
    if(left == NULL || frames < 1 || sound_rate < 1) return -1;
    if(sound_count == sound_capacity){
        int capacity = sound_capacity == 0 ? 64 : sound_capacity * 2;
        Sound *grown = realloc(sounds, sizeof(Sound) * (size_t)capacity);
        if(grown == NULL) return -1;
        sounds = grown;
        sound_capacity = capacity;
    }
    sounds[sound_count].left = left;
    sounds[sound_count].right = right == NULL ? left : right;
    sounds[sound_count].frames = frames;
    sounds[sound_count].rate = sound_rate;
    return sound_count++;
}


//// STAGES ////

static void free_stage(Stage *stage)
{
    for(int i = 0; i < stage->line_count; i++) free(stage->lines[i].data);
    stage->line_count = 0;
}

static void close_voice(Voice *voice)
{
    for(int i = 0; i < voice->stage_count; i++) free_stage(&voice->stages[i]);
    voice->stage_count = 0;
    voice->open = 0;
    voice->started = 0;
}

static Stage *new_stage(int voice_index, int kind)
{
    if(voice_index < 0 || voice_index >= MAX_VOICES) return NULL;
    Voice *voice = &voices[voice_index];
    if(!voice->open || voice->started || voice->stage_count == MAX_STAGES) return NULL;
    Stage *stage = &voice->stages[voice->stage_count++];
    memset(stage, 0, sizeof(Stage));
    stage->kind = kind;
    return stage;
}

static int make_line(Stage *stage, int size, float feedback)
{
    if(size < 1) size = 1;
    Line *line = &stage->lines[stage->line_count];
    line->data = calloc((size_t)size, sizeof(float));
    if(line->data == NULL) return 0;
    line->size = size;
    line->at = 0;
    line->feedback = feedback;
    stage->line_count++;
    return 1;
}

/** A biquad filter, on the formulas of the Web Audio API. */
void stage_biquad(int voice, int kind, float frequency, float quality, float gain)
{
    Stage *stage = new_stage(voice, STAGE_BIQUAD);
    if(stage == NULL) return;
    double nyquist = rate / 2.0 - 1.0;
    double f = frequency < 1.0 ? 1.0 : (frequency > nyquist ? nyquist : frequency);
    double w0 = 2.0 * PI * f / rate;
    double cosine = cos(w0);
    double sine = sin(w0);
    double alpha = sine / (2.0 * (quality < 0.0001 ? 0.0001 : quality));
    double alpha_db = sine / (2.0 * pow(10.0, quality / 20.0));
    double amplitude = pow(10.0, gain / 40.0);
    double shelf = 2.0 * sqrt(amplitude) * alpha;
    double b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
    switch(kind){
        case BIQUAD_LOWPASS:
            b0 = (1 - cosine) / 2; b1 = 1 - cosine; b2 = b0;
            a0 = 1 + alpha_db; a1 = -2 * cosine; a2 = 1 - alpha_db;
            break;
        case BIQUAD_HIGHPASS:
            b0 = (1 + cosine) / 2; b1 = -(1 + cosine); b2 = b0;
            a0 = 1 + alpha_db; a1 = -2 * cosine; a2 = 1 - alpha_db;
            break;
        case BIQUAD_BANDPASS:
            b0 = alpha; b1 = 0; b2 = -alpha;
            a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
            break;
        case BIQUAD_NOTCH:
            b0 = 1; b1 = -2 * cosine; b2 = 1;
            a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
            break;
        case BIQUAD_ALLPASS:
            b0 = 1 - alpha; b1 = -2 * cosine; b2 = 1 + alpha;
            a0 = 1 + alpha; a1 = -2 * cosine; a2 = 1 - alpha;
            break;
        case BIQUAD_PEAKING:
            b0 = 1 + alpha * amplitude; b1 = -2 * cosine; b2 = 1 - alpha * amplitude;
            a0 = 1 + alpha / amplitude; a1 = -2 * cosine; a2 = 1 - alpha / amplitude;
            break;
        case BIQUAD_LOWSHELF:
            b0 = amplitude * (amplitude + 1 - (amplitude - 1) * cosine + shelf);
            b1 = 2 * amplitude * (amplitude - 1 - (amplitude + 1) * cosine);
            b2 = amplitude * (amplitude + 1 - (amplitude - 1) * cosine - shelf);
            a0 = amplitude + 1 + (amplitude - 1) * cosine + shelf;
            a1 = -2 * (amplitude - 1 + (amplitude + 1) * cosine);
            a2 = amplitude + 1 + (amplitude - 1) * cosine - shelf;
            break;
        case BIQUAD_HIGHSHELF:
            b0 = amplitude * (amplitude + 1 + (amplitude - 1) * cosine + shelf);
            b1 = -2 * amplitude * (amplitude - 1 + (amplitude + 1) * cosine);
            b2 = amplitude * (amplitude + 1 + (amplitude - 1) * cosine - shelf);
            a0 = amplitude + 1 - (amplitude - 1) * cosine + shelf;
            a1 = 2 * (amplitude - 1 - (amplitude + 1) * cosine);
            a2 = amplitude + 1 - (amplitude - 1) * cosine - shelf;
            break;
        default:
            break;
    }
    stage->b0 = b0 / a0;
    stage->b1 = b1 / a0;
    stage->b2 = b2 / a0;
    stage->a1 = a1 / a0;
    stage->a2 = a2 / a0;
}

/** A change of volume. */
void stage_gain(int voice, float volume)
{
    Stage *stage = new_stage(voice, STAGE_GAIN);
    if(stage != NULL) stage->volume = volume;
}

/** A move between the speakers, as the stereo panner of the Web Audio API makes it. */
void stage_pan(int voice, float position)
{
    Stage *stage = new_stage(voice, STAGE_PAN);
    if(stage == NULL) return;
    float clamped = position < -1.0f ? -1.0f : (position > 1.0f ? 1.0f : position);
    stage->pan_to_right = clamped > 0;
    float angle = (float)((stage->pan_to_right ? clamped : clamped + 1.0f) * PI / 2.0);
    stage->pan_left = cosf(angle);
    stage->pan_right = sinf(angle);
}

/** An echo: the sound, then its repeats, each one quieter than the one before. */
void stage_delay(int voice, float time, float feedback)
{
    Stage *stage = new_stage(voice, STAGE_DELAY);
    if(stage == NULL) return;
    int size = (int)lround(time * rate);
    if(!make_line(stage, size, feedback) || !make_line(stage, size, feedback)){
        free_stage(stage);
        stage->kind = STAGE_GAIN;
        stage->volume = 1;
        return;
    }
    double repeats = feedback > 0 ? ceil(log(SILENCE) / log(feedback)) : 1;
    double tail = time * (repeats < 1 ? 1 : repeats);
    stage->tail = tail > MAX_ECHO_TAIL ? MAX_ECHO_TAIL : tail;
}

/** A room around the sound, as combs and allpass filters. */
void stage_reverb(int voice, float duration, float decay)
{
    Stage *stage = new_stage(voice, STAGE_REVERB);
    if(stage == NULL) return;
    double ring = (duration < 0.05 ? 0.05 : duration) / (decay < 1 ? 1 : decay);
    double scale = rate / ROOM_RATE;
    int ok = 1;
    for(int side = 0; side < 2 && ok; side++){
        int spread = side * STEREO_SPREAD;
        for(int i = 0; i < COMBS && ok; i++){
            int size = (int)lround(COMB_DELAYS[i] * scale) + spread;
            ok = make_line(stage, size, (float)pow(10.0, -3.0 * size / (rate * ring)));
        }
        for(int i = 0; i < ALLPASSES && ok; i++){
            ok = make_line(stage, (int)lround(ALLPASS_DELAYS[i] * scale) + spread, 0.5f);
        }
    }
    if(!ok){
        free_stage(stage);
        stage->kind = STAGE_GAIN;
        stage->volume = 1;
        return;
    }
    stage->tail = duration;
}

/** A dynamics compressor: the loud parts are pulled down toward the threshold. */
void stage_compressor(int voice, float threshold, float knee, float ratio, float attack, float release)
{
    Stage *stage = new_stage(voice, STAGE_COMPRESSOR);
    if(stage == NULL) return;
    stage->threshold = threshold;
    stage->knee = knee;
    stage->ratio = ratio;
    stage->attack = (float)exp(-1.0 / ((attack < 0.0001f ? 0.0001f : attack) * rate));
    stage->release = (float)exp(-1.0 / ((release < 0.0001f ? 0.0001f : release) * rate));
}

/** A distortion: the samples are bent toward the extremes, the more the higher the amount. */
void stage_distortion(int voice, float amount)
{
    Stage *stage = new_stage(voice, STAGE_DISTORTION);
    if(stage != NULL) stage->amount = amount;
}


//// PROCESSING ////

static void run_biquad(Stage *stage, float *samples, int length, double *memory)
{
    double x1 = memory[0], x2 = memory[1], y1 = memory[2], y2 = memory[3];
    for(int i = 0; i < length; i++){
        double x0 = samples[i];
        double y0 = stage->b0 * x0 + stage->b1 * x1 + stage->b2 * x2 - stage->a1 * y1 - stage->a2 * y2;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        samples[i] = (float)y0;
    }
    memory[0] = x1;
    memory[1] = x2;
    memory[2] = y1;
    memory[3] = y2;
}

static void run_delay(Stage *stage, float *samples, int length, Line *line)
{
    for(int i = 0; i < length; i++){
        float echo = line->data[line->at];
        line->data[line->at] = samples[i] + echo * line->feedback;
        samples[i] += echo;
        line->at = (line->at + 1) % line->size;
    }
    (void)stage;
}

static void run_reverb(float *samples, int length, Line *lines)
{
    for(int i = 0; i < length; i++){
        float input = samples[i];
        float wet = 0;
        for(int c = 0; c < COMBS; c++){
            Line *comb = &lines[c];
            float out = comb->data[comb->at];
            comb->data[comb->at] = input + out * comb->feedback;
            comb->at = (comb->at + 1) % comb->size;
            wet += out;
        }
        for(int a = 0; a < ALLPASSES; a++){
            Line *allpass = &lines[COMBS + a];
            float buffered = allpass->data[allpass->at];
            float out = buffered - wet;
            allpass->data[allpass->at] = wet + buffered * 0.5f;
            allpass->at = (allpass->at + 1) % allpass->size;
            wet = out;
        }
        samples[i] = input + wet * ROOM_LEVEL;
    }
}

/** The reduction, in dB and no more than 0, that a level in dB asks for. */
static float compressor_target(Stage *stage, float level)
{
    float over = level - stage->threshold;
    float slope = 1.0f / stage->ratio - 1.0f;
    if(2 * over < -stage->knee) return 0;
    if(stage->knee > 0 && 2 * fabsf(over) <= stage->knee){
        float inside = over + stage->knee / 2;
        return slope * inside * inside / (2 * stage->knee);
    }
    return slope * over;
}

static float bend(float amount, float x)
{
    float clamped = x < -1 ? -1 : (x > 1 ? 1 : x);
    return (1 + amount) * clamped / (1 + amount * fabsf(clamped));
}

static void process(Stage *stage, float *left, float *right, int length)
{
    switch(stage->kind){
        case STAGE_BIQUAD:
            run_biquad(stage, left, length, stage->memory[0]);
            run_biquad(stage, right, length, stage->memory[1]);
            break;
        case STAGE_GAIN:
            for(int i = 0; i < length; i++){
                left[i] *= stage->volume;
                right[i] *= stage->volume;
            }
            break;
        case STAGE_PAN:
            for(int i = 0; i < length; i++){
                float l = left[i];
                float r = right[i];
                if(stage->pan_to_right){
                    left[i] = l * stage->pan_left;
                    right[i] = r + l * stage->pan_right;
                }
                else {
                    left[i] = l + r * stage->pan_left;
                    right[i] = r * stage->pan_right;
                }
            }
            break;
        case STAGE_DELAY:
            run_delay(stage, left, length, &stage->lines[0]);
            run_delay(stage, right, length, &stage->lines[1]);
            break;
        case STAGE_REVERB:
            run_reverb(left, length, &stage->lines[0]);
            run_reverb(right, length, &stage->lines[LINES_PER_SIDE]);
            break;
        case STAGE_COMPRESSOR:
            for(int i = 0; i < length; i++){
                float level = fmaxf(fmaxf(fabsf(left[i]), fabsf(right[i])), 1e-9f);
                float target = compressor_target(stage, 20 * log10f(level));
                float coefficient = target < stage->reduction ? stage->attack : stage->release;
                stage->reduction = target + coefficient * (stage->reduction - target);
                float factor = powf(10.0f, stage->reduction / 20);
                left[i] *= factor;
                right[i] *= factor;
            }
            break;
        case STAGE_DISTORTION:
            for(int i = 0; i < length; i++){
                left[i] = bend(stage->amount, left[i]);
                right[i] = bend(stage->amount, right[i]);
            }
            break;
        default:
            break;
    }
}


//// VOICES ////

/**
 * Open a voice on a sound, to which stages are added before it starts. When every voice is taken, the
 * oldest started one is cut off. Returns the voice, or -1 when the sound is unknown.
 */
int voice_open(int sound, float volume)
{
    if(sound < 0 || sound >= sound_count) return -1;
    int chosen = -1;
    for(int i = 0; i < MAX_VOICES; i++){
        if(!voices[i].open){
            chosen = i;
            break;
        }
    }
    if(chosen < 0){
        for(int i = 0; i < MAX_VOICES; i++){
            if(voices[i].started && (chosen < 0 || voices[i].age < voices[chosen].age)) chosen = i;
        }
        if(chosen < 0) return -1;
        close_voice(&voices[chosen]);
    }
    Voice *voice = &voices[chosen];
    voice->open = 1;
    voice->started = 0;
    voice->age = clock_ticks++;
    voice->sound = sound;
    voice->volume = volume;
    voice->position = 0;
    voice->rendered = 0;
    voice->stage_count = 0;
    return chosen;
}

/** Let a voice be heard, from the next block. */
void voice_start(int index)
{
    if(index < 0 || index >= MAX_VOICES) return;
    Voice *voice = &voices[index];
    if(!voice->open || voice->started) return;
    Sound *sound = &sounds[voice->sound];
    voice->step = (double)sound->rate / rate;
    double tail = 0;
    for(int i = 0; i < voice->stage_count; i++) tail += voice->stages[i].tail;
    voice->total = (long)ceil(sound->frames / voice->step) + (long)ceil(tail * rate);
    voice->started = 1;
}

/** Add the next `length` frames of a voice to the sums of each side. */
static void mix_voice(Voice *voice, int length)
{
    Sound *sound = &sounds[voice->sound];
    for(int i = 0; i < length; i++){
        double at = voice->position;
        int index = (int)at;
        if(index < sound->frames){
            int next = index + 1 < sound->frames ? index + 1 : sound->frames - 1;
            float mix = (float)(at - index);
            left_voice[i] = sound->left[index] + (sound->left[next] - sound->left[index]) * mix;
            right_voice[i] = sound->right[index] + (sound->right[next] - sound->right[index]) * mix;
        }
        else {
            left_voice[i] = 0;
            right_voice[i] = 0;
        }
        voice->position += voice->step;
    }
    for(int s = 0; s < voice->stage_count; s++) process(&voice->stages[s], left_voice, right_voice, length);
    for(int i = 0; i < length; i++){
        left_mix[i] += left_voice[i] * voice->volume;
        right_mix[i] += right_voice[i] * voice->volume;
    }
    voice->rendered += length;
}

/** A sample kept between -1 and 1: left as it is up to the knee, bent smoothly above it. */
static float limit(float sample)
{
    float level = fabsf(sample);
    if(level <= KNEE) return sample;
    float room = 1 - KNEE;
    float bent = KNEE + room * tanhf((level - KNEE) / room);
    return sample < 0 ? -bent : bent;
}

/**
 * Render the next `frames` frames of every voice started, and return them as interleaved left and right
 * samples. The block stays where it is until the next call.
 */
float *engine_render(int frames)
{
    if(frames < 1) return output;
    if(frames > MAX_BLOCK) frames = MAX_BLOCK;
    memset(left_mix, 0, sizeof(float) * (size_t)frames);
    memset(right_mix, 0, sizeof(float) * (size_t)frames);
    for(int i = 0; i < MAX_VOICES; i++){
        Voice *voice = &voices[i];
        if(!voice->open || !voice->started) continue;
        mix_voice(voice, frames);
        if(voice->rendered >= voice->total) close_voice(voice);
    }
    for(int i = 0; i < frames; i++){
        output[2 * i] = limit(left_mix[i]);
        output[2 * i + 1] = limit(right_mix[i]);
    }
    return output;
}
