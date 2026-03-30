import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRole } from '../context/RoleContext';
import { useStatus } from '../context/StatusContext';
import { MOCK_DATA } from '../data/mockData';
import { BriefcaseBusiness, Code2, TrendingUp, Shuffle, Zap, ChevronRight } from 'lucide-react-native';

function RoleIcon({ role, size = 16 }: { role: string; size?: number }) {
  if (role === 'PM') return <BriefcaseBusiness size={size} color="#E8640A" />;
  if (role === 'SWE') return <Code2 size={size} color="#4A7C5E" />;
  if (role === 'DS') return <TrendingUp size={size} color="#C8A45A" />;
  return null;
}

export default function PracticeScreen({ navigation }: any) {
  const { selectedRole } = useRole();
  const roleData = MOCK_DATA[selectedRole as keyof typeof MOCK_DATA];
  const categories = roleData?.categories ?? [];
  const { getQuestionStatus } = useStatus();

  // all questions in a category
  const allQuestions = categories.flatMap(cat =>
    cat.questions.map(q => ({ ...q, categoryName: cat.name }))
  );

  // questions need practice
  const needsPractice = allQuestions.filter(q => getQuestionStatus(q.id) === 'needs_practice');

  // random question from need practice pool
  function getRandomQuestion() {
    const pool = needsPractice.length > 0 ? needsPractice : allQuestions;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startRandom() {
    const q = getRandomQuestion();
    if (q) navigation.navigate('PracticeSession', { question: q });
  }

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* random question card */}
        <TouchableOpacity style={styles.randomCard} onPress={startRandom} activeOpacity={0.85}>
          <View style={styles.randomCardLeft}>
            <Shuffle size={24} color="#FFFFFF" />
            <View>
              <Text style={styles.randomCardTitle}>Random Question</Text>
              <Text style={styles.randomCardSub}>
                {needsPractice.length > 0
                  ? `${needsPractice.length} questions need practice`
                  : 'All questions practiced!'}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* needs practice */}
        {needsPractice.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Zap size={14} color="#E8640A" />
              <Text style={styles.sectionTitle}>Needs Practice</Text>
            </View>
            <View style={styles.questionList}>
              {needsPractice.slice(0, 5).map((question, index) => {
                const isLast = index === Math.min(needsPractice.length, 5) - 1;
                return (
                  <TouchableOpacity
                    key={question.id}
                    style={[styles.questionItem, isLast && styles.questionItemLast]}
                    onPress={() => navigation.navigate('PracticeSession', { question })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.questionLeft}>
                      <Text style={styles.categoryTag}>{question.categoryName}</Text>
                      <Text style={styles.questionText}>{question.text}</Text>
                    </View>
                    <ChevronRight size={16} color="#D0D5D2" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  randomCard: {
    backgroundColor: '#1C3A2A',
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  randomCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  randomCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  randomCardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
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
    gap: 4,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A7C5E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 14,
    color: '#1C3A2A',
    lineHeight: 20,
  },
});