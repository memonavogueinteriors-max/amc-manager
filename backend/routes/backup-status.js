const express = require('express');
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');
const { getBackupStatus } = require('../backup');

const router = express.Router();

function ownerOrAdminOnly(req, res, next) {
  if (!['owner', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({
      error: 'Only Owner or Admin can view backup status'
    });
  }

  next();
}

function readSavedStatus() {
  const statusPath = path.join(
    __dirname,
    '..',
    'backups',
    'backup-status.json'
  );

  if (!fs.existsSync(statusPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function newestStatus(memoryStatus, savedStatus) {
  if (!savedStatus) return memoryStatus;

  const memoryTime = new Date(
    memoryStatus?.completedAt ||
      memoryStatus?.startedAt ||
      0
  ).getTime();

  const savedTime = new Date(
    savedStatus?.completedAt ||
      savedStatus?.startedAt ||
      0
  ).getTime();

  return savedTime > memoryTime ? savedStatus : memoryStatus;
}

router.get('/status', auth, ownerOrAdminOnly, (req, res) => {
  const memoryStatus = getBackupStatus();
  const savedStatus = readSavedStatus();
  const status = newestStatus(memoryStatus, savedStatus) || {};

  res.json({
    status: status.status || 'Not run',
    startedAt: status.startedAt || null,
    completedAt: status.completedAt || null,
    sizeBytes: Number(status.sizeBytes || 0),
    tableCount: Number(status.tableCount || 0),
    rowCount: Number(status.rowCount || 0),
    uploadedFileCount: Number(status.uploadedFileCount || 0),
    driveFileId: status.driveFileId || null,
    driveLink: status.driveLink || null,
    error: status.error || null,
    automatic: true,
    schedule: process.env.BACKUP_CRON || '0 2 * * *',
    timezone: process.env.BACKUP_TIMEZONE || 'Asia/Dubai',
    driveConfigured: Boolean(
      process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID
    ),
    sheetsConfigured: Boolean(
      process.env.GOOGLE_SHEETS_BACKUP_SPREADSHEET_ID
    )
  });
});

module.exports = router;
