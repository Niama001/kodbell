-- server/db/migration_002.sql

CREATE TABLE universities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email_domain VARCHAR(150) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    admin_contact_email VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN university_id INTEGER REFERENCES universities(id);