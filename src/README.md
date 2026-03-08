# Collaborative Spreadsheet Application

A lightweight, real-time collaborative spreadsheet application built with Next.js, React, Firebase, and TypeScript.

## Features

### Core Requirements ✓

#### 1. Document Dashboard
- Home screen listing existing spreadsheets with title and last modified date
- Create new spreadsheets with one click
- Browse and open existing documents
- Authentication status display

#### 2. The Editor
- **Scrollable Grid**: Numbered rows (1-30), lettered columns (A-T)
- **Editable Cells**: Click to edit, Enter to confirm, Escape to cancel
- **Formula Support**:
  - SUM function: `=SUM(A1:A5)` or `=SUM(A1,B1,C1)`
  - AVERAGE function: `=AVERAGE(A1:A5)`
  - Basic arithmetic: `=A1+B1*C1`, `=D2-E2`, etc.
  - Cell references resolved automatically
- **Real-time Sync**: All changes sync across open sessions via Firebase
- **Write State Indicator**: Visual feedback showing save status (saving/saved)

#### 3. Presence
- Active users displayed in document header with colored avatars
- User name and color assigned per session
- Real-time presence updates using Firebase subcollections
- Clean presence UI showing active collaborators

#### 4. Identity
- Display name configuration (editable in document header)
- Session-based identity persistence
- Color-coded user indicators for collaboration
- Username visible to all collaborators

#### 5. Deployment
- Full TypeScript type safety (no `@ts-ignore` statements)
- Builds without errors
- Vercel-ready with Firebase configuration
- Production-grade error handling

### Bonus Features ✓

#### Cell Formatting
- Bold and italic text
- Font size selection (10px-20px)
- Text color picker (8 colors)
- Background color picker (8 colors)
- Text alignment (left, center, right)
- Formatting persists across sessions

#### Column Resizing
- Drag column header borders to resize
- Auto-fit on double-click (default: 112px)
- Visual feedback during resize
- Smooth drag experience

#### Keyboard Navigation
- **Arrow Keys**: Navigate between cells
- **Tab**: Move to next cell, **Shift+Tab**: Move to previous
- **Enter**: Confirm edit and move down
- **Escape**: Cancel edit
- **Ctrl+Z/Cmd+Z**: Undo
- **Ctrl+Y/Cmd+Y**: Redo
- **Ctrl+A/Cmd+A**: Select all cells

#### Export Support
- **CSV**: Compatible with Excel, Google Sheets
- **JSON**: Full data and formatting export
- **HTML**: Styled table view for browser viewing
- One-click export menu

#### Additional Features
- Multi-cell selection with Shift+Click
- Undo/Redo history (up to 100 entries)
- Selection highlighting and info display
- Loading states and error handling
- Responsive design

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Firebase Firestore (real-time sync)
- **Authentication**: Session-based with Firebase Auth setup
- **State Management**: React Hooks (useSpreadsheet, useSelection, useHistory, usePresence)
- **Icons**: Inline SVG components

## Project Structure

```
├── app/
│   ├── auth/
│   │   ├── login/page.tsx          # Login page
│   │   └── signup/page.tsx         # Signup page
│   ├── doc/[id]/page.tsx           # Document editor
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home/dashboard
│   └── globals.css                 # Global styles
├── components/
│   ├── Cell.tsx                    # Individual cell component
│   ├── Spreadsheet.tsx             # Main spreadsheet container
│   ├── Toolbar.tsx                 # Formatting toolbar
│   ├── DocumentHeader.tsx          # Document title & metadata
│   ├── Presence.tsx                # Collaborator avatars
│   ├── WriteStateIndicator.tsx     # Save status indicator
│   ├── ExportMenu.tsx              # Export functionality
│   ├── SearchBar.tsx               # Search utility
│   ├── ColumnResizer.tsx           # Column resize handler
│   ├── SelectionInfo.tsx           # Selection metadata
│   └── ActivityFeed.tsx            # Activity log
├── hooks/
│   ├── useSpreadsheet.ts           # Cell data & real-time sync
│   ├── useSelection.ts             # Multi-cell selection logic
│   ├── useHistory.ts               # Undo/redo functionality
│   └── usePresence.ts              # Collaborator tracking
├── lib/
│   ├── firebase.ts                 # Firebase initialization
│   ├── formulaParser.ts            # Formula evaluation engine
│   └── exportUtils.ts              # CSV/JSON/HTML export
├── types/
│   └── spreadsheet.ts              # TypeScript interfaces
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore enabled

### Installation

```bash
# Install dependencies
npm install

