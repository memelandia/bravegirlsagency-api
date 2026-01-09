UPDATE lms_quizzes SET cooldown_minutes = 5;
ALTER TABLE lms_quizzes ALTER COLUMN cooldown_minutes SET DEFAULT 5;
