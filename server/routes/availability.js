import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/availability - mentor creates a new open slot
router.post('/', requireAuth, requireRole('mentor'), async (req, res) => {
  const { startTime, endTime } = req.body;
  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'startTime and endTime are required' });
  }
  if (new Date(startTime) >= new Date(endTime)) {
    return res.status(400).json({ error: 'startTime must be before endTime' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO availability_slots (mentor_id, start_time, end_time)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, startTime, endTime]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// GET /api/availability/mentor/:mentorId - all slots for a mentor (for calendar view)
router.get('/mentor/:mentorId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM availability_slots WHERE mentor_id = $1 ORDER BY start_time`,
      [req.params.mentorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// DELETE /api/availability/:id - mentor removes a slot they haven't been booked for
router.delete('/:id', requireAuth, requireRole('mentor'), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM availability_slots
       WHERE id = $1 AND mentor_id = $2 AND is_booked = FALSE
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found, not yours, or already booked' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

export default router;
