const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL,
    pass: process.env.ALERT_EMAIL_PASSWORD
  }
});

async function sendTicketAlert(ticket) {
  try {
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL,
      to: process.env.ALERT_EMAIL,
      subject: `🔴 New Client Ticket — ${ticket.client_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#BA9438;padding:20px;text-align:center">
            <h2 style="color:#fff;margin:0">VOGUE AIR CARE</h2>
            <p style="color:#fff;margin:5px 0">New Service Ticket Alert</p>
          </div>
          <div style="padding:20px;background:#fff">
            <h3 style="color:#333">Client has raised a service ticket!</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr style="background:#f9f9f9">
                <td style="padding:10px;font-weight:bold;color:#666">Client Name</td>
                <td style="padding:10px">${ticket.client_name}</td>
              </tr>
              <tr>
                <td style="padding:10px;font-weight:bold;color:#666">Phone</td>
                <td style="padding:10px">${ticket.client_phone || '—'}</td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:10px;font-weight:bold;color:#666">Issue</td>
                <td style="padding:10px">${ticket.description}</td>
              </tr>
              <tr>
                <td style="padding:10px;font-weight:bold;color:#666">Photo</td>
                <td style="padding:10px">${ticket.photo_url ? `<a href="${ticket.photo_url}">View Photo</a>` : 'No photo'}</td>
              </tr>
              <tr style="background:#f9f9f9">
                <td style="padding:10px;font-weight:bold;color:#666">Submitted</td>
                <td style="padding:10px">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <div style="margin-top:20px;text-align:center">
              <a href="https://amc-manager-gray.vercel.app/tickets" 
                style="background:#BA9438;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold">
                View in Dashboard
              </a>
            </div>
          </div>
          <div style="background:#BA9438;padding:10px;text-align:center">
            <p style="color:#fff;margin:0;font-size:12px">Vogue Air Care — +971 50 127 5342</p>
          </div>
        </div>
      `
    });
    console.log('✅ Alert email sent');
  } catch(e) {
    console.error('Email alert failed:', e.message);
  }
}

async function sendBookingAlert(booking) {
  try {
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL,
      to: process.env.ALERT_EMAIL,
      subject: `📅 Booking Confirmed — ${booking.client_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#BA9438;padding:20px;text-align:center">
            <h2 style="color:#fff;margin:0">VOGUE AIR CARE</h2>
            <p style="color:#fff;margin:5px 0">Booking Confirmation Alert</p>
          </div>
          <div style="padding:20px;background:#fff">
            <h3 style="color:#333">Client has confirmed a service date!</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr style="background:#f9f9f9">
                <td style="padding:10px;font-weight:bold;color:#666">Client Name</td>
                <td style="padding:10px">${booking.client_name}</td>
              </tr>
              <tr>
                <td style="padding:10px;font-weight:bold;color:#666">Selected Date</td>
                <td style="padding:10px;font-weight:bold;color:#BA9438;font-size:18px">${booking.selected_date}</td>
              </tr>
            </table>
            <div style="margin-top:20px;text-align:center">
              <a href="https://amc-manager-gray.vercel.app/schedule"
                style="background:#BA9438;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold">
                View Schedule
              </a>
            </div>
          </div>
          <div style="background:#BA9438;padding:10px;text-align:center">
            <p style="color:#fff;margin:0;font-size:12px">Vogue Air Care — +971 50 127 5342</p>
          </div>
        </div>
      `
    });
    console.log('✅ Booking alert email sent');
  } catch(e) {
    console.error('Booking alert failed:', e.message);
  }
}

module.exports = { sendTicketAlert, sendBookingAlert };
