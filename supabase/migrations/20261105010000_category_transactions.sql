-- 카테고리 삭제와 순서 변경을 한 트랜잭션으로 묶는다(로드맵 6절).
-- 이름 변경은 posts_category_slug_fkey가 on update cascade라 update 한 문장으로 끝나 함수가 필요 없다.
-- 서버 액션이 관리자를 확인한 뒤 service role로만 부른다.

create or replace function public.delete_category(p_slug text, p_move_to text default null)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- 이 행을 잠그면 글이 이 카테고리를 새로 가리키는 쓰기는 끝날 때까지 기다린다(외래 키 확인이 같은 행을 잠근다).
  -- 잠그지 않으면 아래 확인과 삭제 사이에 들어온 글의 카테고리가 on delete set null로 비어 방문자에게서 사라진다.
  perform 1 from public.categories where slug = p_slug for update;
  if not found then
    return 'not_found';
  end if;

  if exists (select 1 from public.posts where category_slug = p_slug) then
    if p_move_to is null then
      return 'in_use';
    end if;

    -- 글을 옮기는 동안 이동 대상이 지워지지 않게 잠근다.
    perform 1 from public.categories where slug = p_move_to and slug <> p_slug for key share;
    if not found then
      return 'move_target_invalid';
    end if;

    update public.posts set category_slug = p_move_to where category_slug = p_slug;
  end if;

  delete from public.categories where slug = p_slug;
  return 'deleted';
end;
$$;

create or replace function public.move_category(p_slug text, p_direction text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ordered text[];
  from_index integer;
  to_index integer;
begin
  -- 있는 행만 번호를 바꾸므로 그 사이 지워진 카테고리를 되살리지 않는다.
  select array_agg(locked.slug order by locked.sort_order, locked.slug)
    into ordered
    from (select slug, sort_order from public.categories for update) as locked;

  from_index := array_position(ordered, p_slug);
  if from_index is null then
    return 'not_found';
  end if;

  to_index := from_index + case when p_direction = 'up' then -1 else 1 end;
  if to_index < 1 or to_index > cardinality(ordered) then
    return 'unchanged';
  end if;

  ordered[from_index] := ordered[to_index];
  ordered[to_index] := p_slug;

  -- 옛 카테고리는 sort_order가 겹칠 수 있어 두 행의 값만 맞바꾸면 순서가 바뀌지 않는다. 전체를 다시 매긴다.
  update public.categories as c
     set sort_order = t.ord
    from unnest(ordered) with ordinality as t(slug, ord)
   where c.slug = t.slug
     and c.sort_order <> t.ord;

  return 'moved';
end;
$$;

revoke execute on function public.delete_category(text, text) from public, anon, authenticated;
grant execute on function public.delete_category(text, text) to service_role;

revoke execute on function public.move_category(text, text) from public, anon, authenticated;
grant execute on function public.move_category(text, text) to service_role;
