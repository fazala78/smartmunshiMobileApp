import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

const Error: React.FC<any> = ({ refetch }) => {
    return (

        <View style={styles.center}>
            <Icon name="error-outline" size={44} color={colors.danger} />
            <Text style={styles.emptyTitle}>Failed to load cheques</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Error;

const styles = StyleSheet.create({

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primaryMuted },
    retryText: { fontSize: 13, fontWeight: '800', color: colors.primary },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        minHeight: 300,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginBottom: 16,
    },


    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#13ec5b',
        borderRadius: 12,
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
});
