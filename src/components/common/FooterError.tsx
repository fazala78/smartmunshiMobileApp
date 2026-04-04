import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme';

const FooterError: React.FC<any> = ({ setFooterError,footerError }) => {
    return (

        <View style={styles.errorBanner}>
            <Icon name="error-outline" size={15} color={colors.danger} />
            <Text style={styles.errorBannerText} numberOfLines={2}>
                {footerError}
            </Text>
            <TouchableOpacity
                onPress={() => setFooterError(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Icon name="close" size={15} color={colors.danger} />
            </TouchableOpacity>
        </View>
    );
};

export default FooterError;

const styles = StyleSheet.create({

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: colors.danger,
        lineHeight: 17,
    },
});
