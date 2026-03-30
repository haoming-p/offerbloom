import React, { createContext, useContext, useState } from 'react';
import { QuestionStatus, MOCK_DATA } from '../data/mockData';

// map of questionId to status
type StatusMap = Record<string, QuestionStatus>;

// initialize status from mockData
function buildInitialStatus(): StatusMap {
  const map: StatusMap = {};
  Object.values(MOCK_DATA).forEach(roleData => {
    roleData.categories?.forEach(cat => {
      cat.questions.forEach(q => {
        map[q.id] = q.status;
      });
    });
  });
  return map;
}

type StatusContextType = {
  statusMap: StatusMap;
  setQuestionStatus: (questionId: string, status: QuestionStatus) => void;
  getQuestionStatus: (questionId: string) => QuestionStatus;
};

const StatusContext = createContext<StatusContextType>({
  statusMap: {},
  setQuestionStatus: () => {},
  getQuestionStatus: () => 'needs_practice',
});

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [statusMap, setStatusMap] = useState<StatusMap>(buildInitialStatus());

  function setQuestionStatus(questionId: string, status: QuestionStatus) {
    setStatusMap(prev => ({ ...prev, [questionId]: status }));
  }

  function getQuestionStatus(questionId: string): QuestionStatus {
    return statusMap[questionId] ?? 'needs_practice';
  }

  return (
    <StatusContext.Provider value={{ statusMap, setQuestionStatus, getQuestionStatus }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  return useContext(StatusContext);
}