import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

/**
 * 일반 <script src="..."> 로 쓴 파일을 이름 그대로 dist/ 에 복사한다.
 *
 * vite 는 type="module" 인 스크립트만 번들에 넣는다.
 * ("can't be bundled without type=module" 경고가 그 뜻이다)
 * 이 앱은 index.html 을 더블클릭으로도 열 수 있어야 해서 일부러 일반 스크립트를 쓰므로,
 * 번들 대신 파일을 그대로 옮겨서 dist/index.html 의 src="spread-core.js" 가 그대로 맞게 한다.
 */
function copyPlainScripts(files) {
  return {
    name: 'copy-plain-scripts',
    apply: 'build',
    generateBundle() {
      files.forEach((name) => {
        this.emitFile({ type: 'asset', fileName: name, source: readFileSync(name, 'utf8') });
      });
    },
  };
}

/**
 * spread-simulator (디지털 공간에서 정보의 확산 속도 체험하기) — 개발/빌드 설정
 *
 * 포트 8083: binary-converter=8080, data-cleaner=8081, excel-picker=8082 와 겹치지 않게.
 * 설치·빌드 결과물(node_modules/, dist/)도 모두 이 폴더 안에 생긴다.
 * 프로젝트 루트(C:\project_AI)에는 아무것도 설치하지 않는다.
 *
 * 파일 이름이 vite.config.js 가 아니라 .mjs 인 이유:
 * 이 앱은 외부 의존성이 없어서 index.html 을 더블클릭으로도 열 수 있게 만들었다.
 * 그러려면 스크립트를 ES 모듈이 아닌 일반 <script> 로 써야 하고,
 * 그래서 package.json 에 "type": "module" 을 넣지 않았다(단위 시험도 require 로 읽는다).
 * 그 상태에서 vite 설정만 ESM 으로 쓰려면 확장자를 .mjs 로 해야 한다.
 */
export default defineConfig({
  root: '.',
  base: './',

  plugins: [copyPlainScripts(['spread-core.js', 'main.js'])],

  server: {
    port: 8083,
    strictPort: true,
    open: false,
  },

  preview: {
    port: 8083,
    strictPort: true,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // 수업 화면(index.html) 과 시안 비교용 페이지(alt-views.html) 를 함께 빌드한다
    rollupOptions: {
      input: { main: 'index.html', alt: 'alt-views.html' },
    },
  },
});
