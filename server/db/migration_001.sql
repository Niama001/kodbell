-- Migration 001: replace ai_prep_tip with contact fields for the booking request form
-- Run this in DBeaver against your existing kodbell database.

ALTER TABLE bookings DROP COLUMN IF EXISTS ai_prep_tip;

ALTER TABLE bookings
  ADD COLUMN contact_name VARCHAR(150),
  ADD COLUMN contact_email VARCHAR(150),
  ADD COLUMN contact_phone VARCHAR(50);
