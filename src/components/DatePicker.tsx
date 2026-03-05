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

const DatePicker: React.FC<DatePickerProps> = ({
    onDateChange,
}) => {
    const getToday = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(getToday());
    const [showCalendar, setShowCalendar] = useState(false);

    // Get week dates based on selected date
    const getWeekDates = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
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

    // Get month and year from selected date
    const selectedDateObj = new Date(selectedDate);
    const monthYear = selectedDateObj.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    }).toUpperCase();

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
        calendarBackground:colors.white,
        textSectionTitleColor: colors.textSecondary,
        selectedDayBackgroundColor:colors.white,
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
                        <Text style={styles.monthLabel}>
                            {monthYear}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.datesContainer}
                >
                    {weekDates.map((item) => (
                        <TouchableOpacity
                            key={item.fullDate}
                            onPress={() => handleWeekDateSelect(item.fullDate)}
                            style={styles.dateItem}
                        >
                            <Text
                                style={[
                                    styles.dayLabel,
                                    item.fullDate === selectedDate && styles.dayLabelActive,
                                ]}
                            >
                                {item.day}
                            </Text>
                            {item.fullDate === selectedDate ? (
                                <View style={styles.dateCircleActive}>
                                    <Text style={styles.dateTextActive}>
                                        {item.date}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.dateText}>
                                    {item.date}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
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
    dateSection: {
        backgroundColor:colors.white,
        paddingHorizontal: 10,
    },
    dateSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    monthLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 1.5,
    },
    datesContainer: {
        gap: 30,
    },
    dateItem: {
        alignItems: 'center',
        gap: 16,
    },
    dayLabel: {
        fontSize: 10,
        fontWeight: '700',
        color:colors.textMuted,
        letterSpacing: 0.5,
    },
    dayLabelActive: {
        color: colors.primary
    },
    dateText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.backgroundDark
    },
    dateCircleActive: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor:colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 50,
        elevation: 8,
    },
    dateTextActive: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.white,
    },
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