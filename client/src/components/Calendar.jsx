// Simple week-view calendar. Groups slots by day and renders them as clickable pills.
export default function Calendar({ slots, onSlotClick, selectable = false }) {
  const days = groupByDay(slots);

  if (Object.keys(days).length === 0) {
    return <p style={{ color: '#6b7280', fontSize: 14 }}>No availability posted yet.</p>;
  }

  return (
    <div className="calendar-grid">
      {Object.entries(days).map(([day, daySlots]) => (
        <div key={day} className="calendar-day">
          <strong>{day}</strong>
          {daySlots.map((slot) => (
            <div
              key={slot.id}
              className={`slot-pill ${slot.is_booked ? 'booked' : ''}`}
              onClick={() => {
                if (selectable && !slot.is_booked && onSlotClick) onSlotClick(slot);
              }}
            >
              {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
              {slot.is_booked ? ' (booked)' : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupByDay(slots) {
  const groups = {};
  for (const slot of slots) {
    const day = new Date(slot.start_time).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(slot);
  }
  return groups;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
