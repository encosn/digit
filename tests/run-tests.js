/**
 * spread-core.js 단위 시험 — 실행: npm test
 *
 * 화면 없이 계산만 확인한다. 교과서 예시답안(700 / 3,100 / 3,800)이
 * 코드에서 그대로 나오는지가 가장 중요한 시험이다.
 */
const C = require('../spread-core.js');

let pass = 0;
let fail = 0;

function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, actual, expected) {
  ok(name, actual === expected, '기대 ' + expected + ', 실제 ' + actual);
}
function group(title) { console.log('\n[' + title + ']'); }

const nodes = C.buildNodes();

/* ───────── 1. 관계망 만들기 ───────── */
group('관계망 만들기');
eq('사람은 모두 39명 (홍길동 1 + 1차 7 + 2차 31)', nodes.length, 39);
eq('1차 확산자는 7명', nodes.filter(n => n.level === 1).length, 7);
eq('2차 확산자는 31명', nodes.filter(n => n.level === 2).length, 31);
eq('홍길동은 0분에 본다', nodes[0].seeAt, 0);
ok('모든 2차 확산자는 부모(1차 확산자)를 가진다',
  nodes.filter(n => n.level === 2).every(n => n.parent && n.parent.length === 1));
ok('2차 확산자가 보는 시각 = 1차 확산자 시각 + 선의 시간',
  nodes.filter(n => n.level === 2).every(n => {
    const p = nodes.find(x => x.id === n.parent);
    return n.seeAt === p.seeAt + n.edgeMin;
  }));

/* ───────── 1-2. 3차·4차까지 이어 만들기 ───────── */
group('3차·4차까지 이어 만들기');
const n3 = C.buildNodes(null, 3);
const n4 = C.buildNodes(null, 4);
eq('3차까지면 39 + 137 = 176명', n3.length, 176);
eq('4차까지면 176 + 607 = 783명', n4.length, 783);
eq('3차 확산자는 137명', n3.filter(n => n.level === 3).length, 137);
eq('4차 확산자는 607명', n4.filter(n => n.level === 4).length, 607);
eq('1·2차는 단계를 늘려도 그대로', C.countAt(n4, Infinity, 2).total, 38);
ok('3차 이상은 앞사람이 본 1분 뒤에 본다',
  n4.filter(n => n.level >= 3).every(n => {
    const p = n4.find(x => x.id === n.parent);
    return n.seeAt === p.seeAt + C.DEEP_EDGE_MIN;
  }));
eq('3차는 늦어도 10분 안에 다 본다', C.maxSeeTime(n3), 10);
eq('4차는 늦어도 11분 안에 다 본다', C.maxSeeTime(n4), 11);
ok('아이디가 겹치지 않는다', new Set(n4.map(n => n.id)).size === n4.length);
ok('4차 확산자에게는 모두 3차 부모가 있다',
  n4.filter(n => n.level === 4).every(n => {
    const p = n4.find(x => x.id === n.parent);
    return p && p.level === 3;
  }));
eq('단계를 1로 줘도 교과서(2차)까지는 만든다', C.buildNodes(null, 1).length, 39);
eq('단계를 9로 줘도 최대 4차까지만 만든다', C.buildNodes(null, 9).length, 783);

/* ───────── 2. 교과서 예시답안 ───────── */
group('교과서 예시답안');
const a = C.answers(nodes, 100);
eq('(1) 1차 확산 = 700명', a.q1.people, 700);
eq('(2) 2차 확산 = 3,100명', a.q2.people, 3100);
eq('(3) 10분 안에 = 3,800명', a.q3.people, 3800);
eq('(1) 아이콘 수는 7개', a.q1.icons, 7);
eq('(2) 아이콘 수는 31개', a.q2.icons, 31);

// 화면이 4차까지 보여 주고 있어도 문제는 교과서 기준(2차까지)으로만 채점해야 한다
const a4 = C.answers(n4, 100);
eq('4차까지 그려도 (1) 정답은 그대로 700명', a4.q1.people, 700);
eq('4차까지 그려도 (2) 정답은 그대로 3,100명', a4.q2.people, 3100);
eq('4차까지 그려도 (3) 정답은 그대로 3,800명', a4.q3.people, 3800);

/* ───────── 3. 시간에 따른 확산 ───────── */
group('시간에 따른 확산');
eq('마지막 사람까지 9분 걸린다', C.maxSeeTime(nodes), 9);
ok('모든 사람이 10분 안에 본다 (교사용 참고: 총시간 10분 미만)',
  nodes.every(n => n.seeAt < C.DEADLINE));
eq('0분에는 아무도 못 봤다', C.countAt(nodes, 0).total, 0);
eq('1분에는 1차 확산자 1명', C.countAt(nodes, 1).first, 1);
eq('1분에는 2차 확산자 0명', C.countAt(nodes, 1).second, 0);
eq('3분에는 1차 5명', C.countAt(nodes, 3).first, 5);
eq('3분에는 2차 2명', C.countAt(nodes, 3).second, 2);
eq('9분에는 38명 전원', C.countAt(nodes, 9).total, 38);
eq('12분에도 38명 (더 늘지 않는다)', C.countAt(nodes, 12).total, 38);

