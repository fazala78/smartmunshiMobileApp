import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors } from '../theme';

interface DatePickerProps {
    onDateChange: (date: string) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ onDateChange }) => {
    const getToday = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(getToday());
    const [showCalendar, setShowCalendar] = useState(false);

    const getWeekDates = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));

        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const current = new Date(monday);
            current.setDate(monday.getDate() + i);
            weekDates.push({
                day: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i],
                date: current.getDate(),
                fullDate: current.toISOString().split('T')[0],
            });
        }
        return weekDates;
    };

    const weekDates = getWeekDates(selectedDate);

    const selectedDateObj = new Date(selectedDate);
    const monthYear = selectedDateObj
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase();

    const handleDateSelect = (date: any) => {
        const newDate = date.dateString;
        setSelectedDate(newDate);
        onDateChange(newDate);
        setShowCalendar(false);
    };

    const handleWeekDateSelect = (dateString: string) => {
        setSelectedDate(dateString);
        onDateChange(dateString);
    };

    const defaultCalendarTheme = {
        backgroundColor: colors.white,
        calendarBackground: colors.white,
        textSectionTitleColor: colors.textSecondary,
        selectedDayBackgroundColor: colors.white,
        selectedDayTextColor: colors.white,
        todayTextColor: colors.textPlaceholder,
        dayTextColor: colors.textPrimary,
        textDisabledColor: colors.backgroundLight,
        monthTextColor: colors.backgroundDark,
        textMonthFontWeight: '700' as any,
        textDayFontWeight: '500' as any,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 12,
    };

    return (
        <>
            {/* Date Selector */}
            <View style={styles.dateSection}>
                <View style={styles.dateSectionHeader}>
                    <TouchableOpacity onPress={() => setShowCalendar(true)}>
                        <Text style={styles.monthLabel}>{monthYear}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.datesContainer}
                >
                    {weekDates.map((item) => {
                        const active = item.fullDate === selectedDate;
                        return (
                            <TouchableOpacity
                                key={item.fullDate}
                                onPress={() => handleWeekDateSelect(item.fullDate)}
                                style={[styles.dateItem, active && styles.dateItemActive]}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                                    {item.day}
                                </Text>
                                <Text style={[styles.dateText, active && styles.dateTextActive]}>
                                    {item.date}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Calendar Modal */}
            <Modal
                visible={showCalendar}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCalendar(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Calendar
                            current={selectedDate}
                            onDayPress={handleDateSelect}
                            markedDates={{
                                [selectedDate]: {
                                    selected: true,
                                    selectedColor: colors.primary,
                                },
                            }}
                            theme={defaultCalendarTheme}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    // ── Date section ─────────────────────────────────────────────────────────
    dateSection: {
        backgroundColor: colors.white,
        paddingHorizontal: 10,
    },
    dateSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    monthLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 1.5,
    },

    // ── Day cards ─────────────────────────────────────────────────────────────
    datesContainer: {
        gap: 8,
        paddingVertical: 4,
    },
    dateItem: {
        width: 56,
        height: 80,
        borderRadius: 14,
        backgroundColor: '#f0f4f2',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    dateItemActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    dayLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.5,
    },
    dayLabelActive: {
        color: colors.white,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.backgroundDark,
    },
    dateTextActive: {
        color: colors.white,
    },

    // ── Calendar modal ────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.backgroundDark,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.backgroundLight,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundLight,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.backgroundDark,
    },
    modalClose: {
        fontSize: 24,
        fontWeight: '300',
        color: colors.textMuted,
    },
});

export default DatePicker;