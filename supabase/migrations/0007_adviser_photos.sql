-- Adviser profile photos (admin upload on adviser list page)

alter table app_user
  add column if not exists profile_photo_path text;

comment on column app_user.profile_photo_path is
  'Storage object key in adviser-photos bucket, e.g. advisers/{app_user_id}/photo.jpg';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adviser-photos',
  'adviser-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
