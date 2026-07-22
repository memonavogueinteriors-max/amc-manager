require('dotenv').config();

const { Pool } = require('pg');
const { ZipArchive } = require('archiver');
const cron = require('node-cron');
const { google } = require('googleapis');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const BACKUP_NAME = 'AMC-Latest-Backup.zip';
const BACKUP_DIR = path.join(__dirname, 'backups');
const BACKUP_PATH = path.join(BACKUP_DIR, BACKUP_NAME);
const DEFAULT_CRON = '0 2 * * *';
const DEFAULT_TIMEZONE = 'Asia/Dubai';

let isRunning = false;
let latestStatus = {
  status: 'Not run',
  startedAt: null,
  completedAt: null,
  sizeBytes: 0,
  tableCount: 0,
  rowCount: 0,
  uploadedFileCount: 0,
  driveFileId: null,
  driveLink: null,
  error: null
};

function isLocalDatabase(url = '') {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function createPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  return new Pool({
    connectionString: databaseUrl,
    ssl: isLocalDatabase(databaseUrl)
      ? false
      : { rejectUnauthorized: false }
  });
}

function safeFileName(value) {
  return String(value || 'file')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .slice(0, 140);
}

function walkForCloudinaryUrls(value, urls) {
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/g) || [];

    for (const url of matches) {
      if (/res\.cloudinary\.com|cloudinary\.com/i.test(url)) {
        urls.add(url.replace(/[),.;]+$/, ''));
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) walkForCloudinaryUrls(item, urls);
    return;
  }

  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      walkForCloudinaryUrls(item, urls);
    }
  }
}

async function listAllTables(pool) {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  return result.rows.map((row) => row.table_name);
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function exportDatabase(pool, workDir) {
  const tables = await listAllTables(pool);
  const exportedTables = {};
  const tableCounts = {};
  const cloudinaryUrls = new Set();
  let totalRows = 0;

  for (const table of tables) {
    const result = await pool.query(
      `SELECT * FROM ${quoteIdentifier(table)}`
    );

    exportedTables[table] = result.rows;
    tableCounts[table] = result.rowCount;
    totalRows += result.rowCount;
    walkForCloudinaryUrls(result.rows, cloudinaryUrls);
  }

  const databaseFile = path.join(workDir, 'database.json');

  await fsp.writeFile(
    databaseFile,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        databaseType: 'PostgreSQL',
        tables: exportedTables
      },
      null,
      2
    )
  );

  return {
    databaseFile,
    tables,
    tableCounts,
    totalRows,
    cloudinaryUrls: [...cloudinaryUrls]
  };
}

function requestToFile(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        const redirectedUrl = new URL(
          response.headers.location,
          url
        ).toString();

        requestToFile(redirectedUrl, destination, redirects + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const output = fs.createWriteStream(destination);
      response.pipe(output);
      output.on('finish', () => output.close(resolve));
      output.on('error', reject);
    });

    request.setTimeout(60000, () => {
      request.destroy(new Error('Download timed out'));
    });

    request.on('error', reject);
  });
}

async function downloadCloudinaryFiles(urls, workDir) {
  const targetDir = path.join(workDir, 'cloudinary-files');
  await fsp.mkdir(targetDir, { recursive: true });

  const downloaded = [];
  const failed = [];

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const originalName = safeFileName(
        decodeURIComponent(path.basename(parsed.pathname)) ||
          'cloudinary-file'
      );
      const hash = crypto
        .createHash('sha1')
        .update(url)
        .digest('hex')
        .slice(0, 12);
      const destination = path.join(
        targetDir,
        `${hash}-${originalName}`
      );

      await requestToFile(url, destination);
      const stats = await fsp.stat(destination);

      downloaded.push({
        url,
        backupName: path.basename(destination),
        sizeBytes: stats.size
      });
    } catch (error) {
      failed.push({ url, error: error.message });
    }
  }

  return { targetDir, downloaded, failed };
}

async function findLocalUploadDirectories() {
  const candidates = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'public', 'uploads'),
    path.join(__dirname, 'storage'),
    path.join(__dirname, '..', 'frontend', 'public', 'uploads')
  ];

  const existing = [];

  for (const directory of candidates) {
    try {
      const stats = await fsp.stat(directory);
      if (stats.isDirectory()) existing.push(directory);
    } catch (_) {
      // Nothing to include from this location.
    }
  }

  return existing;
}

