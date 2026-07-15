-- Allow one facilitator to advise multiple classes in the same term when the
-- NSTP types differ (CWTS / LTS / ROTC). Still forbid two classes of the same
-- type for the same facilitator in one term.
--
-- NSTP type is the last token of course_code (e.g. "NSTP 2 CWTS" → "CWTS").

alter table section
  drop constraint if exists uq_section_adviser_term;

create unique index if not exists uq_section_adviser_term_nstp_type
  on section (
    adviser_user_id,
    term_id,
    (upper(trim(substring(course_code from '\S+$'))))
  );
