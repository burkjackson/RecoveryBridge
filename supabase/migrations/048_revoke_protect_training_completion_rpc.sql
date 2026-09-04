-- protect_training_completion() (047) was missed when 045 revoked RPC access
-- from the other trigger functions (handle_new_user, protect_admin_flag,
-- protect_session_transitions, validate_session_participants) — it showed up
-- on the security advisor as callable by anon and authenticated at
-- /rest/v1/rpc/protect_training_completion. Calling it directly would just
-- error (OLD/NEW aren't populated outside a real trigger context), so this
-- isn't a live hole, but it's the same "advisor stays clean, nobody has to
-- reason about it later" fix 045 already applied to the others.

revoke execute on function public.protect_training_completion() from anon, authenticated, public;
