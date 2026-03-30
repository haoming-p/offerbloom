import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { ROLES, MOCK_DATA } from '../data/mockData';
import { BriefcaseBusiness, Code2, TrendingUp } from 'lucide-react-native';
import { useStatus } from '../context/StatusContext';
import { ChevronRight } from 'lucide-react-native';


function RoleIcon({ role, size = 16 }: { role: string; size?: number }) {
  if (role === 'PM') return <BriefcaseBusiness size={size} color="#E8640A" />;
  if (role === 'SWE') return <Code2 size={size} color="#4A7C5E" />;
  if (role === 'DS') return <TrendingUp size={size} color="#C8A45A" />;
  return null;
}

// category progress
function CategoryProgressRow({ name, completed, total }: {
  name: string; completed: number; total: number;
}) {
  const progress = total > 0 ? completed / total : 0;

  return (
    <View style={styles.catRow}>
      <Text style={styles.catName}>{name}</Text>
      <View style={styles.catBarContainer}>
        <View style={styles.catBarBg}>
          <View style={[styles.catBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.catCount}>{completed}/{total}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { selectedRole, setSelectedRole } = useRole();
  const { getQuestionStatus } = useStatus();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const roleData = MOCK_DATA[selectedRole as keyof typeof MOCK_DATA];
  const categories = roleData?.categories ?? [];

  // READY in category 
  const categoryStats = categories.map(cat => ({
    name: cat.name,
    total: cat.questions.length,
    completed: cat.questions.filter(q => getQuestionStatus(q.id) === 'ready').length,
  }));

  // overview progress
  const totalQuestions = categoryStats.reduce((sum, c) => sum + c.total, 0);
  const totalCompleted = categoryStats.reduce((sum, c) => sum + c.completed, 0);

  // progress circle parameters
  const SIZE = 180;
  const STROKE = 12;
  const progress = totalQuestions > 0 ? totalCompleted / totalQuestions : 0;
  const degrees = progress * 360;

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🌱 OfferBloom</Text>
        <TouchableOpacity
          style={styles.roleBtn}
          onPress={() => setDropdownVisible(true)}
        >
          <RoleIcon role={selectedRole} size={15} />
          <Text style={styles.roleBtnText}>{selectedRole}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.roleTitleRow}>
            <RoleIcon role={selectedRole} size={20} />
            <Text style={styles.roleTitle}>{selectedRole} Interview Prep</Text>
          </View>
          <View style={styles.circleContainer}>
            <CircleProgress size={SIZE} stroke={STROKE} progress={progress} />
            <View style={styles.circleInner}>
              <Text style={styles.circleNum}>{totalCompleted}</Text>
              <Text style={styles.circleSlash}>/ {totalQuestions}</Text>
              <Text style={styles.circleLabel}>ready</Text>
            </View>
          </View>
        </View>

        {categoryStats.length > 0 && (
          <View style={styles.categoryCard}>
            <Text style={styles.sectionTitle}>Progress Overview</Text>
            <View style={styles.categoryList}>
              {categoryStats.map((cat, index) => (
                <View key={index}>
                  <TouchableOpacity
                    style={styles.catRow}
                    onPress={() => navigation.navigate('Category', {
                      categoryName: cat.name,
                    })}
                    activeOpacity={0.7}
                  >
                  <Text style={styles.catName}>{cat.name}</Text>
                  <View style={styles.catBarContainer}>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${(cat.completed / cat.total) * 100}%` }]} />
                    </View>
                    <Text style={styles.catCount}>{cat.completed}/{cat.total}</Text>
                  </View>
                  <ChevronRight size={16} color="#D0D5D2" />
                </TouchableOpacity>
                {index < categoryStats.length - 1 && <View style={styles.catDivider} />}
              </View>
            ))}
          </View>
        </View>
      )}

        {categories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No questions yet for this role.</Text>
          </View>
        )}

      </ScrollView>

      {/* role dropdown modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Role</Text>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.dropdownItem, role === selectedRole && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedRole(role);
                  setDropdownVisible(false);
                }}
              >
                <View style={styles.dropdownItemLeft}>
                  <RoleIcon role={role} size={15} />
                  <Text style={[
                    styles.dropdownItemText,
                    role === selectedRole && styles.dropdownItemTextActive,
                  ]}>
                    {role}
                  </Text>
                </View>
                {role === selectedRole && <Text style={{ color: '#4A7C5E' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// progress circle
function CircleProgress({ size, stroke, progress }: {
  size: number; stroke: number; progress: number;
}) {
  const degrees = progress * 360;

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: '#E8E8E8',
      }} />
      {/* progress arc */}
      <ArcProgress size={size} stroke={stroke} degrees={degrees} />
    </View>
  );
}

function ArcProgress({ size, stroke, degrees }: {
  size: number; stroke: number; degrees: number;
}) {
  const color = '#4A7C5E';
  const rightDegrees = Math.min(degrees, 180);
  const leftDegrees = Math.max(degrees - 180, 0);

  const borderStyle = {
    position: 'absolute' as const,
    width: size, height: size,
    borderRadius: size / 2,
    borderWidth: stroke,
  };

  return (
    <>
      <View style={{ position: 'absolute', width: size / 2, height: size, right: 0, overflow: 'hidden' }}>
        <View style={{
          ...borderStyle,
          right: 0,
          borderColor: 'transparent',
          borderTopColor: rightDegrees > 0 ? color : 'transparent',
          borderRightColor: rightDegrees > 90 ? color : 'transparent',
          transform: [{ rotate: `${rightDegrees / 2 - 45}deg` }],
        }} />
      </View>
      {degrees > 180 && (
        <View style={{ position: 'absolute', width: size / 2, height: size, left: 0, overflow: 'hidden' }}>
          <View style={{
            ...borderStyle,
            left: 0,
            borderColor: 'transparent',
            borderBottomColor: leftDegrees > 0 ? color : 'transparent',
            borderLeftColor: leftDegrees > 90 ? color : 'transparent',
            transform: [{ rotate: `${leftDegrees / 2 - 45}deg` }],
          }} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C3A2A',
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  chevron: {
    fontSize: 12,
    color: '#4A7C5E',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24,
    alignItems: 'center',
    flexGrow: 1,
  },
  topSection: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 40,
  paddingVertical: 12,
  paddingTop: 20,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  circleContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    position: 'absolute',
    alignItems: 'center',
  },
  circleNum: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1C3A2A',
    lineHeight: 52,
  },
  circleSlash: {
    fontSize: 18,
    color: '#4A7C5E',
    fontWeight: '500',
  },
  circleLabel: {
    fontSize: 12,
    color: '#9BA5A0',
    marginTop: 2,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9BA5A0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoryList: {
    gap: 0,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  catName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C3A2A',
    width: 100,
  },
  catBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0EDE6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    backgroundColor: '#4A7C5E',
    borderRadius: 3,
  },
  catCount: {
    fontSize: 12,
    color: '#9BA5A0',
    fontWeight: '500',
    width: 28,
    textAlign: 'right',
  },
  catDivider: {
    height: 1,
    backgroundColor: '#F0EDE6',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#9BA5A0',
  },
  // Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 110,
    paddingRight: 24,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9BA5A0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#F0F7F3',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1C3A2A',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#4A7C5E',
  },
});