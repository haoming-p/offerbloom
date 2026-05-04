import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Bot, Send, Check, Copy } from 'lucide-react-native';
import { useChat, Message } from '../context/ChatContext';

// mock response
function getMockResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  if (msg.includes('structure') || msg.includes('star'))
    return 'Try the STAR method: Situation, Task, Action, Result. Focus most of your answer on the Actions you took and the Results you achieved — that\'s what interviewers care about most.';
  if (msg.includes('short') || msg.includes('long') || msg.includes('concise'))
    return 'A good spoken answer is 1-2 minutes. Cut any background that isn\'t directly relevant. Lead with the result, then explain how you got there.';
  if (msg.includes('metric') || msg.includes('number') || msg.includes('data'))
    return 'Adding metrics makes your answer much stronger. Instead of "improved performance", try "reduced load time by 40%" or "increased retention by 15%". Even rough estimates are better than none.';
  if (msg.includes('improve') || msg.includes('better') || msg.includes('weak'))
    return 'The weakest part of your answer is the result — it\'s a bit vague. Try to quantify the impact. What changed after you took action? Who benefited, and by how much?';
  return 'Good point. To strengthen this further, try to be more specific about your personal contribution — what did YOU do specifically, vs what the team did together?';
}

// mock improved answer generator
function generateImprovedAnswer(originalContent: string): string {
  return `${originalContent}\n\n[AI-improved version: Added clearer structure using STAR format, quantified the impact, and tightened the language for conciseness.]`;
}

export default function AIChatScreen({ route, navigation }: any) {
  const { answer, question } = route.params;
  const { getChatHistory, addMessage, initChat } = useChat();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const messages = getChatHistory(answer.id);

  // initial chat on first entry
  useEffect(() => {
    initChat(answer.id, {
      id: 'intro',
      role: 'assistant',
      text: `I've read your answer. What would you like to improve? I can help with structure, clarity, metrics, or anything else.`,
    });
  }, [answer.id]);

  async function sendMessage() {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: inputText.trim(),
    };

    addMessage(answer.id, userMsg);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: getMockResponse(userMsg.text),
      };
      addMessage(answer.id, aiMsg);
      setIsLoading(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 1000);
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1C3A2A" />
        </TouchableOpacity>

        <View style={styles.botIconContainer}>
          <Bot size={22} color="#1C3A2A" />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => setSaveModalVisible(true)}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* preview answer */}
      <View style={styles.answerPreview}>
        <Text style={styles.answerPreviewTitle} numberOfLines={1}>{answer.title}</Text>
        <Text style={styles.answerPreviewText} numberOfLines={2}>{answer.content}</Text>
      </View>

      {/* message list */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[styles.messageRow, msg.role === 'user' && styles.messageRowUser]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <Bot size={14} color="#FFFFFF" />
              </View>
            )}
            <View style={[
              styles.bubble,
              msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
            ]}>
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI,
              ]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={styles.messageRow}>
            <View style={styles.aiAvatar}>
              <Bot size={14} color="#FFFFFF" />
            </View>
            <View style={styles.loadingBubble}>
              <Text style={styles.loadingDots}>●  ●  ●</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your answer..."
            placeholderTextColor="#B0B8B4"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Send size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Save Modal：replace or new ver. */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setSaveModalVisible(false)}
        >
          <View style={styles.saveModal}>
            <Text style={styles.saveModalTitle}>Save AI-Improved Answer</Text>
            <Text style={styles.saveModalSub}>
              How would you like to save the improved version?
            </Text>

            {/* replace current answer */}
            <TouchableOpacity
              style={styles.saveOption}
              onPress={() => {
                // TODO：update answer content
                setSaveModalVisible(false);
                navigation.goBack();
              }}
            >
              <View style={styles.saveOptionIcon}>
                <Check size={18} color="#4A7C5E" />
              </View>
              <View style={styles.saveOptionText}>
                <Text style={styles.saveOptionTitle}>Replace current answer</Text>
                <Text style={styles.saveOptionSub}>Overwrite "{answer.title}"</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.saveOptionDivider} />

            {/* save as new ver. */}
            <TouchableOpacity
              style={styles.saveOption}
              onPress={() => {
                // TODO: new answer and title with "AI Version"
                setSaveModalVisible(false);
                navigation.goBack();
              }}
            >
              <View style={styles.saveOptionIcon}>
                <Copy size={18} color="#C8A45A" />
              </View>
              <View style={styles.saveOptionText}>
                <Text style={styles.saveOptionTitle}>Save as new version</Text>
                <Text style={styles.saveOptionSub}>Keep both versions</Text>
              </View>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  botIconContainer: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#EAE6DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    borderWidth: 1,
    borderColor: '#D0D5D2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  answerPreview: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#EAE6DE',
    borderRadius: 12,
    padding: 14,
    gap: 3,
  },
  answerPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C3A2A',
  },
  answerPreviewText: {
    fontSize: 12,
    color: '#9BA5A0',
    lineHeight: 17,
  },
  messageList: { flex: 1 },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#1C3A2A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleAI: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#1C3A2A',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextAI: { color: '#1C3A2A' },
  bubbleTextUser: { color: '#FFFFFF' },
  loadingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingDots: {
    fontSize: 10,
    color: '#9BA5A0',
    letterSpacing: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    backgroundColor: '#F5F0E8',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAE6DE',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C3A2A',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#1C3A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D0D5D2',
  },
  // Save Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModal: {
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
  saveModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C3A2A',
  },
  saveModalSub: {
    fontSize: 13,
    color: '#9BA5A0',
    marginTop: -8,
  },
  saveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  saveOptionIcon: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOptionText: { flex: 1, gap: 3 },
  saveOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C3A2A',
  },
  saveOptionSub: {
    fontSize: 12,
    color: '#9BA5A0',
  },
  saveOptionDivider: {
    height: 1,
    backgroundColor: '#F0EDE6',
  },
});