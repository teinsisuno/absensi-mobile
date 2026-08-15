import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { addMonths, format, parseISO } from 'date-fns';
import MonthCalendar from '../components/MonthCalendar';
import ScreenContainer from '../components/ScreenContainer';
import { getData, scheduleApi } from '../services/api';
import { getCachedSchedules, getCurrentEmployeeId } from '../services/database';
import { useScheduleStore } from '../stores/scheduleStore';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';
import type { ScheduleItem } from '../types/models';

export default function CalendarScreen() {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const schedules = useScheduleStore((s) => s.schedules);
  const setSchedules = useScheduleStore((s) => s.setSchedules);

  const load = useCallback(async () => {
    const from = format(month, 'yyyy-MM-01');
    const to = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');
    try {
      const res = await scheduleApi.me(from, to);
      const rows = getData<Record<string, unknown>[]>(res);
      if (Array.isArray(rows)) {
        setSchedules(
          rows.map(mapSchedule)
        );
      }
    } catch {
      const employeeId = await getCurrentEmployeeId();
      if (!employeeId) return;
      const rows = await getCachedSchedules(employeeId, from, to);
      setSchedules(rows.map(mapSchedule));
    }
  }, [month, setSchedules]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSchedule = useMemo(() => {
    if (!selectedDate) return null;
    const key = format(selectedDate, 'yyyy-MM-dd');
    return schedules.find((s) => s.date === key) ?? null;
  }, [schedules, selectedDate]);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setMonth((m) => addMonths(m, -1))}
          >
            <Text style={styles.navText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(month, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setMonth((m) => addMonths(m, 1))}
          >
            <Text style={styles.navText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <MonthCalendar
            month={month}
            schedules={schedules}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailDate}>
            {selectedDate ? format(selectedDate, 'dd MMMM yyyy') : '-'}
          </Text>
          {selectedSchedule ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shift</Text>
                <Text style={styles.detailValue}>
                  {selectedSchedule.shiftName ?? 'Tidak ada shift'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Jam Kerja</Text>
                <Text style={styles.detailValue}>
                  {selectedSchedule.shiftStart && selectedSchedule.shiftEnd
                    ? `${selectedSchedule.shiftStart}–${selectedSchedule.shiftEnd}`
                    : '-'}
                </Text>
              </View>
              {selectedSchedule.isHoliday ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: Colors.warning }]}>
                    Libur Nasional
                  </Text>
                </View>
              ) : null}
              {selectedSchedule.isLeave || selectedSchedule.isPermit ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: Colors.purple }]}>
                    Izin/Cuti
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.detailEmpty}>
              Tidak ada jadwal untuk tanggal ini
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function mapSchedule(row: Record<string, unknown>): ScheduleItem {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id ?? 0),
    date: String(row.date ?? row.work_date ?? ''),
    shiftName: row.shift_name ? String(row.shift_name) : null,
    shiftStart: row.shift_start ? String(row.shift_start) : null,
    shiftEnd: row.shift_end ? String(row.shift_end) : null,
    isHoliday: Number(row.is_holiday ?? 0),
    isLeave: Number(row.is_leave ?? 0),
    isPermit: Number(row.is_permit ?? 0),
    status: row.status ? String(row.status) : null,
  };
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingBottom: Spacing.xxl,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 14,
    color: Colors.primary[700],
    fontWeight: '700',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.gray[900],
    textTransform: 'capitalize',
  },
  calendarCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gray[900],
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[800],
  },
  detailEmpty: {
    fontSize: 13,
    color: Colors.gray[400],
  },
});

