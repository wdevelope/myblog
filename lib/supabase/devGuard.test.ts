import { describe, expect, it } from "vitest";
import { assertNotProductionSupabase } from "@/lib/supabase/devGuard";

describe("개발 서버 안전장치", () => {
  it("운영 프로젝트 주소면 고칠 방법을 알리며 멈춘다", () => {
    expect(() =>
      assertNotProductionSupabase("https://mgyoglaujbxfbuxxlcfj.supabase.co"),
    ).toThrow(".env.development.local");
  });

  it("끝 슬래시가 붙은 운영 주소도 막는다", () => {
    expect(() =>
      assertNotProductionSupabase("https://mgyoglaujbxfbuxxlcfj.supabase.co/"),
    ).toThrow();
  });

  it("개발 프로젝트나 다른 주소는 통과한다", () => {
    expect(() =>
      assertNotProductionSupabase("https://admadefdkybuvklpezht.supabase.co"),
    ).not.toThrow();
    expect(() => assertNotProductionSupabase("http://127.0.0.1:54321")).not.toThrow();
  });

  it("주소가 없으면 판정하지 않는다", () => {
    expect(() => assertNotProductionSupabase(undefined)).not.toThrow();
  });
});
