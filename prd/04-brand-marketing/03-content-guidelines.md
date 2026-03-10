# Content Guidelines

> How we write, communicate, and engage with creators across all channels.

---

## Writing Principles

### 1. Creator-First Language

We speak **to** creators, not **about** them. Every sentence should feel like advice from a fellow creator.

| Instead of | Write |
|-----------|-------|
| "Users can create ideas" | "Capture your ideas instantly" |
| "The system processes content" | "Your content moves through the pipeline" |
| "Features include analytics" | "See what's working and what's not" |
| "Subscription management" | "Manage your plan" |

### 2. Action-Oriented

Every piece of copy should inspire action. Lead with verbs.

| Instead of | Write |
|-----------|-------|
| "Idea capture functionality" | "Capture ideas in 5 seconds" |
| "Content pipeline management" | "Move content from draft to published" |
| "Analytics dashboard" | "Track your growth in real-time" |
| "AI-powered features" | "Let AI write your first draft" |

### 3. Concise

Less is more. Cut every word that doesn't earn its place.

| Instead of | Write |
|-----------|-------|
| "In order to create a new idea" | "To create an idea" |
| "Please note that you can" | "You can" |
| "At this point in time" | "Now" |
| "Due to the fact that" | "Because" |

---

## Copy by Context

### Buttons & CTAs

| Type | Format | Examples |
|------|--------|---------|
| Primary action | Verb + Object | "Create Idea", "Publish Now", "Start Timer" |
| Secondary | Verb | "Cancel", "Skip", "Learn More" |
| Destructive | Verb + Object | "Delete Idea", "Remove Member" |
| Navigation | Noun | "Settings", "Analytics", "Pipeline" |

**Rules:**
- Max 3 words for buttons
- Title Case for primary CTAs
- Sentence case for secondary
- No periods

### Empty States

**Structure:** Headline + Description + CTA

```
No ideas captured yet

The best content starts with a spark.
Capture your first idea and watch it grow.

[Capture Your First Idea]
```

```
Your pipeline is clear

Nothing in progress right now.
Promote an idea to start creating.

[Browse Ideas]
```

```
No analytics yet

Start publishing to see your growth metrics.
Consistency is the only metric that matters.

[Go to Pipeline]
```

**Rules:**
- Headline: State the situation (no "Oops!" or sad faces)
- Description: 1-2 sentences explaining what to do
- CTA: Clear next step
- Tone: Encouraging, never blaming

### Error Messages

**Structure:** What happened + What to do

```
Couldn't save your idea
Check your connection and try again. Your draft is safe.
[Retry]
```

```
Session expired
Please sign in again to continue.
[Sign In]
```

```
Idea not found
It may have been deleted or moved.
[Back to Ideas]
```

**Rules:**
- Never blame the user
- Explain what happened in plain language
- Always provide a next step
- No technical details (no error codes in UI)
- Reassure data safety when relevant

### Success Messages (Toasts)

| Action | Message |
|--------|---------|
| Idea created | "Idea captured" |
| Content published | "Content published to YouTube" |
| Streak continued | "13-day streak! Keep it up" |
| XP earned | "+45 XP earned" |
| File uploaded | "Thumbnail uploaded" |
| Settings saved | "Settings updated" |

**Rules:**
- Max 8 words
- Past tense or present state
- No exclamation marks (except celebrations)
- Auto-dismiss after 3 seconds

### Tooltips

```
Consistency Score: How regularly you publish.
                   Based on your weekly targets.

AI Credits: Each AI generation uses 1 credit.
            PRO gives you 500/month.

Pipeline Velocity: Average days from scripting
                   to published.
```

**Rules:**
- First line: What it is
- Second line: Why it matters or how it works
- Max 2 lines
- No marketing language

### Modal Confirmations

**Destructive:**
```
Delete "CSS Grid Tutorial"?

This idea and all associated tags will be
permanently removed. This can't be undone.

[Cancel]  [Delete]
```

**Important:**
```
Promote to Pipeline?

"CSS Grid Tutorial" will move from Ideas to
the Content Pipeline as a new content piece.

[Cancel]  [Promote]
```

**Rules:**
- Title: Action + Object name (in quotes)
- Body: Explain consequences clearly
- Cancel button always on left (ghost)
- Confirm button on right (styled by severity)

---

## Notification Copy

### Push Notifications

