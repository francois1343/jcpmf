INSERT INTO seasons (title, description, position)
SELECT 'Saison 1 — Débuter', 'Premiers entraînements progressifs de course et de marche.', 1
WHERE NOT EXISTS (SELECT 1 FROM seasons);

SET @season_id = (SELECT id FROM seasons ORDER BY position, id LIMIT 1);

INSERT INTO weeks (season_id, title, position)
SELECT @season_id, 'Semaine 1', 1
WHERE NOT EXISTS (SELECT 1 FROM weeks WHERE season_id = @season_id);

SET @week_id = (SELECT id FROM weeks WHERE season_id = @season_id ORDER BY position, id LIMIT 1);

INSERT INTO training_sessions (week_id, title, description, position)
SELECT @week_id, 'Session 1', 'Alternance douce entre marche et course.', 1
WHERE NOT EXISTS (SELECT 1 FROM training_sessions WHERE week_id = @week_id);

SET @session_id = (SELECT id FROM training_sessions WHERE week_id = @week_id ORDER BY position, id LIMIT 1);

INSERT INTO exercises (training_session_id, title, type, duration_seconds, position)
SELECT @session_id, 'Échauffement', 'warmup', 300, 1
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE training_session_id = @session_id);

INSERT INTO exercises (training_session_id, title, type, duration_seconds, position)
SELECT @session_id, 'Course légère', 'run', 60, 2
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE training_session_id = @session_id AND position = 2);

INSERT INTO exercises (training_session_id, title, type, duration_seconds, position)
SELECT @session_id, 'Marche active', 'walk', 90, 3
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE training_session_id = @session_id AND position = 3);

INSERT INTO exercises (training_session_id, title, type, duration_seconds, position)
SELECT @session_id, 'Étirements', 'stretching', 300, 4
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE training_session_id = @session_id AND position = 4);
