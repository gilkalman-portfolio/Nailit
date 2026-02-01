import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getSetting, setSetting } from '../db';
import { getWritableCalendars } from '../lib/calendar';
import { requestNotificationPermissions, sendImmediateNotification } from '../lib/notifications';

export const Settings: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [thresholdManicure, setThresholdManicure] = useState('20');
  const [thresholdPedicure, setThresholdPedicure] = useState('20');
  const [instaLink, setInstaLink] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [calendars, setCalendars] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const loadSettings = async () => {
      setThresholdManicure(await getSetting('threshold_manicure'));
      setThresholdPedicure(await getSetting('threshold_pedicure'));
      setInstaLink(await getSetting('insta_link'));
      setCalendarId(await getSetting('calendar_id'));
    };
    loadSettings().catch((error) => console.error('loadSettings error', error));
  }, []);

  useEffect(() => {
    getWritableCalendars()
      .then((list) => setCalendars(list.map((calendar) => ({ id: calendar.id, title: calendar.title }))))
      .catch((error) => console.error('getWritableCalendars error', error));
  }, []);

  const handleSave = async () => {
    await setSetting('threshold_manicure', thresholdManicure || '0');
    await setSetting('threshold_pedicure', thresholdPedicure || '0');
    await setSetting('insta_link', instaLink);
    await setSetting('calendar_id', calendarId);
    Alert.alert('נשמר', 'ההגדרות עודכנו בהצלחה.');
  };

  const handleTestNotification = async () => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert('הרשאה', 'בלי הרשאה לא ניתן לשלוח התראה.');
      return;
    }
    await sendImmediateNotification('זו התראת בדיקה מיידית.');
    Alert.alert('נשלחה', 'התראת בדיקה נשלחה.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>הגדרות</Text>

      <Text style={styles.label}>סף מניקור</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={thresholdManicure}
        onChangeText={setThresholdManicure}
        textAlign="right"
      />

      <Text style={styles.label}>סף פדיקור</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={thresholdPedicure}
        onChangeText={setThresholdPedicure}
        textAlign="right"
      />

      <Text style={styles.label}>לינק אינסטגרם</Text>
      <TextInput
        style={styles.input}
        value={instaLink}
        onChangeText={setInstaLink}
        textAlign="right"
      />

      <Text style={styles.label}>בחירת יומן</Text>
      <View style={styles.calendarList}>
        {calendars.map((calendar) => (
          <Pressable
            key={calendar.id}
            style={[styles.calendarItem, calendarId === calendar.id && styles.calendarActive]}
            onPress={() => setCalendarId(calendar.id)}
          >
            <Text
              style={[styles.calendarText, calendarId === calendar.id && styles.calendarTextActive]}
            >
              {calendar.title}
            </Text>
          </Pressable>
        ))}
        {calendars.length === 0 && <Text style={styles.helper}>אין יומנים זמינים</Text>}
      </View>

      <Pressable style={styles.secondaryButton} onPress={handleTestNotification}>
        <Text style={styles.secondaryText}>בדיקת התראות</Text>
      </Pressable>

      <Pressable style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryText}>שמירה</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={onDone}>
        <Text style={styles.secondaryText}>חזרה</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'right',
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    color: '#333',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    textAlign: 'right',
  },
  calendarList: {
    marginTop: 8,
    gap: 8,
  },
  calendarItem: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 10,
    padding: 10,
  },
  calendarActive: {
    backgroundColor: '#111827',
  },
  calendarText: {
    color: '#111827',
    textAlign: 'right',
  },
  calendarTextActive: {
    color: '#fff',
  },
  helper: {
    color: '#666',
    textAlign: 'right',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
  },
});
