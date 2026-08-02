/**
 * spread-core.js — "디지털 공간에서 정보의 확산 속도" 계산 부분
 *
 * 화면을 그리는 코드는 여기에 하나도 없다 (그건 main.js 가 한다).
 * 그래서 브라우저 없이 node 로도 시험할 수 있다 → npm test
 *
 * 브라우저에서는 전역 변수 SpreadCore 로,
 * node 시험에서는 require('../spread-core.js') 로 쓴다.
 */
(function (global) {
  'use strict';

  /**
   * 교과서 그림의 SNS 관계망.
   *
   *  min      : 앞사람이 본 뒤 이 사람이 보기까지 걸린 시간(분).
   *             그림에서 선 위에 적혀 있는 "N분" 이다.
   *  children : 이 1차 확산자와 연결된 2차 확산자들이 걸린 시간(분)
   *
   *  1차 확산자 7명  → 7 × 100 = 700명
   *  2차 확산자 5+4+5+4+5+4+4 = 31명 → 31 × 100 = 3,100명
   *  가장 늦게 보는 사람도 9분(홍길동 → E → 6분)이므로,
   *  10분 안에 38명 전원 = 3,800명에게 확산된다. (교과서 예시답안과 같다)
   */
  var NETWORK = [
    { id: 'A', min: 1, children: [2, 3, 3, 4, 5] },
    { id: 'B', min: 2, children: [1, 2, 3, 4] },
    { id: 'C', min: 2, children: [2, 2, 3, 4, 5] },
    { id: 'D', min: 3, children: [1, 2, 3, 5] },
    { id: 'E', min: 3, children: [2, 3, 4, 5, 6] },
    { id: 'F', min: 4, children: [1, 2, 3, 4] },
    { id: 'G', min: 4, children: [1, 2, 4, 5] }
  ];

  var CENTER_ID = '홍길동';

  /** 사람 아이콘 1개가 나타내는 팔로워 수 (교과서 기준 100명) */
  var DEFAULT_FOLLOWERS = 100;

  /** 교과서 문제 (3) 의 기준 시간 */
  var DEADLINE = 10;

  /** 교과서 그림에 실제로 그려진 단계 (홍길동 → 1차 → 2차) */
  var TEXTBOOK_STAGES = 2;

  /** 그림으로 그릴 수 있는 최대 단계 (4차 = 782명, 이보다 많으면 화면·성능 모두 무리) */
  var MAX_STAGES = 4;

  /**
   * 3차부터 쓰는 선의 시간(분).
   * 교과서 그림의 가장 빠른 연결이 1분이므로, "이 속도로 계속 퍼진다면"을
   * 1분 간격으로 본다. 값이 같아서 한 단계가 통째로 켜지며 원이 커지는 물결이 된다.
   */
  var DEEP_EDGE_MIN = 1;

  /**
   * 관계망을 "사람 한 명 = 항목 하나" 인 납작한 목록으로 펼친다.
   *
   * seeAt = 앞사람이 본 시각 + 선에 적힌 시간
   *   → 홍길동은 0분, 1차 확산자는 선의 시간, 2차 확산자는 (1차 시간 + 자기 선의 시간)
   *
   * stages 를 3 이상으로 주면 3차·4차를 이어서 만든다.
   * 몇 명에게 퍼지는지는 그림에서 실제로 센 값(1차 7명 → 2차 31명)의 비율
   * 31 ÷ 7 ≈ 4.4명을 그대로 이어 쓴다 — growthTable() 의 추정과 같은 수가 나온다.
   */
  function buildNodes(network, stages) {
    var net = network || NETWORK;
    var depth = Math.max(TEXTBOOK_STAGES, Math.min(MAX_STAGES, stages || TEXTBOOK_STAGES));
    var nodes = [{ id: CENTER_ID, level: 0, parent: null, edgeMin: 0, seeAt: 0 }];

    net.forEach(function (first) {
      nodes.push({
        id: first.id,
        level: 1,
        parent: CENTER_ID,
        edgeMin: first.min,
        seeAt: first.min
      });
      first.children.forEach(function (min, j) {
        nodes.push({
          id: first.id + '-' + (j + 1),
          level: 2,
          parent: first.id,
          edgeMin: min,
          seeAt: first.min + min
        });
      });
    });

    var seed = countAt(nodes, Infinity);
    var ratio = seed.second / seed.first;
    var prev = nodes.filter(function (n) { return n.level === 2; });

    for (var lv = 3; lv <= depth; lv++) {
      // 이번 단계의 전체 인원을 먼저 정하고, 앞 단계 사람들에게 고르게 나눠 준다
      // (앞에서부터 한 명씩 더 맡는 방식이라 합이 정확히 맞는다)
      var total = Math.round(prev.length * ratio);
      var base = Math.floor(total / prev.length);
      var extra = total - base * prev.length;
      var next = [];

      prev.forEach(function (p, i) {
        var k = base + (i < extra ? 1 : 0);
        for (var j = 0; j < k; j++) {
          var child = {
            id: p.id + '.' + (j + 1),
            level: lv,
            parent: p.id,
            edgeMin: DEEP_EDGE_MIN,
            seeAt: p.seeAt + DEEP_EDGE_MIN
          };
          nodes.push(child);
          next.push(child);
        }
      });
      prev = next;
    }

    return nodes;
  }

  /**
   * t분이 지난 시점에 "이미 본 사람"의 수를 센다 (홍길동 본인은 빼고 센다).
   * maxLevel 을 주면 그 단계까지만 센다 (예: 2 → 교과서 기준)
   */
  function countAt(nodes, t, maxLevel) {
    var lim = maxLevel || 99;
    var byLevel = [0, 0, 0, 0, 0];
    var total = 0;
    nodes.forEach(function (n) {
      if (n.level === 0 || n.level > lim || n.seeAt > t) return;
      byLevel[n.level] += 1;
      total += 1;
    });
    return { byLevel: byLevel, first: byLevel[1], second: byLevel[2], total: total };
  }

  /** t분 시점의 사람 수를 실제 인원(아이콘 수 × 팔로워 수)으로 바꾼다 */
  function peopleAt(nodes, t, followers, maxLevel) {
    var per = followers || DEFAULT_FOLLOWERS;
    var c = countAt(nodes, t, maxLevel);
    return {
      firstIcons: c.first,
      secondIcons: c.second,
      totalIcons: c.total,
      iconsByLevel: c.byLevel,
      peopleByLevel: c.byLevel.map(function (n) { return n * per; }),
      first: c.first * per,
      second: c.second * per,
      total: c.total * per
    };
  }

  /** 마지막 사람까지 다 보는 데 걸리는 시간(분) */
  function maxSeeTime(nodes) {
    return nodes.reduce(function (m, n) {
      return n.seeAt > m ? n.seeAt : m;
    }, 0);
  }

  /** 1분에 몇 명씩 퍼지고 있는지 (0분이면 0) */
  function spreadSpeed(totalPeople, t) {
    if (!t || t <= 0) return 0;
    return Math.round(totalPeople / t);
  }

  /**
   * 교과서 문제 (1)(2)(3) 의 정답.
   *
   * 화면이 3차·4차까지 보여 주고 있어도 **문제는 언제나 교과서와 같이 2차까지만** 세어
   * 채점한다. 그래서 maxLevel 을 TEXTBOOK_STAGES 로 고정한다.
   */
  function answers(nodes, followers) {
    var per = followers || DEFAULT_FOLLOWERS;
    var all = countAt(nodes, Infinity, TEXTBOOK_STAGES);
    var byDeadline = countAt(nodes, DEADLINE, TEXTBOOK_STAGES);
    return {
      q1: { icons: all.first, people: all.first * per },
      q2: { icons: all.second, people: all.second * per },
      q3: { icons: byDeadline.total, people: byDeadline.total * per }
    };
  }

  /**
   * 학생이 쓴 답에서 숫자만 뽑는다.
   * "3,100명", "3100", "약 3100 명" → 모두 3100
   */
  function parseAnswer(text) {
    if (text === null || text === undefined) return null;
    var digits = String(text).replace(/[^0-9]/g, '');
    if (digits === '') return null;
    return Number(digits);
  }

  /**
   * 채점.
   *  correct  : 정답 인원
   *  icons    : 사람 아이콘 개수 (×100 을 깜빡한 답을 따로 알아채기 위해)
   */
  function judge(text, correct, icons) {
    var v = parseAnswer(text);
    if (v === null) return { kind: 'empty', value: null };
    if (v === correct) return { kind: 'correct', value: v };
    if (v === icons) return { kind: 'icon', value: v };
    return { kind: 'wrong', value: v };
  }

  /** 1234567 → "1,234,567" */
  function formatKo(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var SpreadCore = {
    NETWORK: NETWORK,
    CENTER_ID: CENTER_ID,
    DEFAULT_FOLLOWERS: DEFAULT_FOLLOWERS,
    DEADLINE: DEADLINE,
    TEXTBOOK_STAGES: TEXTBOOK_STAGES,
    MAX_STAGES: MAX_STAGES,
    DEEP_EDGE_MIN: DEEP_EDGE_MIN,
    buildNodes: buildNodes,
    countAt: countAt,
    peopleAt: peopleAt,
    maxSeeTime: maxSeeTime,
    spreadSpeed: spreadSpeed,
    answers: answers,
    parseAnswer: parseAnswer,
    judge: judge,
    formatKo: formatKo
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SpreadCore;
  else global.SpreadCore = SpreadCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
