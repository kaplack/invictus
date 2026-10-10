ALTER TABLE events ADD COLUMN competition_config jsonb;
ALTER TABLE event_categories ADD COLUMN modalities jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE event_categories ADD CONSTRAINT event_categories_modalities_array CHECK (jsonb_typeof(modalities) = 'array');
ALTER TABLE events ADD CONSTRAINT events_competition_config_object CHECK (competition_config IS NULL OR jsonb_typeof(competition_config) = 'object');