| Trigger | Title | Body |
|---------|-------|------|
| Streak at risk | "Don't break your streak!" | "Publish today to keep your 12-day streak alive" |
| Morning ritual | "Morning Review" | "Check yesterday's metrics and plan today" |
| Scheduled publish | "Content published" | "'CSS Grid Tutorial' is live on YouTube" |
| Comment received | "New comment" | "Alex replied on 'React Hooks Tutorial'" |
| Deal update | "Deal update" | "TechBrand deal moved to Signed" |

### Email Subject Lines

| Type | Subject | Preview |
|------|---------|---------|
| Welcome | "Welcome to Ordo -- let's set up your pipeline" | "It takes about 2 minutes..." |
| Weekly digest | "Your week in content: 3 published, 87% consistency" | "Plus: 2 ideas captured..." |
| Streak reminder | "Your 15-day streak is at risk" | "Publish today to keep it going" |
| Feature update | "New: AI Title Lab is here" | "Generate CTR-optimized titles..." |

---

## Microcopy Patterns

### Loading States

| Context | Copy |
|---------|------|
| Page loading | No text (skeleton loader) |
| AI generating | "Thinking..." or "Generating..." |
| File uploading | "Uploading... 67%" |
| Saving | "Saving..." |
| Searching | "Searching..." |

### Placeholder Text

| Input | Placeholder |
|-------|------------|
| Idea title | "What's your next content idea?" |
| Search | "Search ideas, content, series..." |
| AI chat | "Ask anything about your content..." |
| Description | "Add more details..." |
| Tags | "Add tags..." |

### Label Conventions

| Pattern | Example |
|---------|---------|
| On/Off toggles | "Dark mode", "Auto-save", "Notifications" |
| Counts | "12 ideas", "3 in progress", "156 published" |
| Time | "2 hours ago", "March 10, 2026", "Thursday 10 AM" |
| Status | "Active", "Scheduled", "Published", "Draft" |
| Progress | "4 of 12 completed", "87%", "Level 5" |

---

## Internationalization (i18n)

### Supported Languages

| Code | Language | Coverage |
|------|----------|----------|
| `en` | English | 100% (primary) |
| `es` | Spanish | 100% |
| `pt` | Portuguese | 100% |

### Translation Rules

1. **Don't translate brand names**: Ordo, Pipeline, Studio, Remix stay in English
2. **Adapt, don't translate literally**: Spanish has different sentence structure
3. **Keep the tone**: Casual-professional in all languages
4. **Number formatting**: Follow locale conventions (1,000 vs 1.000)
5. **Date formatting**: Follow locale conventions (MM/DD vs DD/MM)
6. **Plural forms**: Handle properly per language rules

### Translation Key Structure

```json
{
  "ideas": {
    "title": "Ideas",
    "create": "New Idea",
    "empty": {
      "title": "No ideas captured yet",
      "description": "Capture your first idea and watch it grow.",
      "cta": "Capture Your First Idea"
    },
    "status": {
      "active": "Active",
      "validated": "Validated",
      "promoted": "Promoted",
      "graveyarded": "Archived"
    }
  }
}
```

---

## SEO & Meta Content

### Page Titles

```
{Page Name} | Ordo Creator OS
```

Examples:
- "Ideas | Ordo Creator OS"
- "Content Pipeline | Ordo Creator OS"
- "Analytics | Ordo Creator OS"

### Meta Descriptions

```
Manage your content creation lifecycle with Ordo.
From idea capture to publishing, all in one place.
```

### Open Graph

```html
<meta property="og:title" content="Ordo Creator OS" />
<meta property="og:description" content="The operating system for content creators" />
<meta property="og:image" content="/og-image.png" />
<meta property="og:type" content="website" />
```

---

## Content Calendar (Marketing)

### Weekly Cadence

| Day | Content Type | Platform |
|-----|-------------|----------|
| Monday | Feature tip | Twitter |
| Tuesday | Creator spotlight | LinkedIn |
| Wednesday | Product update | Blog + Twitter |
| Thursday | Tutorial / How-to | YouTube + Blog |
| Friday | Community highlight | Twitter + Instagram |

### Content Pillars

1. **Product**: Feature announcements, tutorials, tips
2. **Creator Education**: Content strategy, consistency tips, growth tactics
3. **Community**: User stories, milestones, spotlights
4. **Behind the Scenes**: Building Ordo, technical decisions, team updates

---

*Words are the interface between humans and software. Choose them wisely.*
