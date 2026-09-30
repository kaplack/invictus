CREATE TABLE "_TeamSports" (
  "A" UUID NOT NULL,
  "B" UUID NOT NULL,
  CONSTRAINT "_TeamSports_A_fkey" FOREIGN KEY ("A") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_TeamSports_B_fkey" FOREIGN KEY ("B") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "_TeamSports_AB_unique" ON "_TeamSports"("A", "B");
CREATE INDEX "_TeamSports_B_index" ON "_TeamSports"("B");
