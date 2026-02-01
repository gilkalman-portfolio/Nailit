import * as Calendar from 'expo-calendar';

import { AppointmentType } from '../db';

export const getWritableCalendars = async () => {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return [];
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.filter((calendar) => calendar.allowsModifications);
};

export const ensureDefaultWritableCalendar = async () => {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  if (defaultCalendar?.allowsModifications) {
    return defaultCalendar;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.find((calendar) => calendar.allowsModifications) ?? null;
};

const getEventTitle = (type: AppointmentType, clientName: string) => {
  if (type === 'manicure') {
    return `מניקור – ${clientName}`;
  }
  if (type === 'pedicure') {
    return `פדיקור – ${clientName}`;
  }
  return `מניקור+פדיקור – ${clientName}`;
};

export const createCalendarEvent = async (params: {
  calendarId: string;
  type: AppointmentType;
  clientName: string;
  startTime: Date;
  durationMinutes: number;
}) => {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60000);
  const eventId = await Calendar.createEventAsync(params.calendarId, {
    title: getEventTitle(params.type, params.clientName),
    startDate: params.startTime,
    endDate: endTime,
    timeZone: undefined,
  });
  return eventId;
};

export const cancelCalendarEvent = async (eventId: string, type: AppointmentType, clientName: string) => {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return;
  }
  const title = `בוטל: ${getEventTitle(type, clientName)}`;
  await Calendar.updateEventAsync(eventId, { title });
};
