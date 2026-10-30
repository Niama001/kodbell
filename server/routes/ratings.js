import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/ratings - student rates a completed session
router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const { bookingId, score, comment } = req.body;
  if (!bookingId || !score) {
    return res.status(400).json({ error: 'bookingId and score are required' });
  }

  if (!Number.isInteger(score)) {
  return res.status(400).json({ error: 'score must be a whole number' });
  }

  if (score < 1 || score > 5) {
    return res.status(400).json({ error: 'score must be between 1 and 5' });
  }

  try {
    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND student_id = $2 AND status = 'completed'`,
      [bookingId, req.user.id]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return res.status(404).json({ error: 'Completed booking not found for this student' });
    }

    const result = await pool.query(
      `INSERT INTO ratings (booking_id, mentor_id, student_id, score, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bookingId, booking.mentor_id, req.user.id, score, comment || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already rated this session' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

export default router;
