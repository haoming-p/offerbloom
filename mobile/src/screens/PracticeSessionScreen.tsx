import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';
import { ChevronLeft, Mic, MicOff, Pencil, Square, RotateCcw, Save, ChevronDown, ChevronUp, Bot, ChevronRight } from 'lucide-react-native';
import StatusBadge from '../components/StatusBadge';
import { useStatus } from '../context/StatusContext';

type Mode = 'idle' | 'recording' | 'stopped' | 'typing';

export default function PracticeSessionScreen({ route, navigation }: any) {
  const { question } = route.params;
  const [mode, setMode] = useState<Mode>('idle');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showSavedAnswers, setShowSavedAnswers] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const { getQuestionStatus, setQuestionStatus } = useStatus();

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1C3A2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <StatusBadge
            status={getQuestionStatus(question.id)}
            onStatusChange={(newStatus) => setQuestionStatus(question.id, newStatus)}
            editable
          />
        </View>

        {/* answer mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode !== 'typing' && styles.modeBtnActive]}
            onPress={() => setMode('idle')}
          >
            <Mic size={15} color={mode !== 'typing' ? '#FFFFFF' : '#9BA5A0'} />
            <Text style={[styles.modeBtnText, mode !== 'typing' && styles.modeBtnTextActive]}>
              Voice
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'typing' && styles.modeBtnActive]}
            onPress={() => setMode('typing')}
          >
           <Pencil size={15} color={mode === 'typing' ? '#FFFFFF' : '#9BA5A0'} />
           <Text style={[styles.modeBtnText, mode === 'typing' && styles.modeBtnTextActive]}>
            Type
            </Text>
          </TouchableOpacity>
        </View>

        {/* Voice Mode */}
        {mode !== 'typing' && (
          <View style={styles.voiceCard}>
            {/* recording status text */}
            <Text style={styles.voiceStatus}>
              {mode === 'idle' && 'Tap the mic to start'}
              {mode === 'recording' && 'Recording...'}
              {mode === 'stopped' && 'Recording saved'}
            </Text>

            {/* time display */}
            {mode === 'recording' && (
              <Text style={styles.timer}>
                {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:
                {String(recordingTime % 60).padStart(2, '0')}
              </Text>
            )}

            {/* recording controls */}
            <View style={styles.voiceControls}>
              {/* re-record button（shown when stopped) */}
              {mode === 'stopped' && (
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={() => setMode('idle')}
                >
                  <RotateCcw size={20} color="#9BA5A0" />
                </TouchableOpacity>
              )}

              {/* mic button */}
              <TouchableOpacity
                style={[
                  styles.micBtn,
                  mode === 'recording' && styles.micBtnRecording,
                  mode === 'stopped' && styles.micBtnStopped,
                ]}
                onPress={() => {
                  if (mode === 'idle') setMode('recording');
                  else if (mode === 'recording') setMode('stopped');
                }}
              >
                {mode === 'stopped'
                  ? <Square size={28} color="#FFFFFF" />
                  : <Mic size={28} color="#FFFFFF" />
                }
              </TouchableOpacity>

              {/* save button (shown when stopped) */}
              {mode === 'stopped' && (
                <TouchableOpacity style={styles.controlBtn}>
                  <Save size={20} color="#4A7C5E" />
                </TouchableOpacity>
              )}
            </View>

            {mode === 'recording' && (
              <Text style={styles.voiceHint}>Tap again to stop</Text>
            )}
          </View>
        )}

        {/* Type Mode */}
        {mode === 'typing' && (
          <View style={styles.typeCard}>
            <TextInput
              style={styles.typeInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#B0B8B4"
              multiline
              value={typedAnswer}
              onChangeText={setTypedAnswer}
              textAlignVertical="top"
            />
            <View style={styles.typeFooter}>
              <Text style={styles.charCount}>{typedAnswer.length} chars</Text>
              <TouchableOpacity
                style={[styles.saveTextBtn, typedAnswer.length === 0 && styles.saveTextBtnDisabled]}
                disabled={typedAnswer.length === 0}
              >
                <Save size={14} color={typedAnswer.length > 0 ? '#FFFFFF' : '#B0B8B4'} />
                <Text style={[styles.saveTextBtnText, typedAnswer.length === 0 && styles.saveTextBtnTextDisabled]}>
                  Save Answer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI feedback button */}
        <TouchableOpacity style={styles.aiFeedbackBtn}>
          <Bot size={18} color="#FFFFFF" />
          <Text style={styles.aiFeedbackBtnText}>Get AI Feedback</Text>
        </TouchableOpacity>

        {/* saved answers section */}
          <View style={styles.savedAnswersBlock}>
            <TouchableOpacity
              style={styles.savedAnswersHeader}
              onPress={() => setShowSavedAnswers(!showSavedAnswers)}
            >
              <Text style={styles.savedAnswersTitle}>
                Saved Answers ({question.answers?.length ?? 0})
              </Text>
              {showSavedAnswers
                ? <ChevronUp size={16} color="#9BA5A0" />
                : <ChevronDown size={16} color="#9BA5A0" />
              }
            </TouchableOpacity>

            {showSavedAnswers && (
              <View style={styles.savedAnswersList}>
                {(question.answers?.length ?? 0) === 0 ? (
                  <View style={styles.noAnswersState}>
                    <Text style={styles.noAnswersText}>No saved answers.</Text>
                    <Text style={styles.noAnswersSubText}>Record or type your answer above to save it.</Text>
                  </View>
                ) : (
                  question.answers.map((answer: any) => (
                    <TouchableOpacity
                      key={answer.id}
                      style={styles.savedAnswerItem}
                      onPress={() => navigation.navigate('AnswerDetail', { answer, question })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.savedAnswerItemLeft}>
                        <Text style={styles.savedAnswerTitle}>{answer.title}</Text>
                        <Text style={styles.savedAnswerPreview} numberOfLines={1}>
                          {answer.content}
                        </Text>
                      </View>
                      <ChevronRight size={16} color="#D0D5D2" />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  questionCard: {
    backgroundColor: '#1C3A2A',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F5F0E8',
    lineHeight: 26,
  },
  // mode Toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  modeBtnActive: {
    backgroundColor: '#1C3A2A',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9BA5A0',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  // voice
  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  voiceStatus: {
    fontSize: 15,
    color: '#9BA5A0',
    fontWeight: '500',
  },
  timer: {
    fontSize: 36,
    fontWeight: '300',
    color: '#1C3A2A',
    letterSpacing: 2,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  micBtn: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: '#1C3A2A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C3A2A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  micBtnRecording: {
    backgroundColor: '#E8640A',
    shadowColor: '#E8640A',
  },
  micBtnStopped: {
    backgroundColor: '#9BA5A0',
    shadowColor: '#000',
  },
  controlBtn: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceHint: {
    fontSize: 12,
    color: '#B0B8B4',
  },
  // type
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  typeInput: {
    fontSize: 15,
    color: '#1C3A2A',
    lineHeight: 24,
    minHeight: 140,
  },
  typeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0EDE6',
    paddingTop: 10,
  },
  charCount: {
    fontSize: 12,
    color: '#B0B8B4',
  },
  saveTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C3A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveTextBtnDisabled: {
    backgroundColor: '#F0EDE6',
  },
  saveTextBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveTextBtnTextDisabled: {
    color: '#B0B8B4',
  },
  // AI feedback
  aiFeedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C8A45A',
    paddingVertical: 16,
    borderRadius: 100,
  },
  aiFeedbackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // saved answers
  savedAnswersBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  savedAnswersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  savedAnswersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  savedAnswersList: {
    borderTopWidth: 1,
    borderTopColor: '#F0EDE6',
  },
  savedAnswerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE6',
    gap: 12,
  },
  savedAnswerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  savedAnswerPreview: {
    fontSize: 12,
    color: '#9BA5A0',
    lineHeight: 18,
  },
  statusRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  noAnswersState: {
  padding: 18,
  alignItems: 'center',
  gap: 4,
  },
  noAnswersText: {
  fontSize: 13,
  fontWeight: '500',
  color: '#9BA5A0',
  },
  noAnswersSubText: {
  fontSize: 12,
  color: '#B0B8B4',
  textAlign: 'center',
  },
  savedAnswerItemLeft: {
  flex: 1,
  gap: 3,
},

});