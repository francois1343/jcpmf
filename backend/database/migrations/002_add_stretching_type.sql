ALTER TABLE exercises
  MODIFY type ENUM('warmup', 'run', 'walk', 'sprint', 'stretching', 'cooldown', 'other') NOT NULL DEFAULT 'other';
