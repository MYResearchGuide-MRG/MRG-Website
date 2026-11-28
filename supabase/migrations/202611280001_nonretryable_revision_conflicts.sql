-- A stale client revision cannot succeed if PostgREST retries the transaction.
-- Return HTTP 409 while retaining each function's version check, locks and grants.
begin;
do $migration$
declare
  target regprocedure;
  definition text;
begin
  foreach target in array array[
    'public.myssp_save_judge_review_v2(text,jsonb,boolean,timestamptz)'::regprocedure,
    'public.myssp_set_research_judging_window(integer,boolean,timestamptz,boolean,timestamptz)'::regprocedure,
    'public.myssp_save_submission_review(text,text,text,jsonb,text,integer)'::regprocedure,
    'public.myssp_set_submission_deadline(integer,timestamptz,timestamptz,boolean,boolean)'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if strpos(definition, '''40001''') > 0 then
      execute replace(definition, '''40001''', '''PT409''');
    elsif strpos(definition, '''PT409''') = 0 then
      raise exception 'Unexpected conflict handler in %', target;
    end if;
  end loop;
end
$migration$;
commit;
