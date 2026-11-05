// Imported by cWasm.test.ts, through the plugin of core/build/cWasm.ts.

#include <math.h>
#include <stdlib.h>

#include "cWasm.fixture.h"

/** Values the tests write from JS, then sum here. */
float samples[SAMPLE_COUNT];

static int square(int x){
    return x * x;
}

/** The sum of the squares of two numbers. */
int sumOfSquares(int a, int b){
    return square(a) + square(b);
}

double hypotenuse(double a, double b){
    return sqrt(a * a + b * b);
}

long long twice(long long value){
    return value * 2;
}

float sumOfSamples(void){
    float sum = 0;
    for(int i = 0; i < SAMPLE_COUNT; i++) sum += samples[i];
    return sum;
}

float* allocate(int count){
    return calloc(count, sizeof(float));
}
