import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { colors } from '../../theme';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { useQuery } from '@tanstack/react-query';
import { getLedgerHtml } from '../../services/contactService';
import { sharePDF } from '../../services/shareService';
import { Contact } from '../../types/contact';
import { iosSharePDF } from '../../services/iosShareService';

interface DownloadModalProps {
    visible: boolean;
    onClose: () => void;
    contact: Contact;
}

const SHORTCUTS = [
    { label: 'Last week', days: 7 },
    { label: 'Last 2 weeks', days: 14 },
    { label: 'Last month', months: 1 },
    { label: 'Last 2 months', months: 2 },
] as const;

const ContactLedgerDialog: React.FC<DownloadModalProps> = ({ visible, onClose, contact }) => {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [activeLabel, setActiveLabel] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const toISO = (d: Date) => d.toISOString().split('T')[0];

    // Move useQuery to component level with proper condition
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: htmlData, refetch: fetchLedger, isLoading, error } = useQuery({
        queryKey: ['ledgerHtml', contact?.id, startDate ? toISO(startDate) : null, endDate ? toISO(endDate) : null],
        queryFn: async () => {
            if (!startDate || !endDate || !contact) {
                throw new Error('Missing required parameters');
            }
            return getLedgerHtml(contact.id, {
                startDate: toISO(startDate),
                endDate: toISO(endDate)
            });
        },
        staleTime: 30 * 1000,
        enabled: false, // Don't run automatically
    });

    const getShortcutRange = (s: typeof SHORTCUTS[number]): [Date, Date] => {
        const end = new Date();
        const start = new Date();
        if ('days' in s) start.setDate(start.getDate() - s.days);
        if ('months' in s) start.setMonth(start.getMonth() - s.months);
        return [start, end];
    };

    const handleShortcut = (shortcut: typeof SHORTCUTS[number]) => {
        const [s, e] = getShortcutRange(shortcut);
        setStartDate(s);
        setEndDate(e);
        setActiveLabel(shortcut.label);
    };

    const handleDateChange = (start: Date | undefined, end: Date | undefined) => {
        setStartDate(start);
        setEndDate(end);
        setActiveLabel(''); // clear shortcut highlight when user picks manually
    };

    const handleDone = async () => {
        if (!startDate || !endDate) {
            Alert.alert('Error', 'Please select a date range');
            return;
        }

        setIsGenerating(true);

        try {
            // Fetch the ledger data
            const result = await fetchLedger();

            if (result.error) {
                throw new Error('Failed to fetch ledger data');
            }

            if (!result.data) {
                throw new Error('No data received');
            }

            // Share the PDF

            if (Platform.OS === 'android') {
                await sharePDF(result.data, contact.name);
            } else {
                await iosSharePDF(result.data, contact.name);
            }


            // Close modal on success
            onClose();
        } catch (err) {
            console.error('Error generating statement:', err);
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to generate statement. Please try again.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const isReady = !!startDate && !!endDate;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={dlStyles.overlay}>
                <TouchableOpacity style={dlStyles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={dlStyles.sheet}>
                    {/* Handle */}
                    <View style={dlStyles.handle} />

                    {/* Header */}
                    <View style={dlStyles.header}>
                        <Text style={dlStyles.title}>Download Statement</Text>
                        <TouchableOpacity style={dlStyles.closeBtn} onPress={onClose}>
                            <Text style={dlStyles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Shortcuts */}
                    <Text style={dlStyles.sectionLabel}>Quick Select</Text>
                    <View style={dlStyles.shortcutsRow}>
                        {SHORTCUTS.map((s) => (
                            <TouchableOpacity
                                key={s.label}
                                style={[dlStyles.chip, activeLabel === s.label && dlStyles.chipActive]}
                                onPress={() => handleShortcut(s)}
                            >
                                <Text style={[dlStyles.chipText, activeLabel === s.label && dlStyles.chipTextActive]}>
                                    {s.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Divider */}
                    <View style={dlStyles.divider} />

                    {/* Date Range Picker */}
                    <View style={dlStyles.dateRangeWrap}>
                        <DateRangePicker
                            label="SELECT PERIOD"
                            startDate={startDate}
                            endDate={endDate}
                            onDateChange={handleDateChange}
                            placeholder="Choose dates"
                        />
                    </View>

                    <View style={dlStyles.divider} />

                    {/* Done button */}
                    <TouchableOpacity
                        style={[dlStyles.doneBtn, (!isReady || isGenerating) && dlStyles.doneBtnDisabled]}
                        onPress={handleDone}
                        disabled={!isReady || isGenerating}
                        activeOpacity={0.85}
                    >
                        {isGenerating ? (
                            <View style={dlStyles.buttonContent}>
                                <ActivityIndicator size="small" color={colors.white} />
                                <Text style={[dlStyles.doneBtnText, dlStyles.buttonTextWithSpacing]}>
                                    Generating...
                                </Text>
                            </View>
                        ) : (
                            <Text style={dlStyles.doneBtnText}>↓  Download PDF</Text>
                        )}
                    </TouchableOpacity>

                    {/* Error Message */}
                    {error && (
                        <Text style={dlStyles.errorText}>
                            Failed to load data. Please try again.
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default ContactLedgerDialog;

const dlStyles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    backdrop: { flex: 1 },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 36,
        maxHeight: '90%', // Prevent sheet from going off screen
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray300, alignSelf: 'center', marginBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.backgroundLight, justifyContent: 'center', alignItems: 'center' },
    closeBtnText: { fontSize: 16, color: colors.gray900 },
    sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.primary, marginBottom: 10 },
    shortcutsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.backgroundLight, backgroundColor: colors.white },
    chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}1F` }, // 1F = 12% opacity in hex
    chipText: { fontSize: 13, fontWeight: '500', color: colors.gray900 },
    chipTextActive: { color: colors.primaryDark || '#0a7a30' },
    divider: { borderBottomWidth: 1, borderColor: colors.backgroundLight, marginBottom: 16 },
    doneBtn: {
        height: 50,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8
    },
    doneBtnDisabled: {
        backgroundColor: colors.gray200,
        opacity: 0.7,
    },
    doneBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.white,
    },
    dateRangeWrap: { marginBottom: 50 },
    errorText: {
        color: colors.error || '#dc2626',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTextWithSpacing: {
        marginLeft: 8,
    },
});