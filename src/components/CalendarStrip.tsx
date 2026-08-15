import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Radius, Spacing } from '../theme/spacing';

interface CalendarStripProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  markers?: Record<string, 'hadir' | 'izin' | 'libur' | 'alpha'>;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CalendarStrip({
  selectedDate,
  onSelect,
  markers,
}: CalendarStripProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const marker = markers?.[key];
        return (
          <TouchableOpacity
            key={key}
            style={[styles.day, isSelected && styles.daySelected]}
            onPress={() => onSelect(day)}
          >
            <Text style={[styles.dayName, isSelected && styles.textSelected]}>
              {DAY_NAMES[day.getDay()]}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.textSelected]}>
              {format(day, 'd')}
            </Text>
            <View style={styles.markerRow}>
              {isToday ? <View style={styles.todayDot} /> : null}
              {marker ? (
                <View
                  style={[
                    styles.markerDot,
                    marker === 'hadir' && { backgroundColor: Colors.success },
                    marker === 'izin' && { backgroundColor: Colors.warning },
                    marker === 'libur' && { backgroundColor: Colors.gray[300] },
                    marker === 'alpha' && { backgroundColor: Colors.danger },
                  ]}
                />
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  day: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[50],
  },
  daySelected: {
    backgroundColor: Colors.primary[600],
  },
  dayName: {
    fontSize: 11,
    color: Colors.gray[500],
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray[800],
    marginTop: 2,
  },
  textSelected: {
    color: Colors.white,
  },
  markerRow: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
    alignItems: 'center',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary[400],
  },
  markerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});

