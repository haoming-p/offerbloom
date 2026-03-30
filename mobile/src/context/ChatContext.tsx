import React, { createContext, useContext, useState } from 'react';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

// map of answerId to chat history
type ChatHistoryMap = Record<string, Message[]>;

type ChatContextType = {
  getChatHistory: (answerId: string) => Message[];
  addMessage: (answerId: string, message: Message) => void;
  initChat: (answerId: string, initialMessage: Message) => void;
};

const ChatContext = createContext<ChatContextType>({
  getChatHistory: () => [],
  addMessage: () => {},
  initChat: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatHistories, setChatHistories] = useState<ChatHistoryMap>({});

  function getChatHistory(answerId: string): Message[] {
    return chatHistories[answerId] ?? [];
  }

  function addMessage(answerId: string, message: Message) {
    setChatHistories(prev => ({
      ...prev,
      [answerId]: [...(prev[answerId] ?? []), message],
    }));
  }

  // only initialize if no history exists yet
  function initChat(answerId: string, initialMessage: Message) {
    setChatHistories(prev => {
      if (prev[answerId] && prev[answerId].length > 0) return prev;
      return { ...prev, [answerId]: [initialMessage] };
    });
  }

  return (
    <ChatContext.Provider value={{ getChatHistory, addMessage, initChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}