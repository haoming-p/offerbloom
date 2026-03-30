# Mobile

React Native mobile app built with Expo.

## Prerequisites
- Expo Go app installed on your phone

## Getting Started

1. Install dependencies
```bash
   cd mobile
   npm install
```

2. Start the development server
```bash
   npx expo start
```

3. Scan the QR code with Expo Go or Camera app

## Project Structure
```
mobile/
├── App.tsx                  # Entry point, navigation setup
├── src/
│   ├── context/
│   │   ├── RoleContext.tsx  # Global role state (PM/SWE/DS)
│   │   ├── StatusContext.tsx # Question status state
│   │   └── ChatContext.tsx  # AI chat history state
│   ├── data/
│   │   └── mockData.ts      # Mock data (TODO: replace with API)
│   ├── components/
│   │   └── StatusBadge.tsx  # Reusable status badge component
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── HomeScreen.tsx
│       ├── CategoryScreen.tsx
│       ├── PracticeSessionScreen.tsx
│       ├── AnswerDetailScreen.tsx
│       ├── AIChatScreen.tsx
│       ├── QuickPracticeScreen.tsx
│       └── ProfileScreen.tsx
```

## Notes

- All data is currently mocked in `src/data/mockData.ts`
