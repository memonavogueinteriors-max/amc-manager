import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API = 'https://amc-manager-production.up.railway.app/api';

export default function ClientBooking() {
  const { token } = useParams();
  const [booking, setBooking] = useState(null);
  const [selected, setSelected] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/packages/booking/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError('Invalid or expired link');
        else { setBooking(data); if (data.status === 'confirmed') { setSelected(data.selected_date); setConfirmed(true); } }
      }).catch(() => setError('Could not load booking'));
  }, [token]);

  const confirm = async () => {
    if (!selected) return alert('Please select a date');
    await fetch(`${API}/packages/booking/${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_date: selected })
    });
    setConfirmed(true);
  };

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>❌</div>
        <div style={{ color: '#A32D2D', marginTop: 8 }}>{error}</div>
      </div>
    </div>
  );

  if (!booking) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const dates = booking.available_dates || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="VAC Logo" style={{ width: 120, objectFit: 'contain' }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>VAC AMC Management</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Service Booking</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', border: '0.5px solid rgba(0,0,0,0.08)' }}>
          {confirmed ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 500, marginTop: 12 }}>Booking Confirmed!</div>
              <div style={{ fontSize: 15, color: '#185FA5', marginTop: 8, fontWeight: 500 }}>{selected}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Our team will arrive on the selected date. You will receive a confirmation via WhatsApp.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 13, color: '#888' }}>Dear</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{booking.client_name}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Please select your preferred service date from the options below:</div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                {dates.map(date => (
                  <div key={date} onClick={() => setSelected(date)}
                    style={{ padding: '12px 16px', border: `2px solid ${selected === date ? '#185FA5' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: selected === date ? '#E6F1FB' : '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === date ? '#185FA5' : '#ccc'}`, background: selected === date ? '#185FA5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected === date && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}></div>}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: selected === date ? 500 : 400, color: selected === date ? '#185FA5' : '#333' }}>{date}</span>
                  </div>
                ))}
              </div>
              <button onClick={confirm} style={{ width: '100%', padding: '12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                Confirm Booking
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}