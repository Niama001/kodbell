import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/bookings - student books an open slot
router.post('/', requireAuth, requireRole('student'), async (req, res) => {
  const { slotId, topicId, problemDescription, contactName, contactEmail, contactPhone } = req.body;
  if (!slotId) {
    return res.status(400).json({ error: 'slotId is required' });
  }
  if (!contactName || !contactEmail || !problemDescription) {
    return res.status(400).json({ error: 'contactName, contactEmail, and problemDescription are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slotResult = await client.query(
      'SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE',
      [slotId]
    );
    const slot = slotResult.rows[0];
    if (!slot) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Slot not found' });
    }
    if (slot.is_booked) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'That slot was just booked by someone else' });
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (slot_id, student_id, mentor_id, topic_id, problem_description, contact_name, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [slotId, req.user.id, slot.mentor_id, topicId || null, problemDescription, contactName, contactEmail, contactPhone || null]
    );

    await client.query('UPDATE availability_slots SET is_booked = TRUE WHERE id = $1', [slotId]);

    await client.query('COMMIT');
    res.status(201).json(bookingResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

// GET /api/bookings/mine - bookings for the logged-in user (student or mentor)
router.get('/mine', requireAuth, async (req, res) => {
  const column = req.user.role === 'mentor' ? 'mentor_id' : 'student_id';
  try {
    const result = await pool.query(
      `SELECT b.*, s.start_time, s.end_time,
              student.name AS student_name, mentor.name AS mentor_name,
              t.name AS topic_name
       FROM bookings b
       JOIN availability_slots s ON s.id = b.slot_id
       JOIN users student ON student.id = b.student_id
       JOIN users mentor ON mentor.id = b.mentor_id
       LEFT JOIN topics t ON t.id = b.topic_id
       WHERE b.${column} = $1
       ORDER BY s.start_time`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PATCH /api/bookings/:id/complete - mentor marks a session done (unlocks rating)
router.patch('/:id/complete', requireAuth, requireRole('mentor'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'completed'
       WHERE id = $1 AND mentor_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not yours' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// PATCH /api/bookings/:id/cancel - student or mentor cancels a confirmed booking, freeing the slot
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const isMentor = req.user.role === 'mentor';
  const ownerColumn = isMentor ? 'mentor_id' : 'student_id';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND ${ownerColumn} = $2 AND status = 'confirmed' FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Confirmed booking not found for you' });
    }

    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [booking.id]);
    await client.query(`UPDATE availability_slots SET is_booked = FALSE WHERE id = $1`, [booking.slot_id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id - student edits their own confirmed booking's details
router.patch('/:id', requireAuth, requireRole('student'), async (req, res) => {
  const { contactName, contactEmail, contactPhone, problemDescription } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bookings SET
         contact_name = COALESCE($1, contact_name),
         contact_email = COALESCE($2, contact_email),
         contact_phone = $3,
         problem_description = COALESCE($4, problem_description)
       WHERE id = $5 AND student_id = $6 AND status = 'confirmed'
       RETURNING *`,
      [contactName, contactEmail, contactPhone, problemDescription, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Confirmed booking not found for this student' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

export default router;