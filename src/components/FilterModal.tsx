import React from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { colors } from '../theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterModalProps {
    visible:  boolean;
    title?:   string;
    onClose:  () => void;
    onReset?: () => void;
    onApply?: () => void;
    children: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ─── Component ────────────────────────────────────────────────────────────────

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    title = 'Filters',
    onClose,
    onReset,
    onApply,
    children,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={styles.kavWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalOverlay}>

                    {/* Tappable backdrop */}
                    <TouchableOpacity
                        style={styles.modalBackground}
                        activeOpacity={1}
                        onPress={onClose}
                    />

                    {/*
                     * Sheet height is fixed at 90% of screen height.
                     * This is the key fix — without a concrete height the
                     * ScrollView has nothing to measure against and renders
                     * nothing. Using a pixel value (not a percentage string)
                     * avoids the RN percentage-in-style bug on some versions.
                     */}
                    <View style={styles.bottomSheet}>

                        {/* Drag handle */}
                        <View style={styles.dragHandleWrap}>
                            <View style={styles.dragHandle} />
                        </View>

                        {/* Title row with close button */}
                        <View style={styles.titleRow}>
                            <Text style={styles.sheetTitle}>{title}</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={onClose}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Icon name="close" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable content — grows to fill space between title and buttons */}
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {children}
                        </ScrollView>

                        {/* Action buttons — always pinned at bottom */}
                        {(onReset || onApply) && (
                            <View style={styles.actionButtons}>
                                {onReset && (
                                    <TouchableOpacity
                                        style={styles.resetButton}
                                        onPress={onReset}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.resetButtonText}>Reset</Text>
                                    </TouchableOpacity>
                                )}
                                {onApply && (
                                    <TouchableOpacity
                                        style={styles.applyButton}
                                        onPress={onApply}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default FilterModal;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    kavWrapper: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bottomSheet: {
        backgroundColor:      colors.white,
        borderTopLeftRadius:  20,
        borderTopRightRadius: 20,
        // Concrete pixel height — percentage strings are unreliable in RN
        // for nested modal layouts and cause content to collapse.
        height:               SCREEN_HEIGHT * 0.5,
        paddingHorizontal:    16,
        paddingBottom:        Platform.OS === 'ios' ? 32 : 16,
    },
    dragHandleWrap: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragHandle: {
        width:           40,
        height:          4,
        backgroundColor: '#e5e7eb',
        borderRadius:    2,
    },
    titleRow: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   16,
    },
    sheetTitle: {
        fontSize:   18,
        fontWeight: 'bold',
        color:      colors.textPrimary,
    },
    closeButton: {
        width:           32,
        height:          32,
        borderRadius:    16,
        backgroundColor: colors.backgroundLight,
        alignItems:      'center',
        justifyContent:  'center',
    },
    scrollContent: {
        paddingBottom: 16,
    },
    actionButtons: {
        flexDirection:   'row',
        gap:             12,
        paddingTop:      16,
        paddingBottom:   4,
        borderTopWidth:  1,
        borderTopColor:  '#f3f4f6',
    },
    resetButton: {
        flex:            1,
        paddingVertical: 14,
        borderRadius:    12,
        backgroundColor: colors.backgroundLight,
        alignItems:      'center',
    },
    resetButtonText: {
        color:      colors.textPrimary,
        fontWeight: '600',
        fontSize:   14,
    },
    applyButton: {
        flex:            2,
        paddingVertical: 14,
        borderRadius:    12,
        backgroundColor: colors.primary,
        alignItems:      'center',
    },
    applyButtonText: {
        color:      colors.white,
        fontWeight: '700',
        fontSize:   14,
    },
});