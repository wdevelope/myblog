import type { Database as GeneratedDatabase } from "@/lib/supabase/database.types";
import type { PostType, Visibility } from "@/lib/types";

// database.types.ts는 Supabase가 만든 파일이라 고치지 않는다. 아래 열은 DB가 text + CHECK로 두어 생성 타입이
// string이므로, 쓰는 값으로 좁혀 코드에서 캐스트하지 않게 한다.
type Narrowed<Columns, Overrides> = {
  [K in keyof Columns]: K extends keyof Overrides ? Overrides[K] : Columns[K];
};

type NarrowedTable<Table, Overrides> = {
  [K in keyof Table]: K extends "Row" | "Insert" | "Update" ? Narrowed<Table[K], Overrides> : Table[K];
};

type GeneratedPublic = GeneratedDatabase["public"];

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedPublic, "Tables"> & {
    Tables: Omit<GeneratedPublic["Tables"], "posts" | "categories"> & {
      posts: NarrowedTable<GeneratedPublic["Tables"]["posts"], { type: PostType; visibility: Visibility }>;
      categories: NarrowedTable<GeneratedPublic["Tables"]["categories"], { visibility: Visibility }>;
    };
  };
};

export type TableRow<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"];
