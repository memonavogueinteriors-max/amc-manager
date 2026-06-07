require('dotenv').config();
const express = require('express');
const cors = require('cors');

async function start() {
  const { initDb, getDb } = require('./db/database');
  const db = await initDb();

  // Make db available globally for routes
  global.amcDb = db;

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/contracts', require('./routes/contracts'));

  const { clientsRouter, villasRouter, ticketsRouter, scheduleRouter, procurementRouter, dashboardRouter } = require('./routes/all');
  app.use('/api/clients', clientsRouter);
  app.use('/api/villas', villasRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/procurement', procurementRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ AMC Server running on http://localhost:${PORT}`));
}

start().catch(console.error);
