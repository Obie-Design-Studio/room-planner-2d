# Room Planner 2D

A web-based room planning application for designing and visualizing interior spaces. Create floor plans, add furniture, doors, and windows with precise measurements in centimeters.

![Room Planner 2D](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

### Room Management
- 📐 **Custom room dimensions** - Set width and length in centimeters
- 🏗️ **Adjustable ceiling height** - Configure vertical space
- 🏷️ **Room types** - Categorize as bedroom, living room, kitchen, office, or bathroom
- 🎨 **Visual canvas** - 2D top-down view with architectural precision

### Architectural Elements
- 🪟 **Windows** - Add configurable windows that snap to walls
  - Adjustable width and floor distance
  - Wall-mounted positioning (top, left, right, bottom)
  - Default 100cm width
- 🚪 **Doors** - Add doors with swing direction control
  - Adjustable height (editable, wall thickness-based)
  - Configurable swing direction (in/out, left/right)
  - Default 90cm width
  - Visual arc showing door swing

### Furniture Library
- 🪑 **23 pre-designed furniture items** organized by category:
  - **Bedroom**: Bed, Nightstand, Dresser, Closet, Desk
  - **Living Room**: Sofa, Armchair, Coffee Table, TV Stand, Bookshelf
  - **Kitchen**: Dining Table, Chair, Refrigerator, Stove, Counter
  - **Office**: Desk, Filing Cabinet
  - **Bathroom**: Toilet, Sink, Shower, Bathtub, Wall Toilet, Towel Dryer
- 🎨 **Custom furniture** - Create rectangular items with custom dimensions and colors
- 📏 **Room-aware suggestions** - Relevant furniture displayed based on room type
- 🖼️ **Architectural symbols** - Professional 2D representations of all items

### Canvas Controls
- 🔍 **Zoom controls** - Smooth zoom from 25% to 300%
  - Mouse wheel zoom (Cmd/Ctrl + Scroll)
  - UI buttons (+/- in corner)
  - Center-locked behavior (no drift)
  - Zoom percentage indicator
- 🖱️ **Pan controls** - Navigate around the room
  - Click and drag to pan
  - Two-finger scroll on trackpad
  - Space bar + drag
  - Boundary constraints (room always visible)
- 🎯 **Fit to view** - Press 'F' or click button to reset view
- 📐 **Grid background** - Visual 50cm grid for alignment

### Measurements & Precision
- 📏 **Real-time measurements** - Distances shown between items
- 📍 **Snap-to-wall** - Windows and doors automatically align to walls
- 🎯 **Pixel-perfect rendering** - 1cm = specific pixel ratio for accuracy
- 📐 **Wall thickness** - Realistic 5cm wall thickness included

### Item Management
- ✏️ **Edit properties** - Double-click any item to edit
  - Dimensions (width/height/length)
  - Colors
  - Position coordinates
  - Special properties (door swing, window floor distance)
- 🗑️ **Delete items** - Select and press Delete/Backspace
- 🎨 **Color picker** - Choose from predefined palette or custom colors
- 📋 **Item list** - Sidebar showing all items in the room
  - Windows & Doors section
  - Furniture section
  - New items appear at top

### Keyboard Shortcuts
- **Cmd/Ctrl + Z** - Undo
- **Cmd/Ctrl + Shift + Z** or **Cmd/Ctrl + Y** - Redo
- **Cmd/Ctrl + C** - Copy selected item
- **Cmd/Ctrl + V** - Paste copied item
- **Cmd/Ctrl + D** - Duplicate selected item
- **Cmd/Ctrl + A** - Select all items
- **Delete** or **Backspace** - Delete selected item
- **Escape** - Deselect current item
- **F** - Fit room to view (reset zoom/pan)
- **Space + Drag** - Pan canvas

### Additional Features
- ↩️ **Undo/Redo system** - Full history support
- 📋 **Copy/Paste** - Duplicate items easily
- 🎯 **Auto-select** - New items automatically selected
- 📱 **Responsive design** - Works on mobile, tablet, and desktop
  - Mobile: Collapsible sidebar with overlay
  - Tablet: Optimized 280px sidebar
  - Desktop: Full 320px sidebar
  - Touch-optimized controls (44px minimum touch targets)
- 💾 **In-memory state** - Work persists during session

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **UI Library**: [React 19](https://react.dev)
- **Language**: [TypeScript 5](https://www.typescriptlang.org)
- **Canvas Rendering**: [Konva.js 10](https://konvajs.org) / [React Konva 19](https://github.com/konvajs/react-konva)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Build Tool**: [Next.js built-in](https://nextjs.org/docs/architecture/nextjs-compiler)

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd room-planner-2d
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm run start
```

## Usage Guide

### Creating Your First Room

1. **Set up room dimensions**
   - Click "Edit room settings" in the sidebar
   - Enter width and length in centimeters (e.g., 400 × 300)
   - Set ceiling height (default: 250cm)
   - Optionally choose a room type for relevant furniture suggestions

2. **Add architectural elements**
   - Click "Add Window" or "Add Door" in the Windows & Doors section
   - Items automatically snap to walls
   - Click on an item to select it, double-click to edit

3. **Add furniture**
   - Click "Browse All Furniture" to see the full catalog
   - Or use "Add Custom Furniture" for unique items
   - Drag furniture to position them in the room
   - Furniture with circular handles can be rotated

4. **Edit items**
   - Double-click any item to open the edit modal
   - Change dimensions, colors, or special properties
   - Click outside or press Escape to close

5. **Navigate the canvas**
   - **Zoom**: Hold Cmd/Ctrl and scroll, or use +/- buttons
   - **Pan**: Click and drag empty space, or use two-finger scroll
   - **Reset**: Press 'F' or click the fit-to-view button

### Tips & Best Practices

- Use the **grid** for alignment (50cm intervals)
- Check **measurements** between items to ensure proper spacing
- Use **zoom** when working with small details
- **Copy/paste** (Cmd/Ctrl+C, Cmd/Ctrl+V) to duplicate furniture
- Press **F** if you lose track of the room
- Use **undo** (Cmd/Ctrl+Z) freely - full history is maintained

## Project Structure

```
room-planner-2d/
├── .cursor/                  # Cursor AI rules and configuration
│   └── rules/               # Project-specific AI guidelines
├── public/                   # Static assets
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx        # Main application page
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── canvas/         # Konva canvas components
│   │   │   ├── RoomCanvas.tsx           # Main canvas controller
│   │   │   ├── FurnitureShape.tsx       # Individual item renderer
│   │   │   ├── furnitureSymbols.tsx     # SVG/symbol definitions
│   │   │   ├── GridBackground.tsx       # Canvas grid
│   │   │   └── MeasurementOverlay.tsx   # Distance measurements
│   │   └── ui/             # UI components and modals
│   │       ├── RoomSettingsModal.tsx
│   │       ├── ItemEditModal.tsx
│   │       ├── FurnitureLibraryModal.tsx
│   │       ├── CustomFurnitureModal.tsx
│   │       ├── ColorPicker.tsx
│   │       └── Input.tsx
│   ├── lib/                # Utilities and constants
│   │   ├── constants.ts           # Pixel ratios, wall thickness
│   │   ├── furnitureLibrary.ts    # 23-item furniture catalog
│   │   └── furnitureTheme.ts      # Default furniture by room type
│   └── types/              # TypeScript type definitions
│       └── index.ts        # FurnitureItem, RoomConfig types
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## Development

### Key Concepts

- **Coordinates**: All measurements in centimeters, converted to pixels via `PIXELS_PER_CM`
- **Wall-mounted items**: Windows and doors have special positioning logic to snap to walls
- **Canvas layers**: Konva renders on multiple layers for performance
- **Transform system**: Zoom and pan use coordinate transformations
- **State management**: React state with history for undo/redo

### Adding New Features

1. **New furniture type**: Add to `src/lib/furnitureLibrary.ts`
2. **New furniture symbol**: Create in `src/components/canvas/furnitureSymbols.tsx`
3. **New modal**: Add to `src/components/ui/`
4. **Canvas feature**: Modify `src/components/canvas/RoomCanvas.tsx`

### Code Style

- TypeScript for type safety
- Functional React components with hooks
- Inline styles for dynamic styling (Konva requirements)
- Tailwind CSS for static styles
- Clear component separation (canvas vs UI)

## Version History

See [git commits](../../commits/main) for detailed changelog.

### Recent Updates (v0.1.0)
- ✅ **Responsive design** - Mobile, tablet, and desktop support
  - Collapsible sidebar on mobile with hamburger menu
  - Touch-optimized controls (44px minimum)
  - Adaptive layout for different screen sizes
- ✅ Zoom controls with center-locked behavior (25%-300%)
- ✅ Pan controls with boundary constraints
- ✅ 23-item furniture library with categories
- ✅ Room type selection with relevant furniture
- ✅ Windows and doors with architectural properties
- ✅ Measurement overlays and grid background
- ✅ Full undo/redo system
- ✅ Copy/paste/duplicate functionality
- ✅ Keyboard shortcuts

## Contributing

This is a personal project. If you'd like to contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and not licensed for public use.

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Canvas rendering powered by [Konva.js](https://konvajs.org)
- Icons from [Lucide](https://lucide.dev)
