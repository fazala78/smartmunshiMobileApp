
// ─── Confirmation Dialog ──────────────────────────────────────────────────────

import { ActivityIndicator, Modal,Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Inventory } from "../../types/Inventory";
import Icon from "react-native-vector-icons/MaterialIcons";
import SwipeButton from 'rn-swipe-button';
import { colors } from "../../theme/colors";
import TransactionSummary from "../../components/TransactionSummary";
import FooterError from "../../components/common/FooterError";

interface ConfirmDialogProps {
  visible: boolean;
  payload: Inventory;
  loading: boolean;
  footerError: string | null;
  setFooterError: (v: string | null) => void;
  onSwipeSuccess: () => void;
  onDismiss: () => void;
  resetSwipe: React.MutableRefObject<(() => void) | null>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  payload,
  loading,
  footerError,
  setFooterError,
  onSwipeSuccess,
  onDismiss,
  resetSwipe,
}) => {
  const ThumbIcon = () =>
    loading
      ? <ActivityIndicator size="small" color="#fff" />
      : <Icon name="arrow-forward" size={20} color="#fff" />;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      {/*
       * overlay    → flex:1 + justifyContent:'flex-end'  anchors sheet to bottom
       * sheet      → height:'92%'  ← change this ONE value to resize
       * sheetInner → flex:1  fills sheet so ScrollView + footer layout correctly
       */}
      <Pressable style={ds.overlay} onPress={() => { if (!loading) onDismiss(); }}>
        <View style={ds.sheet}>
          <Pressable style={ds.sheetInner} onPress={() => {}}>

            {/* Header */}
            <View style={ds.header}>
              <View style={ds.handleBar} />
              <View style={ds.headerRow}>
                <View>
                  <Text style={ds.title}>Confirm Checkout</Text>
                  <Text style={ds.subtitle}>Review your order before confirming</Text>
                </View>
                <TouchableOpacity
                  onPress={onDismiss}
                  style={ds.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={loading}
                >
                  <Icon name="close" size={20} color={colors.gray500} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable body */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={ds.body}
            >
              {/* Customer */}
              {payload.contact && (
                <View style={ds.customerChip}>
                  <Icon name="person-outline" size={15} color={colors.primary} />
                  <Text style={ds.customerName} numberOfLines={1}>
                    {payload.contact.name}
                  </Text>
                </View>
              )}
              {/* Full transaction breakdown */}
              <TransactionSummary payload={payload} />
            </ScrollView>

            {/* Footer — error + swipe */}
            <View style={ds.footer}>
              {footerError && (
                <FooterError
                  setFooterError={setFooterError}
                  footerError={footerError}
                />
              )}
              <SwipeButton
                title={loading ? 'Processing…' : 'Slide to confirm'}
                thumbIconComponent={ThumbIcon}
                railBackgroundColor={colors.primaryLight}
                railBorderColor={colors.primaryLight}
                railFillBackgroundColor={colors.primary}
                thumbIconBackgroundColor={loading ? colors.gray400 : colors.primary}
                thumbIconBorderColor={loading ? colors.gray400 : colors.primary}
                titleColor={colors.backgroundDark}
                titleFontSize={13}
                height={52}
                swipeSuccessThreshold={70}
                disabled={loading}
                onSwipeSuccess={onSwipeSuccess}
                forceReset={(reset: () => void) => { resetSwipe.current = reset; }}
              />
            </View>

          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};
const ds = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '92%',               // ← change this one value to resize
  },
  sheetInner: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gray200,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.gray800,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
    gap: 16,
    paddingBottom: 8,
  },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentsBlock: {
    gap: 8,
    backgroundColor: colors.backgroundLight,
    borderRadius: 14,
    padding: 14,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.gray400,
    marginBottom: 2,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    paddingLeft: 10,
    borderRadius: 4,
  },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    flex: 1,
  },
  payBadgeText: { fontSize: 12, fontWeight: '700' },
  payAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.gray800,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 10,
  },
});