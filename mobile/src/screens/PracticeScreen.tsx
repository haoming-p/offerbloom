import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { MOCK_DATA } from '../data/mockData';
import { BriefcaseBusiness, Code2, TrendingUp, Search, ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react-native';

function RoleIcon({ role, size = 16 }: { role: string; size?: number }) {
  if (role === 'PM') return <BriefcaseBusiness size={size} color="#E8640A" />;
  if (role === 'SWE') return <Code2 size={size} color="#4A7C5E" />;
  if (role === 'DS') return <TrendingUp size={size} color="#C8A45A" />;
  return null;
}

// status tag of each question item
function StatusTag({ answers }: { answers: any[] }) {
  if (answers.length === 0) {
    return (
      <View style={[styles.tag, styles.tagNeedsPractice]}>
        <Text style={[styles.tagText, styles.tagTextOrange]}>Needs Practice</Text>
      </View>
    );
  }
  return (
    <View style={[styles.tag, styles.tagReady]}>
      <Text style={[styles.tagText, styles.tagTextGreen]}>Ready</Text>
    </View>
  );
}

export default function PracticeScreen({ navigation }: any) {
  const { selectedRole } = useRole();
  const roleData = MOCK_DATA[selectedRole as keyof typeof MOCK_DATA];
  const categories = roleData?.categories ?? [];

  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // all questions in a category
  const allQuestions = categories.flatMap(cat =>
    cat.questions.map(q => ({ ...q, categoryName: cat.name }))
  );

  // filter questions based on search text
  const filteredQuestions = searchText.trim() === ''
    ? allQuestions
    : allQuestions.filter(q =>
        q.text.toLowerCase().includes(searchText.toLowerCase()) ||
        q.categoryName.toLowerCase().includes(searchText.toLowerCase())
      );

  // regroup by category after filtering
  const groupedQuestions = categories.map(cat => ({
    ...cat,
    questions: filteredQuestions.filter(q => q.categoryName === cat.name),
  })).filter(cat => cat.questions.length > 0);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Practice</Text>
        <View style={styles.roleBadge}>
          <RoleIcon role={selectedRole} size={14} />
          <Text style={styles.roleBadgeText}>{selectedRole}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Search size={16} color="#9BA5A0" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search questions..."
            placeholderTextColor="#B0B8B4"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {groupedQuestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No questions found.</Text>
          </View>
        ) : (
          groupedQuestions.map(category => (
            <View key={category.id} style={styles.categoryBlock}>

              {/* category */}
              <Text style={styles.categoryName}>{category.name}</Text>

              {/* questions list */}
              <View style={styles.questionList}>
                {category.questions.map((question, index) => {
                  const isLast = index === category.questions.length - 1;
                  return (
                    <TouchableOpacity
                      key={question.id}
                      style={[styles.questionItem, isLast && styles.questionItemLast]}
                      onPress={() => navigation.navigate('PracticeSession', { question })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.questionLeft}>
                        <StatusTag answers={question.answers} />
                        <Text style={styles.questionText}>{question.text}</Text>

                        {/* last practice time（mock） */}
                        {question.answers.length > 0 && (
                          <View style={styles.lastPracticed}>
                            <Clock size={11} color="#9BA5A0" />
                            <Text style={styles.lastPracticedText}>Last practiced 2d ago</Text>
                          </View>
                        )}
                      </View>
                      <ChevronRight size={16} color="#D0D5D2" />
                    </TouchableOpacity>
                  );
                })}
              </View>

            </View>
          ))
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C3A2A',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchBarFocused: {
    borderColor: '#4A7C5E',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C3A2A',
  },
  clearBtn: {
    fontSize: 13,
    color: '#9BA5A0',
    paddingHorizontal: 4,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#9BA5A0',
  },
  categoryBlock: {
    gap: 10,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9BA5A0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  questionLeft: {
    flex: 1,
    gap: 6,
  },
  questionText: {
    fontSize: 14,
    color: '#1C3A2A',
    lineHeight: 20,
  },
  lastPracticed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastPracticedText: {
    fontSize: 11,
    color: '#9BA5A0',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagNeedsPractice: {
    backgroundColor: '#FFF0E6',
  },
  tagReady: {
    backgroundColor: '#F0F7F3',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagTextOrange: {
    color: '#E8640A',
  },
  tagTextGreen: {
    color: '#4A7C5E',
  },
});