ALTER TABLE events ADD COLUMN time_limit_minutes integer;
ALTER TABLE events ADD CONSTRAINT events_time_limit_minutes_positive CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);
