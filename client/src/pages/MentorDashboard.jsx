import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import Calendar from '../components/Calendar';

export default function MentorDashboard() {
  const { user, logout } = useAuth();
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [newSlot, setNewSlot] = useState({ startTime: '', endTime: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getTopics().then(setTopics).catch(() => {});
    api.getMentorSlots(user.id).then(setSlots).catch(() => {});
    api.getMyBookings().then(setBookings).catch(() => {});
  }, [user.id]);

  function toggleTopic(id) {
    setSelectedTopics((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function saveTopics() {
    try {
      await api.setMentorTopics(selectedTopics);
      setMessage('Topics updated!');
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function addSlot(e) {
    e.preventDefault();
    try {
      const slot = await api.createSlot(newSlot);
      setSlots((prev) => [...prev, slot]);
      setNewSlot({ startTime: '', endTime: '' });
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function markComplete(bookingId) {
    try {
      await api.completeBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'completed' } : b)));
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function cancelSession(bookingId) {
    try {
      await api.cancelBooking(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b)));
    } catch (err) {
      setMessage(err.message);
    }
  }

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
        <h3>Topics you mentor</h3>
        <div>
          {topics.map((t) => (
            <span
              key={t.id}
              className="tag"
              style={{
                cursor: 'pointer',
                background: selectedTopics.includes(t.id) ? '#4f46e5' : '#eef0ff',
                color: selectedTopics.includes(t.id) ? 'white' : '#4f46e5',
              }}
              onClick={() => toggleTopic(t.id)}
            >
              {t.name}
            </span>
          ))}
        </div>
        <button onClick={saveTopics} style={{ marginTop: 12 }}>Save topics</button>
        {message && <p className="success-text">{message}</p>}
      </div>

      <div className="card">
        <h3>Add availability</h3>
        <form onSubmit={addSlot}>
          <label>Start time</label>
          <input
            type="datetime-local"
            value={newSlot.startTime}
            onChange={(e) => setNewSlot((s) => ({ ...s, startTime: e.target.value }))}
            required
          />
          <label>End time</label>
          <input
            type="datetime-local"
            value={newSlot.endTime}
            onChange={(e) => setNewSlot((s) => ({ ...s, endTime: e.target.value }))}
            required
          />
          <button type="submit">Add slot</button>
        </form>
      </div>

      <div className="card">
        <h3>Your calendar</h3>
        <Calendar slots={slots} />
      </div>

      <div className="card">
        <h3>Upcoming & past sessions</h3>
        {bookings.length === 0 && <p style={{ color: '#6b7280' }}>No bookings yet.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ marginBottom: 8 }}>
            <p><strong>{b.contact_name || b.student_name}</strong> — {b.topic_name || 'General'} — {b.status}</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              {new Date(b.start_time).toLocaleString()}
            </p>
            {b.contact_email && <p style={{ fontSize: 13, color: '#6b7280' }}>{b.contact_email}{b.contact_phone ? ` • ${b.contact_phone}` : ''}</p>}
            {b.problem_description && <p style={{ fontSize: 13 }}>Reason: {b.problem_description}</p>}
            {b.status === 'confirmed' && (
              <div>
                <button onClick={() => markComplete(b.id)}>Mark session complete</button>
                <button className="secondary" style={{ marginLeft: 8 }} onClick={() => cancelSession(b.id)}>
                  Cancel session
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}