const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('mm_token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  getMentors: ({ search, topicId } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (topicId) params.set('topicId', topicId);
    const qs = params.toString();
    return request(`/mentors${qs ? `?${qs}` : ''}`);
  },
  getTopics: () => request('/mentors/topics'),
  setMentorTopics: (topicIds) => request('/mentors/topics', { method: 'POST', body: { topicIds }, auth: true }),

  getMentorSlots: (mentorId) => request(`/availability/mentor/${mentorId}`),
  createSlot: (payload) => request('/availability', { method: 'POST', body: payload, auth: true }),
  deleteSlot: (id) => request(`/availability/${id}`, { method: 'DELETE', auth: true }),

  createBooking: (payload) => request('/bookings', { method: 'POST', body: payload, auth: true }),
  getMyBookings: () => request('/bookings/mine', { auth: true }),
  completeBooking: (id) => request(`/bookings/${id}/complete`, { method: 'PATCH', auth: true }),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH', auth: true }),
  editBooking: (id, payload) => request(`/bookings/${id}`, { method: 'PATCH', body: payload, auth: true }),

  submitRating: (payload) => request('/ratings', { method: 'POST', body: payload, auth: true }),
};

export { getToken };