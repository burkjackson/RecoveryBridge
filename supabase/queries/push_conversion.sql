-- Does notifying an absent listener actually produce conversations?
--
-- Run this after a few weeks of data has accumulated in notification_log
-- (added 24 Aug 2026). It compares listeners who were genuinely online when
-- they were notified against listeners who were flagged 'available' but whose
-- heartbeat had gone stale — the group a cleanup reset would silence.
--
-- "Converted" = that listener opened a session with that seeker within 30
-- minutes of being notified.

with sends as (
  select
    n.id,
    n.listener_id,
    n.seeker_id,
    n.created_at,
    n.channel,
    case when n.listener_stale then 'stale (absent)' else 'genuinely online' end as cohort,
    exists (
      select 1 from sessions s
      where s.listener_id = n.listener_id
        and s.seeker_id   = n.seeker_id
        and s.created_at >= n.created_at
        and s.created_at <  n.created_at + interval '30 minutes'
    ) as converted
  from notification_log n
  where n.created_at > now() - interval '90 days'
)
select
  cohort,
  channel,
  count(*)                                                       as notifications_sent,
  count(*) filter (where converted)                              as led_to_a_session,
  round(100.0 * count(*) filter (where converted) / nullif(count(*), 0), 1) as conversion_pct,
  count(distinct listener_id)                                    as distinct_listeners
from sends
group by rollup (cohort, channel)
order by cohort nulls last, channel nulls last;

-- How to read it:
--   If "stale (absent)" converts at a rate anywhere near "genuinely online",
--   the reach is real — leave the notification targeting alone.
--   If it converts at ~0% over a few hundred sends, those pushes are only
--   training people to ignore notifications. Reset stale listeners to offline
--   in the cleanup route and lean on Always Available for out-of-app reach.
--
-- FIRST RESULT (24 Aug 2026, day one of the log — 51 sends, 7 listeners,
-- 4 seekers, none of them the admin account):
--
--   genuinely online / push   17 sent,  7 converted  (41%)
--   stale (absent)   / push   24 sent,  6 converted  (25%)
--   stale (absent)   / email  10 sent,  0 converted  ( 0%)
--
-- Of the sessions that started within 30 minutes of a notification, the stale
-- cohort produced 7 sessions and 4 real conversations — including the longest
-- conversation of the day at 76 messages, joined ~7 minutes after the push —
-- against 3 sessions and 1 real conversation from the fresh cohort.
--
-- So: leave the targeting alone. The metric is mislabelled — a stale heartbeat
-- means the PWA is not open, not that the person is unreachable, and the
-- closed-app case is exactly what push is for. Resetting these listeners would
-- silence the channel that produced the best conversation on the platform's
-- first properly-working day.
--
-- That is one day and ~10 conversions, so re-running this to confirm is worth
-- doing — but it would take substantial contrary evidence to justify the
-- reset, not merely a thin sample. The only channel with no evidence behind it
-- is stale + email (0 for 10); that is the number to watch.
