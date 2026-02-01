import * as SQLite from 'expo-sqlite';

export type AppointmentType = 'manicure' | 'pedicure' | 'both';
export type AppointmentStatus = 'scheduled' | 'done' | 'canceled';

export type AppointmentRecord = {
  id: number;
  client_id: number;
  client_name: string;
  type: AppointmentType;
  status: AppointmentStatus;
  start_time: string;
  duration_minutes: number;
  treatment_notes: string | null;
  apple_event_id: string | null;
};

const db = SQLite.openDatabase('nailit.db');

const executeSql = (
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLResultSet> =>
  new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          console.error('SQL error:', error, sql, params);
          reject(error);
          return false;
        }
      );
    });
  });

export const initDB = async () => {
  await executeSql(
    `CREATE TABLE IF NOT EXISTS Clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      permanent_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS Appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('manicure','pedicure','both')),
      status TEXT NOT NULL CHECK(status IN ('scheduled','done','canceled')) DEFAULT 'scheduled',
      start_time DATETIME NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      treatment_notes TEXT,
      apple_event_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES Clients(id)
    );`
  );
  await executeSql(
    `CREATE TABLE IF NOT EXISTS Settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`
  );
};

const defaultSettings: Record<string, string> = {
  threshold_manicure: '20',
  threshold_pedicure: '20',
  last_notified_manicure: '0',
  last_notified_pedicure: '0',
  insta_link: '',
  calendar_id: '',
};

export const seedDefaultsIfMissing = async () => {
  for (const [key, value] of Object.entries(defaultSettings)) {
    const result = await executeSql('SELECT value FROM Settings WHERE key = ?', [key]);
    if (result.rows.length === 0) {
      await executeSql('INSERT INTO Settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }
};

export const getSetting = async (key: string): Promise<string> => {
  const result = await executeSql('SELECT value FROM Settings WHERE key = ?', [key]);
  if (result.rows.length === 0) {
    return '';
  }
  return result.rows.item(0).value as string;
};

export const setSetting = async (key: string, value: string) => {
  await executeSql('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)', [key, value]);
};

export const listTodayAppointments = async (): Promise<AppointmentRecord[]> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const result = await executeSql(
    `SELECT Appointments.*, Clients.name as client_name
     FROM Appointments
     JOIN Clients ON Clients.id = Appointments.client_id
     WHERE start_time >= ? AND start_time <= ?
     ORDER BY start_time ASC`,
    [start.toISOString(), end.toISOString()]
  );
  return result.rows._array as AppointmentRecord[];
};

export const searchClients = async (term: string) => {
  const likeTerm = `%${term}%`;
  const result = await executeSql(
    'SELECT id, name, phone FROM Clients WHERE name LIKE ? OR phone LIKE ? ORDER BY name LIMIT 20',
    [likeTerm, likeTerm]
  );
  return result.rows._array as { id: number; name: string; phone: string | null }[];
};

export const createClient = async (name: string, phone?: string | null) => {
  const result = await executeSql(
    'INSERT INTO Clients (name, phone, permanent_notes) VALUES (?, ?, ?)',
    [name, phone ?? null, null]
  );
  return result.insertId as number;
};

export const checkConflict = async (startTime: string, durationMinutes: number) => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const result = await executeSql(
    `SELECT id FROM Appointments
     WHERE status IN ('scheduled','done')
     AND start_time < ?
     AND datetime(start_time, '+' || duration_minutes || ' minutes') > ?
     LIMIT 1`,
    [end.toISOString(), start.toISOString()]
  );
  return result.rows.length > 0;
};

export const createAppointment = async (params: {
  clientId: number;
  type: AppointmentType;
  startTime: string;
  durationMinutes: number;
  treatmentNotes?: string | null;
  appleEventId?: string | null;
}) => {
  const result = await executeSql(
    `INSERT INTO Appointments (
      client_id,
      type,
      status,
      start_time,
      duration_minutes,
      treatment_notes,
      apple_event_id
    ) VALUES (?, ?, 'scheduled', ?, ?, ?, ?)`,
    [
      params.clientId,
      params.type,
      params.startTime,
      params.durationMinutes,
      params.treatmentNotes ?? null,
      params.appleEventId ?? null,
    ]
  );
  return result.insertId as number;
};

export const updateAppointmentAppleEventId = async (appointmentId: number, appleEventId: string | null) => {
  await executeSql('UPDATE Appointments SET apple_event_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    appleEventId,
    appointmentId,
  ]);
};

export const markAppointmentDone = async (appointmentId: number) => {
  await executeSql(
    "UPDATE Appointments SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [appointmentId]
  );
};

export const markAppointmentCanceled = async (appointmentId: number) => {
  await executeSql(
    "UPDATE Appointments SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [appointmentId]
  );
};

export const countDoneManicure = async () => {
  const result = await executeSql(
    "SELECT COUNT(*) as count FROM Appointments WHERE status = 'done' AND type IN ('manicure','both')"
  );
  return (result.rows.item(0).count as number) || 0;
};

export const countDonePedicure = async () => {
  const result = await executeSql(
    "SELECT COUNT(*) as count FROM Appointments WHERE status = 'done' AND type IN ('pedicure','both')"
  );
  return (result.rows.item(0).count as number) || 0;
};