async function createZip(sourceData) {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const temporaryZip = `${BACKUP_PATH}.tmp`;

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(temporaryZip);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.file(sourceData.databaseFile, {
      name: 'database/database.json'
    });
    archive.file(sourceData.manifestFile, {
      name: 'manifest.json'
    });
    archive.file(sourceData.restoreFile, {
      name: 'RESTORE-INSTRUCTIONS.txt'
    });

    if (sourceData.cloudinaryDir) {
      archive.directory(
        sourceData.cloudinaryDir,
        'uploads/cloudinary'
      );
    }

    for (const directory of sourceData.localUploadDirectories) {
      archive.directory(
        directory,
        `uploads/local/${safeFileName(path.basename(directory))}`
      );
    }

    archive.finalize();
  });

  await fsp.rm(BACKUP_PATH, { force: true });
  await fsp.rename(temporaryZip, BACKUP_PATH);

  return fsp.stat(BACKUP_PATH);
}

function parseGoogleCredentials() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  return undefined;
}

async function getGoogleAuth() {
  if (process.env.GOOGLE_OAUTH_TOKEN_JSON) {
    const token = JSON.parse(
      process.env.GOOGLE_OAUTH_TOKEN_JSON
    );

    return google.auth.fromJSON(token);
  }

  const oauthTokenPath =
    process.env.GOOGLE_OAUTH_TOKEN_PATH ||
    path.join(__dirname, 'google-oauth-token.json');

  if (fs.existsSync(oauthTokenPath)) {
    const token = JSON.parse(
      fs.readFileSync(oauthTokenPath, 'utf8')
    );

    return google.auth.fromJSON(token);
  }

  const credentials = parseGoogleCredentials();

  if (
    credentials ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    return new google.auth.GoogleAuth({
      credentials,
      keyFile: credentials
        ? undefined
        : process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ]
    });
  }

  throw new Error(
    'Google authorization is not configured. Run node google-oauth-authorize.js first.'
  );
}

function escapeDriveQuery(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

async function uploadLatestToDrive() {
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  if (!folderId) {
    return {
      skipped: true,
      reason:
        'GOOGLE_DRIVE_BACKUP_FOLDER_ID is not configured'
    };
  }

  const auth = await getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const list = await drive.files.list({
    q: `'${escapeDriveQuery(
      folderId
    )}' in parents and name = '${escapeDriveQuery(
      BACKUP_NAME
    )}' and trashed = false`,
    fields: 'files(id,name,webViewLink,createdTime)',
    orderBy: 'createdTime asc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  const existingFiles = list.data.files || [];
  let fileId;

  if (existingFiles.length > 0) {
    fileId = existingFiles[0].id;

    await drive.files.update({
      fileId,
      media: {
        mimeType: 'application/zip',
        body: fs.createReadStream(BACKUP_PATH)
      },
      fields: 'id,name,webViewLink,modifiedTime,size',
      supportsAllDrives: true
    });

    for (const duplicate of existingFiles.slice(1)) {
      await drive.files.delete({
        fileId: duplicate.id,
        supportsAllDrives: true
      });
    }
  } else {
    const created = await drive.files.create({
      requestBody: {
        name: BACKUP_NAME,
        parents: [folderId]
      },
      media: {
        mimeType: 'application/zip',
        body: fs.createReadStream(BACKUP_PATH)
      },
      fields: 'id,name,webViewLink,modifiedTime,size',
      supportsAllDrives: true
    });

    fileId = created.data.id;
  }

  const metadata = await drive.files.get({
    fileId,
    fields: 'id,name,webViewLink,modifiedTime,size',
    supportsAllDrives: true
  });

  return {
    skipped: false,
    fileId: metadata.data.id,
    webViewLink: metadata.data.webViewLink || null,
    modifiedTime: metadata.data.modifiedTime || null,
    size: Number(metadata.data.size || 0)
  };
}

async function updateGoogleSheet(status) {
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_BACKUP_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return {
      skipped: true,
      reason:
        'GOOGLE_SHEETS_BACKUP_SPREADSHEET_ID is not configured'
    };
  }

  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const range =
    process.env.GOOGLE_SHEETS_BACKUP_RANGE ||
    'Backup Status!A1:H2';

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [
          'Status',
          'Last Backup',
          'Size (MB)',
          'Tables',
          'Rows',
          'Uploaded Files',
          'Google Drive Link',
          'Error'
        ],
        [
          status.status,
          status.completedAt || status.startedAt || '',
          (status.sizeBytes / 1024 / 1024).toFixed(2),
          status.tableCount,
          status.rowCount,
          status.uploadedFileCount,
          status.driveLink || '',
          status.error || ''
        ]
      ]
    }
  });

  return { skipped: false };
}

