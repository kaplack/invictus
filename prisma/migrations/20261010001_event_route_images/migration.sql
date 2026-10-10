CREATE TABLE event_route_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 file_id uuid NOT NULL REFERENCES stored_files(id) ON DELETE RESTRICT,
 title varchar(180) NOT NULL,
 description varchar(2000),
 position integer NOT NULL
);
CREATE INDEX event_route_images_event_id_position_idx ON event_route_images(event_id, position);
INSERT INTO event_route_images(event_id,file_id,title,position)
 SELECT id,route_image_file_id,'Ruta del evento',0 FROM events WHERE route_image_file_id IS NOT NULL;
