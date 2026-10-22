-- Create Storage buckets for post images
-- NOTE: Supabase Storage is managed via the `storage` schema.

insert into storage.buckets (id, name, public)
values ('post-images-public', 'post-images-public', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

insert into storage.buckets (id, name, public)
values ('post-images-private', 'post-images-private', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