async function backup() {
  if (isRunning) {
    console.log(
      'Backup skipped because another backup is already running.'
    );
    return latestStatus;
  }

  isRunning = true;
  const startedAt = new Date().toISOString();
  let pool;
  let workDir;

  latestStatus = {
    ...latestStatus,
    status: 'Running',
    startedAt,
    completedAt: null,
    error: null
  };

  try {
    pool = createPool();
    workDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), 'amc-backup-')
    );

    const database = await exportDatabase(pool, workDir);
    const cloudinary = await downloadCloudinaryFiles(
      database.cloudinaryUrls,
      workDir
    );
    const localUploadDirectories =
      await findLocalUploadDirectories();

    const manifest = {
      backupName: BACKUP_NAME,
      createdAt: new Date().toISOString(),
      tables: database.tables,
      tableCounts: database.tableCounts,
      totalRows: database.totalRows,
      cloudinaryFilesDownloaded: cloudinary.downloaded,
      cloudinaryFilesFailed: cloudinary.failed,
      localUploadDirectories,
      note:
        'This file replaces the previous latest backup.'
    };

    const manifestFile = path.join(workDir, 'manifest.json');
    await fsp.writeFile(
      manifestFile,
      JSON.stringify(manifest, null, 2)
    );

    const restoreFile = path.join(
      workDir,
      'RESTORE-INSTRUCTIONS.txt'
    );

    await fsp.writeFile(
      restoreFile,
      [
        'VAC AMC LATEST BACKUP',
        '',
        '1. Extract this ZIP file.',
        '2. Full PostgreSQL data is in database/database.json.',
        '3. Uploaded files are under uploads/.',
        '4. Restore into a clean database using a reviewed restore script.',
        '5. Verify users, clients, contracts, tickets, visits, learning modules and reports.',
        '',
        'Do not overwrite production without taking a safety copy first.'
      ].join('\n')
    );

    const zipStats = await createZip({
      databaseFile: database.databaseFile,
      manifestFile,
      restoreFile,
      cloudinaryDir: cloudinary.downloaded.length
        ? cloudinary.targetDir
        : null,
      localUploadDirectories
    });

    const driveResult = await uploadLatestToDrive();
    const completedAt = new Date().toISOString();

    latestStatus = {
      status: driveResult.skipped
        ? 'Local backup completed'
        : 'Successful',
      startedAt,
      completedAt,
      sizeBytes: zipStats.size,
      tableCount: database.tables.length,
      rowCount: database.totalRows,
      uploadedFileCount: cloudinary.downloaded.length,
      driveFileId: driveResult.fileId || null,
      driveLink: driveResult.webViewLink || null,
      error: driveResult.skipped
        ? driveResult.reason
        : null
    };

    try {
      await updateGoogleSheet(latestStatus);
    } catch (sheetError) {
      latestStatus.error = latestStatus.error
        ? `${latestStatus.error}; Google Sheets: ${sheetError.message}`
        : `Google Sheets: ${sheetError.message}`;
    }

    await fsp.writeFile(
      path.join(BACKUP_DIR, 'backup-status.json'),
      JSON.stringify(latestStatus, null, 2)
    );

    console.log(
      `AMC backup completed: ${BACKUP_NAME} (${(
        zipStats.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );

    return latestStatus;
  } catch (error) {
    latestStatus = {
      ...latestStatus,
      status: 'Failed',
      completedAt: new Date().toISOString(),
      error: error.message
    };

    try {
      await fsp.mkdir(BACKUP_DIR, { recursive: true });
      await fsp.writeFile(
        path.join(BACKUP_DIR, 'backup-status.json'),
        JSON.stringify(latestStatus, null, 2)
      );
      await updateGoogleSheet(latestStatus);
    } catch (_) {
      // Keep the original backup error.
    }

    console.error('Backup failed:', error.message);
    return latestStatus;
  } finally {
    isRunning = false;

    if (pool) {
      await pool.end().catch(() => {});
    }

    if (workDir) {
      await fsp
        .rm(workDir, { recursive: true, force: true })
        .catch(() => {});
    }
  }
}

function startBackupScheduler() {
  const expression =
    process.env.BACKUP_CRON || DEFAULT_CRON;
  const timezone =
    process.env.BACKUP_TIMEZONE || DEFAULT_TIMEZONE;

  if (!cron.validate(expression)) {
    throw new Error(
      `Invalid BACKUP_CRON expression: ${expression}`
    );
  }

  console.log(
    `Daily AMC backup scheduled: ${expression} (${timezone})`
  );

  backup().catch((error) => {
    console.error('Startup backup failed:', error.message);
  });

  return cron.schedule(
    expression,
    () => {
      backup().catch((error) => {
        console.error(
          'Scheduled backup failed:',
          error.message
        );
      });
    },
    { timezone }
  );
}

function getBackupStatus() {
  return { ...latestStatus };
}

module.exports = {
  backup,
  startBackupScheduler,
  getBackupStatus,
  BACKUP_PATH
};
