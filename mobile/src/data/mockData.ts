export type QuestionStatus = 'needs_practice' | 'ready' | 'skip';

export const ROLES = ['PM', 'SWE', 'DS'];

export const ROLE_CONFIG = {
  PM: { label: 'PM', icon: 'briefcase' },
  SWE: { label: 'SWE', icon: 'code' },
  'Data Analyst': { label: 'DS', icon: 'chart' },
};

export const MOCK_DATA = {
  PM: {
    progress: { completed: 6, total: 10 },
    categories: [
      {
        id: '1',
        name: 'Self-intro',
        questions: [
          {
            id: 'q1',
            text: 'Give me a quick overview of your background',
            status: 'ready' as QuestionStatus,
            answers: [
              { id: 'a1', title: 'Google PM Version', content: 'I am a product manager with 3 years experience of...', feedback: 'Good structure, add more metrics.' },
              { id: 'a2', title: 'Meta PM Version', content: 'Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit amet consectetur adipiscing elit quisque faucibus ex. Adipiscing elit quisque faucibus ex sapien vitae pellentesque.', feedback: 'Strong opening.' },
            ],
          },
          {
            id: 'q2',
            text: 'Why do you want to be a PM?',
            status: 'needs_practice' as QuestionStatus,
            answers: [],
          },
        ],
      },
      {
        id: '2',
        name: 'Behavioral Questions',
        questions: [
          {
            id: 'q3',
            text: 'Tell me about a time you showed leadership',
            status: 'needs_practice' as QuestionStatus,
            answers: [
              { id: 'a3', title: 'Google PM Version', content: 'During my internship...', feedback: 'Use more STAR format.' },
            ],
          },
          {
            id: 'q4',
            text: 'Describe a time you handled conflict',
            status: 'needs_practice' as QuestionStatus,
            answers: [],
          },
        ],
      },
      {
        id: '3',
        name: 'Technical',
        questions: [
          {
            id: 'q5',
            text: 'How would you prioritize a product roadmap?',
            status: 'needs_practice' as QuestionStatus,
            answers: [],
          },
        ],
      },
    ],
  },
  SWE: {
    progress: { completed: 3, total: 15 },
    categories: [
      {
        id: '4',
        name: 'Self-intro',
        questions: [
          {
            id: 'q6',
            text: 'Tell me about yourself',
            status: 'ready' as QuestionStatus,
            answers: [
              { id: 'a4', title: 'Google SDE Version', content: 'I am a software engineer...', feedback: 'Good but too long.' },
            ],
          },
        ],
      },
      {
        id: '5',
        name: 'Behavioral Questions',
        questions: [
          {
            id: 'q7',
            text: 'Tell me about a challenging scalability problem you solved',
            status: 'needs_practice' as QuestionStatus,
            answers: [],
          },
        ],
      },
      {
        id: '6',
        name: 'Technical',
        questions: [
          {
            id: 'q8',
            text: 'Explain how LRU cache works',
            status: 'skip' as QuestionStatus,
            answers: [],
          },
        ],
      },
    ],
  },
  'DS': {
    progress: { completed: 0, total: 8 },
    categories: [],
  },
};