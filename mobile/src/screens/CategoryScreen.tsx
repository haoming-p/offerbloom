import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { MOCK_DATA } from '../data/mockData';
import { BriefcaseBusiness, Code2, TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import StatusBadge from '../components/StatusBadge';
import { useStatus } from '../context/StatusContext';


function RoleIcon({ role, size = 16 }: { role: string; size?: number }) {
  if (role === 'PM') return <BriefcaseBusiness size={size} color="#E8640A" />;
  if (role === 'SWE') return <Code2 size={size} color="#4A7C5E" />;
  if (role === 'DS') return <TrendingUp size={size} color="#C8A45A" />;
  return null;
}

// RoleIcon component
// TODO: make shared component later
export default function CategoryScreen({ route, navigation }: any) {
  const { categoryName } = route.params;
  const { selectedRole } = useRole();
  const { getQuestionStatus, setQuestionStatus } = useStatus();

  const roleData = MOCK_DATA[selectedRole as keyof typeof MOCK_DATA];
  const categories = roleData?.categories ?? [];

  // current selected category
  const [selectedCategory, setSelectedCategory] = useState(categoryName);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [addQuestionVisible, setAddQuestionVisible] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');

  // new added questions（save in local state）
  const [customQuestions, setCustomQuestions] = useState<Record<string, { id: string; text: string }[]>>({});

  const currentCategory = categories.find(c => c.name === selectedCategory);
  const customQs = customQuestions[selectedCategory] ?? [];
  const allQuestions = [...(currentCategory?.questions ?? []), ...customQs];

  function addQuestion() {
    if (!newQuestionText.trim()) return;
    const newQ = {
      id: `custom-${Date.now()}`,
      text: newQuestionText.trim(),
      answers: [], 
      status: 'needs_practice' as const,  // new questions default to 'needs_practice'
    };
    setCustomQuestions(prev => ({
      ...prev,
      [selectedCategory]: [...(prev[selectedCategory] ?? []), newQ],
    }));
    setNewQuestionText('');
    setAddQuestionVisible(false);
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        {/* back button + category dropdown */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1C3A2A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryDropdownBtn}
          onPress={() => setCategoryDropdownVisible(true)}
        >
          <Text style={styles.categoryDropdownText}>{selectedCategory}</Text>
          <ChevronDown size={16} color="#4A7C5E" />
        </TouchableOpacity>

        {/* role badge */}
        <View style={styles.roleBadge}>
          <RoleIcon role={selectedRole} size={14} />
          <Text style={styles.roleBadgeText}>{selectedRole}</Text>
        </View>
      </View>

      {/* question list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {allQuestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No questions yet.</Text>
            <Text style={styles.emptySubText}>Tap + Question to add one.</Text>
          </View>
        ) : (
          <View style={styles.questionList}>
            {allQuestions.map((question, index) => {
              const isLast = index === allQuestions.length - 1;
              const answers = Array.isArray((question as any).answers) ? (question as any).answers : [];
              const versionCount = answers.length;
              
              return (
                <TouchableOpacity
                  key={question.id}
                  style={[styles.questionItem, isLast && styles.questionItemLast]}
                  onPress={() => navigation.navigate('PracticeSession', { question })}
                  activeOpacity={0.7}
                >
                  <View style={styles.questionContent}>
                    <Text style={styles.questionText}>{question.text}</Text>

                    {/* tags row */}
                    <View style={styles.tagsRow}>
                      {/* version tag */}
                      {versionCount > 0 && (
                        <View style={styles.versionTag}>
                          <Text style={styles.versionTagText}>
                            {versionCount} {versionCount === 1 ? 'ver.' : 'ver.'}
                          </Text>
                        </View>
                      )}
                      {/* status badge */}
                      <StatusBadge
                        status={getQuestionStatus(question.id)}
                        onStatusChange={(newStatus) => setQuestionStatus(question.id, newStatus)}
                        editable
                      />
                    </View>
                  </View>
                  <ChevronRight size={16} color="#D0D5D2" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* + Question button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addQuestionBtn}
          onPress={() => setAddQuestionVisible(true)}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addQuestionBtnText}>Question</Text>
        </TouchableOpacity>
      </View>

      {/* category dropdown modal */}
      <Modal
        visible={categoryDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setCategoryDropdownVisible(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Category</Text>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.dropdownItem, cat.name === selectedCategory && styles.dropdownItemActive]}
                onPress={() => {
                  setSelectedCategory(cat.name);
                  setCategoryDropdownVisible(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  cat.name === selectedCategory && styles.dropdownItemTextActive,
                ]}>
                  {cat.name}
                </Text>
                {cat.name === selectedCategory && <Text style={{ color: '#4A7C5E' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add question modal */}
      <Modal
        visible={addQuestionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAddQuestionVisible(false);
          setNewQuestionText('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => {
            setAddQuestionVisible(false);
            setNewQuestionText(''); 
          }}

        >
          <TouchableOpacity activeOpacity={1} style={styles.addQuestionModal}>
            <View style={styles.addQuestionHeader}>
              <Text style={styles.addQuestionTitle}>New Question</Text>
                <TouchableOpacity onPress={() => {
                  setAddQuestionVisible(false);
                  setNewQuestionText('');
                }}>
                  <X size={20} color="#9BA5A0" />
                </TouchableOpacity>
              </View>
              <Text style={styles.addQuestionLabel}>Category: {selectedCategory}</Text>
              <TextInput
                style={styles.addQuestionInput}
                placeholder="Type your question here..."
                placeholderTextColor="#B0B8B4"
                multiline
                value={newQuestionText}
                onChangeText={setNewQuestionText}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.addQuestionConfirm, !newQuestionText.trim() && styles.addQuestionConfirmDisabled]}
                onPress={addQuestion}
                disabled={!newQuestionText.trim()}
              >
                <Text style={styles.addQuestionConfirmText}>Add Question</Text>
              </TouchableOpacity>
            </TouchableOpacity> 
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDropdownText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C3A2A',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9BA5A0',
  },
  emptySubText: {
    fontSize: 13,
    color: '#B0B8B4',
  },
  questionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE6',
    gap: 12,
  },
  questionItemLast: {
    borderBottomWidth: 0,
  },
  questionContent: {
    flex: 1,
    gap: 8,
  },
  questionText: {
    fontSize: 14,
    color: '#1C3A2A',
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  versionTag: {
    backgroundColor: '#EAE6DE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9BA5A0',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: '#F5F0E8',
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C3A2A',
    paddingVertical: 16,
    borderRadius: 100,
  },
  addQuestionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    minWidth: 240,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '700',
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
  dropdownItemText: {
    fontSize: 15,
    color: '#1C3A2A',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#4A7C5E',
  },
  // Add Question Modal
  addQuestionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  addQuestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addQuestionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C3A2A',
  },
  addQuestionLabel: {
    fontSize: 13,
    color: '#9BA5A0',
    marginTop: -8,
  },
  addQuestionInput: {
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1C3A2A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addQuestionConfirm: {
    backgroundColor: '#1C3A2A',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
  },
  addQuestionConfirmDisabled: {
    backgroundColor: '#D0D5D2',
  },
  addQuestionConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});