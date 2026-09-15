import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
    onShare?: () => void;
    onPrint?: () => void;
    printing?: boolean;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose, onShare, onPrint, printing }) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
                <Text style={styles.invoiceNumber}>
                    {title}
                </Text>
            </View>
            <View style={styles.headerActions}>
                {onPrint && (
                    <TouchableOpacity
                        onPress={onPrint}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        disabled={printing}
                    >
                        {printing ? (
                            <ActivityIndicator size="small" color="#111813" />
                        ) : (
                            <Icon name="print" size={20} color="#111813" />
                        )}
                    </TouchableOpacity>
                )}
                {onShare ? (
                    <TouchableOpacity onPress={onShare} style={styles.iconButton} activeOpacity={0.7}>
                        <Icon name="share" size={20} color="#111813" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.iconButton} />
                )}
            </View>
        </View>
    );
};
const styles = StyleSheet.create({
    // Header with Close Button


    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gray100,
        justifyContent: 'center',
        alignItems: 'center',
      },
    closeIcon: { fontSize: 24, color: '#111813', fontWeight: '300' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerActions: { flexDirection: 'row', gap: 8 },
    invoiceNumber: {
        ...typography.heading1,  // ← spread it in
        color: '#111813',
    },

});
export default ModalHeader;