# AI Behavior Optimization - Implementation Report

**Date:** January 18, 2026  
**Project:** Room Planner 2D

---

## ✅ Problems I CAN Fix (Rules Updated)

### 1. **shadcn Component Usage** ✅ FIXED

**Problem:** AI creates custom UI components instead of using shadcn MCP.

**Root Cause:** shadcn rules existed but weren't prioritized or enforced.

**Solution Implemented:**
- Created `token-optimization.mdc` with **shadcn-FIRST** mandate
- Added lookup table: "User asks for X → Use shadcn Y"
- Explicit instruction: Check shadcn BEFORE creating any UI component

**New Behavior:**
```
User: "Add a button"
AI: *Checks shadcn MCP* → Uses shadcn Button component (not raw <button>)

User: "Add a modal"
AI: *Checks shadcn MCP* → Uses shadcn Dialog/Sheet (not custom modal)
```

**File:** `.cursor/rules/token-optimization.mdc` (lines 8-37)

---

### 2. **Over-Testing Trivial Changes** ✅ FIXED

**Problem:** AI tests everything, even color changes and text updates.

**Root Cause:** 
- Line 50 in old rules: "For EVERY code change" → triggered testing always
- No exemptions for trivial changes
- No scope limiting (tested entire app instead of changed functionality)

**Solution Implemented:**
- Replaced "MANDATORY TESTING" with "SMART TESTING"
- Added explicit "When NOT to Test" list (styling, text, CSS-only, docs)
- Added "Testing Scope" rule: Test only changed functionality
- Added decision matrix table

**New Behavior:**
```
OLD:
User: "Change button color to blue"
AI: *Tests zoom, pan, furniture, drag, entire app*

NEW:
User: "Change button color to blue"
AI: "Updated button color. CSS-only change, no testing needed."
```

**File:** `.cursor/rules/mcp-tools.mdc` (lines 48-105)

---

### 3. **Token Inefficiency** ✅ IMPROVED

**Problems Fixed:**
- ✅ Not using search_replace for diffs → Now mandated
- ✅ Not checking Context7 first → Now required flow
- ✅ Not batching operations → Now encouraged
- ✅ Reading unnecessary files → Now limited
- ✅ Testing unrelated features → Now scoped

**Solution Implemented:**
- File operations: "Use search_replace, not write" mandate
- Documentation: "Query Context7 before answering" flow
- Batch operations guidance
- "Read only files you need to modify" rule

**New Behavior:**
```
OLD:
User: "How does Konva handle events?"
AI: *Uses training data* → Potentially outdated

NEW:
User: "How does Konva handle events?"
AI: *Queries Context7 for official Konva docs* → Up-to-date, accurate
```

**File:** `.cursor/rules/token-optimization.mdc` (lines 61-104)

---

### 4. **Debugging Workflow** ✅ FIXED

**Problem:** AI starts testing before identifying root cause.

**Root Cause:** No "diagnose first" instruction in rules.

**Solution Implemented:**
- Added "Auto-Debug Protocol" with mandatory 3-step sequence
- Step 1: Console logs (diagnosis)
- Step 2: Targeted fix
- Step 3: Verify fix (scoped testing only)
- Added anti-pattern examples (wrong vs. right)

**New Behavior:**
```
OLD:
User: "Zoom doesn't work"
AI: *Tests zoom, pan, furniture, measurements, takes 10 screenshots*

NEW:
User: "Zoom doesn't work"
AI: *Checks console* → "Error: zoomLevel undefined at line 47"
AI: *Fixes variable* → *Tests zoom only*
```

**File:** `.cursor/rules/mcp-tools.mdc` (lines 345-398)

---

### 5. **Model Complexity Recommendations** ✅ NEW FEATURE

**Problem:** AI doesn't indicate when task is too simple or too complex for current model.

**Solution Implemented:**
- Added self-awareness triggers: Detect when stuck (3+ failed attempts)
- Detect trivial tasks: Text-only, CSS-only, simple patterns
- Detect complex tasks complete: Suggest returning to standard model
- Added recommendation formats for upgrade, downgrade, and return

**New Behavior:**

**Scenario 1: Stuck (Suggest More Powerful)**
```
AI: *Tries 3 fixes, all fail*

⚠️ Model Complexity Suggestion
This task is complex - I've attempted 3 fixes without success.
Recommendation: Consider switching to a more powerful model (Claude Opus, o1).
Want me to continue, or switch models first?
```

**Scenario 2: Simple Task (Suggest Cheaper)**
```
User: "Change button text to 'Save'"

💡 Cost Optimization Tip
This is straightforward text replacement.
You could use a cheaper/faster model for tasks like this to save costs.
Proceed?
```

**Scenario 3: Complex Done (Suggest Return)**
```
✅ Complex Task Complete
The architecture refactor is done.
Recommendation: You can now return to your standard model for regular development.
```

**File:** `.cursor/rules/token-optimization.mdc` (lines 189-299)

---

## ❌ Problems I CANNOT Fix (Limitations)

### 5. **Model Selection Efficiency** ⚠️ PARTIAL SOLUTION

**What you want:**
- AI detects when task is too complex for current model → Suggests upgrade
- AI detects when task is too simple → Suggests cheaper model
- AI notices when stuck → Recommends escalation
- AI completes complex task → Suggests returning to standard model

**What I CAN do now (NEW RULES ADDED):**
- ✅ Detect when I'm struggling (3+ failed attempts) → Suggest more powerful model
- ✅ Detect trivial tasks (text-only, CSS-only) → Suggest cheaper model could handle this
- ✅ Notice complex task complete → Suggest returning to standard model
- ✅ Detect going in circles → Recommend escalation

