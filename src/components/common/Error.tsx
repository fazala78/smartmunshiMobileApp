import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const Error: React.FC<any> = ({ onClose }) => {
    return (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load transaction</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onClose}>
                <Text style={styles.retryButtonText}>Close</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Error;

const styles = StyleSheet.create({


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
