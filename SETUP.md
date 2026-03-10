# LearnAnything — Setup Guide for Mac

> This guide is written for someone with no developer experience. Take it step by step and you'll have the app running on your Mac in about 20–30 minutes.

---

## What you'll need

- A Mac (any recent macOS version)
- A stable internet connection
- The `.env` file (ask the person who shared the repo with you — it contains secret keys and is not included in the download)

---

## Step 1 — Install Xcode

Xcode is Apple's development environment. It includes the iOS Simulator, which lets you run the app on a virtual iPhone on your Mac.

1. Open the **App Store** on your Mac
2. Search for **Xcode**
3. Click **Get** and then **Install** (it's free, but large — about 15 GB — so give it time)
4. Once installed, open **Xcode** once so it finishes its first-time setup
5. When it asks to install additional components, click **Install**

> ☕ This step takes a while. Start it first and move on to Step 2 while it downloads.

---

## Step 2 — Install Homebrew

Homebrew is a tool that makes installing software on a Mac easy. Open the **Terminal** app (you can find it by pressing `Cmd + Space` and typing "Terminal") and paste this command:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Press **Enter** and follow the on-screen instructions. It may ask for your Mac password — type it and press Enter (you won't see the characters as you type, that's normal).

At the end, it may show a message like:

```
==> Next steps:
    Add Homebrew to your PATH...
```

If it does, copy and run those two lines it shows you (they start with `echo` and `eval`). This makes sure Homebrew works correctly.

---

## Step 3 — Install Node.js

Node.js is the engine that runs JavaScript on your computer. In Terminal, run:

```
brew install node
```

Wait for it to finish. When it's done, verify it worked:

```
node --version
```

You should see something like `v22.x.x`. Any version is fine.

---

## Step 4 — Download the app from GitHub

1. Go to the GitHub repository link the team shared with you
2. Click the green **Code** button
3. Click **Download ZIP**
4. Once downloaded, double-click the `.zip` file to unzip it
5. Move the unzipped folder somewhere easy to find, like your **Desktop** or **Documents**

> Alternatively, if you're comfortable with Terminal, you can run `git clone <repo-url>` to clone it directly.

---

## Step 5 — Add the `.env` file

The `.env` file contains secret API keys. It is **not** included in the download for security reasons.

1. Ask a teammate for the `.env` file
2. Place it inside the project folder (the one you unzipped in Step 4) — it should sit at the top level, next to files like `package.json`

The file should look something like this (with real values filled in):

```
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_OPENROUTER_API_KEY=...
```

> If you open the project folder and already see a file named `.env`, you're good — skip this step.
> Note: files starting with a dot (`.`) are hidden by default on Mac. In Finder, press `Cmd + Shift + .` to show hidden files.

---

## Step 6 — Open the project in Terminal

In Terminal, navigate to the project folder. The easiest way:

1. Type `cd ` (with a space after it) in Terminal — **do not press Enter yet**
2. Open **Finder**, find the project folder, and drag it into the Terminal window
3. The folder path will be filled in automatically
4. Now press **Enter**

You should see the terminal prompt change to show the project folder name.

---

## Step 7 — Install project dependencies

This downloads all the libraries the app needs. In Terminal, run:

```
npm install
```

Wait for it to finish. You'll see a lot of text scroll by — that's normal. It's done when you see the cursor blinking again.

---

## Step 8 — Start the app

Run this command:

```
npx expo start --clear
```

After a few seconds, you'll see a screen in Terminal with a QR code and some options. It will look something like this:

```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press i │ open iOS simulator
› Press a │ open Android
```

---

## Step 9 — Open the iOS Simulator

Press the **`i`** key on your keyboard (while Terminal is focused).

This will launch a virtual iPhone on your screen. The app will load automatically inside it in about 30 seconds.

> If it asks you to install the Expo Go app inside the simulator, press **Install**.

---

## Troubleshooting

**"command not found: brew"**
→ Homebrew didn't install correctly, or wasn't added to your PATH. Re-run Step 2 and make sure you run the `echo` and `eval` lines it shows at the end.

**"command not found: node"**
→ Close Terminal completely, reopen it, and try `node --version` again.

**Xcode simulator doesn't open**
→ Make sure Xcode finished installing and you opened it at least once. Then try running `sudo xcode-select --switch /Applications/Xcode.app` in Terminal.

**The app shows a blank white screen**
→ Wait 10–15 seconds and try shaking the virtual iPhone (Device menu → Shake) to reload. Or press `r` in Terminal.

**"Unable to find .env file" or API errors**
→ Make sure the `.env` file is in the root of the project folder (same level as `package.json`).

**The terminal shows a red error about `node_modules`**
→ Run `npm install` again from Step 7.

---

## How to stop the app

Press `Ctrl + C` in Terminal to stop the server. You can close the Simulator from its menu bar.

## How to run it again next time

Just open Terminal, navigate to the project folder (Step 6), and run:

```
npx expo start
```

You don't need to repeat the other steps.

---

*Need help? Reach out to the team.* 🚀
