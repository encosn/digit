/**
 * main.js — 화면 그리기와 조작 (계산은 전부 spread-core.js 가 한다)
 *
 * ① 그림은 **도는 지구본** 이다. 한국(서울)에서 시작해 육지를 따라 전 세계로 퍼진다.
 *    (2026-08-01: 교과서식 동심원 그림 → 지구본으로 교체. 시안 비교는 alt-views.html 참고)
 */
(function () {
  'use strict';

  var C = window.SpreadCore;
  var NS = 'http://www.w3.org/2000/svg';
  var RAD = Math.PI / 180;

  var END_T = 12;          // 슬라이더 끝 (분)
  var MS_PER_MIN = 1400;   // 1배속에서 "1분"이 실제 1.4초 (12분 전체가 약 17초)

  /* ───────── 지구본 설정 ─────────
     ⚠️ 아래 값들은 서로 물려 있다. 바꾼 뒤에는 반드시
        ① 사람이 바다에 찍히지 않는지 ② 회전이 튀지 않는지를 브라우저에서 다시 잴 것. */
  var ORIGIN = { lat: 37.5, lon: 127.0 };   // 서울
  var HOP = [0, 48, 45, 38, 32];   // 단계마다 지구 위에서 몇 도씩 건너뛰는가 (합 163도 = 지구 반대편)
  var GR = 468;                    // 지구 반지름(좌표 단위)
  var VB = 560;                    // viewBox 절반
  var NR = [11, 7.5, 5, 3, 1.9];   // 단계별 점 크기
  var SUB = 8;                     // 대륙 외곽선을 변마다 몇 등분해 찍을지
  var FADE = 5;                    // 갓 켜진 사람이 "회전 방향" 평균에 스며드는 시간(분)
  var GAIN = 1.1;                  // 확산이 쏠린 쪽으로 기울이는 정도
  var SWEEP = 250;                 // 퍼진 만큼 꾸준히 도는 각도

  /* 아주 단순화한 세계 지도. 교실에서 "지구구나" 하고 알아보면 되는 수준이다.
     ⚠️ 지리 수업용 정확한 지도가 아니다. 유라시아의 한반도 부분은 서울이 육지로 판정되게
     일부러 그려 넣은 것이니 손대지 말 것. */
  var LAND = [
    [[-9,36],[-9,43],[-1,43],[1,49],[7,53],[5,58],[11,58],[10,64],[16,69],[28,71],[40,68],[55,70],
     [68,73],[80,74],[95,78],[110,76],[128,73],[142,72],[160,70],[172,66],[168,60],[158,58],[150,53],
     [142,46],[135,43],[131,43],[130,37],[127,34],[125,38],[122,40],[121,38],
     [122,31],[122,23],[110,21],[105,10],[103,1],[98,8],[92,21],
     [88,22],[80,15],[77,8],[73,15],[68,23],[61,25],[57,25],[50,29],[43,30],[35,36],[27,36],[23,40],
     [13,38],[9,44],[3,43],[-2,37]],
    [[-6,36],[10,37],[20,33],[32,31],[35,24],[43,12],[51,12],[44,-2],[40,-16],[35,-25],[26,-34],
     [18,-35],[12,-18],[9,-2],[8,4],[-8,4],[-13,10],[-17,15],[-16,22],[-12,28],[-9,32]],
    [[-168,66],[-158,71],[-140,70],[-125,70],[-110,68],[-95,70],[-82,73],[-70,68],[-58,58],[-53,48],
     [-65,44],[-70,41],[-76,35],[-81,26],[-83,30],[-89,29],[-97,26],[-105,20],[-95,16],[-84,10],
     [-78,9],[-88,16],[-98,18],[-110,24],[-117,32],[-124,40],[-124,48],[-133,55],[-146,60],[-158,56],[-166,60]],
    [[-78,8],[-72,11],[-62,10],[-52,5],[-50,0],[-44,-2],[-35,-6],[-37,-13],[-40,-20],[-48,-25],
     [-54,-34],[-62,-40],[-66,-46],[-70,-53],[-75,-52],[-73,-44],[-72,-35],[-71,-25],[-70,-18],
     [-76,-14],[-81,-5],[-79,2]],
    [[113,-22],[115,-28],[118,-34],[126,-32],[131,-31],[137,-34],[141,-38],[147,-39],[151,-34],
     [153,-27],[149,-21],[143,-13],[136,-12],[130,-12],[124,-15],[118,-19]],
    [[96,5],[104,-2],[112,-4],[120,-4],[131,-1],[141,-3],[147,-8],[140,-9],[132,-8],[122,-9],[112,-8],[104,-7]],
    [[-45,60],[-32,66],[-25,71],[-20,76],[-30,82],[-45,83],[-58,82],[-68,78],[-58,70],[-50,64]],
    [[130,32],[134,34],[139,35],[142,40],[145,44],[141,45],[138,38],[134,33],[131,31]],
    [[44,-12],[50,-15],[50,-20],[47,-25],[44,-22],[43,-17]],
    [[-5,50],[1,51],[0,54],[-2,58],[-5,58],[-6,54]]
  ];

  /* ───────── 상태 ───────── */
  var S = {
    nodes: [], byId: {},
    stages: C.MAX_STAGES,
    t: 0, playing: false, speed: 1, lastTs: 0, maxSee: 0,
    followers: C.DEFAULT_FOLLOWERS,
    dragLon: 0, dragLat: 0,     // 학생이 지구본을 끌어서 돌린 각도
    posted: false,              // 게시물을 올렸는가 (개인 정보 정답이 공개된다)
    movedOn: false,             // 개인 정보를 확인하고 넘어갔는가 (① 문제가 열린다)
    answered: {},               // 「확인」을 눌러 채점해 본 문제 번호
    simReady: false,            // 세 칸을 다 채웠는가 (「확산 보러 가기」 버튼이 나타난다)
    simOpen: false,             // 그 버튼을 눌렀는가 (② 확산 그림이 열린다)
    guess: ['', '', ''],        // ②로 넘어가는 순간 붙잡아 둔 학생의 예상 (채점표에 쓴다)
    cmpShown: [false, false, false],   // 채점표에서 이미 공개된 줄 (한 번 열리면 닫히지 않는다)
    unlocked: false,            // 10분까지 확산을 봤는가 (③ 더 알아보기가 열린다)
    deleted: false, deletedAt: 0, deletedPeople: 0
  };

  /* ───────── 짧은 도우미 ───────── */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function fmt(n) { return C.formatKo(n); }
  function prand(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ───────── 1. 구면 계산 ───────── */

  /** 한 점에서 방위 brg 로 dist(도)만큼 간 지점 */
  function destPoint(lat1, lon1, brg, dist) {
    var f1 = lat1 * RAD, l1 = lon1 * RAD, th = brg * RAD, d = dist * RAD;
    var sf = Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(th);
    var f2 = Math.asin(Math.max(-1, Math.min(1, sf)));
    var l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * sf);
    return { lat: f2 / RAD, lon: ((l2 / RAD + 540) % 360) - 180 };
  }

  /** 점이 육지 안에 있는가 (레이 캐스팅). 대륙 다각형이 날짜변경선을 넘지 않아 경도를 그대로 쓴다 */
  function inPoly(lon, lat, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function onLand(lat, lon) {
    for (var i = 0; i < LAND.length; i++) if (inPoly(lon, lat, LAND[i])) return true;
    return false;
  }

  /** 정사영 — 화면 한가운데가 (phi0, lam0). z>0 이면 앞면(보임) */
  function proj(lat, lon, lam0, phi0) {
    var f = lat * RAD, l = (lon - lam0) * RAD, p0 = (phi0 || 0) * RAD;
    var cf = Math.cos(f), sf = Math.sin(f), cl = Math.cos(l);
    var cp = Math.cos(p0), sp = Math.sin(p0);
    return {
      x: GR * cf * Math.sin(l),
      y: -GR * (cp * sf - sp * cf * cl),
      z: sp * sf + cp * cf * cl
    };
  }

  /**
   * 지구가 어느 쪽을 보고 있을지.
   *   ① 퍼진 만큼 꾸준히 도는 회전(SWEEP)을 뼈대로 삼고
   *   ② 그 위에 확산이 쏠린 쪽으로 조금 기울인다(GAIN).
   * 전 세계로 퍼지면 "확산 방향"이 사방이라 ②만 쓰면 화면이 심하게 흔들린다.
   * 시각 t 만으로 정해지므로 슬라이더를 끌어도 늘 같은 각도가 나온다.
   */
  function spreadLon(t) {
    var sx = 0, sy = 0, tw = 0;
    for (var i = 0; i < S.nodes.length; i++) {
      var n = S.nodes[i], w = (t - n.seeAt) / FADE;
      if (w <= 0) continue;
      if (w > 1) w = 1;
      var f = n.lat * RAD, l = n.lon * RAD, cf = Math.cos(f);
      sx += w * cf * Math.cos(l);
      sy += w * cf * Math.sin(l);
      tw += w;
    }
    if (tw === 0) return ORIGIN.lon;
    // 사방으로 고르게 퍼지면 평균 벡터가 0에 가까워져 방향이 튄다 → 뚜렷한 만큼만 기울인다
    var sharp = Math.min(1, Math.hypot(sx, sy) / tw / 0.45);
    var diff = ((Math.atan2(sy, sx) / RAD - ORIGIN.lon + 540) % 360) - 180;
    return ORIGIN.lon + SWEEP * (tw / S.nodes.length) + diff * sharp * GAIN;
  }

  /* ───────── 2. 사람을 지구 위 육지에 앉히기 ─────────
     ⚠️ 바다에는 사람이 살지 않으므로 **육지에 앉을 때까지 방향·거리를 다시 뽑는다.**
     흩어짐은 고정된 식(prand)이라 새로 고쳐도 늘 같은 모양이 나온다. */
  function assignGeo() {
    var firsts = S.nodes.filter(function (n) { return n.level === 1; });
    S.nodes.forEach(function (n, i) {
      if (n.level === 0) { n.lat = ORIGIN.lat; n.lon = ORIGIN.lon; n.head = 0; return; }
      var p = S.byId[n.parent];
      var base = n.level === 1 ? (firsts.indexOf(n) / firsts.length) * 360 : p.head;
      var span = n.level === 1 ? 26 : 170 / n.level;
      var q = null, head = base;

      // ① 부모가 향하던 쪽에서 찾되, 안 되면 조금씩 넓게 훑는다 (단 ±160도까지만)
      for (var k = 0; k < 90 && !q; k++) {
        var h = base + (prand(i * 91 + k * 7) - .5) * Math.min(span * (1 + k * .09), 160);
        var c = destPoint(p.lat, p.lon, h, HOP[n.level] * (.55 + .9 * prand(i * 53 + k * 11)));
        if (onLand(c.lat, c.lon)) { q = c; head = h; }
      }
      // ② 그래도 없으면 부모 둘레를 한 바퀴 훑는다 (섬처럼 사방이 바다인 경우)
      for (var b = 0; b < 360 && !q; b += 6) {
        for (var s = 0; s < 4 && !q; s++) {
          var c2 = destPoint(p.lat, p.lon, b, HOP[n.level] * (.35 + s * .25));
          if (onLand(c2.lat, c2.lon)) { q = c2; head = b; }
        }
      }
      if (!q) q = { lat: p.lat, lon: p.lon };   // 최후 — 부모 옆에 둔다
      n.lat = q.lat; n.lon = q.lon; n.head = head;
    });
  }

  /* ───────── 3. 그림 만들기 (딱 한 번) ─────────
     ⚠️ 성능: 점·선을 하나하나 element 로 두면 매 프레임 1,500개를 고쳐야 해서 느리다.
     그래서 **단계별로 path 하나에 몰아 그린다** (점 5개 + 선 4개 = element 9개).
     circle/line 여러 개로 되돌리지 말 것. */
  var landEls = [], gratEl, eqEl, ndEls = [], edEls = [], labels = [], delMark;

  function buildSvg() {
    var svg = $('net');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', (-VB) + ' ' + (-VB) + ' ' + (VB * 2) + ' ' + (VB * 2));

    svg.appendChild(el('circle', { class: 'ocean', r: GR, cx: 0, cy: 0 }));
    LAND.forEach(function () {
      var p = el('path', { class: 'land', d: '' });
      svg.appendChild(p); landEls.push(p);
    });
    gratEl = el('path', { class: 'grat', d: '' }); svg.appendChild(gratEl);
    eqEl = el('path', { class: 'eq', d: '' }); svg.appendChild(eqEl);

    for (var lv = 1; lv <= 4; lv++) {
      edEls[lv] = el('path', { class: 'ed' + lv, d: '' });
      svg.appendChild(edEls[lv]);
    }
    for (var v = 0; v <= 4; v++) {
      ndEls[v] = el('path', { class: 'nd' + v, d: '' });
      svg.appendChild(ndEls[v]);
    }

    // "N분" 은 드문드문만 — 1차 7개 전부 + 2차는 넷에 하나 (3·4차는 전부 1분이라 뺐다)
    var l2 = 0;
    S.nodes.forEach(function (n) {
      if (!n.parent) return;
      if (n.level === 1 || (n.level === 2 && (l2++ % 4 === 0))) {
        var tx = el('text', { class: 'mlab', x: 0, y: 0, opacity: 0 });
        tx.textContent = n.edgeMin + '분';
        svg.appendChild(tx);
        labels.push({ n: n, el: tx });
      }
    });

    // 글을 지웠을 때 홍길동 자리에 뜨는 표시
    delMark = el('g', { class: 'del-mark', opacity: 0 });
    delMark.appendChild(el('circle', { cx: 0, cy: 0, r: 20 }));
    delMark.appendChild(el('line', { x1: -14, y1: 14, x2: 14, y2: -14 }));
    svg.appendChild(delMark);
  }

  /** 위경도 격자 — 앞면 부분만 이어서 그린다 */
  function graticule(lam0, phi0, lons, lats) {
    var d = '';
    lons.forEach(function (lon) {
      var pen = false;
      for (var lat = -85; lat <= 85; lat += 5) {
        var p = proj(lat, lon, lam0, phi0);
        if (p.z > 0) { d += (pen ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); pen = true; }
        else pen = false;
      }
    });
    lats.forEach(function (lat) {
      var pen = false;
      for (var lon = -180; lon <= 180; lon += 5) {
        var p = proj(lat, lon, lam0, phi0);
        if (p.z > 0) { d += (pen ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); pen = true; }
        else pen = false;
      }
    });
    return d;
  }

  /** 대륙 — 뒤로 넘어간 점은 지구 가장자리로 밀어붙인다.
      변마다 SUB 등분해 찍어야 가장자리 해안선이 찌그러지지 않는다. */
  function landPath(poly, lam0, phi0) {
    var any = false, d = '';
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      for (var s = 0; s < SUB; s++) {
        var f = s / SUB;
        var p = proj(a[1] + (b[1] - a[1]) * f, a[0] + (b[0] - a[0]) * f, lam0, phi0);
        var x = p.x, y = p.y;
        if (p.z > 0) any = true;
        else { var h = Math.sqrt(x * x + y * y) || 1; x = x / h * GR; y = y / h * GR; }
        d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
    }
    return any ? d + 'Z' : '';
  }

  /* ───────── 3-2. ① 문제 옆의 교과서 그림 (정지 그림, 한 번만 그린다) ─────────
     교과서의 동심원 관계망을 그대로 재현한다 — 학생이 여기서 7명·31명을 직접 셀 수 있어야 하므로
     **사람 모양과 선을 다 그린다.** 확산 그림(지구본)과는 별개다. */
  function buildTextbookFigure() {
    var svg = $('tbFig');
    if (!svg) return;
    var CX = 285, CY = 275, R1 = 96, R2 = 210, SPAN = 40;
    svg.setAttribute('viewBox', '0 0 570 560');

    var defs = el('defs', {});
    var sym = el('symbol', { id: 'tbP', viewBox: '0 0 22 30' });
    sym.appendChild(el('circle', { cx: 11, cy: 6, r: 5.2 }));
    sym.appendChild(el('path', { d: 'M11 13.6c-5 0-8.2 3.4-8.2 8.4V30h16.4v-8c0-5-3.2-8.4-8.2-8.4z' }));
    defs.appendChild(sym);
    svg.appendChild(defs);

    svg.appendChild(el('rect', { class: 'tb-bg', x: 0, y: 0, width: 570, height: 560, rx: 16 }));
    [R1, R2].forEach(function (r) {
      svg.appendChild(el('circle', { class: 'tb-ring', cx: CX, cy: CY, r: r }));
    });

    var firsts = S.nodes.filter(function (n) { return n.level === 1; });
    var step = 360 / firsts.length;
    var edges = el('g', {}), labs = el('g', {}), people = el('g', {});

    function put(g, x, y, size, cls) {
      g.appendChild(el('use', {
        href: '#tbP', class: cls,
        x: x - size * 0.36, y: y - size * 0.5, width: size * 0.72, height: size
      }));
    }
    function line(x1, y1, x2, y2) {
      edges.appendChild(el('line', { class: 'tb-edge', x1: x1, y1: y1, x2: x2, y2: y2 }));
    }
    function minLabel(px, py, cx2, cy2, k, txt, cls) {
      var t = el('text', {
        class: 'tb-min ' + cls,
        x: (px + (cx2 - px) * k).toFixed(1), y: (py + (cy2 - py) * k).toFixed(1)
      });
      t.textContent = txt + '분';
      labs.appendChild(t);
    }

    firsts.forEach(function (f, i) {
      var a = (-90 + i * step) * RAD;
      var fx = CX + R1 * Math.cos(a), fy = CY + R1 * Math.sin(a);
      line(CX, CY, fx, fy);
      minLabel(CX, CY, fx, fy, 0.6, f.edgeMin, 'lv1');

      var kids = S.nodes.filter(function (n) { return n.parent === f.id; });
      var gap = kids.length > 1 ? SPAN / (kids.length - 1) : 0;
      kids.forEach(function (c, j) {
        var b = (-90 + i * step + (j - (kids.length - 1) / 2) * gap) * RAD;
        var cx2 = CX + R2 * Math.cos(b), cy2 = CY + R2 * Math.sin(b);
        line(fx, fy, cx2, cy2);
        // 안쪽/바깥쪽 세 단으로 엇갈리게 — 한 값이면 "N분" 글씨가 서로 겹친다
        minLabel(fx, fy, cx2, cy2, [0.36, 0.56, 0.76][j % 3], c.edgeMin, 'lv2');
        put(people, cx2, cy2, 19, 'tb-p2');
      });
      put(people, fx, fy, 25, 'tb-p1');
    });

    svg.appendChild(edges);
    svg.appendChild(labs);
    svg.appendChild(people);
    put(svg, CX, CY, 32, 'tb-p0');
    var nm = el('text', { class: 'tb-name', x: CX, y: CY + 32 });
    nm.textContent = '홍길동';
    svg.appendChild(nm);

    var lg = el('g', { class: 'tb-legend' });
    [['tb-p1', '1차 확산 7명', 26], ['tb-p2', '2차 확산 31명', 54]].forEach(function (r) {
      put(lg, 22, r[2] - 4, 18, r[0]);
      var t = el('text', { class: 'tb-lg', x: 40, y: r[2] });
      t.textContent = r[1];
      lg.appendChild(t);
    });
    svg.appendChild(lg);
  }

  /* ───────── 4. 한 장면 그리기 ───────── */
  function render() {
    var t = S.t;
    var lam0 = spreadLon(t) + S.dragLon;   // 자동 회전 + 학생이 끌어서 돌린 만큼
    var phi0 = S.dragLat;

    LAND.forEach(function (poly, i) { landEls[i].setAttribute('d', landPath(poly, lam0, phi0)); });
    gratEl.setAttribute('d', graticule(lam0, phi0,
      [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180], [-60, -30, 30, 60]));
    eqEl.setAttribute('d', graticule(lam0, phi0, [], [0]));

    S.nodes.forEach(function (n) {
      var p = proj(n.lat, n.lon, lam0, phi0);
      n._x = p.x; n._y = p.y; n._z = p.z;
      n._on = n.level === 0 || n.seeAt <= t;
    });

    var dn = ['', '', '', '', ''], de = ['', '', '', '', ''];
    S.nodes.forEach(function (n) {
      if (!n._on || n._z <= 0) return;
      var r = NR[n.level], x = n._x.toFixed(1), y = n._y.toFixed(1);
      dn[n.level] += 'M' + (n._x - r).toFixed(1) + ' ' + y +
        'a' + r + ' ' + r + ' 0 1 0 ' + (r * 2) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-r * 2) + ' 0';
      if (n.parent) {
        var p = S.byId[n.parent];
        if (p._z > 0) de[n.level] += 'M' + p._x.toFixed(1) + ' ' + p._y.toFixed(1) + 'L' + x + ' ' + y;
      }
    });
    for (var lv = 1; lv <= 4; lv++) edEls[lv].setAttribute('d', de[lv]);
    for (var v = 0; v <= 4; v++) ndEls[v].setAttribute('d', dn[v]);

    labels.forEach(function (L) {
      var n = L.n, p = S.byId[n.parent];
      var show = n._on && n._z > 0 && p._z > 0;
      L.el.setAttribute('opacity', show ? 1 : 0);
      if (show) {
        L.el.setAttribute('x', ((p._x + n._x) / 2).toFixed(1));
        L.el.setAttribute('y', ((p._y + n._y) / 2).toFixed(1));
      }
    });

    var o = S.nodes[0];
    var showDel = S.deleted && o._z > 0;
    delMark.setAttribute('opacity', showDel ? 1 : 0);
    if (showDel) delMark.setAttribute('transform', 'translate(' + o._x.toFixed(1) + ',' + o._y.toFixed(1) + ')');
    $('net').classList.toggle('deleted', S.deleted);

    updateGauge();
  }

  /* ───────── 5. 계기판 ───────── */
  function updateGauge() {
    var t = S.t;
    var r = C.peopleAt(S.nodes, t, S.followers);

    $('vTime').textContent = t.toFixed(1) + '분';
    $('vPeople').textContent = fmt(r.total);
    $('vSpeed').textContent = t > 0 ? '약 ' + fmt(C.spreadSpeed(r.total, t)) + '명/분' : '-';

    var html = '';
    for (var lv = 1; lv <= S.stages; lv++) {
      html += '<div class="lv' + lv + '"><em>' + lv + '차</em><b>' + fmt(r.peopleByLevel[lv]) + '</b></div>';
    }
    $('stageSplit').innerHTML = html;

    var tb = $('tbLine');
    if (S.stages > C.TEXTBOOK_STAGES) {
      tb.classList.remove('hidden');
      tb.innerHTML = '그중 <b>교과서 기준(1·2차)</b>은 ' +
        fmt(C.peopleAt(S.nodes, t, S.followers, C.TEXTBOOK_STAGES).total) + '명';
    } else tb.classList.add('hidden');

    var badge = $('badge');
    if (t >= C.DEADLINE) {
      unlockDeep();
      badge.className = 'badge hot';
      badge.textContent = '⏰ 10분 경과 — 모두 ' + fmt(r.total) + '명이 봤어요!';
    } else if (r.totalIcons === S.nodes.length - 1) {
      badge.className = 'badge ok';
      badge.textContent = '✅ ' + S.maxSee + '분 만에 ' + fmt(r.total) + '명에게 모두 퍼졌어요!';
    } else {
      badge.className = 'badge hidden';
      badge.textContent = '';
    }

    updateCompare();
    if (S.deleted) updateDeleteOut(r.total);
  }

  /* ───────── 6. 단계별로 열기 ───────── */
  function setStep(n) {
    Array.prototype.forEach.call($('steps').children, function (li, i) {
      li.classList.toggle('done', i + 1 < n);
      li.classList.toggle('on', i + 1 === n);
    });
  }
  function tags() {
    return Array.prototype.slice.call(document.querySelectorAll('#postTags .tag'));
  }
  function updatePickCount() {
    var n = tags().filter(function (t) { return t.classList.contains('picked'); }).length;
    $('pickCount').innerHTML = n === 0
      ? '<span class="mute">개인 정보가 담겼다고 생각하는 해시태그를 눌러 보세요.</span>'
      : '고른 해시태그 <b>' + n + '개</b> — 다 골랐으면 아래 <b>게시하기</b>를 누르세요.';
  }

  function publishPost() {
    if (S.posted) return;
    S.posted = true;
    document.body.classList.add('posted');

    var hit = 0, miss = 0, wrong = 0, total = 0;
    tags().forEach(function (t) {
      var leak = t.hasAttribute('data-leak');
      var picked = t.classList.contains('picked');
      if (leak) total += 1;
      if (leak && picked) { t.classList.add('hit'); hit += 1; }
      else if (leak) { t.classList.add('miss'); miss += 1; }
      else if (picked) { t.classList.add('wrong'); wrong += 1; }
    });

    var msg;
    if (hit === total && wrong === 0) {
      msg = '<b class="ok">🎉 완벽해요!</b> 개인 정보가 담긴 해시태그 <b>' + total + '개</b>를 모두 찾았어요.';
    } else if (hit === 0) {
      msg = '개인 정보가 담긴 해시태그는 모두 <b>' + total + '개</b>였어요. ' +
            '빨간 물결로 표시된 것을 하나씩 살펴보세요.';
    } else {
      msg = '개인 정보가 담긴 해시태그 <b>' + total + '개</b> 중 <b class="ok">' + hit + '개</b>를 찾았어요. ' +
            '<b class="no">놓친 것 ' + miss + '개</b>' + (wrong > 0 ? ', 잘못 고른 것 ' + wrong + '개' : '') + '.';
    }
    $('pickCount').classList.add('hidden');
    $('tagScore').innerHTML = msg;
    $('tagScore').classList.remove('hidden');

    $('post').classList.add('published');
    $('postTime').textContent = '방금 전 · 🌐 전체 공개';
    $('postCue').innerHTML =
      '✅ 게시 완료! 이 사진은 이제 <b>내 손을 떠났습니다.</b> ' +
      '옆에서 <b>어떤 정보가 함께 올라갔는지</b> 확인해 보세요.';
    $('btnPost').classList.add('hidden');
    $('postActions').classList.remove('hidden');
    $('leakBox').classList.remove('stage-locked');
    $('btnNext').classList.remove('stage-locked');

    setTimeout(function () { $('leakBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 380);
  }

  /* 2단계 — 먼저 문제로 "예상"해 본다 (확산 그림은 아직 열지 않는다) */
  function goNext() {
    if (S.movedOn) return;
    S.movedOn = true;
    $('btnNext').classList.add('hidden');
    $('quizCard').classList.remove('stage-locked');
    setStep(2);
    setTimeout(function () { $('quizCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }

  /* 세 칸에 숫자를 다 채우면 「확산 보러 가기」 버튼만 나타난다.
     ⚠️ 조건은 **정답도, 「확인」을 누른 것도 아니고 "숫자를 채웠는가"** 다 (사용자 지시).
        막힌 학생도 다음 화면으로 넘어가서 거기서 답을 확인하게 하려는 것이다.
     ⚠️ 여기서 확산 그림을 열지 말 것 — 답을 확인할 틈도 없이 다음 화면이 튀어나온다. */
  function readySim() {
    if (S.simReady) return;
    S.simReady = true;
    $('quizHint').classList.add('hidden');
    $('btnToSim').classList.remove('stage-locked');
  }

  /* 3단계 — 버튼을 눌러야 비로소 확산 그림이 열린다 ("예상 → 확인" 순서).
     이때 학생이 쓴 세 숫자를 붙잡아 두고(S.guess) 채점표를 만든다. */
  function openSim() {
    if (S.simOpen) return;
    S.simOpen = true;
    S.guess = quizInputs().map(function (i) { return i.value; });
    $('simCard').classList.remove('stage-locked');
    renderCompare();
    setStep(3);
    setTimeout(function () { $('simCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }

  /* 4단계 — 10분까지 지켜보면 더 알아보기가 열린다 */
  function unlockDeep() {
    if (S.unlocked || !S.simOpen) return;
    S.unlocked = true;
    $('deepCard').classList.remove('stage-locked');
    $('nextHint').classList.add('hidden');
    setStep(4);
  }

  /* ───────── 7. 시간 흐르게 하기 ───────── */
  function tick(ts) {
    if (!S.playing) return;
    if (!S.lastTs) S.lastTs = ts;
    var dt = (ts - S.lastTs) / MS_PER_MIN * S.speed;
    S.lastTs = ts;
    setTime(S.t + dt);
    if (S.t >= END_T) { setTime(END_T); pause(); return; }
    requestAnimationFrame(tick);
  }
  function setTime(t) {
    S.t = Math.max(0, Math.min(END_T, t));
    $('slider').value = S.t;
    render();
  }
  function play() {
    if (S.t >= END_T) setTime(0);
    S.playing = true; S.lastTs = 0;
    $('btnPlay').textContent = '⏸ 잠깐 멈춤';
    requestAnimationFrame(tick);
  }
  function pause() {
    S.playing = false;
    $('btnPlay').textContent = S.t >= END_T ? '↻ 다시 보기' : '▶ 이어서 보기';
  }
  function resetAll() {
    pause();
    S.deleted = false; S.deletedAt = 0; S.deletedPeople = 0;
    S.dragLon = 0; S.dragLat = 0;
    $('deleteOut').textContent = '';
    $('deleteOut').className = 'deep-out';
    $('btnDelete').disabled = false;
    $('btnPlay').textContent = '▶ 확산 시작';
    setTime(0);
  }

  /* ───────── 8. 문제 채점 ───────── */
  var QUIZ = [
    {
      hint: '교과서 그림에서 홍길동과 <b>선 하나로</b> 이어진 사람을 세어 보세요(<b>7명</b>). ' +
            '사람 1명 = 팔로워 100명이니 <b>× 100</b> 을 해야 해요.',
      solve: function (a) {
        return '<b>' + fmt(a.q1.people) + '명</b> — 홍길동과 연결된 1차 확산자가 모두 ' +
               a.q1.icons + '명이므로 총 ' + fmt(a.q1.people) + '명에게 확산된다.';
      },
      wrong: function () {
        return '홍길동과 <b>선 하나로</b> 이어진 사람만 세어요. 그 바깥쪽 사람은 아직 세지 않아요.';
      }
    },
    {
      hint: '1차 확산자 7명과 각각 연결된 사람을 모두 세면 <b>31명</b>이에요. 여기에도 <b>× 100</b>.',
      solve: function (a) {
        return '<b>' + fmt(a.q2.people) + '명</b> — 1차 확산자와 연결된 2차 확산자 수는 총 ' +
               a.q2.icons + '명이므로 ' + fmt(a.q2.people) + '명에게 확산된다.';
      },
      wrong: function () {
        return '2차 확산은 <b>바깥쪽 사람</b>만 세는 거예요. 1차 확산자는 빼고 세어 보세요.';
      }
    },
    {
      hint: '1차와 2차를 <b>더해야</b> 해요. 선에 적힌 시간을 다 더해도 10분을 넘지 않으니, ' +
            '10분 안에 두 단계 모두 보게 됩니다.',
      solve: function (a) {
        return '<b>' + fmt(a.q3.people) + '명</b> — 홍길동과 1차 확산자, 2차 확산자로 연결된 선의 총시간이 ' +
               '10분 미만일 경우 확산자 수로 계산한다. 모두 10분 미만이기 때문에 1차, 2차 모두 ' +
               fmt(a.q3.people) + '명에게 확산된다.';
      },
      wrong: function () {
        return '1차 확산자와 2차 확산자를 <b>모두 더해야</b> 해요. 2차 확산자 중 가장 늦게 본 사람도 ' +
          '<b>9분</b>이라 10분 안에 전부 보게 됩니다.';
      }
    }
  ];

  /** 문제는 화면 설정과 상관없이 늘 교과서 기준(팔로워 100명 · 2차까지)으로 채점한다 */
  function quizAnswers() { return C.answers(S.nodes, C.DEFAULT_FOLLOWERS); }

  /** 문제 (1)(2)(3) 의 답 칸 세 개 */
  function quizInputs() {
    return Array.prototype.slice.call(document.querySelectorAll('.q .q-input'));
  }
  /** 세 칸에 숫자가 다 들어갔는가 (정답인지는 보지 않는다) */
  function quizFilled() {
    return quizInputs().every(function (i) { return C.parseAnswer(i.value) !== null; });
  }

  function bindQuiz() {
    Array.prototype.forEach.call(document.querySelectorAll('.q'), function (box) {
      var idx = Number(box.getAttribute('data-q')) - 1;
      var input = box.querySelector('.q-input');
      var msg = box.querySelector('.q-msg');
      function show(kind, html) { msg.className = 'q-msg ' + kind; msg.innerHTML = html; }

      box.querySelector('.q-check').addEventListener('click', function () {
        var a = quizAnswers();
        var key = ['q1', 'q2', 'q3'][idx];
        var res = C.judge(input.value, a[key].people, a[key].icons);
        if (res.kind === 'empty') show('warn', '숫자를 입력해 주세요.');
        else if (res.kind === 'correct') show('ok', '🎉 정답이에요! ' + QUIZ[idx].solve(a));
        else if (res.kind === 'icon') show('warn',
          '거의 다 왔어요! ' + res.value + '은(는) <b>점의 개수</b>예요. ' +
          '점 1개 = 팔로워 100명이니까 <b>× 100</b>을 해 보세요.');
        else show('no', '아직 아니에요. ' + QUIZ[idx].wrong());

        if (res.kind !== 'empty') S.answered[idx] = true;
      });
      box.querySelector('.q-hint').addEventListener('click', function () { show('warn', '💡 ' + QUIZ[idx].hint); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') box.querySelector('.q-check').click();
      });
      // ⚠️ 「확인」을 누르지 않아도, 세 칸을 채우기만 하면 다음으로 넘어갈 수 있다
      input.addEventListener('input', function () { if (quizFilled()) readySim(); });
    });
  }

  /* ───────── 8-2. 「내 예상 vs 실제」 채점표 (② 화면) ─────────
     ⚠️ 문제 화면에서 「확인」을 안 눌러도 넘어올 수 있으므로, **채점은 여기가 본진**이다.
        한 줄씩 나오는 이유: 그 단계의 확산이 끝나야 실제 인원이 확정되기 때문이다
        (1차 4분 · 2차 9분 · 10분 문제 10분). 계기판의 숫자와 정확히 같은 시각이다. */
  var CMP = [
    { key: 'q1', label: '(1) 1차 확산' },
    { key: 'q2', label: '(2) 2차 확산' },
    { key: 'q3', label: '(3) 10분 안에' }
  ];

  /** 각 줄이 채점되는 시각(분) — 자료에서 뽑으므로 관계망을 고치면 함께 따라온다 */
  function cmpTimes() {
    return [C.levelDoneTime(S.nodes, 1), C.levelDoneTime(S.nodes, 2), C.DEADLINE];
  }

  /** 예상이 얼마나 빗나갔는지 한 문장으로 */
  function cmpDiffText(r) {
    if (r.kind === 'empty') return '답을 쓰지 않았어요';
    if (r.kind === 'correct') return '🎉 정확히 맞혔어요!';
    if (r.kind === 'icon') {
      return '아깝다! ' + fmt(r.guess) + '은(는) <b>점의 개수</b>예요 (× 100 하면 정답)';
    }
    var gap = Math.abs(r.diff);
    var many = r.times !== null && (r.times >= 2 || r.times <= 0.5);
    var scale = many
      ? ' <em>(실제가 내 예상의 약 ' + (r.times >= 1 ? niceTimes(r.times) + '배' : '1/' + niceTimes(1 / r.times)) + ')</em>'
      : '';
    return (r.diff < 0 ? '실제보다 <b>' + fmt(gap) + '명</b> 적게 예상했어요'
                       : '실제보다 <b>' + fmt(gap) + '명</b> 많게 예상했어요') + scale;
  }
  /** 4.36 → "4.4", 12.0 → "12" */
  function niceTimes(x) { return x < 10 ? String(Math.round(x * 10) / 10) : String(Math.round(x)); }

  function renderCompare() {
    if (!S.simOpen) return;
    var a = quizAnswers();
    var when = cmpTimes();
    var rows = '', waiting = [], right = 0;

    CMP.forEach(function (q, i) {
      var ans = a[q.key];
      var r = C.compareGuess(S.guess[i], ans.people, ans.icons);
      var mine = r.guess === null ? '<b class="none">안 씀</b>' : '<b>' + fmt(r.guess) + '</b>명';

      // 아직 그 단계까지 안 퍼졌으면 줄을 만들지 않고 아래 한 줄에 모아 둔다
      if (!S.cmpShown[i]) {
        waiting.push({ mine: '<b>' + q.label.slice(0, 3) + '</b> ' + mine, at: when[i] + '분' });
        return;
      }
      if (r.kind === 'correct') right += 1;
      rows += '<li class="cmp-row ' + (r.kind === 'correct' ? 'ok' : 'miss') + '">' +
        '<span class="cmp-q">' + q.label + '</span>' +
        '<span class="cmp-mine">내 예상 ' + mine + '</span>' +
        '<span class="cmp-real">실제 <b>' + fmt(ans.people) + '</b>명</span>' +
        '<span class="cmp-diff">' + cmpDiffText(r) + '</span></li>';
    });
    $('cmpList').innerHTML = rows;

    var done = CMP.length - waiting.length;
    $('cmpSum').innerHTML = done === 0
      ? '⏱ 확산을 지켜보면 <b>한 줄씩</b> 채점돼요'
      : '채점 <b>' + done + '</b> / ' + CMP.length;

    if (waiting.length) {
      // 한 줄에 들어가게 「내 예상 …」과 「채점 시각 …」을 따로 모아 쓴다
      $('cmpNote').className = 'cmp-note';
      $('cmpNote').innerHTML = '🔒 아직 채점 전 — 내 예상 ' +
        waiting.map(function (w) { return w.mine; }).join(' · ') +
        ' <em>→ ' + (waiting.length > 1 ? '각각 ' : '') +
        waiting.map(function (w) { return w.at; }).join(' · ') + '에 채점돼요</em>';
    } else {
      $('cmpNote').className = 'cmp-note cmp-lesson';
      $('cmpNote').innerHTML = right === CMP.length
        ? '🎉 세 문제 <b>모두 정답</b>! 예상한 그대로 퍼졌어요.'
        : '세 문제 중 <b>' + right + '개</b> 정답 — 정답을 못 맞혀도 괜찮아요. ' +
          '중요한 건 <b>사진 한 장이 10분 만에 이만큼 퍼진다</b>는 것이에요.';
    }
  }

  /** 시각이 흘러 새로 채점할 줄이 생겼는지 본다 (한 번 열린 줄은 되감아도 닫지 않는다) */
  function updateCompare() {
    if (!S.simOpen) return;
    var when = cmpTimes(), changed = false;
    for (var i = 0; i < CMP.length; i++) {
      if (!S.cmpShown[i] && S.t >= when[i]) { S.cmpShown[i] = true; changed = true; }
    }
    if (changed) renderCompare();
  }

  /* ───────── 9. 더 알아보기 ───────── */
  function updateFollowers() {
    var per = S.followers;
    $('legendFollowers').textContent = fmt(per);

    var all = C.peopleAt(S.nodes, Infinity, per, C.TEXTBOOK_STAGES);
    $('followersOut').innerHTML =
      '점 1개가 <b>' + fmt(per) + '명</b>이면, 교과서 기준(2차까지)만으로도 9분 만에 <b>' +
      fmt(all.total) + '명</b>에게 퍼져요. (1분에 약 <b>' + fmt(C.spreadSpeed(all.total, 9)) + '명</b>씩)';

    var note = $('quizFollowersNote');
    if (per === C.DEFAULT_FOLLOWERS) note.classList.add('hidden');
    else { note.classList.remove('hidden'); $('quizFollowersNow').textContent = fmt(per); }
    render();
  }

  /**
   * 글을 지운 뒤의 안내. 핵심은 "지워도 확산이 멈추지 않는다" 이다 —
   * 이미 본 사람들이 각자 퍼뜨린 글이 홍길동의 손을 떠나 있기 때문이다.
   * 아직 안 늘었으면 "지금도 퍼지는 중" 이라고 알려 준다 (0명으로 끝나 보이면 안 된다).
   */
  function updateDeleteOut(nowTotal) {
    var after = nowTotal - S.deletedPeople;
    var spreading = S.t < S.maxSee;
    $('deleteOut').className = 'deep-out warn-box';
    $('deleteOut').innerHTML =
      '<b class="del-head">🗑️ ' + S.deletedAt.toFixed(1) + '분에 홍길동이 글을 지웠어요. ' +
        '하지만 확산은 멈추지 않습니다.</b>' +
      '<p class="del-why">지운 순간 이미 <b>' + fmt(S.deletedPeople) + '명</b>이 본 뒤였고, ' +
        '그 사람들이 <b>자기 계정으로 퍼뜨린 글</b>은 홍길동이 지울 수 없어요.<br>' +
        '<span class="del-em">그래서 지금도 그 글을 보고, 또 퍼뜨리는 사람이 계속 생깁니다.</span></p>' +
      '<p class="del-more">' +
        (after > 0
          ? '지운 뒤에 더 본 사람 <b>' + fmt(after) + '명</b>' + (spreading ? ' <em>… 계속 늘어나는 중</em>' : '')
          : '<span class="del-em">지금도 퍼지는 중…</span> <em>곧 숫자가 올라갑니다</em>') +
        ' <span class="del-sum">(지금까지 모두 ' + fmt(nowTotal) + '명)</span></p>' +
      '<p class="del-lesson">디지털 공간에 한 번 올린 정보는 <b>내가 지워도 완전히 사라지지 않는다.</b></p>';
  }

  /* ───────── 10. 이벤트 연결 ───────── */
  function bind() {
    // 1단계 — 태그 고르기 → 게시하기 → 개인 정보 확인 → 다음으로 넘어가기
    tags().forEach(function (t) {
      t.addEventListener('click', function () {
        if (S.posted) return;
        t.classList.toggle('picked');
        updatePickCount();
      });
    });
    updatePickCount();
    $('btnPost').addEventListener('click', publishPost);
    $('btnNext').addEventListener('click', goNext);
    $('btnToSim').addEventListener('click', openSim);

    $('btnPlay').addEventListener('click', function () { S.playing ? pause() : play(); });
    $('btnReset').addEventListener('click', resetAll);
    $('btn10').addEventListener('click', function () { pause(); setTime(C.DEADLINE); });
    $('btnCenter').addEventListener('click', function () { S.dragLon = 0; S.dragLat = 0; render(); });

    $('slider').addEventListener('input', function (e) { pause(); setTime(Number(e.target.value)); });
    $('selSpeed').addEventListener('change', function (e) { S.speed = Number(e.target.value); S.lastTs = 0; });

    $('selFollowers').addEventListener('change', function (e) {
      S.followers = Number(e.target.value);
      updateFollowers();
    });
    $('btnBack100').addEventListener('click', function () {
      $('selFollowers').value = String(C.DEFAULT_FOLLOWERS);
      S.followers = C.DEFAULT_FOLLOWERS;
      updateFollowers();
    });

    $('btnDelete').addEventListener('click', function () {
      if (S.t <= 0) {
        $('deleteOut').className = 'deep-out warn-box';
        $('deleteOut').textContent = '먼저 ▶ 확산 시작을 눌러 정보가 퍼지기 시작한 뒤에 지워 보세요.';
        return;
      }
      /* ⚠️ 확산이 이미 끝난 시각(11분 이후)에 지우면 더 늘어날 사람이 없어서
         "곧 숫자가 올라갑니다" 가 영영 지켜지지 않는다. 그래서 **아직 퍼지는 중인 시점으로
         되감고** 거기서 지운 것으로 한다 — 시계도 함께 되감기므로 문구와 어긋나지 않는다. */
      if (S.t >= S.maxSee) setTime(4);

      S.deleted = true;
      S.deletedAt = S.t;
      S.deletedPeople = C.peopleAt(S.nodes, S.t, S.followers).total;
      this.disabled = true;
      render();
      // 지운 뒤에도 계속 퍼지는 것을 바로 보여 준다 (멈춰 있으면 숫자가 0으로 보여 오해한다)
      if (!S.playing) play();
    });

    // 지구본 끌어서 돌리기 — 가로는 회전, 세로는 기울기. 자동 회전 위에 더해진다.
    (function () {
      var svg = $('net'), on = false, px = 0, py = 0;
      svg.addEventListener('pointerdown', function (e) {
        on = true; px = e.clientX; py = e.clientY;
        svg.setPointerCapture(e.pointerId);
        svg.classList.add('grabbing');
      });
      svg.addEventListener('pointermove', function (e) {
        if (!on) return;
        var w = svg.getBoundingClientRect().width || 1;
        S.dragLon -= (e.clientX - px) / w * 200;
        S.dragLat = Math.max(-75, Math.min(75, S.dragLat + (e.clientY - py) / w * 200));
        px = e.clientX; py = e.clientY;
        render();
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) {
        svg.addEventListener(ev, function () { on = false; svg.classList.remove('grabbing'); });
      });
    })();
  }

  /* ───────── 11. 시작 ───────── */
  function init() {
    S.nodes = C.buildNodes(null, S.stages);
    S.nodes.forEach(function (n) { S.byId[n.id] = n; });
    S.maxSee = C.maxSeeTime(S.nodes);
    document.body.classList.add('deep-on');

    assignGeo();
    buildSvg();
    buildTextbookFigure();
    bind();
    bindQuiz();
    updateFollowers();
    setTime(0);
  }

  init();
})();
