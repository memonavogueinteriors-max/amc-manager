require('dotenv').config();
const express = require('express');
const cors = require('cors');

async function start() {
  const { initDb } = require('./db/database');
  await initDb();

  const app = express();
  app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
  app.use(express.json());

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/upload', require('./routes/uploads'));
  app.use('/api/packages', require('./routes/packages'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/service-reports', require('./routes/reports'));
    app.use('/api/backup', require('./routes/backup-status'));

  const { clientsRouter, villasRouter, ticketsRouter, scheduleRouter, procurementRouter, dashboardRouter, contractsRouter } = require('./routes/all');
  app.use('/api/contracts', contractsRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/villas', villasRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/procurement', procurementRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`âœ… AMC Server running on http://localhost:${PORT}`);
    const { startBackupScheduler } = require('./backup');
    startBackupScheduler();
  });
}

start().catch(console.error);
