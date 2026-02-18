# LearnAnything

Upload a PDF. Get quizzes, story cards, and more — powered by AI.

## Tech Stack

- **Framework:** Expo SDK 54 + React Native + TypeScript
- **Navigation:** expo-router (file-based)
- **Styling:** NativeWind v5 (Tailwind CSS for React Native)
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
- **AI:** Abstracted provider layer (OpenAI, Claude, Gemini)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## Project Structure

```
app/                  # expo-router file-based routes
  (tabs)/             # Tab navigation (Library, Learn, Profile)
  (auth)/             # Auth screens (Sign In, Sign Up)
  _layout.tsx         # Root layout with providers
components/           # Shared UI components
  ui/                 # Design system base components
lib/                  # Utilities and client configs
  ai/                 # AI provider abstraction
  supabase.ts         # Supabase client
services/             # Business logic / data layer
types/                # TypeScript type definitions
constants/            # Theme tokens, app config
```
