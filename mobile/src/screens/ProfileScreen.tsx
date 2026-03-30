import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, User, Bell, Shield, HelpCircle, LogOut, Mail, BookOpen } from 'lucide-react-native';

function SettingItem({
  icon, label, value, onPress, danger = false
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
          {icon}
        </View>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {!danger && <ChevronRight size={16} color="#D0D5D2" />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: any) {
  return (
    <View style={styles.container}>

      {/* header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* user card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>B</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Bobo🐶</Text>
            <Text style={styles.userEmail}>bobo@offerbloom.com</Text>
          </View>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* account settings*/}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<User size={16} color="#4A7C5E" />}
              label="Personal Info"
              onPress={() => {}}
            />
            <SettingItem
              icon={<Mail size={16} color="#4A7C5E" />}
              label="Email"
              onPress={() => {}}
            />
            <SettingItem
              icon={<Shield size={16} color="#4A7C5E" />}
              label="Password"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<BookOpen size={16} color="#C8A45A" />}
              label="Default Role"
              value="PM"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* log out */}
        <View style={styles.section}>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<LogOut size={16} color="#D94F4F" />}
              label="Log Out"
              onPress={() => navigation.replace('Login')}
              danger
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C3A2A',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1C3A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F5F0E8',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C3A2A',
  },
  userEmail: {
    fontSize: 13,
    color: '#9BA5A0',
  },
  editProfileBtn: {
    borderWidth: 1,
    borderColor: '#D0D5D2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editProfileBtnText: {
    fontSize: 13,
    color: '#1C3A2A',
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9BA5A0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  settingGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: '#FFF0F0',
  },
  settingLabel: {
    fontSize: 15,
    color: '#1C3A2A',
    fontWeight: '500',
  },
  settingLabelDanger: {
    color: '#D94F4F',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 13,
    color: '#9BA5A0',
  },
});
