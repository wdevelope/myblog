// 글 화면 플러그인(@vscode/markdown-it-katex)이 require("katex")로 CJS 파일을 불러온다. 에디터도 같은 파일을 불러와야
// 번들에 KaTeX가 두 벌(ESM·CJS) 실리지 않는다. 그 경로에는 타입이 없어 패키지 타입을 그대로 붙인다.
declare module "katex/dist/katex.js" {
  import katex from "katex";
  export default katex;
}
