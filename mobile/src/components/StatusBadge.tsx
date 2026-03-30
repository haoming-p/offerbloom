import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useState } from 'react';
import { QuestionStatus } from '../data/mockData';

// status badge component
export const STATUS_CONFIG = {
  needs_practice: {
    label: 'Needs Practice',
    color: '#E8640A',
    bg: '#FFF0E6',
    dot: '#E8640A',
  },
  ready: {
    label: 'Ready',
    color: '#4A7C5E',
    bg: '#F0F7F3',
    dot: '#4A7C5E',
  },
  skip: {
    label: 'Skip',
    color: '#9BA5A0',
    bg: '#F5F5F5',
    dot: '#9BA5A0',
  },
};

type Props = {
  status: QuestionStatus;
  onStatusChange?: (newStatus: QuestionStatus) => void;
  editable?: boolean;
};

export default function StatusBadge({ status, onStatusChange, editable = false }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const config = STATUS_CONFIG[status];

  // not editable badge
  if (!editable) {
    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  // editable badge
  return (
    <>
      <TouchableOpacity
        style={[styles.badge, styles.badgeEditable, { backgroundColor: config.bg }]}
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        <Text style={[styles.chevron, { color: config.color }]}>▾</Text>
      </TouchableOpacity>

      {/* Status menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Set Status</Text>
            {(Object.keys(STATUS_CONFIG) as QuestionStatus[]).map(s => {
              const c = STATUS_CONFIG[s];
              const isActive = s === status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => {
                    onStatusChange?.(s);
                    setMenuVisible(false);
                  }}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.dot, { backgroundColor: c.dot }]} />
                    <Text style={[styles.menuItemText, { color: c.color }]}>{c.label}</Text>
                  </View>
                  {isActive && <Text style={{ color: c.color }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  badgeEditable: {
    paddingRight: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 9,
    marginLeft: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9BA5A0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: '#F5F0E8',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
});