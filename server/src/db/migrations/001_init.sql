-- 001_init.sql — core schema (Day 2)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    source_type   VARCHAR(10) NOT NULL CHECK (source_type IN ('paste','file')),
    language      VARCHAR(20) NOT NULL,
    code          TEXT NOT NULL,
    file_name     VARCHAR(255),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    id             SERIAL PRIMARY KEY,
    submission_id  INT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    status         VARCHAR(12) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','completed','failed')),
    overall_score  INT CHECK (overall_score BETWEEN 0 AND 100),
    summary        TEXT,
    metrics        JSONB,
    error_message  TEXT,
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_findings (
    id            SERIAL PRIMARY KEY,
    review_id     INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    stage         VARCHAR(10) NOT NULL CHECK (stage IN ('static','ai')),
    severity      VARCHAR(10) NOT NULL CHECK (severity IN ('info','warning','error','critical')),
    category      VARCHAR(30),
    rule          VARCHAR(100),
    issue         VARCHAR(300) NOT NULL,
    explanation   TEXT,
    suggested_fix TEXT,
    line_number   INT,
    column_number INT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user  ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_submission ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_findings_review    ON review_findings(review_id, severity);
