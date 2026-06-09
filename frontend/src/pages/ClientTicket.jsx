import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const API = 'https://amc-manager-production.up.railway.app/api';

export default function ClientTicket() {
  const { token } = useParams();
  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState({ description: '', photo_url: '' });
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    fetch(`${API}/packages/ticket/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError('Invalid or expired link');
        else { setTicket(data); if (data.status === 'submitted') setSubmitted(true); }
      }).catch(() => setError('Could not load ticket'));
  }, [token]);

  const uploadPhoto = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    setForm(f => ({ ...f, photo_url: data.url }));
  };

  const submit = async () => {
    if (!form.description) return alert('Please describe the issue');
    await fetch(`${API}/packages/ticket/${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setSubmitted(true);
  };

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: 32 }}>❌</div>
        <div style={{ fontSize: 16, marginTop: 8, color: '#A32D2D' }}>{error}</div>
      </div>
    </div>
  );

  if (!ticket) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="VAC Logo" style={{ width: 120, objectFit: 'contain' }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>VAC AMC Management</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Service Ticket</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', border: '0.5px solid rgba(0,0,0,0.08)' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: 48 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 500, marginTop: 12 }}>Ticket Submitted!</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Our team will contact you shortly to schedule a visit.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 13, color: '#888' }}>Client</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{ticket.client_name}</div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: 12, color: '#555', fontWeight: 500, display: 'block', marginBottom: 4 }}>Describe the issue</label>
                <textarea
                  style={{ width: '100%', padding: '10px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', minHeight: 100 }}
                  placeholder="e.g. AC not cooling, water leak, electrical issue..."
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: 12, color: '#555', fontWeight: 500, display: 'block', marginBottom: 4 }}>Add Photo (optional)</label>
                <input type="file" ref={fileRef} accept="image/*" capture="environment" onChange={e => uploadPhoto(e.target.files[0])} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => fileRef.current.click()} style={{ padding: '8px 16px', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, background: '#f5f5f4', cursor: 'pointer', fontSize: 13 }}>
                    {uploading ? 'Uploading...' : '📷 Take/Upload Photo'}
                  </button>
                  {form.photo_url && <span style={{ fontSize: 12, color: '#185FA5', alignSelf: 'center' }}>✓ Photo added</span>}
                </div>
              </div>
              <button onClick={submit} style={{ width: '100%', padding: '12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                Submit Ticket
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}