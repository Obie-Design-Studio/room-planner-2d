# MCP Configuration Reference

**Last Updated:** 2026-01-18

## Active MCPs

This document lists all configured Model Context Protocol (MCP) servers for this project and when to use each one.

---

## ✅ Working MCPs

### 1. **supabase**
- **Type:** HTTP
- **URL:** `https://mcp.supabase.com/mcp?project_ref=rbpcaqqahdzvpwzzctlx`
- **Status:** ✅ Connected (OAuth authenticated)
- **Use for:**
  - Database queries and schema management
  - Creating/modifying tables
  - Row-level security policies
  - Authentication setup
  - Backend API configuration
- **When to use:** Any database or backend-related work

### 2. **shadcn**
- **Type:** HTTP
- **URL:** `https://www.shadcn.io/api/mcp`
- **Status:** ✅ Connected (2 tools available)
- **Use for:**
  - Adding pre-built UI components (buttons, dialogs, inputs, forms)
  - Consistent, accessible component library
  - React/Next.js component patterns
- **When to use:** 
  - Adding new UI components
  - Need accessible, well-designed component
  - Building forms or interactive elements

### 3. **vercel**
- **Type:** HTTP
- **URL:** `https://mcp.vercel.com`
- **Status:** ✅ Connected (OAuth authenticated)
- **Use for:**
  - Deploying to production/preview
  - Managing environment variables
  - Checking deployment logs
  - Build status and errors
  - **v0 AI component generation** (generate beautiful UI from descriptions)
- **When to use:**
  - Deploying the app
  - Debugging deployment issues
  - Generating new UI components with AI

### 4. **playwright**
- **Type:** Command (npm package)
- **Package:** `@playwright/mcp@latest`
- **Status:** ✅ Connected (22 tools available)
- **Use for:**
  - Browser automation for testing
  - Canvas interaction testing
  - Click, type, navigate browser actions
  - Console log inspection
  - Network request monitoring
  - Screenshots for verification
- **When to use:**
  - Testing new features (especially canvas interactions)
  - Debugging browser-specific issues
  - Automated UI testing
  - Verifying user flows

### 5. **filesystem**
- **Type:** Command (npm package)
- **Package:** `@modelcontextprotocol/server-filesystem`
- **Scope:** `/Users/tobias.johansson10/cursor-projects/room-planner-2d`
- **Status:** ✅ Connected
- **Use for:**
  - Reading/writing files in the project
  - File structure inspection
  - Batch file operations
- **When to use:** Already handled automatically by Cursor

### 6. **context7**
- **Type:** Command (npm package)
- **Package:** `@upstash/context7-mcp`
- **Status:** ✅ Connected (2 tools available)
- **Use for:**
  - Looking up library documentation (React, Next.js, Konva, etc.)
  - API references
  - Up-to-date usage examples
- **When to use:**
  - Need to check latest API for a library
  - Unsure about correct usage
  - Looking for code examples

---

## MCP Usage Priority

### When Adding UI Components
1. **First:** Check **shadcn** for pre-built components
2. **Second:** Use **vercel (v0)** to generate custom components
3. **Third:** Build custom only if neither fits

### When Testing Features
1. **Always:** Use **playwright** for browser automation
2. Check console logs via playwright tools
3. Take screenshots for visual verification
4. Never ask user to test manually unless playwright fails

### When Deploying
1. Use **vercel** MCP to deploy
2. Check deployment logs via vercel tools
3. Manage environment variables via vercel

### When Working with Database
1. Use **supabase** MCP for all database operations
2. Design schema before implementing
3. Always add Row Level Security (RLS) policies

### When Looking Up Documentation
1. Use **context7** before implementing
2. Check official docs for latest APIs
3. Find code examples and patterns

---

## Design Philosophy (Critical)

**User's requirement:** Designs must NOT look AI-generated

**What to avoid:**
- ❌ Purple/blue gradients
- ❌ Glassmorphism effects
- ❌ Generic marketing site patterns
- ❌ Excessive blur/shadows
- ❌ Trendy rounded-full buttons

**What to do:**
- ✅ Clean, professional aesthetics
- ✅ Functional over flashy
- ✅ Tool-like interface (Figma/Notion-inspired)
- ✅ Custom color palettes (not Tailwind defaults)
- ✅ Purposeful interactions (no unnecessary animations)

**When using shadcn or vercel v0:**
- Always customize components (don't use defaults as-is)
- Apply custom colors from project design system
- Adjust spacing and typography to match app style
- Remove generic patterns

---

## Configuration File Location

**MCP settings stored at:**
```
~/.cursor/mcp.json
```

**Or in Cursor UI:**
Settings → MCP Servers

---

## Complete MCP Configuration (JSON)

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=rbpcaqqahdzvpwzzctlx",
      "type": "http"
    },
    "shadcn": {
      "url": "https://www.shadcn.io/api/mcp",
      "type": "http"
    },
    "vercel": {
      "url": "https://mcp.vercel.com",
      "type": "http"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "filesystem": {
      "command": "/usr/local/bin/npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/tobias.johansson10/cursor-projects/room-planner-2d"
      ]
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp",
        "--api-key",
        "ctx7sk-e73f9a65-47bd-420f-8c80-cc59eefdf3fa"
      ]
    }
  }
}
```

---

## Notes

- All MCPs are working and authenticated
- No additional MCPs needed at this time
- Focus on using these tools effectively rather than adding more
- The combination of shadcn + vercel (v0) + existing design system provides everything needed for beautiful, unique UI design
