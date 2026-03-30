import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';
import { ChevronLeft, Pencil, Check, X, Bot } from 'lucide-react-native';

export default function AnswerDetailScreen({ route, navigation }: any) {
  const { answer, question } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(answer.content);
  const [savedContent, setSavedContent] = useState(answer.content);

  function handleSave() {
    setSavedContent(editedContent);
    setIsEditing(false);
  }

  function handleCancel() {
    setEditedContent(savedContent);
    setIsEditing(false);
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1C3A2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{answer.title}</Text>

        {/* Edit / Save / Cancel buttons */}
        {isEditing ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <X size={18} color="#9BA5A0" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <Pencil size={16} color="#1C3A2A" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* question text */}
        <View style={styles.questionRef}>
          <Text style={styles.questionRefLabel}>QUESTION</Text>
          <Text style={styles.questionRefText}>{question.text}</Text>
        </View>

        {/* answer content */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR ANSWER</Text>
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editedContent}
              onChangeText={setEditedContent}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.contentCard}>
              <Text style={styles.contentText}>{savedContent}</Text>
            </View>
          )}
        </View>

        {/* AI Chat button */}
        <TouchableOpacity
          style={styles.aiBtnRow}
          onPress={() => navigation.navigate('AIChat', {
            answer: { ...answer, content: savedContent },
            question,
          })}
          activeOpacity={0.85}
        >
          <View style={styles.aiBtnLeft}>
            <View style={styles.aiBtnIcon}>
              <Bot size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.aiBtnTitle}>Discuss with AI</Text>
            </View>
          </View>
          <Text style={styles.aiBtnArrow}>→</Text>
        </TouchableOpacity>

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
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C3A2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#D0D5D2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  editBtnText: {
    fontSize: 13,
    color: '#1C3A2A',
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  questionRef: {
    backgroundColor: '#EAE6DE',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  questionRefLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9BA5A0',
    letterSpacing: 1,
  },
  questionRefText: {
    fontSize: 14,
    color: '#1C3A2A',
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9BA5A0',
    letterSpacing: 1,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  contentText: {
    fontSize: 15,
    color: '#1C3A2A',
    lineHeight: 24,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    fontSize: 15,
    color: '#1C3A2A',
    lineHeight: 24,
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: '#4A7C5E',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  aiBtnRow: {
    backgroundColor: '#1C3A2A',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  aiBtnIcon: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiBtnArrow: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
  },
});