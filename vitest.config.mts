import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // server-only는 react-server 조건이 아니면 import만으로 throw한다. 테스트에서는 빈 모듈로 바꾼다.
      "server-only": path.join(root, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
  test: {
    // 화면 테스트는 파일 첫 줄에 `// @vitest-environment jsdom`을 쓴다.
    environment: "node",
    include: ["{app,lib}/**/*.test.{ts,tsx}", "*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
  },
});
