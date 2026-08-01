# Quasara Track — Chrome Extension

Track employee tab usage, active/inactive time, keystrokes, copy/paste events, generate AI daily summaries, and sync everything to Google Sheets.

## Features

- **Tab Tracking**: Records which tabs were opened, for how long, and which were actively used
- **Idle Detection**: Marks tabs as inactive after a configurable threshold (default 5 minutes)
- **Activity Logging**: Counts keystrokes, copy, and paste events per tab (no text content captured)
- **AI Summaries**: Generates a daily work summary using OpenAI GPT
- **Google Sheets Sync**: Logs all data to a Google Sheet via Apps Script web app
- **Privacy First**: Only counts and metadata are tracked — never actual text content

## Installation

1. Download or clone this folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `quasara-track` folder
5. The extension icon should appear in your toolbar

## Setup

### 1. Configure the Extension
1. Click the Quasara Track icon in your toolbar
2. Go to the **Settings** tab
3. Enter your **Employee Name**
4. Enter your **OpenAI API Key** (get one at https://platform.openai.com/api-keys)
5. Set the **Inactivity Threshold** (default: 5 minutes)
6. Optionally enable **Auto-sync** at a specific time
7. Click **Save Settings**

### 2. Set Up Google Sheets Integration

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. In the sheet, click **Extensions > Apps Script**
3. Delete the default code and paste the contents of `apps-script/Code.gs`
4. Click **Deploy > New deployment**
5. Select type: **Web app**
6. Set **Execute as**: Me
7. Set **Who has access**: Anyone
8. Click **Deploy**, authorize the permissions
9. Copy the **Web App URL**
10. Paste the URL into the extension Settings under **Google Apps Script URL**
11. Save settings

## Usage

- The extension automatically tracks tab activity in the background
- Click the extension icon to see **Today's stats**: active time, inactive time, keystrokes, and per-tab breakdown
- Click **Generate Summary & Sync** to manually trigger AI summary generation and Google Sheets sync
- If auto-sync is enabled, it will sync automatically at the configured time (default 6 PM)

## Data Logged to Google Sheets

| Column | Description |
|--------|-------------|
| Date | YYYY-MM-DD |
| Employee | Name from settings |
| Domain | Website domain |
| Title | Tab title |
| Active Time | Time spent actively on tab |
| Inactive Time | Idle time on tab |
| Keystrokes | Key press count |
| Copies | Copy event count |
| Pastes | Paste event count |
| Opened At | Tab open time |
| Closed At | Tab close time |
| Type | TAB / SUMMARY / AI SUMMARY text |

## Privacy

- **No text content is ever captured** — only keystroke counts, copy/paste counts, and tab metadata (URL, title, domain)
- All data is stored locally in `chrome.storage.local` until synced
- The OpenAI API key is stored locally and only sent to OpenAI's servers
- The Apps Script URL is stored locally and only used for syncing

## File Structure

```
quasara-track/
├── manifest.json          # Chrome extension manifest (MV3)
├── background.js          # Service worker — tab tracking, idle detection, aggregation
├── content.js             # Content script — activity detection (mouse, keyboard, copy, paste)
├── settings.js            # Settings storage wrapper
├── ai-summary.js          # OpenAI API integration
├── sheets-sync.js         # Google Sheets sync via Apps Script
├── popup.html             # Extension popup UI
├── popup.css              # Popup styling
├── popup.js               # Popup logic
├── icons/                 # Extension icons
└── apps-script/
    └── Code.gs            # Google Apps Script for Sheets integration
```

## For Administrators

To track multiple employees:
1. Each employee installs the extension
2. Each employee enters their own name in settings
3. All employees use the same Apps Script URL (same Google Sheet)
4. The Sheet will contain rows from all employees, identifiable by the Employee column
