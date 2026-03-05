import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            {/* Spacer to keep title centered */}
            <View style={styles.headerSpacer} />
        </View>
    );
};
const styles = StyleSheet.create({
    // Header with Close Button

    closeButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },

    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#111813',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    headerSpacer: {
        width: 36,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    closeIcon: {
        fontSize: 24,
        color: '#111813',
        fontWeight: '300',
    },

});
export default ModalHeader;