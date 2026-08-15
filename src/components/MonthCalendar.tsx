import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import type { ScheduleItem } from '../types/models';

interface MonthCalendarProps {
  month: Date;
  schedules: ScheduleItem[];
  selectedDate?: Date | null;
  onSelect?: (date: Date) => void;
}

const WEEKDAYS = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm'];

export default function MonthCalendar({
  month,
  schedules,
  selectedDate,
  onSelect,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const totalCells = Math.ceil((monthEnd.getDate() + (monthStart.getDay() + 6) % 7) / 7) * 7;

  const scheduleByDate = new Map<string, ScheduleItem>();
  schedules.forEach((s) => scheduleByDate.set(s.date, s));

  const cells = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const schedule = scheduleByDate.get(key);
          const inMonth = isSameMonth(day, month);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isToday = isSameDay(day, new Date());

          let marker: string | null = null;
          if (schedule?.isHoliday) marker = 'L';
          else if (schedule?.isLeave || schedule?.isPermit) marker = 'I';
          else if (schedule?.shiftStart) marker = 'M';

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.cell,
                !inMonth && styles.cellOutside,
                isSelected && styles.cellSelected,
              ]}
              disabled={!onSelect}
              onPress={() => onSelect?.(day)}
            >
              <Text
                style={[
                  styles.cellNumber,
                  !inMonth && styles.cellOutsideText,
                  isToday && styles.cellToday,
                  isSelected && styles.cellSelectedText,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {marker ? (
                <Text
                  style={[
                    styles.marker,
                    marker === 'L' && styles.markerLibur,
                    marker === 'I' && styles.markerIzin,
                    isSelected && styles.markerSelected,
                  ]}
                >
                  {marker}
                </Text>
              ) : (
                <View style={styles.markerSpacer} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={[styles.marker, styles.markerMasuk]}>M</Text>
          <Text style={styles.legendText}>Masuk</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.marker, styles.markerIzin]}>I</Text>
          <Text style={styles.legendText}>Izin/Cuti</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.marker, styles.markerLibur]}>L</Text>
          <Text style={styles.legendText}>Libur</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 6}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  cellOutside: {
    opacity: 0.35,
  },
  cellSelected: {
    backgroundColor: Colors.primary[600],
  },
  cellNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  cellOutsideText: {
    color: Colors.gray[400],
  },
  cellToday: {
    color: Colors.primary[700],
  },
  cellSelectedText: {
    color: Colors.white,
  },
  marker: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  markerSpacer: {
    height: 13,
  },
  markerMasuk: {
    color: Colors.primary[600],
  },
  markerIzin: {
    color: Colors.warning,
  },
  markerLibur: {
    color: Colors.gray[400],
  },
  markerSelected: {
    color: Colors.white,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.gray[500],
  },
});

