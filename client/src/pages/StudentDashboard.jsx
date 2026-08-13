import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import Calendar from '../components/Calendar';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [topics, setTopics] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [selectedMentor, setSelectedMentor] = useState(null);
  const [mentorSlots, setMentorSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    contactName: user.name || '',
    contactEmail: user.email || '',
    contactPhone: '',
    problemDescription: '',
  });

  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [ratingDraft, setRatingDraft] = useState({});
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  useEffect(() => {
    api.getTopics().then(setTopics).catch(() => {});
    api.getMyBookings().then(setBookings).catch(() => {});
  }, []);

  useEffect(() => {
    api.getMentors({ search: searchText || undefined, topicId: topicFilter || undefined }).then(setMentors).catch(() => {});
  }, [searchText, topicFilter]);

  async function selectMentor(mentor) {
    setSelectedMentor(mentor);
    setSelectedSlot(null);
    const slots = await api.getMentorSlots(mentor.id);
    setMentorSlots(slots);
  }

  function pickSlot(slot) {
    setSelectedSlot(slot);
    setMessage('');
  }

  async function submitBookingRequest(e) {
    e.preventDefault();
    if (!selectedSlot) return;
    try {
      await api.createBooking({
        slotId: selectedSlot.id,
        topicId: topicFilter || null,
        problemDescription: bookingForm.problemDescription,
        contactName: bookingForm.contactName,
        contactEmail: bookingForm.contactEmail,
        contactPhone: bookingForm.contactPhone,
      });
      setMessage('Session requested! Check your sessions below.');
      setSelectedSlot(null);
      setBookingForm((f) => ({ ...f, problemDescription: '' }));
      const updated = await api.getMentorSlots(selectedMentor.id);
      setMentorSlots(updated);
      const myBookings = await api.getMyBookings();
      setBookings(myBookings);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitRating(bookingId) {
    const draft = ratingDraft[bookingId] || { score: 5, comment: '' };
    try {
      await api.submitRating({ bookingId, score: Number(draft.score), comment: draft.comment });
      setMessage('Thanks for rating your session!');
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function cancelSession(bookingId) {
    try {
      await api.cancelBooking(bookingId);
      setMessage('Session cancelled.');
      const myBookings = await api.getMyBookings();
      setBookings(myBookings);
    } catch (err) {
      setMessage(err.message);
    }
  }

  function startEditing(booking) {
    setEditingBookingId(booking.id);
    setEditDraft({
      contactName: booking.contact_name || '',
      contactEmail: booking.contact_email || '',
      contactPhone: booking.contact_phone || '',
      problemDescription: booking.problem_description || '',
    });
  }

  async function saveEdit(bookingId) {
    try {
      await api.editBooking(bookingId, editDraft);
      setMessage('Session updated.');
      setEditingBookingId(null);
      const myBookings = await api.getMyBookings();
      setBookings(myBookings);
    } catch (err) {
      setMessage(err.message);
    }
  }

  const visibleSlots = dateFilter
    ? mentorSlots.filter((s) => s.start_time.slice(0, 10) === dateFilter)
    : mentorSlots;

  return (
    <div className="app-container">
      <div className="navbar" style={{ marginBottom: 16 }}>
        <h1>KodBell</h1>
        <div>
          <span style={{ marginRight: 12 }}>Hi, {user.name}</span>
          <button className="secondary" onClick={logout}>Log out</button>
        </div>
      </div>

      <div className="card">
        <h3>Find a mentor</h3>
        <label>Search by name</label>
        <input
          placeholder="e.g. Test Mentor"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <label>Filter by subject</label>
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="">All subjects</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {mentors.length === 0 && <p style={{ color: '#6b7280' }}>No mentors match your filters.</p>}
        {mentors.map((m) => (
          <div
            key={m.id}
            className="card"
            style={{
              marginBottom: 8,
              cursor: 'pointer',
              borderColor: selectedMentor?.id === m.id ? '#4f46e5' : undefined,
            }}
            onClick={() => selectMentor(m)}
          >
            <p><strong>{m.name}</strong> {m.avg_rating && `— ${m.avg_rating}★ (${m.rating_count})`}</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{m.bio}</p>
            <div>{(m.topics || []).map((t) => <span key={t} className="tag">{t}</span>)}</div>
          </div>
        ))}
      </div>

      {selectedMentor && (
        <div className="card">
          <h3>{selectedMentor.name}'s availability</h3>
          <label>Filter by date</label>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <Calendar slots={visibleSlots} selectable onSlotClick={pickSlot} />
        </div>
      )}

      {selectedSlot && (
        <div className="card">
          <h3>Request this session</h3>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {new Date(selectedSlot.start_time).toLocaleString()} with {selectedMentor.name}
          </p>
          <form onSubmit={submitBookingRequest}>
            <label>Your name</label>
            <input
              value={bookingForm.contactName}
              onChange={(e) => setBookingForm((f) => ({ ...f, contactName: e.target.value }))}
              required
            />
            <label>Your email</label>
            <input
              type="email"
              value={bookingForm.contactEmail}
              onChange={(e) => setBookingForm((f) => ({ ...f, contactEmail: e.target.value }))}
              required
            />
            <label>Phone (optional)</label>
            <input
              value={bookingForm.contactPhone}
              onChange={(e) => setBookingForm((f) => ({ ...f, contactPhone: e.target.value }))}
            />
            <label>What do you need help with?</label>
            <textarea
              rows={3}
              value={bookingForm.problemDescription}
              onChange={(e) => setBookingForm((f) => ({ ...f, problemDescription: e.target.value }))}
              required
            />
            <button type="submit">Submit request</button>
            <button type="button" className="secondary" style={{ marginLeft: 8 }} onClick={() => setSelectedSlot(null)}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {message && <p className="success-text">{message}</p>}

      <div className="card">
        <h3>Your sessions</h3>
        {bookings.length === 0 && <p style={{ color: '#6b7280' }}>No sessions booked yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ marginBottom: 8 }}>
            <p><strong>{b.mentor_name}</strong> — {b.topic_name || 'General'} — {b.status}</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{new Date(b.start_time).toLocaleString()}</p>

            {editingBookingId === b.id ? (
              <div>
                <label>Your name</label>
                <input
                  value={editDraft.contactName}
                  onChange={(e) => setEditDraft((d) => ({ ...d, contactName: e.target.value }))}
                />
                <label>Your email</label>
                <input
                  type="email"
                  value={editDraft.contactEmail}
                  onChange={(e) => setEditDraft((d) => ({ ...d, contactEmail: e.target.value }))}
                />
                <label>Phone (optional)</label>
                <input
                  value={editDraft.contactPhone}
                  onChange={(e) => setEditDraft((d) => ({ ...d, contactPhone: e.target.value }))}
                />
                <label>Reason</label>
                <textarea
                  rows={2}
                  value={editDraft.problemDescription}
                  onChange={(e) => setEditDraft((d) => ({ ...d, problemDescription: e.target.value }))}
                />
                <button onClick={() => saveEdit(b.id)}>Save changes</button>
                <button type="button" className="secondary" style={{ marginLeft: 8 }} onClick={() => setEditingBookingId(null)}>
                  Cancel edit
                </button>
              </div>
            ) : (
              b.problem_description && <p style={{ fontSize: 13 }}>Reason: {b.problem_description}</p>
            )}

            {b.status === 'confirmed' && editingBookingId !== b.id && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => startEditing(b)}>Edit</button>
                <button className="secondary" style={{ marginLeft: 8 }} onClick={() => cancelSession(b.id)}>
                  Cancel session
                </button>
              </div>
            )}

            {b.status === 'completed' && (
              <div>
                <label>Rate this session (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingDraft[b.id]?.score ?? 5}
                  onChange={(e) =>
                    setRatingDraft((prev) => ({ ...prev, [b.id]: { ...prev[b.id], score: e.target.value } }))
                  }
                />
                <textarea
                  rows={2}
                  placeholder="Optional comment"
                  value={ratingDraft[b.id]?.comment ?? ''}
                  onChange={(e) =>
                    setRatingDraft((prev) => ({ ...prev, [b.id]: { ...prev[b.id], comment: e.target.value } }))
                  }
                />
                <button onClick={() => submitRating(b.id)}>Submit rating</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}