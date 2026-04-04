import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface ContactLeftProps {
    avatar?: string | null;
    name: string;
    type?: string;
}

const ContactProfile: React.FC<ContactLeftProps> = ({
    avatar,
    name,
    type,
}) => {
    const getInitialsColor = (type?: string) => {
        switch (type) {
            case 'client':
                return colors.primary;
            case 'vendor':
                return colors.warning;
            case 'walk-in':
                return colors.info;
            default:
                return '#13ec5b';
        }
    };

    const initialsText =  name.substring(0, 2).toUpperCase();
    const color = getInitialsColor(type);

    return (
        <>
            {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
                <View
                    style={[
                        styles.initialsContainer,
                        { backgroundColor: color + '33' },
                    ]}
                >
                    <Text style={[styles.initialsText, { color }]}>
                        {initialsText}
                    </Text>
                </View>
            )}
        </>


    );
};


const styles = StyleSheet.create({

    initialsContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(19, 236, 91, 0.2)',
    },


});


export default ContactProfile;