# Create .env.local with Firebase config
cat > .env.local << EOF
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
EOF

# Run development server
npm run dev

# Open http://localhost:3000
```

### Firebase Setup

1. Create Firestore collection `documents` with structure:
   ```
   documents/
   ├── {docId}/
   │   ├── title: string
   │   ├── author: string
   │   ├── updatedAt: timestamp
   │   ├── cells: object (cellId -> {value, format})
   │   └── presence/ (subcollection)
   │       └── {userId}/ (user presence docs)
   ```

2. Set Firestore rules for real-time sync:
   ```
   match /documents/{docId} {
     allow read, write: if request.auth != null;
     match /presence/{userId} {
       allow read, write: if request.auth != null;
     }
   }
   ```

## Usage

### Creating & Opening Documents
1. Click "New Spreadsheet" on the home page
2. Edit the title by clicking it
3. Set your username in the document header

### Editing Cells
- Click any cell to start editing
- Type your content or formula
- Press Enter to confirm or Escape to cancel
- Formulas start with `=` (e.g., `=SUM(A1:A5)`)

### Formatting
- Select one or multiple cells (Shift+Click)
- Use toolbar buttons for bold, italic, alignment
- Choose colors from the color pickers
- Select font size from dropdown

### Collaboration
- Multiple users can edit the same document
- Active collaborators shown in header with avatars
- Changes sync in real-time
- Username visible to all users

### Exporting
- Click the "Export" button in document header
- Choose format: CSV, JSON, or HTML
- File downloads automatically

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Arrow Keys | Navigate cells |
| Tab | Next cell |
| Shift+Tab | Previous cell |
| Enter | Confirm edit |
| Escape | Cancel edit |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+A | Select all |

## Architecture Decisions

### State Management
- **useSpreadsheet**: Real-time sync via Firebase onSnapshot
- **useSelection**: Client-side multi-cell selection with Set for O(1) lookups
- **useHistory**: Simple array-based history for undo/redo (100 entry limit)
- **usePresence**: Firebase subcollection listeners for live collaborators

### Formula Evaluation
- Uses Function constructor for safe arithmetic evaluation
- Supports SUM ranges (A1:A5), AVERAGE, and basic math
- Range parsing handles column and row indices
- Error boundary returns "ERR" for invalid formulas

### Real-time Sync
- Firestore onSnapshot for bidirectional updates
- updateDoc for atomic cell writes
- Session storage for user identity
- Presence tracked via subcollection documents

### Formatting
- Cell format stored as optional object on each cell
- Format persists through Firestore updates
- Toolbar reads from selected cell format
- Multi-cell operations merge formats

## Performance Considerations

- Cell grid limited to 30 rows × 20 columns for responsive performance
- useCallback prevents unnecessary re-renders of cells
- useMemo caches selected format computation
- Column widths stored in state (not Firestore) for UI smoothness
- History limited to 100 entries to prevent memory bloat

## Error Handling

- Formula errors return "ERR" string
- Firebase errors logged to console
- Missing cell references default to 0 in formulas
- Graceful degradation for offline edits (sync when reconnected)

## Future Enhancements

- Row reordering by drag-and-drop
- Cell comments and @mentions
- Version history timeline
- Share links with permissions
- Mobile app version
- Google Sheets sync
- Custom function definitions
- Conditional formatting
- Data validation rules

## Known Limitations

- No offline support (requires internet for real-time sync)
- Grid limited to 30 rows × 20 columns
- Formulas don't support advanced functions (MAX, MIN, IF, etc. - can be added)
- No cell comments yet
- No row/column reordering yet
- Formula recalculation on each cell update (not optimized)

## Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

The app is configured for Vercel deployment with automatic GitHub integration support.

## License

MIT
