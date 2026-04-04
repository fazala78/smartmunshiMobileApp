import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
interface ModalFooterProps {
  onClose: () => void;
  onAddNew:() => void;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ onClose,onAddNew }) => {
  return (
    <View style={styles.footer}>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() => {
            onAddNew();
          }}>
          <Icon name="add-circle" size={20} color="#111813" />
          <Text style={styles.actionButtonText}>Add New</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={onClose}
        >
          <Icon name="cancel" size={20} color="#111813" />
          <Text style={styles.actionButtonText}>Close</Text>
        </TouchableOpacity>
      </View>


    </View>
  );
};
const styles = StyleSheet.create({
  // Footer
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,

  },
  actionButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111813',
  },
});
export default ModalFooter;