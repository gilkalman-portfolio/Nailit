import React, { useEffect, useState } from 'react';
import { I18nManager, SafeAreaView, StyleSheet, Text } from 'react-native';

import {
  AppointmentRecord,
  AppointmentType,
  countDoneManicure,
  countDonePedicure,
  getSetting,
  initDB,
  listTodayAppointments,
  markAppointmentDone,
  seedDefaultsIfMissing,
  setSetting,
} from './src/db';
import { ensureDefaultWritableCalendar } from './src/lib/calendar';
import { requestNotificationPermissions, sendImmediateNotification } from './src/lib/notifications';
import { CreateAppointment } from './src/screens/CreateAppointment';
import { Dashboard } from './src/screens/Dashboard';
import { Settings } from './src/screens/Settings';

const notificationMessages = {
  manicure: (threshold: number) =>
    `הגעת ל-${threshold} טיפולי מניקור. כדאי לבדוק בסיסים, טופים ואלכוהול!`,
  pedicure: (threshold: number) =>
    `הגעת ל-${threshold} טיפולי פדיקור. כדאי לבדוק חומרים ומלאי!`,
};

export default function App() {
  const [screen, setScreen] = useState<'dashboard' | 'create' | 'settings'>('dashboard');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }, []);

  useEffect(() => {
    const setup = async () => {
      await initDB();
      await seedDefaultsIfMissing();
      const calendarId = await getSetting('calendar_id');
      if (!calendarId) {
        const calendar = await ensureDefaultWritableCalendar();
        if (calendar?.id) {
          await setSetting('calendar_id', calendar.id);
        }
      }
      await refreshAppointments();
      setIsReady(true);
    };
    setup().catch((error) => console.error('init error', error));
  }, []);

  useEffect(() => {
    if (screen === 'dashboard') {
      refreshAppointments().catch((error) => console.error('refresh error', error));
    }
  }, [screen]);

  const refreshAppointments = async () => {
    const list = await listTodayAppointments();
    setAppointments(list);
  };

  const handleInventoryNotification = async (type: AppointmentType) => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      return;
    }

    if (type === 'manicure' || type === 'both') {
      const current = await countDoneManicure();
      const threshold = Number(await getSetting('threshold_manicure'));
      const lastNotified = Number(await getSetting('last_notified_manicure'));
      if (Number.isFinite(threshold) && threshold > 0 && current >= lastNotified + threshold) {
        await sendImmediateNotification(notificationMessages.manicure(threshold));
        await setSetting('last_notified_manicure', String(current));
      }
    }

    if (type === 'pedicure' || type === 'both') {
      const current = await countDonePedicure();
      const threshold = Number(await getSetting('threshold_pedicure'));
      const lastNotified = Number(await getSetting('last_notified_pedicure'));
      if (Number.isFinite(threshold) && threshold > 0 && current >= lastNotified + threshold) {
        await sendImmediateNotification(notificationMessages.pedicure(threshold));
        await setSetting('last_notified_pedicure', String(current));
      }
    }
  };

  const handleMarkDone = async (appointment: AppointmentRecord) => {
    await markAppointmentDone(appointment.id);
    await handleInventoryNotification(appointment.type);
    await refreshAppointments();
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.loadingText}>טוענת...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'dashboard' && (
        <Dashboard
          appointments={appointments}
          onCreate={() => setScreen('create')}
          onSettings={() => setScreen('settings')}
          onMarkDone={handleMarkDone}
        />
      )}
      {screen === 'create' && <CreateAppointment onDone={() => setScreen('dashboard')} />}
      {screen === 'settings' && <Settings onDone={() => setScreen('dashboard')} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 18,
  },
});
