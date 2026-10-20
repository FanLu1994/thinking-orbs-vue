// orbs-v2.js — 新设计的 5 个 thinking 状态（working / searching / solving / listening / connecting）
// 纯 2D canvas、黑白墨色、细点 + 3D 纵深 + 拖尾 + 错峰缓动。浏览器直接 <script> 引入，暴露 window.OrbsV2
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;

  // ---------- 基础工具 ----------
  function hash(a, b) { var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); }
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(e0, e1, x) { var u = clamp((x - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u); }
  function easeIO(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function fib(i, n) {
    var g = Math.PI * (3 - Math.sqrt(5)), y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * g;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  }
  var fibCache = {};
  function fibArr(n) {
    if (!fibCache[n]) { var arr = []; for (var i = 0; i < n; i++) arr.push(fib(i, n)); fibCache[n] = arr; }
    return fibCache[n];
  }
  function norm(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  // 世界坐标 → 视图坐标（z>0 朝向观察者）
  function rot(yaw, tilt) {
    var sy = Math.sin(yaw), cy = Math.cos(yaw), st = Math.sin(tilt), ct = Math.cos(tilt);
    return function (x, y, z) {
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      return [x1, y * ct - z1 * st, y * st + z1 * ct];
    };
  }
  function slerp(a, b, u) {
    var om = Math.acos(clamp(dot3(a, b), -1, 1));
    if (om < 1e-4) return a.slice();
    var so = Math.sin(om), wa = Math.sin((1 - u) * om) / so, wb = Math.sin(u * om) / so;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
  }
  // 推入一个点：v 为视图坐标，w = 墨值(0 最浓)，a = 透明度
  function D(out, c, s, v, r, w, a) { out.push({ x: c + v[0] * s, y: c - v[1] * s, z: v[2], r: r, w: w, a: a }); }

  // ============================================================
  // working — 环面纽结流：粒子沿 (2,3) 纽结奔流，各自速度不同会互相超车，带拖尾
  // ============================================================
  function working(S, t) {
    var k = S / 64, c = S / 2, s = S * 0.39 * (1 + 0.035 * Math.sin(t * 1.3));
    var R = rot(t * 0.32, 0.55 + 0.12 * Math.sin(t * 0.4)), out = [], N = 190, TR = 6;
    for (var i = 0; i < N; i++) {
      var h1 = hash(i, 1.1), h2 = hash(i, 2.2), h3 = hash(i, 3.3), sp = 0.85 + 0.45 * h1;
      for (var j = 0; j < TR; j++) {
        var tt = t - j * 0.045, u = (i / N) * TAU + tt * sp;
        var rr = 2 + Math.cos(3 * u), cx2 = Math.cos(2 * u), sx2 = Math.sin(2 * u);
        var o1 = (h2 - 0.5) * 0.14 + 0.06 * (noise(i * 0.37, tt * 0.9) - 0.5);
        var o2 = (h3 - 0.5) * 0.14 + 0.06 * (noise(i * 0.53 + 9, tt * 0.9) - 0.5);
        var v = R(rr * cx2 / 3 + cx2 * o1, Math.sin(3 * u) / 3 + o2, rr * sx2 / 3 + sx2 * o1);
        var d = clamp((v[2] + 1) / 2, 0, 1), f = 1 - j / TR;
        D(out, c, s, v, k * (0.3 + 0.45 * d) * (j ? 0.55 + 0.4 * f : 1), 0.62 - 0.5 * d + (j ? 0.12 : 0), (0.3 + 0.7 * d) * f * f);
      }
    }
    return out;
  }

  // ============================================================
  // searching — 探照巡航：一颗探针绕着点阵球巡航，在几个落点间“移动 → 停驻 → 再出发”，
  //             它照到的地方只是安静地亮起来，球面本身不形变（不鼓包、不出现眼睛状光环）
  // ============================================================
  function seekDir(i) {
    // 落点只取朝向观察者的半球，保证光斑始终在可见面
    return norm([(hash(i, 1.7) - 0.5) * 1.5, (hash(i, 2.9) - 0.5) * 1.1, 0.55 + 0.45 * hash(i, 4.1)]);
  }
  function seekAt(tt) {
    var SEG = 1.7, ph = tt / SEG, i = Math.floor(ph), u = ph - i;
    var e = easeIO(clamp(u / 0.6, 0, 1));                       // 前 60% 移动，后 40% 停驻
    var hold = smooth(0.6, 0.72, u) * (1 - smooth(0.9, 1, u));   // 停驻时光斑稍微增亮，表示“看清楚了”
    return { L: norm(slerp(seekDir(i), seekDir(i + 1), e)), hold: hold };
  }
  function searching(S, t) {
    var k = S / 64, c = S / 2, s = S * 0.36, R = rot(t * 0.1, 0.38), out = [];
    var sk = seekAt(t), L = sk.L, I = 0.72 + 0.28 * sk.hold, pts = fibArr(320);
    // 球面：均匀细点，只做明暗，不做位移
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], v = R(p[0], p[1], p[2]), d = clamp((v[2] + 1) / 2, 0, 1);
      var f = smooth(0.8, 0.985, dot3(v, L)) * I;
      D(out, c, s, v, k * (0.24 + 0.22 * d + 0.26 * f), 0.68 - 0.38 * d - 0.42 * f, clamp(0.12 + 0.4 * d + 0.48 * f, 0, 1));
    }
    // 光束：从光斑向外几颗细点，越远越淡，没有探针
    for (var b = 1; b <= 5; b++) {
      var bh = 1 + b * 0.04;
      D(out, c, s, [L[0] * bh, L[1] * bh, L[2] * bh], k * 0.24, 0.3, (0.6 - b * 0.11) * I);
    }
    return out;
  }

  // ============================================================
  // solving — 混沌 → 秩序：散乱粒子按波次归位成球 → 螺旋式重组为立方点阵 → 自上而下溃散，循环
  //           成形停顿时有一道"校验扫描线"掠过
  // ============================================================
  var SOL_N = 260, solCache = null;
  function solData() {
    if (solCache) return solCache;
    var sph = fibArr(SOL_N), cube = [], scat = [];
    for (var i = 0; i < SOL_N; i++) {
      var p = sph[i], m = Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
      cube.push([p[0] / m, p[1] / m, p[2] / m].map(function (x) { return (Math.round((x + 1) * 2.5) / 2.5 - 1) * 0.64; }));
      var dir = norm([hash(i, 4.1) - 0.5, hash(i, 5.2) - 0.5, hash(i, 6.3) - 0.5]), rad = 0.3 + 0.65 * Math.cbrt(hash(i, 7.4));
      scat.push([dir[0] * rad, dir[1] * rad, dir[2] * rad]);
    }
    return (solCache = { sph: sph, cube: cube, scat: scat });
  }
  function solving(S, t) {
    var dd = solData(), k = S / 64, c = S / 2, s = S * 0.43, R = rot(t * 0.38, 0.42), out = [];
    var T = t % 5.2, A, B, p = 1, mode = -1, hold = 0;
    if (T < 1.1) { A = 'scat'; B = 'sph'; p = T / 1.1; mode = 0; }
    else if (T < 1.8) { A = B = 'sph'; hold = (T - 1.1) / 0.7; }
    else if (T < 2.8) { A = 'sph'; B = 'cube'; p = (T - 1.8) / 1.0; mode = 1; }
    else if (T < 3.5) { A = B = 'cube'; hold = (T - 2.8) / 0.7; }
    else if (T < 4.4) { A = 'cube'; B = 'scat'; p = (T - 3.5) / 0.9; mode = 2; }
    else { A = B = 'scat'; }
    function get(name, i) {
      var v = dd[name][i];
      if (name === 'scat') return [v[0] + 0.18 * (noise(i * 0.31, t * 0.45) - 0.5), v[1] + 0.18 * (noise(i * 0.47 + 5, t * 0.45) - 0.5), v[2] + 0.18 * (noise(i * 0.29 + 11, t * 0.45) - 0.5)];
      if (name === 'sph') return [v[0] * 0.92, v[1] * 0.92, v[2] * 0.92];
      return v;
    }
    var sweepY = -1.1 + 2.2 * hold, settled = mode === -1 && A !== 'scat';
    for (var i = 0; i < SOL_N; i++) {
      var a = get(A, i), b = get(B, i);
      var sv = mode === 0 ? (b[1] + 1) / 2 : mode === 1 ? Math.atan2(a[2], a[0]) / TAU + 0.5 : mode === 2 ? 1 - (a[1] + 1) / 2 : 0;
      var e = mode === -1 ? 1 : easeIO(clamp(p * 1.7 - sv * 0.7, 0, 1)), mv = 4 * e * (1 - e);
      var x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e, z = a[2] + (b[2] - a[2]) * e;
      var n = norm([x, y, z]);
      x += n[0] * 0.1 * mv; y += n[1] * 0.1 * mv; z += n[2] * 0.1 * mv;
      var band = settled ? Math.exp(-Math.pow((y - sweepY) / 0.09, 2)) : 0;
      var v = R(x, y, z), d = clamp((v[2] + 1) / 2, 0, 1), hi = Math.max(mv, band);
      D(out, c, s, v, k * (0.3 + 0.38 * d + 0.35 * hi), 0.62 - 0.45 * d - 0.32 * hi, clamp(0.3 + 0.6 * d + 0.25 * hi, 0, 1));
    }
    return out;
  }

  // ============================================================
  // listening — 声场水面：一片同心点阵圆盘，中心按"语音包络"起伏，涟漪带着历史振幅向外扩散
  // ============================================================
  function env(tt) { return Math.pow(clamp(noise(tt * 1.5, 7.3) * 1.5 - 0.25, 0, 1), 1.4); }
  function listening(S, t) {
    var k = S / 64, c = S / 2, s = S * 0.44, R = rot(t * 0.12, 0.72), out = [], RINGS = 16;
    for (var ri = 1; ri <= RINGS; ri++) {
      var r = ri / RINGS, n = Math.round(6 + r * 60), E = env(t - r * 0.75);
      var h0 = E * Math.sin(r * 11 - t * 7.5) * 0.2 * (1 - 0.4 * r);
      var edge = 1 - smooth(0.8, 1, r) * 0.6;
      for (var q = 0; q < n; q++) {
        var ang = (q / n) * TAU + ri * 0.37 + t * 0.05;
        var h = h0 + 0.018 * r * Math.sin(ang * 3 + t * 1.7);
        var v = R(r * Math.cos(ang), h, r * Math.sin(ang)), d = clamp((v[2] + 1) / 2, 0, 1), ah = Math.abs(h);
        D(out, c, s, v, k * (0.28 + 0.24 * d + 1.6 * ah), 0.6 - 0.3 * d - 2.2 * Math.max(0, h), clamp((0.28 + 0.55 * d + 1.5 * ah) * edge, 0, 1));
      }
    }
    var Ec = env(t);
    D(out, c, s, R(0, 0.03 + 0.06 * Ec, 0), k * (0.6 + 1.0 * Ec), 0.08, 0.95);
    return out;
  }

  // ============================================================
  // connecting — 神经突触：球面上漂移的节点之间，点线弧"自己长出来"→ 抵达时目标节点脉冲 → 尾部收回
  // ============================================================
  function connecting(S, t) {
    var k = S / 64, c = S / 2, s = S * 0.35, R = rot(t * 0.22, 0.4), out = [], M = 10, nodes = [], pulse = [];
    for (var i = 0; i < M; i++) {
      var f = fib(i, M);
      nodes.push(norm([f[0] + 0.35 * (noise(i * 0.7, t * 0.25) - 0.5), f[1] + 0.35 * (noise(i * 0.9 + 3, t * 0.25) - 0.5), f[2] + 0.35 * (noise(i * 1.1 + 6, t * 0.25) - 0.5)]));
      pulse.push(0);
    }
    var dust = fibArr(150);
    for (var j = 0; j < dust.length; j++) {
      var dv = R(dust[j][0], dust[j][1], dust[j][2]), dd = clamp((dv[2] + 1) / 2, 0, 1);
      D(out, c, s, dv, k * 0.26, 0.7, 0.05 + 0.13 * dd);
    }
    var LINKS = 5, DUR = 2.4;
    for (var sl = 0; sl < LINKS; sl++) {
      var ph = t / DUR + sl / LINKS + hash(sl, 3.3) * 0.2, cyc = Math.floor(ph), p = ph - cyc;
      var a = Math.floor(hash(cyc, sl + 0.5) * M), b = Math.floor(hash(cyc, sl + 7.1) * M);
      if (b === a) b = (a + 1 + Math.floor(hash(cyc, sl + 2.2) * (M - 1))) % M;
      var A = nodes[a], B = nodes[b], om = Math.acos(clamp(dot3(A, B), -1, 1)), lift = 0.08 + 0.3 * (om / Math.PI);
      var head = easeIO(clamp(p / 0.5, 0, 1)), tail = easeIO(clamp((p - 0.5) / 0.45, 0, 1));
      pulse[a] = Math.max(pulse[a], Math.exp(-Math.pow(p / 0.06, 2)));
      pulse[b] = Math.max(pulse[b], Math.exp(-Math.pow((p - 0.5) / 0.08, 2)));
      var Q = 30;
      for (var q = 0; q <= Q; q++) {
        var u = q / Q;
        if (u < tail - 1e-6 || u > head + 1e-6) continue;
        var m = slerp(A, B, u), hh = 1 + lift * Math.sin(Math.PI * u);
        var v = R(m[0] * hh, m[1] * hh, m[2] * hh), d = clamp((v[2] + 1) / 2, 0, 1);
        var glow = head < 1 ? Math.exp(-Math.pow((u - head) / 0.07, 2)) : 0;
        D(out, c, s, v, k * (0.26 + 0.22 * d + 0.5 * glow), 0.55 - 0.35 * d - 0.4 * glow, clamp(0.25 + 0.5 * d + 0.3 * glow, 0, 1));
      }
    }
    for (var ni = 0; ni < M; ni++) {
      var nd = nodes[ni], nv = R(nd[0], nd[1], nd[2]), d2 = clamp((nv[2] + 1) / 2, 0, 1), pu = pulse[ni];
      D(out, c, s, nv, k * (0.5 + 0.25 * d2 + 0.7 * pu), 0.3 - 0.25 * d2 - 0.2 * pu, clamp(0.55 + 0.45 * d2, 0, 1));
      var t1 = norm(Math.abs(nd[1]) > 0.9 ? cross(nd, [1, 0, 0]) : cross(nd, [0, 1, 0])), t2 = cross(nd, t1), rr = 0.09 + 0.07 * pu;
      for (var q2 = 0; q2 < 6; q2++) {
        var an = (q2 / 6) * TAU + t * 1.2 + ni;
        var px = nd[0] + (t1[0] * Math.cos(an) + t2[0] * Math.sin(an)) * rr;
        var py = nd[1] + (t1[1] * Math.cos(an) + t2[1] * Math.sin(an)) * rr;
        var pz = nd[2] + (t1[2] * Math.cos(an) + t2[2] * Math.sin(an)) * rr;
        var rv = R(px, py, pz);
        D(out, c, s, rv, k * 0.24, 0.5 - 0.3 * d2, clamp((0.2 + 0.4 * d2) * (0.4 + 0.6 * pu), 0, 1));
      }
    }
    return out;
  }

  // ---------- 绘制：远→近排序，黑白墨色，深色主题镜像 ----------
  function paint(ctx, dots, dark) {
    dots.sort(function (a, b) { return a.z - b.z; });
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (d.a < 0.02) continue;
      var w = clamp(d.w, 0, 1), g = Math.round((dark ? 1 - w : w) * 255);
      ctx.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + d.a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(0.25, d.r), 0, TAU); ctx.fill();
    }
  }

  root.OrbsV2 = { modes: { working: working, searching: searching, solving: solving, listening: listening, connecting: connecting }, paint: paint };
})(typeof window !== 'undefined' ? window : globalThis);
