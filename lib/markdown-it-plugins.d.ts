// markdown-it-mark·markdown-it-ins는 타입을 함께 배포하지 않는다.
declare module "markdown-it-mark" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}

declare module "markdown-it-ins" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}
