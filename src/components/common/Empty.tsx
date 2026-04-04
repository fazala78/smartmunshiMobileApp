import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

const Empty: React.FC<any> = ({ title }) => {
    return (

        <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
                <Icon name="description" size={40} color={colors.gray400} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySub}>Try changing the filter or date</Text>
        </View>
    );
};

export default Empty;

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 10, gap: 12 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
    emptySub: { fontSize: 13, color: '#9ca3af' },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f4f2', alignItems: 'center', justifyContent: 'center' },
});
