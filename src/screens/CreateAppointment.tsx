import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AppointmentType,
  checkConflict,
  createAppointment,
  createClient,
  getSetting,
  searchClients,
  updateAppointmentAppleEventId,
} from '../db';
import { createCalendarEvent } from '../lib/calendar';

type Props = {
  onDone: () => void;
};

type Client = { id: number; name: string; phone: string | null };

export const CreateAppointment: React.FC<Props> = ({ onDone }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [type, setType] = useState<AppointmentType>('manicure');
  const [startDate, setStartDate] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (searchTerm.trim().length === 0) {
      setResults([]);
      return;
    }
    searchClients(searchTerm)
      .then((clients) => {
        if (isMounted) {
          setResults(clients);
        }
      })
      .catch((error) => console.error('searchClients error', error));
    return () => {
      isMounted = false;
    };
  }, [searchTerm]);

  const handleSave = async () => {
    if (!selectedClient && clientName.trim().length === 0) {
      Alert.alert('חסר שם', 'תכניסי שם לקוחה כדי לשמור תור.');
      return;
    }
    const parsedDuration = Number(durationMinutes);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      Alert.alert('משך לא תקין', 'תכניסי משך זמן תקין בדקות.');
      return;
    }
    const conflict = await checkConflict(startDate.toISOString(), parsedDuration);
    if (conflict) {
      Alert.alert('חפיפה', 'יש חפיפה עם תור אחר. תבחרי שעה אחרת.');
      return;
    }

    let clientId = selectedClient?.id ?? null;
    let finalClientName = selectedClient?.name ?? clientName.trim();
    if (!clientId) {
      clientId = await createClient(finalClientName, clientPhone.trim() || null);
    }

    const appointmentId = await createAppointment({
      clientId,
      type,
      startTime: startDate.toISOString(),
      durationMinutes: parsedDuration,
      treatmentNotes: notes.trim() || null,
      appleEventId: null,
    });

    try {
      const calendarId = await getSetting('calendar_id');
      if (calendarId) {
        const eventId = await createCalendarEvent({
          calendarId,
          type,
          clientName: finalClientName,
          startTime: startDate,
          durationMinutes: parsedDuration,
        });
        if (eventId) {
          await updateAppointmentAppleEventId(appointmentId, eventId);
        } else {
          Alert.alert(
            'יומן',
            'לא הצלחתי ליצור אירוע ביומן. אפשר לאשר הרשאות בהגדרות.'
          );
        }
      } else {
        Alert.alert(
          'יומן',
          'לא הצלחתי ליצור אירוע ביומן. אפשר לאשר הרשאות בהגדרות.'
        );
      }
    } catch (error) {
      console.error('createCalendarEvent error', error);
      Alert.alert('יומן', 'לא הצלחתי ליצור אירוע ביומן. אפשר לאשר הרשאות בהגדרות.');
    }

    onDone();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>תור חדש</Text>

      <Text style={styles.label}>חיפוש לקוחה</Text>
      <TextInput
        style={styles.input}
        placeholder="חיפוש לפי שם או טלפון"
        placeholderTextColor="#888"
        value={searchTerm}
        onChangeText={(value) => {
          setSearchTerm(value);
          setSelectedClient(null);
        }}
        textAlign="right"
      />
      {results.map((client) => (
        <Pressable
          key={client.id}
          style={styles.result}
          onPress={() => {
            setSelectedClient(client);
            setClientName(client.name);
            setClientPhone(client.phone ?? '');
            setSearchTerm('');
            setResults([]);
          }}
        >
          <Text style={styles.resultText}>{`${client.name} ${client.phone ?? ''}`}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>שם לקוחה</Text>
      <TextInput
        style={styles.input}
        placeholder="שם מלא"
        placeholderTextColor="#888"
        value={clientName}
        onChangeText={setClientName}
        textAlign="right"
      />

      <Text style={styles.label}>טלפון</Text>
      <TextInput
        style={styles.input}
        placeholder="טלפון (אופציונלי)"
        placeholderTextColor="#888"
        keyboardType="phone-pad"
        value={clientPhone}
        onChangeText={setClientPhone}
        textAlign="right"
      />

      <Text style={styles.label}>סוג טיפול</Text>
      <View style={styles.row}>
        {(["manicure", "pedicure", "both"] as AppointmentType[]).map((value) => (
          <Pressable
            key={value}
            style={[styles.chip, type === value && styles.chipActive]}
            onPress={() => setType(value)}
          >
            <Text style={[styles.chipText, type === value && styles.chipTextActive]}>
              {value === 'manicure' ? 'מניקור' : value === 'pedicure' ? 'פדיקור' : 'משולב'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>תאריך ושעה</Text>
      <View style={styles.row}>
        <Pressable style={styles.outlineButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.outlineText}>{startDate.toLocaleDateString('he-IL')}</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.outlineText}>
            {startDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) {
              const newDate = new Date(startDate);
              newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
              setStartDate(newDate);
            }
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={startDate}
          mode="time"
          display="default"
          onChange={(_, date) => {
            setShowTimePicker(false);
            if (date) {
              const newDate = new Date(startDate);
              newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
              setStartDate(newDate);
            }
          }}
        />
      )}

      <Text style={styles.label}>משך בדקות</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        textAlign="right"
      />

      <Text style={styles.label}>הערות טיפול</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="הערות (אופציונלי)"
        placeholderTextColor="#888"
        value={notes}
        onChangeText={setNotes}
        textAlign="right"
        multiline
      />

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
  textarea: {
    height: 90,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    color: '#111827',
  },
  chipTextActive: {
    color: '#fff',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  outlineText: {
    color: '#111827',
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
  result: {
    paddingVertical: 6,
  },
  resultText: {
    color: '#111827',
    textAlign: 'right',
  },
});
