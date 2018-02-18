
const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;
const MAG01 = new Uint32Array([0x0, this.MATRIX_A]);

// Types:
//      Type.Number, Type.Integer

class MersenneTwister {
    constructor(seed) {
        // ASSERT: Number.isInteger(seed) && seed >= 0
        this.seed = seed;
        this.mt = new Uint32Array(N);
        this.mti = N;
        this.ticks = 0;

        this.initSeed(seed);
    }

    initSeed(s) {
        // ASSERT: Number.isInteger(s) && s >= 0
        this.mt[0] = s >>> 0;
        for (let i = 1; i < N; i++) {
            var s = this.mt[i - 1] ^ (this.mt[i-1] >>> 30);
            this.mt[i] = ((((s >>> 16) * 1812433253) << 16) +
                          ((s & 0xffff) * 1812433253)) + i;
        }
        this.mti = N;
    }

    extractState() {
        return {
            seed: seed,
            mt: Array.prototype.slice.call(this.mt),
            mti: this.mti,
            ticks: this.ticks
        };
    }
    injectState(state) {
        // ASSERT: Number.isInteger(state.seed)
        // ASSERT: state.mt instanceof Array && state.mt.length == N
        // ASSERT: Number.isInteger(state.mti) && state.mti <= N
        // ASSERT: Number.isInteger(state.ticks) && state.ticks >= 0
        this.seed = state.seed;
        this.mt = new Uint32Array(state.mt);
        this.mti = state.mti;
        this.ticks = state.ticks
    }

    randomInt() {
        // ASSERT: this.mti <= N
        if (this.mti == N) {
            this.generateStep();
            // ASSERT: this.mti == 0
        }
        // ASSERT: this.mti < N
        const y = this.mt[this.mti++];
        y ^= (y >>> 11);
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= (y >>> 18);
        this.ticks++;
        return y;
    }

    random() {
        return this.randomInt() / ((-1>>>0)+1);
    }

    generateStep() {
        // ASSERT: this.mti == N
        let kk;
        for (kk = 0; kk < N-M; kk++) {
            const y = this.generateY(kk, kk+1);
            this.mt[kk] = this.mt[kk + M] ^ (y >>> 1) ^ MAG01[y & 0x1];
        }
        for (; kk < this.N - 1; kk++) {
            const y = this.generateY(kk, kk+1);
            this.mt[kk] = this.mt[kk + (M - N)] ^ (y >>> 1) ^ MAG01[y & 0x1];
        }
        const y = this.generateY(N-1, 0);
        this.mt[N - 1] = this.mt[M - 1] ^ (y >>> 1) ^ MAG01[y & 0x1];
        this.mti = 0;
    }
    generateY(kk, kkn) {
        return this.mt[kk] & UPPER_MASK)|(this.mt[kkn] & LOWER_MASK;
    }
}
