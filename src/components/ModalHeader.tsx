import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
    onShare?: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose, onShare }) => {
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
            {onShare ? (
                <TouchableOpacity onPress={onShare} style={styles.iconButton} activeOpacity={0.7}>
                    <Icon name="share" size={20} color="#111813" />
                </TouchableOpacity>
            ) : (
                <View style={styles.iconButton} />
            )}

        </View>
    );
};
const styles = StyleSheet.create({
    // Header with Close Button


    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    iconButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    closeIcon: { fontSize: 24, color: '#111813', fontWeight: '300' },
    headerCenter: { flex: 1, alignItems: 'center' },
    invoiceNumber: {
        ...typography.heading1,  // ← spread it in
        color: '#111813',
    },

});
export default ModalHeader;