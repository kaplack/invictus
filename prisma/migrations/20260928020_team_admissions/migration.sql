ALTER TABLE teams ADD COLUMN discoverable boolean NOT NULL DEFAULT false,
ADD COLUMN join_policy varchar(20) NOT NULL DEFAULT 'INVITE' CHECK (join_policy IN ('OPEN','APPROVAL','INVITE'));
CREATE TABLE team_admissions (
 id uuid PRIMARY KEY, team_id uuid NOT NULL REFERENCES teams(id), user_id uuid NOT NULL REFERENCES users(id),
 kind varchar(20) NOT NULL CHECK (kind IN ('REQUEST','INVITE')),
 status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(team_id,user_id)
);
