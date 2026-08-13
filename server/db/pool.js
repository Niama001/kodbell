import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Reads PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE from environment automatically,
// but we pass them explicitly here so it's clear what's being used.
export const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});
