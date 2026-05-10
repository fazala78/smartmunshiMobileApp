// steps/LotSummaryStep.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LotFormData } from '../../types/assembly';
import { colors, spacing } from '../../theme';

interface Step4Props {
  formData: LotFormData;
  totalSteps: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Icon name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LotSummaryStep({ formData }: Step4Props) {
  const {
    lot_number,
    source,
    cart,
    mixed_cart,
    manufacturer,
    process,
    contact,
    invoice_number,
    discount,
    shipping,
    date,
    remarks,
  } = formData;

  const isPurchase = source === 'purchase';
  const cartItems = isPurchase ? mixed_cart : cart;
  const hasShipping =
    shipping?.shipping_amount !== null &&
    shipping?.shipping_amount !== undefined &&
    shipping.shipping_amount > 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Header ── */}
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Final Review</Text>
        <Text style={styles.title}>Overview</Text>
        <Text style={styles.subtitle}>
          Review your production order before submitting.
        </Text>
      </View>

      {/* ══════════════════════════════════════════════════
          CARD 1 — Allocation
      ══════════════════════════════════════════════════ */}
      <View style={styles.card}>
        <SectionHeader icon="assignment" label="Allocation" />
        <Row label="Lot Number" value={lot_number || '—'} />
        <Row
          label="Source"
          value={isPurchase ? 'New Purchase' : 'From Stock'}
        />
        {date && (
          <Row
            label="Date"
            value={new Date(date).toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          />
        )}
      </View>

      {/* ══════════════════════════════════════════════════
          CARD 2 — Purchase detail  (purchase only)
      ══════════════════════════════════════════════════ */}
      {isPurchase && (
        <View style={styles.card}>
          <SectionHeader icon="shopping-cart" label="Purchase" />
          <Row label="Supplier" value={contact?.name || '—'} />
          <Row label="Invoice #" value={invoice_number || '—'} />
          {discount ? (
            <Row label="Deduction" value={`${discount}`} />
          ) : null}

          {cartItems && cartItems.length > 0 && (
            <>
              <Divider />
              <SectionHeader icon="inventory-2" label="Cart Items" />
              {cartItems.map((item, index) => (
                <Row
                  key={index}
                  label={item.name}
                  value={item.quantity ? `${item.quantity} units` : '—'}
                />
              ))}
            </>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          CARD 3 — Stock Issue  (stock only)
      ══════════════════════════════════════════════════ */}
      {!isPurchase && (
        <View style={styles.card}>
          <SectionHeader icon="store" label="Stock Issue" />
          {cartItems && cartItems.length > 0 ? (
            cartItems.map((item, index) => (
              <Row
                key={index}
                label={item.name}
                value={item.quantity ? `${item.quantity} units` : '—'}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No items added.</Text>
          )}
        </View>
      )}
       {/* ══════════════════════════════════════════════════
          CARD 5 — Production
      ══════════════════════════════════════════════════ */}
        {manufacturer && (
      <View style={styles.card}>
        <SectionHeader icon="precision-manufacturing" label="Production" />
        <Row label="Manufacturer" value={manufacturer?.name || '—'} />
        {process &&  (
          <Row label="Processes" value={process.name} />
        )}
        {remarks ? <Row label="Remarks" value={remarks} /> : null}
      </View>
        )}

      {/* ══════════════════════════════════════════════════
          CARD 4 — Shipping  (only when amount > 0)
      ══════════════════════════════════════════════════ */}
      {hasShipping && (
        <View style={styles.card}>
          <SectionHeader icon="local-shipping" label="Shipping" />
          <Row
            label="Cost"
            value={`${shipping.shipping_amount}`}
          />
          {shipping.shipper && (
            <Row label="Shipper" value={String(shipping.shipper.name)} />
          )}
          {shipping.shipping_ticket ? (
            <Row label="Tracking #" value={shipping.shipping_ticket} />
          ) : null}
          {shipping.remarks ? (
            <Row label="Remarks" value={shipping.remarks} />
          ) : null}
        </View>
      )}

     

      {/* ── Ready badge ── */}
      <View style={styles.readyBadge}>
        <Icon name="check-circle" size={16} color={colors.primary} />
        <Text style={styles.readyText}>Ready to submit</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: 12,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerBlock: {
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 38,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 2,
  },

  // ── Section header inside card ───────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
    marginTop: 2,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },

  // ── Row ──────────────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },

  // ── Divider ──────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
  },

  // ── Ready badge ──────────────────────────────────────────────────────────────
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginTop: 4,
  },
  readyText: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 0.5,
  },
});