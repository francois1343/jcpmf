CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('runner', 'admin') NOT NULL DEFAULT 'runner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY users_username_unique (username),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seasons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX seasons_position_index (position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS weeks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT weeks_season_fk FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  INDEX weeks_season_position_index (season_id, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS training_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  week_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT sessions_week_fk FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE,
  INDEX sessions_week_position_index (week_id, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exercises (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  training_session_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  type ENUM('warmup', 'run', 'walk', 'sprint', 'stretching', 'cooldown', 'other') NOT NULL DEFAULT 'other',
  duration_seconds INT UNSIGNED NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT exercises_session_fk FOREIGN KEY (training_session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  INDEX exercises_session_position_index (training_session_id, position)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_session_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  training_session_id BIGINT UNSIGNED NOT NULL,
  status ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  current_exercise_index INT UNSIGNED NOT NULL DEFAULT 0,
  distance_km DECIMAL(7,2) NULL,
  steps_count INT UNSIGNED NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT progress_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT progress_session_fk FOREIGN KEY (training_session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  UNIQUE KEY progress_user_session_unique (user_id, training_session_id),
  INDEX progress_user_status_index (user_id, status)
) ENGINE=InnoDB;