/* ───────── 4. 팔로워 수 바꾸기 ───────── */
group('팔로워 수 바꾸기');
eq('팔로워 100명 → 3,800명', C.peopleAt(nodes, 10, 100).total, 3800);
eq('팔로워 200명 → 7,600명', C.peopleAt(nodes, 10, 200).total, 7600);
eq('팔로워 50명 → 1,900명', C.peopleAt(nodes, 10, 50).total, 1900);
eq('팔로워가 많을수록 1분당 확산 속도가 빠르다 (100명 기준)',
  C.spreadSpeed(C.peopleAt(nodes, 9, 100).total, 9), 422);
ok('팔로워 500명이면 속도도 5배 (반올림 오차 1명 이내)',
  Math.abs(C.spreadSpeed(C.peopleAt(nodes, 9, 500).total, 9) -
    C.spreadSpeed(C.peopleAt(nodes, 9, 100).total, 9) * 5) <= 1);

/* ───────── 5. 답 읽기·채점 ───────── */
group('답 읽기·채점');
eq('"3,100명" → 3100', C.parseAnswer('3,100명'), 3100);
eq('"  3100 " → 3100', C.parseAnswer('  3100 '), 3100);
eq('"약 700 명" → 700', C.parseAnswer('약 700 명'), 700);
eq('빈 칸 → null', C.parseAnswer(''), null);
eq('글자만 있으면 null', C.parseAnswer('모르겠어요'), null);
eq('정답이면 correct', C.judge('700', 700, 7).kind, 'correct');
eq('쉼표를 넣어도 정답', C.judge('3,800', 3800, 38).kind, 'correct');
eq('아이콘 수만 세면 icon', C.judge('7', 700, 7).kind, 'icon');
eq('그 밖의 오답은 wrong', C.judge('500', 700, 7).kind, 'wrong');
eq('빈 칸이면 empty', C.judge('', 700, 7).kind, 'empty');

/* ───────── 5-3. 「내 예상 vs 실제」 채점표 ───────── */
group('내 예상 vs 실제 채점표');
eq('1차 확산자는 4분에 다 본다 (채점표 (1)이 열리는 시각)', C.levelDoneTime(nodes, 1), 4);
eq('2차 확산자는 9분에 다 본다 (채점표 (2)가 열리는 시각)', C.levelDoneTime(nodes, 2), 9);
eq('없는 단계면 0분', C.levelDoneTime(nodes, 3), 0);
eq('3차까지 만들면 3차는 10분에 다 본다', C.levelDoneTime(n3, 3), 10);
eq('채점표가 다 열리는 시각은 문제 (3)의 10분을 넘지 않는다',
  Math.max(C.levelDoneTime(nodes, 1), C.levelDoneTime(nodes, 2), C.DEADLINE), C.DEADLINE);

eq('정확히 맞히면 correct', C.compareGuess('700', 700, 7).kind, 'correct');
eq('맞히면 차이는 0', C.compareGuess('700', 700, 7).diff, 0);
eq('적게 예상하면 diff 가 음수', C.compareGuess('500', 700, 7).diff, -200);
eq('많게 예상하면 diff 가 양수', C.compareGuess('1000', 700, 7).diff, 300);
eq('점 개수만 세면 icon (차이도 함께 알려준다)', C.compareGuess('7', 700, 7).kind, 'icon');
eq('점 개수만 세면 693명 적게 쓴 셈', C.compareGuess('7', 700, 7).diff, -693);
ok('실제가 예상의 몇 배인지 알려준다 (700 ÷ 100 = 7배)',
  Math.abs(C.compareGuess('100', 700, 7).times - 7) < 1e-9);
eq('많게 예상하면 times 는 1보다 작다', C.compareGuess('7000', 700, 7).times, 0.1);
eq('빈 칸이면 empty', C.compareGuess('', 700, 7).kind, 'empty');
eq('빈 칸이면 차이를 계산하지 않는다', C.compareGuess('', 700, 7).diff, null);
eq('빈 칸이어도 실제 답은 알려준다', C.compareGuess('', 700, 7).correct, 700);
eq('0 을 쓰면 배수는 못 구한다 (0으로 나누지 않는다)', C.compareGuess('0', 700, 7).times, null);
eq('쉼표를 넣어 써도 읽는다', C.compareGuess('3,100', 3100, 31).kind, 'correct');

/* ───────── 5-2. 단계를 늘렸을 때의 확산 ───────── */
group('단계를 늘렸을 때의 확산');
eq('10분에 3차까지면 17,500명', C.peopleAt(n3, 10, 100).total, 17500);
ok('10분에 4차까지면 3차보다 훨씬 많다', C.peopleAt(n4, 10, 100).total > 17500);
eq('11분이면 4차 783-1=782명 전원', C.countAt(n4, 11).total, 782);
eq('그중 교과서 기준(1·2차)만 세면 언제나 3,800명',
  C.peopleAt(n4, 11, 100, C.TEXTBOOK_STAGES).total, 3800);
ok('단계를 늘리면 같은 10분에 훨씬 더 빨리 퍼진다',
  C.spreadSpeed(C.peopleAt(n4, 10, 100).total, 10) >
  C.spreadSpeed(C.peopleAt(nodes, 10, 100).total, 10) * 10);

/* ───────── 6. 숫자 표시 ───────── */
group('숫자 표시');
eq('3800 → "3,800"', C.formatKo(3800), '3,800');
eq('700 → "700"', C.formatKo(700), '700');
eq('347000 → "347,000"', C.formatKo(347000), '347,000');
eq('0 → "0"', C.formatKo(0), '0');

/* ───────── 결과 ───────── */
console.log('\n───────────────────────────────');
console.log('통과 ' + pass + '개 / 실패 ' + fail + '개');
if (fail > 0) process.exit(1);
