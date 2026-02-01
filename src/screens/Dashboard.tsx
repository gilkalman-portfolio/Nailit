import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppointmentRecord } from '../db';

const statusLabels: Record<AppointmentRecord['status'], string> = {
  scheduled: 'מתוכנן',
  done: 'בוצע',
  canceled: 'בוטל',
};

const typeLabels: Record<AppointmentRecord['type'], string> = {
  manicure: 'מניקור',
  pedicure: 'פדיקור',
  both: 'משולב',
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

const getEndTime = (start: string, durationMinutes: number) => {
  const date = new Date(start);
  return new Date(date.getTime() + durationMinutes * 60000);
};

type Props = {
  appointments: AppointmentRecord[];
  onCreate: () => void;
  onSettings: () => void;
  onMarkDone: (appointment: AppointmentRecord) => void;
};

export const Dashboard: React.FC<Props> = ({ appointments, onCreate, onSettings, onMarkDone }) => {
  const now = new Date();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>היום שלי</Text>
      <FlatList
        data={appointments}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>אין תורים להיום</Text>}
        renderItem={({ item }) => {
          const end = getEndTime(item.start_time, item.duration_minutes);
          const isPastUnfinished =
            item.status === 'scheduled' && end.getTime() < now.getTime();
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.time}>{`${formatTime(new Date(item.start_time))}–${formatTime(
                  end
                )}`}</Text>
                <Text style={styles.status}>{statusLabels[item.status]}</Text>
              </View>
              <Text style={styles.client}>{item.client_name}</Text>
              <Text style={styles.type}>{typeLabels[item.type]}</Text>
              {isPastUnfinished && (
                <Pressable style={styles.doneButton} onPress={() => onMarkDone(item)}>
                  <Text style={styles.doneText}>✅ סיימתי</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={onCreate}>
          <Text style={styles.primaryText}>תור חדש</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onSettings}>
          <Text style={styles.secondaryText}>הגדרות</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  time: {
    fontWeight: '600',
  },
  status: {
    color: '#444',
  },
  client: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  type: {
    color: '#555',
    textAlign: 'right',
  },
  doneButton: {
    marginTop: 8,
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  doneText: {
    color: '#2e7d32',
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
  },
});
