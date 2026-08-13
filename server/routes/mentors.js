import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/mentors?search=<name text>&topicId=<id> - list mentors, optionally filtered
router.get('/', async (req, res) => {
  const { search, topicId } = req.query;

  try {
    const result = await pool.query(
      `
      SELECT
        u.id, u.name, u.bio,
        COALESCE(json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS topics,
        COALESCE(json_agg(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL), '[]') AS topic_ids,
        ROUND(AVG(r.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT r.id) AS rating_count
      FROM users u
      LEFT JOIN mentor_topics mt ON mt.mentor_id = u.id
      LEFT JOIN topics t ON t.id = mt.topic_id
      LEFT JOIN ratings r ON r.mentor_id = u.id
      WHERE u.role = 'mentor'
        AND ($1::text IS NULL OR u.name ILIKE '%' || $1 || '%')
      GROUP BY u.id
      HAVING ($2::int IS NULL OR $2 = ANY(array_agg(t.id)))
      ORDER BY u.name
      `,
      [search || null, topicId ? Number(topicId) : null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// GET /api/mentors/topics - list all topics (for dropdowns)
router.get('/topics', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM topics ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /api/mentors/topics - a mentor sets which topics they can help with
router.post('/topics', requireAuth, requireRole('mentor'), async (req, res) => {
  const { topicIds } = req.body; // array of topic ids
  if (!Array.isArray(topicIds)) {
    return res.status(400).json({ error: 'topicIds must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM mentor_topics WHERE mentor_id = $1', [req.user.id]);
    for (const topicId of topicIds) {
      await client.query(
        'INSERT INTO mentor_topics (mentor_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, topicId]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update topics' });
  } finally {
    client.release();
  }
});

export default router;
