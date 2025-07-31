// JavaScript version of the cst_foil, cst_curve, and dist_clustcos functions

function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function dist_clustcos(nn, a0 = 0.0079, a1 = 0.96, beta = 1.0) {
    const pi = Math.PI;
    const aa = Math.pow((1 - Math.cos(a0 * pi)) / 2, beta);
    const dd = Math.pow((1 - Math.cos(a1 * pi)) / 2, beta) - aa;
    const yt = Array.from({ length: nn }, (_, i) => i / (nn - 1));
    const a = yt.map(y => pi * (a0 * (1 - y) + a1 * y));
    const xx = a.map(v => (Math.pow((1 - Math.cos(v)) / 2, beta) - aa) / dd);
    return xx;
}

function cst_curve(nn, coef, x = null, xn1 = 0.5, xn2 = 1.0, a0 = 0.0079, a1 = 0.96) {

    if (!x) {
        x = dist_clustcos(nn, a0, a1);
    } else if (x.length !== nn) {
        throw new Error(`Specified point distribution has different size ${x.length} as input nn ${nn}`);
    }

    const n_cst = coef.length;
    const s_psi = new Array(nn).fill(0);

    for (let i = 0; i < n_cst; i++) {
        const binomial = factorial(n_cst - 1) / (factorial(i) * factorial(n_cst - 1 - i));
        for (let j = 0; j < nn; j++) {
            s_psi[j] += coef[i] * binomial * Math.pow(x[j], i) * Math.pow(1 - x[j], n_cst - 1 - i);
        }
    }

    const y = x.map((val, i) => Math.pow(val, xn1) * Math.pow(1 - val, xn2) * s_psi[i]);
    y[0] = 0.0;
    y[y.length - 1] = 0.0;

    return [x, y];
}

function cst_foil(nn, cst_u, cst_l, x = null, t = null, tail = 0.0, xn1 = 0.5, xn2 = 1.0, a0 = 0.0079, a1 = 0.96) {
    const [x_, yu0] = cst_curve(nn, cst_u, x, xn1, xn2, a0, a1);
    const [_,  yl0] = cst_curve(nn, cst_l, x, xn1, xn2, a0, a1);

    let yu = [...yu0];
    let yl = [...yl0];
    let thick = yu.map((val, i) => val - yl[i]);
    let it = thick.indexOf(Math.max(...thick));
    let t0 = thick[it];

    if (t !== null) {
        const r = (t - tail * x_[it]) / t0;
        t0 = t;
        yu = yu.map(val => val * r);
        yl = yl.map(val => val * r);
    }

    for (let i = 0; i < nn; i++) {
        yu[i] += 0.5 * tail * x_[i];
        yl[i] -= 0.5 * tail * x_[i];
    }

    if (t === null) {
        thick = yu.map((val, i) => val - yl[i]);
        it = thick.indexOf(Math.max(...thick));
        t0 = thick[it];
    }

    return [x_, yu, yl, t0];
}

function fit_curve(x, y, n_cst = 7, xn1 = 0.5, xn2 = 1.0) {
    const nn = x.length;
    const L = x[nn - 1] - x[0];
    const x_ = x.map(xi => (xi - x[0]) / L);
    const y_ = y.map(yi => (yi - y[0]) / L);

    const b = y_.map((yi, i) => yi - x_[i] * y_[nn - 1]);
    const A = Array.from({ length: nn }, () => new Array(n_cst).fill(0));

    for (let ip = 0; ip < nn; ip++) {
        const C_n1n2 = Math.pow(x_[ip], xn1) * Math.pow(1 - x_[ip], xn2);
        for (let i = 0; i < n_cst; i++) {
            const bin = factorial(n_cst - 1) / (factorial(i) * factorial(n_cst - 1 - i));
            A[ip][i] = bin * Math.pow(x_[ip], i) * Math.pow(1 - x_[ip], n_cst - 1 - i) * C_n1n2;
        }
    }

    // Solve least squares Ax ≈ b
    const AT = A[0].map((_, colIndex) => A.map(row => row[colIndex]));
    const ATA = AT.map(row => AT.map((_, j) => row.reduce((sum, val, k) => sum + val * A[k][j], 0)));
    const ATb = AT.map(row => row.reduce((sum, val, i) => sum + val * b[i], 0));

    // Solve ATA * x = ATb via Gaussian elimination
    const coef = numeric.solve(ATA, ATb);
    return coef;
}