**What I still CANNOT do:**
- ❌ Know which model I currently am (Claude Sonnet vs GPT-4 vs Opus)
- ❌ Know token costs in real-time
- ❌ Automatically switch models
- ❌ Control Cursor's model routing

**How it works:**
I'll monitor task complexity and my own performance, then make recommendations:

**Example 1: Stuck on Bug (Suggest Upgrade)**
```
User: "Fix the drag bug"
AI: *Tries 3 fixes, all fail*

⚠️ Model Complexity Suggestion

This task is complex:
- I've attempted 3 fixes without success
- Root cause requires deeper debugging analysis
- This may need more powerful reasoning

Recommendation: Consider switching to a more powerful model (Claude Opus, o1).

Want me to continue, or switch models first?
```

**Example 2: Simple Task (Suggest Cheaper Model)**
```
User: "Change all button text to Title Case"

💡 Cost Optimization Tip

This is straightforward text replacement:
- No complex logic required
- Follows simple pattern

You could use a cheaper/faster model for tasks like this to save costs.

Proceed? (I can handle it regardless of model)
```

**Example 3: Complex Task Done (Suggest Return to Standard)**
```
User: "Thanks, that architecture refactor worked!"

✅ Complex Task Complete

The state management issue is resolved.

Recommendation: If you switched to a more powerful model for this, you can now return to your standard model (Claude Sonnet) for regular development.
```

**File:** `.cursor/rules/token-optimization.mdc` (lines 189-299)

---

## 🎯 Summary of Changes

### Files Created:
1. **`token-optimization.mdc`** (NEW)
   - shadcn-first mandate with lookup table
   - Testing exemption rules (when NOT to test)
   - File operation efficiency (search_replace over write)
   - Context7 documentation lookup flow
   - Batch operations guidance
   - Expensive operation warnings
   - Task complexity assessment
   - **Model complexity recommendations** (NEW)
   - 11-point optimization checklist

### Files Modified:
2. **`mcp-tools.mdc`** (UPDATED)
   - "MANDATORY TESTING" → "SMART TESTING PROTOCOL"
   - Added "When NOT to Test" explicit list
   - Added "Testing Scope: Changed Functionality Only"
   - Added testing decision matrix table
   - Added "Auto-Debug Protocol" with 3-step sequence
   - Added anti-pattern examples (wrong vs. right debugging)

---

## 🎯 Expected Behavior Changes

### Before Rules Update:
```
User: "Add a save button"
AI: *Creates custom <button> with inline styles*
AI: *Tests entire app: zoom, pan, furniture, drag, everything*
AI: *Takes 5 screenshots*
AI: *Reads 10 files*
Result: Amateur button, wasted tokens, over-testing
```

### After Rules Update:
```
User: "Add a save button"
AI: *Checks shadcn MCP* → Uses shadcn Button component
AI: *Adds button with proper styling and accessibility*
AI: *Tests button click only (targeted testing)*
Result: Professional button, efficient token usage, scoped testing
```

---

## 🚀 Testing the New Behavior

### Test 1: UI Component Request
**Request:** "Add a settings button"
**Expected:** AI uses shadcn Button, doesn't create custom component

### Test 2: Trivial Change
**Request:** "Change the zoom button text to 'Zoom In'"
**Expected:** AI makes change, states "Text-only change, no testing needed"

### Test 3: Bug Report
**Request:** "The furniture drag feature isn't working"
**Expected:** 
1. AI checks console logs first
2. Diagnoses issue from logs
3. Fixes issue
4. Tests drag feature only (not zoom, pan, etc.)

### Test 4: Documentation Question
**Request:** "How do I use Konva's rotation API?"
**Expected:** AI queries Context7 for official Konva docs first

---

## 💡 Recommendations for Further Optimization

### What You Can Do:

**1. Use Cursor Features for Model Selection**
- Check if Cursor has "Use cheaper model" settings
- Manually switch models based on task:
  - Simple edits → Faster/cheaper model
  - Complex debugging → More powerful model

**2. Break Down Large Tasks**
- Instead of: "Build the entire furniture library"
- Try: "Add one furniture type" → verify → "Add 3 more similar ones"
- This allows model switching between phases

**3. Be Explicit About Testing Needs**
- "Add button (no testing needed)" → Skips testing
- "Add button and test it" → Triggers testing

**4. Monitor Token Usage**
- Check Cursor's token usage dashboard (if available)
- Note which operations use more tokens
- Adjust workflow accordingly

---

## ⚠️ Setting Expectations

### What Rules CAN Control:
- ✅ Which MCPs to use and when
- ✅ When to test vs. skip testing
- ✅ File operation efficiency (diffs vs. full files)
- ✅ Debugging workflow (console-first)
- ✅ UI component choices (shadcn vs. custom)
- ✅ Model complexity recommendations (suggest when to upgrade/downgrade)

### What Rules CANNOT Control:
- ❌ Automatic model switching
- ❌ Knowing which specific model is active
- ❌ Real-time token cost calculation
- ❌ Real-time cost optimization

**Bottom line:** Rules fix AI behavior and efficiency. Model selection requires Cursor settings changes.

---

## 📝 Next Steps

1. **Test the new behavior** - Try the test scenarios above
2. **Provide feedback** - Let me know what's working and what's not
3. **Iterate on rules** - We can refine based on real-world usage
4. **Explore Cursor settings** - Check for model selection options

---

## 🔍 Rule Priority Order

Cursor applies rules in this order:
1. `token-optimization.mdc` (new, high priority)
2. `mcp-tools.mdc` (updated, testing rules)
3. Other `.mdc` files (design-system, ux-patterns, etc.)

The new rules **override** conflicting old rules due to specificity and recency.

---

**Questions or Issues?** Let me know what's working and what needs adjustment!
