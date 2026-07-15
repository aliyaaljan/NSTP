alter table public.app_user
  add constraint app_user_email_max_length
    check (char_length(email::text) <= 64),
  add constraint app_user_email_up_domain_format
    check (email::text ~* '^[^@[:space:]]+@up[.]edu[.]ph$'),
  add constraint app_user_full_name_max_length
    check (char_length(full_name) <= 64),
  add constraint app_user_student_number_format
    check (student_number is null or student_number ~ '^[0-9]{9}$'),
  add constraint app_user_sais_id_format
    check (sais_id is null or sais_id ~ '^[0-9]{1,8}$');
