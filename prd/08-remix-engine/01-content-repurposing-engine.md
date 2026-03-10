# Content Repurposing Engine (Remix)

**Technical Specification v1.0**  
*The most powerful content multiplication tool ever built. Create once, publish everywhere.*

---

## Executive Summary

The Remix Engine is Ordo's killer feature—transforming one piece of long-form content (video, podcast, blog) into 5-10 platform-optimized pieces automatically. It combines transcription, AI-powered analysis, engagement detection, and format adaptation to multiply a creator's reach across all platforms.

A single 30-minute video becomes:
- 3-10 short clips (TikTok, Reels, Shorts, Facebook)
- 1 SEO-optimized blog post (WordPress, Medium, Substack)
- 1 Twitter thread (5-15 tweets)
- 1 LinkedIn post (thought leadership framing)
- 1 Instagram carousel (5-10 slides)
- 1 newsletter section (email with CTA)

**Platform Targets**: YouTube, TikTok, Instagram Reels, Facebook Reels, Twitter/X, LinkedIn, WordPress, Medium, Substack, ConvertKit, Mailchimp, Beehiiv.

---

## 1. Vision & Product Goals

### 1.1 Core Promise

**"Create once, publish everywhere with platform-perfect quality."**

- Creators spend 80% of time editing for each platform. Remix automates this.
- One video generates $50-500 in engagement value across platforms.
- Remix reclaims 10+ hours/week of repurposing work.

### 1.2 User Goals

| Role | Goal |
|------|------|
| Creator | Transform 1 piece into 8+ platform-optimized pieces in < 5 minutes |
| Growth Manager | Maximize reach by distributing optimized content to every platform |
| Analyst | Understand which platforms engage best with each content type |
| Team Lead | Approve variants before publishing; maintain brand consistency |

### 1.3 Success Metrics

- **Activation**: 40% of users try Remix within first 30 days
- **Usage**: 2+ pieces repurposed per week by active users
- **Engagement**: Repurposed content achieves 70% of original engagement on secondary platforms
- **Time Savings**: Average 8 hours saved per piece
- **Revenue Impact**: Remix users have 35% higher audience growth (due to consistent distribution)

---

## 2. Transformation Catalog

### 2.1 Video → Short Clips (TikTok, Reels, Shorts)

**Input**: Long-form video (5-120 minutes)  
**Output**: 3-10 clips in multiple durations (15s, 30s, 60s, 90s) + aspect ratio variants

#### Processing Pipeline

```
1. INGESTION & VALIDATION
   - Accept MP4, MOV, WebM (up to 4GB)
   - Extract metadata: duration, fps, resolution, audio codec
   - Validate: duration >= 5 min, audio quality >= 8kHz mono
   - Store to S3/R2 with CDN headers

2. TRANSCRIPTION
   - OpenAI Whisper API (async job)
   - Return: full transcript + speaker identification + word-level timestamps
   - Cache transcription for all downstream processing
   - Fallback: If Whisper fails, queue for manual transcription

3. ENGAGEMENT SCORING (AI Analysis)
   - Parse transcript segments (chunks of 10-30 seconds)
   - Score each segment on:
     * Energy level (vocal intensity, pace, excitement)
     * Topic novelty (unusual/surprising statements)
     * Emotional peaks (laughter, shock, emotion words)
     * Pattern breaks (sudden topic shifts)
     * Retention markers (questions to audience, cliffhangers)
   - Use GPT-4 for semantic scoring with structured JSON output:
     ```json
     {
       "segment": {
         "start_time": 120,
         "end_time": 150,
         "transcript": "...",
         "engagement_score": 0.87,
         "energy_level": 0.9,
         "topic_novelty": 0.75,
         "emotional_peaks": ["surprise", "excitement"],
         "retention_signals": ["question"],
         "viral_potential": 0.82
       }
     }
     ```

4. VIRAL MOMENT DETECTION
   - Identify top 10 segments with highest composite score
   - Apply rules:
     * Must have >= 15s of content
     * Must not exceed 90s
     * Must have <= 2 topic transitions within clip
     * Must include context hook (previous 3-5 seconds)
   - Rank by: engagement_score × audience_fit × platform_suitability

5. CLIP GENERATION
   For each selected segment:
   a) TRANSCODING
      - Extract subclip via FFmpeg (preserve best quality)
      - For TikTok/Reels (9:16): scale video to 1080x1920 (smart zoom to keep face centered)
      - For YouTube Shorts (9:16): scale to 1440x2560 (4K variant for archival)
      - For square (1:1): crop intelligently (show face, not blank space)
      - Generate 3 aspect ratio variants per clip (9:16, 1:1, 16:9)
   
   b) CAPTION GENERATION
      - Extract key phrases from transcript segment
      - Break into caption chunks (max 3 lines per 5 seconds of video)
      - Position: bottom center (leave room for platform UI)
      - Style: bold white text, 0.15s fade in/out
      - Sync exactly to transcript timing
   
   c) VISUAL ENHANCEMENT
      - Detect silent/low-audio segments → Add captions+emoji
      - Detect high-motion segments → Add subtle motion tracking
      - Color correct to platform standard (TikTok: vibrant, YouTube: natural)
      - Add fade transitions between clips if needed
   
   d) HOOK OPTIMIZATION (First 3 seconds)
      - Overlay text hook if transcript starts slow
      - Format: "This one React hook mistake costs your startup $100K/year"
      - Font: Oswald Bold, 48pt, centered, shadow for contrast
      - Timing: Appear at 0.5s, fade at 2.5s

6. BRAND-STYLED SUBTITLES
   - Per workspace: allow brand color selection for subtitle bg
   - Font selection from whitelist: Inter, Montserrat, Open Sans, Poppins
   - Border/outline for accessibility (ensure 4.5:1 contrast ratio)
   - Always include creator watermark (small, corner)

7. PLATFORM ADAPTATION
   For each platform (TikTok, Reels, Shorts):
   - TikTok: 1080x1920, H.264, max 200MB, 60fps optional
   - Reels: 1080x1920, H.264 main profile, max 4GB, 30-60fps
   - Shorts: 1440x2560, VP9 or H.264, max 500MB, any fps
   - Facebook: 1080x1920, H.264, max 2GB

8. OUTPUT STORAGE
   - Store clips in S3/R2 with descriptive keys:
     `/clips/{workspace_id}/{piece_id}/{clip_id}-{duration}s-{aspect}.mp4`
   - Generate thumbnails: {aspect}_thumb.png (first frame with play overlay)
   - Pre-compute CDN headers for instant delivery

9. RANKING & PRIORITIZATION
   - Return 5 "hero" clips (highest engagement score)
   - Return 3-5 "bonus" clips (strong secondary options)
   - Sort by: engagement_score DESC, duration ASC
```

#### Go Code Pattern: Clip Generation

```go
package remix

import (
	"context"
	ffmpeg "github.com/u2takey/ffmpeg-go"
	"sync"
)

type ClipRequest struct {
	VideoID        string
	SegmentStart   float64 // seconds
	SegmentEnd     float64
	TargetDurations []int   // [15, 30, 60, 90]
	AspectRatios   []string // ["9:16", "1:1", "16:9"]
}

type ClipOutput struct {
	ClipID       string
	S3Path       string
	Duration     int
	AspectRatio  string
	ThumbnailURL string
}

// GenerateClips processes video segment into multiple format variants
func (r *RemixEngine) GenerateClips(ctx context.Context, input *ClipRequest) ([]*ClipOutput, error) {
	// Fetch video from S3 (cached in local temp)
	videoFile, err := r.s3Client.GetObject(ctx, input.VideoID)
	if err != nil {
		return nil, fmt.Errorf("fetch video: %w", err)
	}
	defer videoFile.Close()

	var (
		outputs []*ClipOutput
		mu      sync.Mutex
	)

	// Generate aspect ratio variants in parallel
	aspectRatioErrs := make(chan error, len(input.AspectRatios))
	for _, ar := range input.AspectRatios {
		go func(aspectRatio string) {
			clips, err := r.generateAspectVariants(ctx, videoFile, input, aspectRatio)
			if err != nil {
				aspectRatioErrs <- err
				return
			}
			
			mu.Lock()
			outputs = append(outputs, clips...)
			mu.Unlock()
			aspectRatioErrs <- nil
		}(ar)
	}

	// Wait for all variants
	for i := 0; i < len(input.AspectRatios); i++ {
		if err := <-aspectRatioErrs; err != nil {
			return nil, fmt.Errorf("generate aspect variant: %w", err)
		}
	}

	return outputs, nil
}

// generateAspectVariants produces all duration variants for one aspect ratio
func (r *RemixEngine) generateAspectVariants(
	ctx context.Context,
	videoFile io.Reader,
	input *ClipRequest,
	aspectRatio string,
) ([]*ClipOutput, error) {
	var outputs []*ClipOutput
	var mu sync.Mutex
	durationErrs := make(chan error, len(input.TargetDurations))

	for _, dur := range input.TargetDurations {
		go func(targetDuration int) {
			startTime := input.SegmentStart
			// If duration would exceed segment, use full segment
			endTime := startTime + float64(targetDuration)
			if endTime > input.SegmentEnd {
				endTime = input.SegmentEnd
				targetDuration = int(endTime - startTime)
			}

			// Execute FFmpeg trim + scale + encode
			outputPath := fmt.Sprintf("/tmp/clip_%d_%s_%ds.mp4", 
				rand.Int63(), aspectRatio, targetDuration)
			
			cmd := ffmpeg.Input(videoFile.Name()).
				Trim(startTime, endTime).
				SetFilter("scale", r.getScaleFilter(aspectRatio)).
				Output(outputPath, ffmpeg.KwArgs{"c:v": "libx264", "crf": "23"}).
				OverWriteOutput().
				Run()
			
			if err := cmd; err != nil {
				durationErrs <- fmt.Errorf("ffmpeg encode %ds: %w", targetDuration, err)
				return
			}

			// Upload to S3
			s3Key := fmt.Sprintf("clips/%s/%s-%ds-%s.mp4",
				input.VideoID, input.VideoID, targetDuration, aspectRatio)
			s3URL, err := r.s3Client.Upload(ctx, outputPath, s3Key)
			if err != nil {
				durationErrs <- fmt.Errorf("s3 upload: %w", err)
				return
			}

			// Generate and upload thumbnail
			thumbPath := fmt.Sprintf("/tmp/thumb_%d_%s_%ds.png",
				rand.Int63(), aspectRatio, targetDuration)
			ffmpeg.Input(outputPath).
				Filter("select", fmt.Sprintf("eq(n\\,0)")).
				Output(thumbPath).
				Run()
			
			thumbURL, err := r.s3Client.Upload(ctx, thumbPath, 
				fmt.Sprintf("thumbs/%s/%s-%ds-%s.png",
					input.VideoID, input.VideoID, targetDuration, aspectRatio))
			if err != nil {
				durationErrs <- fmt.Errorf("thumbnail upload: %w", err)
				return
			}

			mu.Lock()
			outputs = append(outputs, &ClipOutput{
				ClipID:       fmt.Sprintf("%s-%ds-%s", input.VideoID, targetDuration, aspectRatio),
				S3Path:       s3URL,
				Duration:     targetDuration,
				AspectRatio:  aspectRatio,
				ThumbnailURL: thumbURL,
			})
			mu.Unlock()
			durationErrs <- nil
		}(dur)
	}

	// Collect results
	for i := 0; i < len(input.TargetDurations); i++ {
		if err := <-durationErrs; err != nil {
			return nil, err
		}
	}

	return outputs, nil
}

func (r *RemixEngine) getScaleFilter(aspectRatio string) string {
	switch aspectRatio {
	case "9:16":
		return "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2"
	case "1:1":
		return "scale=1080:1080:force_original_aspect_ratio=decrease,crop=1080:1080"
	case "16:9":
		return "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2"
	default:
		return "scale=1080:1920"
	}
}
```

#### Quality Metrics: Short Clips

| Metric | Target |
|--------|--------|
| Transcription accuracy | 95%+ |
| Engagement score correlation with actual views | 0.72+ |
| Viral moment detection accuracy | 70%+ (human review validates) |
| Clip generation time (30-min video → 8 clips) | < 4 minutes |
| File size (1080x1920 H.264) | 40-60 MB per 30s clip |

---

### 2.2 Video → Blog Post

**Input**: Long-form video with transcript  
**Output**: SEO-optimized blog post (800-2000 words) with images

#### Processing Pipeline

```
1. TRANSCRIPT EXTRACTION
   - Use cached Whisper output from clip generation
   - Or re-transcribe if not already done
   - Parse speaker changes, [MUSIC], [APPLAUSE] markers

2. STRUCTURE DETECTION
   - GPT-4 analyzes full transcript
   - Identifies sections:
     * Introduction (hook + topic framing)
     * Main sections (2-5 distinct topics covered)
     * Examples (stories, case studies, demos)
     * Conclusion (summary + CTA)
   - Output structured JSON:
     ```json
     {
       "sections": [
         {
           "title": "React Hooks: The Basics",
           "content": "...",
           "start_time": 0,
           "end_time": 180,
           "key_points": ["...", "..."],
           "examples": ["..."]
         },
         ...
       ]
     }
     ```

3. BLOG POST GENERATION
   - Convert structured sections to Markdown
   - Format:
     * H1: Video title (SEO-optimized version)
     * Intro paragraph (2-3 sentences)
     * Table of Contents (auto-generated from sections)
     * H2 per section, H3 for subsections
     * Bold key concepts, italicize asides
     * Blockquote for important takeaways
     * Code blocks for technical content (if detected)
   
4. SEO OPTIMIZATION
   - Primary keyword: extracted from title
   - Internal links: suggest 2-3 related articles in workspace
   - Meta description (160 chars): AI-generated summary
   - H1/H2/H3 hierarchy validation
   - Readability: Flesch-Kincaid target = Grade 8
   - Word count: 800-2000 words (flag if outside range)

5. IMAGE EXTRACTION
   - Identify 3-5 key moments from video
   - Capture frames at those timestamps
   - Smart crop to 16:9 ratio (show relevant visual)
   - Compress to < 150KB per image
   - Generate alt text via GPT-4 vision:
     ```
     "Screenshot of React component showing useState hook initialization"
     ```

6. PULL QUOTE IDENTIFICATION
   - Extract 2-3 memorable quotes from transcript
   - Format as blockquotes in blog post
   - Large, distinctive styling

7. EMBED VIDEO
   - Add YouTube embed at top of blog post
   - Add "Watch the full video" CTA button

8. FORMAT OUTPUT
   - Markdown with front matter (for Markdown blogs)
   - Or native HTML (for WordPress API)
   - Include metadata:
     ```yaml
     ---
     title: "Stop Making These 5 React Hooks Mistakes"
     slug: "react-hooks-mistakes"
     description: "Learn the 5 most common React hooks patterns..."
     keywords: "react, hooks, javascript, mistakes"
     image: "og-image-url"
     publish_date: "2026-03-15"
     video_url: "https://youtube.com/..."
     video_duration: "28 minutes"
     reading_time: "8 min read"
     ---
     ```
```

#### Go Code Pattern: Blog Post Generation

```go
package remix

import (
	"fmt"
	"strings"
)

type BlogPostRequest struct {
	VideoID       string
	Transcript    string
	VideoTitle    string
	YouTubeURL    string
	CreatorName   string
	WorkspaceID   string
}

type BlogPost struct {
	Markdown      string
	SEOMetadata   map[string]string
	ReadingTime   int // minutes
	WordCount     int
	Images        []BlogImage
	InternalLinks []string
}

type BlogImage struct {
	FrameTime int    // seconds into video
	S3URL     string
	AltText   string
}

// GenerateBlogPost converts video transcript to SEO-optimized blog post
func (r *RemixEngine) GenerateBlogPost(ctx context.Context, input *BlogPostRequest) (*BlogPost, error) {
	// Step 1: Detect structure
	sections, err := r.detectBlogSections(ctx, input.Transcript)
	if err != nil {
		return nil, fmt.Errorf("structure detection: %w", err)
	}

	// Step 2: Extract images
	images, err := r.extractBlogImages(ctx, input.VideoID, sections)
	if err != nil {
		return nil, fmt.Errorf("image extraction: %w", err)
	}

	// Step 3: Generate Markdown
	md := r.buildBlogMarkdown(input, sections, images)

	// Step 4: SEO optimization
	seoMeta := r.optimizeSEO(md, input.VideoTitle)

	// Step 5: Calculate metrics
	wordCount := len(strings.Fields(md))
	readingTime := (wordCount + 200) / 200 // Standard: 200 words/minute

	return &BlogPost{
		Markdown:    md,
		SEOMetadata: seoMeta,
		ReadingTime: readingTime,
		WordCount:   wordCount,
		Images:      images,
	}, nil
}

func (r *RemixEngine) buildBlogMarkdown(
	input *BlogPostRequest,
	sections []*BlogSection,
	images []BlogImage,
) string {
	var buf strings.Builder

	// Front matter
	buf.WriteString("---\n")
	buf.WriteString(fmt.Sprintf("title: \"%s\"\n", input.VideoTitle))
	buf.WriteString(fmt.Sprintf("description: \"Learn %s in this comprehensive guide\"\n", 
		extractMainTopic(input.VideoTitle)))
	buf.WriteString(fmt.Sprintf("publish_date: \"%s\"\n", time.Now().Format("2006-01-02")))
	buf.WriteString(fmt.Sprintf("video_url: \"%s\"\n", input.YouTubeURL))
	buf.WriteString("---\n\n")

	// Hero image (if available)
	if len(images) > 0 {
		buf.WriteString(fmt.Sprintf("![%s](%s)\n\n", images[0].AltText, images[0].S3URL))
	}

	// Intro
	buf.WriteString("## Introduction\n\n")
	buf.WriteString(sections[0].Content)
	buf.WriteString("\n\n")
	buf.WriteString(fmt.Sprintf("[Watch the full video →](%s)\n\n", input.YouTubeURL))

	// Table of Contents
	buf.WriteString("## Contents\n\n")
	for i, sec := range sections[1:] { // Skip intro
		slug := strings.ToLower(strings.ReplaceAll(sec.Title, " ", "-"))
		buf.WriteString(fmt.Sprintf("%d. [%s](#%s)\n", i+1, sec.Title, slug))
	}
	buf.WriteString("\n")

	// Body sections
	imageIdx := 1
	for _, sec := range sections[1:] { // Skip intro
		buf.WriteString(fmt.Sprintf("## %s\n\n", sec.Title))
		buf.WriteString(sec.Content)
		buf.WriteString("\n\n")

		// Inject image every 2 sections
		if imageIdx < len(images) && imageIdx%2 == 0 {
			buf.WriteString(fmt.Sprintf("![%s](%s)\n\n", images[imageIdx].AltText, images[imageIdx].S3URL))
			imageIdx++
		}
	}

	// Conclusion
	buf.WriteString("## Conclusion\n\n")
	buf.WriteString(fmt.Sprintf("Watch the full video for more details on this topic.\n\n"))
	buf.WriteString(fmt.Sprintf("[Watch now →](%s) *(Running time: 28 minutes)*\n\n", input.YouTubeURL))
	buf.WriteString("---\n\n")
	buf.WriteString(fmt.Sprintf("*Written by %s*\n", input.CreatorName))

	return buf.String()
}

func (r *RemixEngine) optimizeSEO(markdown, title string) map[string]string {
	// Extract primary keyword (usually first noun phrase in title)
	keywords := extractKeywords(title)
	
	// Generate meta description
	metaDesc := title
	if len(metaDesc) > 160 {
		metaDesc = metaDesc[:157] + "..."
	}

	return map[string]string{
		"title":            title,
		"description":      metaDesc,
		"og_title":         title,
		"og_description":   metaDesc,
		"keywords":         strings.Join(keywords, ", "),
		"canonical":        fmt.Sprintf("https://creator.com/blog/%s", slugify(title)),
		"open_graph_image": "og-image-url",
	}
}
```

#### Quality Metrics: Blog Posts

| Metric | Target |
|--------|--------|
| Word count range | 800-2000 |
| H1/H2/H3 hierarchy compliance | 100% |
| Internal links (related articles) | 2-3 |
| Images extracted | 3-5 |
| Alt text quality (human reviewable) | 100% |
| SEO description length | 155-160 chars |
| Readability grade | 8-10 (Flesch-Kincaid) |
| Generation time (30-min video) | < 2 minutes |

---

### 2.3 Video → Twitter/X Thread

**Input**: Video or transcript  
**Output**: 5-15 tweet thread (280 chars each)

#### Processing Pipeline

```
1. KEY INSIGHT EXTRACTION
   - Parse transcript for major claims/insights
   - GPT-4 identifies 7-12 distinct, shareable points
   - Filter by:
     * Not generic/common knowledge (novelty score > 0.6)
     * Actionable or thought-provoking (engagement score > 0.5)
     * Standalone (no context required from outside)
   - Output:
     ```json
     {
       "insights": [
         {
           "insight": "Most React devs miss the cleanup function in useEffect",
           "novelty": 0.78,
           "engagement": 0.85,
           "source_segment": "8:30-9:15"
         },
         ...
       ]
     }
     ```

2. THREAD STRUCTURING
   - Arrange insights for narrative flow
   - Structure:
     * Tweet 1: Hook (question or surprising statement)
     * Tweets 2-N: Value (explain each insight)
     * Tweet N+1: CTA (subscribe, watch video, follow)
   - Example thread:
     ```
     1. "Most React devs are shooting themselves in the foot with useEffect. Here's what they're missing 🧵"
     2. "The #1 mistake: Forgetting the cleanup function. This causes memory leaks AND multiple API calls."
     3. "The dependency array isn't optional. Omit it, and your effect runs on EVERY render."
     4. "The double-render in StrictMode confuses everyone. It's intentional. Here's why..."
     5. "Ready to level up your React? Watch the full breakdown → [video]"
     ```

3. CHARACTER LIMIT OPTIMIZATION
   - Break insights into tweets (max 280 chars)
   - Keep each tweet standalone + connected
   - Use:
     * Numbered format ("1/5 ...", "2/5 ...")
     * Line breaks for readability (whitespace is free)
     * Emoji sparingly (1-2 per thread)
     * No links in body (reserved for final CTA)

4. ENGAGEMENT HOOK PER TWEET
   - Add micro-hooks to keep reading:
     * Questions: "What happens next?"
     * Surprises: "This might shock you..."
     * Pattern breaks: Sudden shift in topic
     * Call for response: "Am I wrong?"

5. FINAL POLISH
   - Verify thread is grammatically sound
   - Check for accidental hashtags that expose mechanics
   - Ensure first tweet is under 140 chars (shows in preview)
   - Generate thread image (optional): Quote graphic with key insight

6. OUTPUT FORMAT
   - Return JSON array of tweet objects:
     ```json
     {
       "thread": [
         {
           "tweet_number": 1,
           "text": "...",
           "character_count": 180,
           "is_hook": true,
           "engagement_hook": "question"
         },
         ...
       ],
       "thread_cta": "Watch the full breakdown → [link]",
       "estimated_engagement": 2800
     }
     ```
```

#### Go Code Pattern: Twitter Thread Generation

```go
package remix

import (
	"fmt"
	"strings"
)

type TwitterThreadRequest struct {
	TranscriptOrURL string
	CreatorHandle   string
	VideoURL        string
	TopicArea       string // e.g., "React", "Productivity"
}

type Tweet struct {
	TweetNumber      int
	Text             string
	CharacterCount   int
	IsHook           bool
	EngagementHook   string // "question", "surprise", "pattern_break"
}

type TwitterThread struct {
	Tweets         []*Tweet
	ThreadCTA      string
	TotalCharacters int
	EstimatedLikes int
}

// GenerateTwitterThread converts content to a Twitter thread
func (r *RemixEngine) GenerateTwitterThread(ctx context.Context, input *TwitterThreadRequest) (*TwitterThread, error) {
	// Step 1: Extract insights from transcript/content
	insights, err := r.extractTwitterInsights(ctx, input.TranscriptOrURL, input.TopicArea)
	if err != nil {
		return nil, fmt.Errorf("insight extraction: %w", err)
	}

	// Step 2: Structure into thread
	tweets := r.buildTwitterThread(insights, input.CreatorHandle, input.VideoURL)

	// Step 3: Validate lengths
	for _, tweet := range tweets {
		if len([]rune(tweet.Text)) > 280 {
			// Truncate or split (error recovery)
			tweet.Text = truncateToCharLimit(tweet.Text, 280)
		}
	}

	thread := &TwitterThread{
		Tweets:    tweets,
		ThreadCTA: fmt.Sprintf("Watch the full breakdown → %s", input.VideoURL),
	}

	// Calculate total
	for _, tweet := range tweets {
		thread.TotalCharacters += len([]rune(tweet.Text))
	}

	return thread, nil
}

func (r *RemixEngine) buildTwitterThread(insights []*TwitterInsight, handle, videoURL string) []*Tweet {
	var tweets []*Tweet

	// Hook tweet (Tweet 1)
	hookText := fmt.Sprintf("I made %d mistakes learning React hooks. Here's what I learned 🧵", len(insights))
	tweets = append(tweets, &Tweet{
		TweetNumber:    1,
		Text:           hookText,
		CharacterCount: len([]rune(hookText)),
		IsHook:         true,
		EngagementHook: "question",
	})

	// Value tweets (Tweets 2-N)
	for i, insight := range insights {
		// Split long insights into multiple tweets if needed
		tweetText := fmt.Sprintf("%d/%d\n\n%s", i+2, len(insights)+2, insight.Text)
		
		// Add hook prompt
		if i < len(insights)-1 {
			tweetText += "\n\n👇"
		}

		tweets = append(tweets, &Tweet{
			TweetNumber:    i + 2,
			Text:           tweetText,
			CharacterCount: len([]rune(tweetText)),
			IsHook:         false,
			EngagementHook: insight.Hook,
		})
	}

	// CTA tweet
	ctaText := fmt.Sprintf("%d/%d\n\nWant the full breakdown? 👇\n%s", len(insights)+2, len(insights)+2, videoURL)
	tweets = append(tweets, &Tweet{
		TweetNumber:    len(insights) + 2,
		Text:           ctaText,
		CharacterCount: len([]rune(ctaText)),
		IsHook:         false,
		EngagementHook: "cta",
	})

	return tweets
}

func truncateToCharLimit(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit-3]) + "..."
}
```

#### Quality Metrics: Twitter Threads

| Metric | Target |
|--------|--------|
| Tweets per thread | 5-15 |
| Character count per tweet | 20-280 |
| Hook tweet engagement rate | 8%+ |
| Value tweet clarity | No jargon without explanation |
| Thread flow (reader can skip tweets) | 100% |
| Generation time | < 1 minute |

---

### 2.4 Video → LinkedIn Post

**Input**: Video or transcript  
**Output**: Professional LinkedIn post (1200-1500 chars) + hashtags

#### Processing Pipeline

```
1. PROFESSIONAL ANGLE EXTRACTION
   - Identify business/career implications of content
   - Reframe technical/casual content for professional audience
   - Examples:
     * "React hooks mistakes" → "Why your team's React patterns cost you in velocity"
     * "Productivity tips" → "How to reclaim 10 hours/week in your engineering org"

2. THOUGHT LEADERSHIP FRAMING
   - Add authority markers:
     * "I've seen this pattern in 50+ codebases..."
     * "What I've learned over 10 years..."
     * "Controversial take: ..."
   - Transform from tutorial to opinion
   - Include personal story or hard-won insight

3. LINKEDIN FORMATTING
   - Use line breaks aggressively (LinkedIn counts as "more engagement")
   - Format:
     ```
     Hook (question or bold statement)

     ↓

     Story or context (2-3 sentences)

     ↓

     Key insight #1
     Key insight #2
     Key insight #3

     ↓

     CTA (comment, like, follow, watch video)
     ```

4. HASHTAG RESEARCH
   - Extract 5-8 relevant hashtags:
     * Primary: #React, #JavaScript (high volume)
     * Secondary: #SoftwareEngineering, #TechLead (medium volume)
     * Long-tail: #ReactPerformance, #MemoryLeaks (specific audience)
   - LinkedIn algorithm favors 2-3 hashtags (rest are noise)
   - Use top 3 in post, list all 8 for consideration

5. CTA OPTIMIZATION FOR LINKEDIN ALGORITHM
   - LinkedIn ranks posts with:
     * Early engagement (first 1 hour critical)
     * Comment engagement (not just likes)
     * Share-backs (watch video, external click)
   - Optimal CTAs:
     * "What's your take?" → encourages comments
     * "You've seen this?" → validates reader experience
     * "Thought-provoking" → generates responses
   - Avoid: "Like and share" (doesn't trigger engagement)

6. OUTPUT
   - Markdown with embedded video preview
   - Character count: 1200-1500 (sweet spot for algorithm)
   - Hashtag recommendations: top 3 + full list
```

#### Go Code Pattern: LinkedIn Post Generation

```go
package remix

type LinkedInPostRequest struct {
	Transcript    string
	VideoURL      string
	CreatorName   string
	CreatorTitle  string // "Software Engineer", "Tech Lead", etc.
	WorkspaceID   string
}

type LinkedInPost struct {
	PostText     string
	VideoPreview string
	Hashtags     []string // ordered by priority
	CharCount    int
	CTAType      string
}

func (r *RemixEngine) GenerateLinkedInPost(ctx context.Context, input *LinkedInPostRequest) (*LinkedInPost, error) {
	// Step 1: Extract professional angle
	professionalAngle, err := r.extractProfessionalAngle(ctx, input.Transcript)
	if err != nil {
		return nil, fmt.Errorf("professional angle: %w", err)
	}

	// Step 2: Generate thought leadership framing
	tlFraming := r.createThoughtLeadershipFraming(input.CreatorName, input.CreatorTitle, professionalAngle)

	// Step 3: Format for LinkedIn
	postText := r.formatLinkedInPost(tlFraming, professionalAngle)

	// Step 4: Generate hashtags
	hashtags := r.generateLinkedInHashtags(professionalAngle)

	// Step 5: Suggest CTA
	ctaType := "question" // "question", "validation", "contrast", etc.

	return &LinkedInPost{
		PostText:     postText,
		VideoPreview: input.VideoURL,
		Hashtags:     hashtags,
		CharCount:    len([]rune(postText)),
		CTAType:      ctaType,
	}, nil
}

func (r *RemixEngine) formatLinkedInPost(tlFraming, angle *ProfessionalAngle) string {
	var buf strings.Builder

	// Hook (bold, question, or surprising statement)
	buf.WriteString(fmt.Sprintf("I'm seeing a pattern that costs teams thousands of hours...\n\n"))

	// Story/context
	buf.WriteString(fmt.Sprintf("%s\n\n", tlFraming.Story))

	// Key insights (use simple bullet or number)
	buf.WriteString("Here's what I've learned:\n\n")
	for i, insight := range angle.KeyInsights {
		buf.WriteString(fmt.Sprintf("%d. %s\n\n", i+1, insight))
	}

	// CTA
	buf.WriteString("Curious? I break down the full approach (and where teams go wrong) in this video →\n")
	buf.WriteString(fmt.Sprintf("[Watch: %s]\n\n", tlFraming.VideoTitle))

	// Engagement hook
	buf.WriteString("What's your take? Have you seen this pattern in your org?\n\n")

	// Hashtag line
	buf.WriteString("#SoftwareEngineering #React #TechLeadership")

	return buf.String()
}
```

#### Quality Metrics: LinkedIn Posts

| Metric | Target |
|--------|--------|
| Character count | 1200-1500 |
| Professional framing | 100% (no casual language) |
| Hashtags (primary) | 2-3 |
| CTA clarity | "What's your take?" format |
| Generation time | < 1 minute |

---

### 2.5 Video → Instagram Carousel

**Input**: Video or transcript  
**Output**: 5-10 carousel slides (1080x1080) + caption

#### Processing Pipeline

```
1. KEY POINTS EXTRACTION (5-10 slides)
   - Parse transcript for distinct, visual concepts
   - AI identifies points that can be illustrated
   - Format as single-idea slides:
     * Slide 1: Hook/title
     * Slides 2-9: Value content (1 idea per slide)
     * Slide 10: CTA + follow

2. VISUAL SLIDE GENERATION
   - Per slide:
     a) Create design template (1080x1080 PNG)
     b) Add background color (from brand kit)
     c) Add text content (max 3 lines per slide)
     d) Optional: Add simple illustrations/icons (if relevant)
   
   - Tools:
     * Canvas library (Go): github.com/go-echarts/echarts-go or custom SVG
     * Or call external design API (Canva API, DALL-E for backgrounds)
   
   - Text hierarchy:
     * Title: 48pt bold, top center
     * Body: 32pt regular, center
     * Annotation: 24pt light, bottom

3. SLIDE 1: TITLE/HOOK SLIDE
   - Large, visual title
   - "5 React Hooks Mistakes"
   - Subtitled with "Swipe for..." or emoji arrow

4. SLIDES 2-9: VALUE CONTENT
   - One concept per slide
   - Format:
     * Title (what's this about)
     * 1-2 sentences explanation
     * Icon or color-coded background
   - Examples:
     ```
     Slide 2: "The Cleanup Function"
     "Your effects need cleanup just like event listeners."
     [background: gradient blue]
     
     Slide 3: "The Dependency Array"
     "Controls when effects re-run. Miss it = bugs everywhere."
     [background: gradient orange]
     ```

5. CAROUSEL CAPTION
   - Intro hook (first 125 chars show before "more")
   - Description of all slides
   - CTA: "Watch the full video" with link
   - Hashtags: 10-15 (Instagram allows high density)
   - Format:
     ```
     5 React mistakes that cost your startup $100K/year 📉

     Swipe through for each mistake + how to fix it:

     1️⃣ Missing cleanup functions (causes memory leaks)
     2️⃣ Ignoring the dependency array (effects run everywhere)
     3️⃣ Creating new objects in dependencies (infinite loops)
     4️⃣ Using hooks conditionally (breaks the rules)
     5️⃣ Forgetting about closure traps (state lag bugs)

     Watch the full breakdown → [link in bio]

     #React #JavaScript #WebDevelopment #ReactHooks #Programming...
     ```

6. SLIDE ORDERING
   - Ensure maximum swipe-through
   - Most engaging slides in positions 2-3 (after hook)
   - CTA slide last (strongest call-to-action)

7. OUTPUT STORAGE
   - Store each slide as PNG in S3
   - Keys: `/carousel/{workspace_id}/{piece_id}/slide-{1-10}.png`
   - Return JSON with:
     ```json
     {
       "carousel_id": "...",
       "slides": [
         {
           "slide_number": 1,
           "s3_url": "...",
           "alt_text": "Title slide..."
         },
         ...
       ],
       "caption": "...",
       "hashtags": ["#React", ...]
     }
     ```
```

#### Go Code Pattern: Carousel Generation

```go
package remix

import (
	"image"
	"image/color"
	"image/png"
	"github.com/fogleman/gg" // Simple drawing library
)

type CarouselSlide struct {
	SlideNumber int
	Title       string
	Body        string
	BackgroundColor color.Color
	S3URL       string
}

type InstagramCarousel struct {
	Slides   []*CarouselSlide
	Caption  string
	Hashtags []string
}

func (r *RemixEngine) GenerateCarousel(ctx context.Context, transcript, brandColor string) (*InstagramCarousel, error) {
	// Step 1: Extract key points (5-10)
	keyPoints, err := r.extractCarouselKeyPoints(ctx, transcript)
	if err != nil {
		return nil, fmt.Errorf("key points: %w", err)
	}

	var slides []*CarouselSlide

	// Step 2: Title slide
	titleSlide := r.createTitleSlide("5 React Hooks Mistakes", brandColor)
	slides = append(slides, titleSlide)

	// Step 3: Content slides
	colors := []color.Color{
		color.RGBA{66, 133, 244, 255},   // Blue
		color.RGBA{251, 188, 5, 255},    // Yellow
		color.RGBA{52, 168, 83, 255},    // Green
		color.RGBA{225, 72, 72, 255},    // Red
		color.RGBA{156, 39, 176, 255},   // Purple
	}

	for i, point := range keyPoints {
		slide := &CarouselSlide{
			SlideNumber:     i + 2,
			Title:           point.Title,
			Body:            point.Description,
			BackgroundColor: colors[i%len(colors)],
		}

		// Generate slide image
		imgPath, err := r.generateCarouselSlideImage(slide)
		if err != nil {
			return nil, fmt.Errorf("slide %d generation: %w", i+2, err)
		}

		// Upload to S3
		s3URL, err := r.s3Client.Upload(ctx, imgPath, 
			fmt.Sprintf("carousel/%s/slide-%d.png", "workspace_id", i+2))
		if err != nil {
			return nil, fmt.Errorf("s3 upload slide %d: %w", i+2, err)
		}

		slide.S3URL = s3URL
		slides = append(slides, slide)
	}

	// Step 4: CTA slide
	ctaSlide := &CarouselSlide{
		SlideNumber:     len(slides) + 1,
		Title:           "Want the full breakdown?",
		Body:            "Tap the link in bio to watch the video",
		BackgroundColor: color.RGBA{0, 0, 0, 255},
	}
	imgPath, _ := r.generateCarouselSlideImage(ctaSlide)
	s3URL, _ := r.s3Client.Upload(ctx, imgPath, 
		fmt.Sprintf("carousel/%s/slide-%d.png", "workspace_id", len(slides)+1))
	ctaSlide.S3URL = s3URL
	slides = append(slides, ctaSlide)

	// Step 5: Generate caption
	caption := r.generateCarouselCaption(keyPoints)
	hashtags := r.generateInstagramHashtags("React", "JavaScript")

	return &InstagramCarousel{
		Slides:   slides,
		Caption:  caption,
		Hashtags: hashtags,
	}, nil
}

func (r *RemixEngine) generateCarouselSlideImage(slide *CarouselSlide) (string, error) {
	dc := gg.NewContext(1080, 1080)

	// Background
	dc.SetColor(slide.BackgroundColor)
	dc.Clear()

	// Title
	dc.SetColor(color.White)
	dc.SetFontSize(48)
	dc.LoadFontFace("/fonts/bold.ttf", 48)
	dc.DrawStringAnchored(slide.Title, 540, 300, 0.5, 0.5)

	// Body
	dc.SetFontSize(32)
	dc.LoadFontFace("/fonts/regular.ttf", 32)
	dc.DrawStringAnchored(slide.Body, 540, 700, 0.5, 0.5)

	// Save to temp
	outputPath := fmt.Sprintf("/tmp/slide-%d.png", slide.SlideNumber)
	return outputPath, dc.SavePNG(outputPath)
}
```

#### Quality Metrics: Instagram Carousels

| Metric | Target |
|--------|--------|
| Slides per carousel | 5-10 |
| Slide dimensions | 1080x1080 (1:1) |
| Text readability | No more than 3 lines per slide |
| Caption character count | 300-500 |
| Hashtags | 10-15 |
| Generation time (5 slides) | < 2 minutes |

---

### 2.6 Video → Newsletter Section

**Input**: Video content  
**Output**: HTML-formatted newsletter section (200-300 words)

#### Processing Pipeline

```
1. SUMMARY GENERATION
   - GPT-4 creates 2-3 paragraph executive summary
   - Format: What + Why + How
   - Tone: Email-friendly (friendly, not salesy)
   - Length: 200-300 words

2. KEY TAKEAWAY BULLETS
   - Extract 3-5 actionable takeaways
   - Format: "You can X by doing Y"
   - Concrete, not abstract

3. VIDEO CTA SECTION
   - "Want the full breakdown?"
   - "Watch the 28-minute video →"
   - Track via unique UTM parameter: utm_source=newsletter&utm_campaign={piece_id}

4. SUBJECT LINE SUGGESTIONS
   - Generate 5 subject line variations
   - Optimized for:
     * Open rate (curiosity gap, specificity)
     * Click-through rate (action word, benefit)
   - Examples:
     * "5 React mistakes that cost you 10 hours/week"
     * "I spent $100K learning React the wrong way"
     * "The React hook everyone gets wrong"

5. PREVIEW TEXT OPTIMIZATION
   - First 100 chars of email content
   - Must be compelling + distinct from subject
   - Avoid: "Forward to a friend" boilerplate

6. HTML FORMATTING
   - Output: Ready-to-paste HTML email template
   - Compatible with: Mailchimp, ConvertKit, Beehiiv
   - Includes:
     * Responsive layout (mobile-first)
     * Brand colors (from workspace brand kit)
     * Click-tracking on CTA button
     * Fallback plain text version

7. OUTPUT
   ```json
   {
     "newsletter_section": {
       "html": "<html>...</html>",
       "plain_text": "...",
       "estimated_read_time": "2 min"
     },
     "subject_lines": [
       {
         "text": "...",
         "type": "curiosity_gap",
         "estimated_open_rate": 0.28
       },
       ...
     ],
     "preview_text": "In this breakdown, I reveal the 5 React mistakes...",
     "utm_tracking": "utm_source=newsletter&utm_campaign=..."
   }
   ```
```

#### Quality Metrics: Newsletter Sections

| Metric | Target |
|--------|--------|
| Summary word count | 200-300 |
| Bullet points | 3-5 |
| Subject line variations | 5 |
| HTML email readability | Mobile + desktop tested |
| CTA click-through rate | 15%+ |
| Generation time | < 90 seconds |

---

### 2.7 Blog Post → Social Posts (Batch)

**Input**: Published blog post  
**Output**: 3-5 platform-specific posts

#### Processing Pipeline

```
1. EXTRACT KEY QUOTES & STATS
   - Identify 3-5 memorable quotes from blog
   - Find statistics or data points
   - Format for social sharing

2. GENERATE PLATFORM VARIANTS
   For Twitter: Quote tweet format
   For LinkedIn: Professional/opinion angle
   For Instagram: Visual quote + story

3. HASHTAG RECOMMENDATION
   - Per platform optimized hashtags
```

---

### 2.8 Podcast → Content Suite

**Input**: Audio file + show notes  
**Output**: Full content ecosystem

```
Transcription → Blog Post → Timestamps + Quote Cards → Social Clips
```

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      REMIX ENGINE - ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Web Uploader   │ (API: POST /api/remix/upload)
│   (React)        │
└────────┬─────────┘
         │ Upload video/podcast/blog
         ▼
┌──────────────────────────────────────┐
│  Storage Layer (S3/R2 + CDN)         │
│  - Input files                       │
│  - Transcripts (cached)              │
│  - Generated outputs                 │
│  - Thumbnails/metadata               │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Job Queue (Redis/NATS)             │
│   - QUEUED → PROCESSING → DONE       │
└────────┬─────────────────────────────┘
         │
    ┌────┴──────────┬─────────────────┬──────────────────┐
    ▼               ▼                 ▼                  ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
│ Worker 1 │  │ Worker 2 │  │ Worker N     │  │ AI Service   │
│ (Go)     │  │ (Go)     │  │ (Go)         │  │ (OpenAI,     │
│          │  │          │  │              │  │  Whisper)    │
└──────────┘  └──────────┘  └──────────────┘  └──────────────┘
    │              │              │                  │
    └──────────────┴──────────────┴──────────────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │  Processing Pipeline        │
    │  (parallel operations)      │
    │  1. Transcription (Whisper) │
    │  2. Analysis (GPT-4)        │
    │  3. Clip generation (FFmpeg)│
    │  4. Social post gen (GPT-4) │
    └─────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │  Review Queue               │
    │  (human approval required)  │
    └─────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │  Publishing Calendar        │
    │  (schedule + publish)       │
    └─────────────────────────────┘
```

### 3.2 Go Backend Architecture

```go
// remix/engine.go - Main orchestration

package remix

import (
	"context"
	"github.com/go-redis/redis/v8"
	"github.com/openai/openai-go"
	"github.com/u2takey/ffmpeg-go"
)

type RemixEngine struct {
	// Storage
	s3Client       *S3Client
	cdnClient      *CDNClient
	
	// Job queue
	jobQueue       redis.Cmdable
	
	// AI services
	openaiClient   *openai.Client
	whisperClient  *WhisperClient
	
	// Workers
	workerPool     *WorkerPool
	
	// Caching
	cacheStore     *CacheStore // Redis + in-memory for transcripts
}

// Job states
const (
	JobQueued      = "QUEUED"
	JobTranscribing = "TRANSCRIBING"
	JobAnalyzing   = "ANALYZING"
	JobGenerating  = "GENERATING"
	JobReview      = "REVIEW"
	JobApproved    = "APPROVED"
	JobScheduled   = "SCHEDULED"
	JobPublished   = "PUBLISHED"
)

type RemixJob struct {
	JobID          string
	WorkspaceID    string
	UserID         string
	SourceType     string // "video", "podcast", "blog"
	SourceURL      string // YouTube URL, S3 path, blog URL
	OutputTypes    []string // ["clip", "blog", "thread", ...]
	Status         string
	Progress       int // 0-100
	CreatedAt      time.Time
	UpdatedAt      time.Time
	CompletedAt    *time.Time
	Results        map[string]interface{} // Output URLs by type
	ErrorMessage   *string
}

// ProcessRemixJob is the main entry point
func (r *RemixEngine) ProcessRemixJob(ctx context.Context, job *RemixJob) error {
	// Update status: QUEUED
	job.Status = JobTranscribing
	r.updateJobStatus(ctx, job)

	// Step 1: Fetch source content
	sourceFile, err := r.fetchSource(ctx, job.SourceURL)
	if err != nil {
		return fmt.Errorf("fetch source: %w", err)
	}

	// Step 2: Transcription (with caching)
	transcript, err := r.transcribeWithCache(ctx, job.JobID, sourceFile)
	if err != nil {
		return fmt.Errorf("transcription: %w", err)
	}

	// Update status: ANALYZING
	job.Status = JobAnalyzing
	job.Progress = 25
	r.updateJobStatus(ctx, job)

	// Step 3: AI analysis (parallel)
	analysisResults := r.analyzeContentInParallel(ctx, transcript, job.OutputTypes)

	// Update status: GENERATING
	job.Status = JobGenerating
	job.Progress = 50
	r.updateJobStatus(ctx, job)

	// Step 4: Generate outputs in parallel
	outputs, err := r.generateOutputsInParallel(ctx, sourceFile, transcript, analysisResults, job.OutputTypes)
	if err != nil {
		return fmt.Errorf("output generation: %w", err)
	}

	// Store results
	job.Results = outputs
	job.Status = JobReview
	job.Progress = 90
	r.updateJobStatus(ctx, job)

	// Update status: REVIEW
	job.CompletedAt = ptr(time.Now())
	job.Progress = 100
	r.updateJobStatus(ctx, job)

	return nil
}

// Helper: parallel processing
func (r *RemixEngine) generateOutputsInParallel(
	ctx context.Context,
	sourceFile io.Reader,
	transcript string,
	analysis map[string]interface{},
	outputTypes []string,
) (map[string]interface{}, error) {
	results := make(map[string]interface{})
	errChan := make(chan error, len(outputTypes))
	resultChan := make(chan struct {
		key   string
		value interface{}
	}, len(outputTypes))

	for _, outputType := range outputTypes {
		go func(ot string) {
			switch ot {
			case "clip":
				clips, err := r.GenerateClips(ctx, &ClipRequest{...})
				resultChan <- struct {
					key   string
					value interface{}
				}{"clips", clips}
				errChan <- err
			case "blog":
				blog, err := r.GenerateBlogPost(ctx, &BlogPostRequest{...})
				resultChan <- struct {
					key   string
					value interface{}
				}{"blog", blog}
				errChan <- err
			case "thread":
				thread, err := r.GenerateTwitterThread(ctx, &TwitterThreadRequest{...})
				resultChan <- struct {
					key   string
					value interface{}
				}{"thread", thread}
				errChan <- err
			// ... more output types
			}
		}(outputType)
	}

	// Collect results
	for i := 0; i < len(outputTypes); i++ {
		if err := <-errChan; err != nil {
			return nil, err
		}
		result := <-resultChan
		results[result.key] = result.value
	}

	return results, nil
}

// Caching layer for transcripts
func (r *RemixEngine) transcribeWithCache(ctx context.Context, jobID string, sourceFile io.Reader) (string, error) {
	// Check cache
	if cached, exists := r.cacheStore.Get(jobID); exists {
		return cached, nil
	}

	// Transcribe via Whisper
	transcript, err := r.whisperClient.Transcribe(ctx, sourceFile)
	if err != nil {
		return "", err
	}

	// Store in cache (TTL: 24 hours)
	r.cacheStore.Set(jobID, transcript, 24*time.Hour)

	return transcript, nil
}
```

### 3.3 Job State Machine

```
QUEUED
  ↓
TRANSCRIBING (fetch source + Whisper transcription)
  ↓
ANALYZING (GPT-4 segment scoring + insight extraction)
  ↓
GENERATING (clip extraction, post generation, etc.)
  ↓
REVIEW (human approval required before publishing)
  ↓
APPROVED (creator clicked "approve all" or approved individual pieces)
  ↓
SCHEDULED (pieces added to publishing calendar)
  ↓
PUBLISHED (scheduler auto-publishes at scheduled time)
```

### 3.4 Performance Targets

| Task | Input | Output | Target Time |
|------|-------|--------|-------------|
| Transcription | 10-min video | Full transcript | 2 minutes |
| Engagement scoring | Transcript | Segment scores | 1 minute |
| Clip generation | Transcript + video | 8 clips (3 variants each) | 3 minutes |
| Blog post | Transcript | 1000-word post | 90 seconds |
| Twitter thread | Transcript | 10-tweet thread | 60 seconds |
| All outputs (full remix) | 30-min video | 15+ pieces | < 10 minutes |

### 3.5 Error Handling & Resilience

```go
// Circuit breaker pattern for AI services
type CircuitBreaker struct {
	failureThreshold int
	successThreshold int
	timeout          time.Duration
	state            string // "CLOSED", "OPEN", "HALF_OPEN"
	failureCount     int
	successCount     int
	lastFailureTime  time.Time
}

func (cb *CircuitBreaker) Call(fn func() error) error {
	switch cb.state {
	case "CLOSED":
		err := fn()
		if err != nil {
			cb.failureCount++
			cb.lastFailureTime = time.Now()
			if cb.failureCount >= cb.failureThreshold {
				cb.state = "OPEN"
				return fmt.Errorf("circuit breaker OPEN: too many failures")
			}
			return err
		}
		cb.failureCount = 0
		return nil
	
	case "OPEN":
		if time.Since(cb.lastFailureTime) > cb.timeout {
			cb.state = "HALF_OPEN"
			cb.successCount = 0
			return cb.Call(fn)
		}
		return fmt.Errorf("circuit breaker OPEN: recovery timeout not reached")
	
	case "HALF_OPEN":
		err := fn()
		if err != nil {
			cb.state = "OPEN"
			cb.lastFailureTime = time.Now()
			return err
		}
		cb.successCount++
		if cb.successCount >= cb.successThreshold {
			cb.state = "CLOSED"
			cb.failureCount = 0
		}
		return nil
	}
	return fmt.Errorf("unknown circuit breaker state: %s", cb.state)
}

// Fallback strategies
func (r *RemixEngine) transcribeWithFallback(ctx context.Context, sourceFile io.Reader) (string, error) {
	// Primary: OpenAI Whisper
	cb := NewCircuitBreaker(5, 2, 30*time.Second) // fail after 5, recover after 2 successes
	
	transcript, err := cb.Call(func() error {
		t, err := r.whisperClient.Transcribe(ctx, sourceFile)
		if err != nil {
			return err
		}
		return nil
	})
	if err == nil {
		return transcript.(string), nil
	}

	// Fallback: AssemblyAI (secondary service)
	transcript, err = r.assemblyAIClient.Transcribe(ctx, sourceFile)
	if err == nil {
		return transcript, nil
	}

	// Last resort: Queue for manual transcription
	r.queueForManualTranscription(sourceFile)
	return "", fmt.Errorf("all transcription services failed; queued for manual processing")
}
```

---

## 4. User Experience Flow

### 4.1 Happy Path: Video → All Outputs

```
1. CREATOR UPLOADS VIDEO
   Web UI: Click "Remix" tab → Upload video (drag & drop)
   ↓

2. SYSTEM ANALYZES
   Real-time progress bar: "Transcribing... 40%"
   (WebSocket updates every 2 seconds)
   ↓

3. REMIX SHOWS AVAILABLE TRANSFORMATIONS
   "Your video is ready for:"
   - [ ] 8 Short clips (TikTok, Reels, Shorts)
   - [ ] Blog post (800 words, SEO optimized)
   - [ ] Twitter thread (12 tweets)
   - [ ] LinkedIn post (1500 chars)
   - [ ] Instagram carousel (6 slides)
   - [ ] Newsletter section (300 words)
   
   Creator selects all or subset
   ↓

4. GENERATION BEGINS
   Progress: "Generating 15 outputs..."
   - Clip 1 of 8: Ready → 12 seconds video
   - Clip 2 of 8: Processing...
   - Blog Post: Processing...
   ↓

5. OUTPUTS APPEAR IN REVIEW QUEUE
   Each piece shows:
   - Thumbnail/preview
   - Platform
   - Engagement score estimate
   - Edit button
   - Approve/Reject buttons
   ↓

6. CREATOR REVIEWS & EDITS
   - Quick edits inline (captions, hashtags, CTAs)
   - Or open in native editor (e.g., video editor for clips)
   ↓

7. BULK APPROVE & SCHEDULE
   - "Approve all" button (with checksum verification)
   - Pieces move to Publishing Calendar
   - Smart scheduling: stagger across platforms
   ↓

8. PIECES PUBLISH ON SCHEDULE
   - YouTube: Thursday 10 AM
   - TikTok: Thursday 11 AM
   - LinkedIn: Thursday 12 PM
   - Twitter: Thursday 1 PM
   
   Creator can watch real-time analytics
```

### 4.2 Detailed Interaction: Clip Review

```
Clip Card:
┌─────────────────────────────────┐
│ [Thumbnail] 30s clip            │
│ Platform: TikTok                │
│ Duration: 30 seconds            │
│ Aspect: 9:16                    │
│ Engagement Score: 0.87 ⭐⭐⭐⭐⭐ │
│                                 │
│ "This is the #1 React mistake..." │
│                                 │
│ [Preview] [Edit] [Approve] [X]  │
└─────────────────────────────────┘

Clicking [Edit]:
- Opens inline caption editor
- Can adjust text, colors, timing
- Play button to preview changes
- Auto-detects if text too long for platform

Clicking [Preview]:
- Full-screen video player
- Shows how it will look on TikTok/Reels/Shorts
- Display platform logo, view counter mockup
- Plays captions with brand styling

Clicking [Approve]:
- Adds to "Approved" queue
- Next: choose which platforms to publish to
- Then: select scheduling date/time
```

### 4.3 WebSocket Architecture for Real-Time Progress

```go
// websocket.go - Real-time progress updates

package remix

type ProgressUpdate struct {
	JobID      string    `json:"job_id"`
	Status     string    `json:"status"` // TRANSCRIBING, ANALYZING, etc.
	Progress   int       `json:"progress"` // 0-100
	Stage      string    `json:"stage"` // "Generating Twitter thread..."
	Completed  []string  `json:"completed"` // ["clip-1", "blog-post"]
	Total      int       `json:"total"` // Total expected outputs
	Timestamp  time.Time `json:"timestamp"`
}

// BroadcastProgress sends update to creator's WebSocket connection
func (r *RemixEngine) BroadcastProgress(jobID string, update *ProgressUpdate) error {
	wsConns := r.wsHub.GetConnections(jobID)
	for _, conn := range wsConns {
		if err := conn.WriteJSON(update); err != nil {
			// Log error but don't block
			log.Errorf("ws write error: %v", err)
		}
	}
	return nil
}

// Example: Sending progress during clip generation
func (r *RemixEngine) GenerateClips(ctx context.Context, input *ClipRequest) ([]*ClipOutput, error) {
	totalClips := len(input.TargetDurations) * len(input.AspectRatios)
	completed := 0

	for i, clip := range generatedClips {
		r.BroadcastProgress(input.JobID, &ProgressUpdate{
			JobID:     input.JobID,
			Status:    "GENERATING",
			Progress:  int(float64(completed) / float64(totalClips) * 100),
			Stage:     fmt.Sprintf("Generating clip %d of %d", i+1, totalClips),
			Completed: []string{clip.ClipID},
			Total:     totalClips,
		})
		completed++
	}

	return generatedClips, nil
}
```

---

## 5. AI Quality Controls

### 5.1 Quality Scoring System

Every generated piece receives a score (0-100):

```go
type QualityScore struct {
	Overall            int `json:"overall"` // 0-100
	BrandVoiceMatch    int `json:"brand_voice_match"` // Does tone match creator's style?
	FactualAccuracy    int `json:"factual_accuracy"` // Does it match source content?
	PlatformCompliance int `json:"platform_compliance"` // Format, length, guidelines
	Engagement         int `json:"engagement"` // Predicted engagement score
	Originality        int `json:"originality"` // No plagiarism/duplication
	Readability        int `json:"readability"` // Flesch-Kincaid, clarity
}

// Calculation
func (r *RemixEngine) CalculateQualityScore(piece *GeneratedPiece) *QualityScore {
	// Weight: 30% brand voice, 20% accuracy, 20% platform, 20% engagement, 10% originality
	overall := (
		piece.BrandVoiceMatch*30 +
		piece.FactualAccuracy*20 +
		piece.PlatformCompliance*20 +
		piece.Engagement*20 +
		piece.Originality*10,
	) / 100

	return &QualityScore{
		Overall:            overall,
		BrandVoiceMatch:    piece.BrandVoiceMatch,
		FactualAccuracy:    piece.FactualAccuracy,
		PlatformCompliance: piece.PlatformCompliance,
		Engagement:         piece.Engagement,
		Originality:        piece.Originality,
	}
}
```

### 5.2 Brand Voice Consistency Check

```go
// Verify generated content matches creator's voice

func (r *RemixEngine) CheckBrandVoiceMatch(ctx context.Context, piece string, brandKit *BrandKit) (int, error) {
	// Analyze creator's existing content samples
	samples := r.fetchCreatorContentSamples(brandKit.WorkspaceID, 10) // Last 10 pieces
	
	// Extract voice markers: tone, vocabulary, structure, emoji usage
	voiceProfile := r.analyzeVoiceProfile(samples)
	
	// Compare generated piece to profile
	prompt := fmt.Sprintf(`
	Creator's voice profile:
	- Tone: %s (formal/casual/funny)
	- Vocabulary level: %s (academic/conversational)
	- Emoji usage: %s (0-20 per post)
	- Structure preference: %s (short para/long-form)
	
	Generated piece:
	%s
	
	Rate how well this piece matches the creator's voice (0-100).
	`, voiceProfile.Tone, voiceProfile.VocabLevel, voiceProfile.EmojiUsage, 
		voiceProfile.StructurePreference, piece)
	
	resp, err := r.openaiClient.CreateChatCompletion(ctx, &openai.ChatCompletionRequest{
		Model: "gpt-4",
		Messages: []openai.ChatCompletionMessage{
			{Role: "system", Content: "You are a content voice analyst. Rate quality 0-100."},
			{Role: "user", Content: prompt},
		},
	})
	
	score := parseScore(resp.Choices[0].Message.Content)
	return score, nil
}
```

### 5.3 Factual Accuracy Verification

```go
// Verify generated content doesn't introduce false claims

func (r *RemixEngine) VerifyFactualAccuracy(ctx context.Context, piece string, sourceTranscript string) (int, error) {
	// Extract key claims from generated piece
	claims := r.extractClaims(piece)
	
	// Verify against source transcript
	for claim := range claims {
		if !r.claimExistsInSource(claim, sourceTranscript) {
			// False claim detected
			return 0, fmt.Errorf("claim not supported by source: %s", claim)
		}
	}
	
	return 95, nil // All claims verified
}
```

### 5.4 Platform Compliance Check

```go
// Verify format, length, guidelines per platform

type PlatformRules struct {
	MaxLength       int      // characters
	MinLength       int
	RecommendedFormat string // "short-form", "thread", etc.
	AspectRatios    []string
	CaptionRequired bool
	HashtagLimit    int
	Guidelines      []string // platform-specific rules
}

var PlatformCompliance = map[string]*PlatformRules{
	"TikTok": {
		MaxLength:       500,
		RecommendedFormat: "15-60s video",
		AspectRatios:    []string{"9:16"},
		CaptionRequired: true,
		HashtagLimit:    10,
	},
	"Twitter": {
		MaxLength:       280,
		MinLength:       10,
		RecommendedFormat: "single-tweet or thread",
		Guidelines:      []string{"No external links in body", "Use CTA in last tweet"},
	},
	// ... more platforms
}

func (r *RemixEngine) CheckPlatformCompliance(piece *GeneratedPiece) (int, error) {
	rules := PlatformCompliance[piece.Platform]
	
	violations := 0
	if len(piece.Content) > rules.MaxLength {
		violations++
	}
	if piece.AspectRatio != "" && !contains(rules.AspectRatios, piece.AspectRatio) {
		violations++
	}
	if piece.Platform == "Twitter" && strings.Contains(piece.Content, "http") {
		violations++
	}
	
	score := 100 - (violations * 10)
	return score, nil
}
```

### 5.5 Human-in-the-Loop Review

**Critical Rule**: All generated content requires human approval before publishing.

```
User sees quality scores but MUST:
1. Review each piece (can't bulk-approve without viewing)
2. Explicitly click "Approve" (no auto-publish)
3. Confirm platform selection
4. Set publish date/time

System prevents:
- Publishing without explicit approval
- Scheduling to wrong platform
- Publishing low-quality pieces (score < 60) without warning
```

---

## 6. Credit System

### 6.1 Credit Costs

| Transformation | Credits | Notes |
|---|---|---|
| Short clip extraction | 5 | Per clip (includes encoding to 3 aspect ratios) |
| Blog post generation | 10 | Includes SEO optimization, image extraction |
| Twitter thread | 3 | Includes hashtag research |
| LinkedIn post | 3 | Includes hashtag research |
| Instagram carousel | 8 | Includes all slide design + caption |
| Newsletter section | 5 | Includes subject line variations |
| **Full remix (all outputs)** | 25 | **30% bundle discount** |

### 6.2 Credit Tiering

| Plan | Monthly Credits | Remix Limit |
|---|---|---|
| Free | 20 | 1 full remix/month |
| Pro | 100 | 4 full remixes/month |
| Studio | 500 | Unlimited |

---

## 7. Competitive Analysis

### Comparison Matrix

| Feature | Ordo | Opus Clip | Repurpose.io | Descript | Kapwing |
|---|---|---|---|---|---|
| Video → Short clips | ✅ Auto | ✅ Manual | ✅ Auto | ❌ | ❌ |
| Video → Blog post | ✅ Full | ❌ | ❌ | ✅ Partial | ❌ |
| Video → Twitter thread | ✅ Full | ❌ | ✅ Auto | ❌ | ❌ |
| Engagement scoring | ✅ ML-powered | ❌ | ✅ Basic | ❌ | ❌ |
| Brand voice learning | ✅ | ❌ | ❌ | ❌ | ❌ |
| Direct publishing | ✅ Upcoming | ✅ | ✅ | ✅ | ✅ |
| Integrated calendar | ✅ | ❌ | ✅ | ❌ | ❌ |
| AI quality scoring | ✅ | ❌ | ❌ | ❌ | ❌ |

### Key Advantages

1. **Brand Learning**: Ordo learns your voice across 50+ pieces. Competitors don't personalize.
2. **Full Pipeline**: One place to create, remix, review, schedule, publish. Others are point solutions.
3. **Engagement Prediction**: ML model predicts viral moments; competitors use basic keyword matching.
4. **Integrated Analytics**: See which platforms perform best for each content type.

---

## 8. Future Capabilities (Roadmap)

### Phase 2 (Q2 2026)

- **AI-Powered Video Editing**: Auto-remove ums, cut dead air, add transitions
- **Voice Cloning**: Generate multi-language versions using creator's voice
- **Auto-Thumbnail Generation**: DALL-E-powered thumbnails with A/B testing
- **Live Stream → Content Suite**: Real-time processing of live streams into 10+ pieces

### Phase 3 (Q3 2026)

- **Trend-Aware Suggestions**: "This trending topic matches your content. Remake as..."
- **Competitor Content Monitoring**: "Your competitor posted similar content. Here's how to one-up them"
- **Multi-Creator Collaboration**: Teams can remix together with unified approval flow

### Phase 4 (Q4 2026)

- **Auto-Analytics Synth**: Weekly email: "Your React content gets 35% more engagement than productivity content"
- **Content Performance Prediction**: "This clip will get 50K views" (pre-publishing)
- **Smart Monetization**: Auto-suggests which pieces to gate behind paywall/sponsorship

---

## 9. Implementation Roadmap

### Milestone 1: MVP (Week 1-4)
- [ ] Video → Short clips (core engine)
- [ ] Video → Blog post (basic)
- [ ] Basic quality scoring
- [ ] Review queue + approval flow
- [ ] Integration with publishing calendar

### Milestone 2: Full Feature Set (Week 5-8)
- [ ] All transformations (Twitter, LinkedIn, Instagram, Newsletter)
- [ ] Brand voice learning
- [ ] Advanced engagement scoring
- [ ] Batch operations
- [ ] Analytics integration

### Milestone 3: Polish & Performance (Week 9-12)
- [ ] Performance optimization (< 5 min full remix)
- [ ] Error recovery & resilience
- [ ] User education (onboarding, tutorials)
- [ ] Beta feedback integration

---

## 10. Success Metrics

### User Adoption

| Metric | Target | Measurement |
|---|---|---|
| % of creators using Remix | 40% in 30 days | Analytics tracking |
| Avg pieces repurposed/week | 2+ | Job queue logs |
| Approval rate | 85%+ | Review queue metrics |

### Content Impact

| Metric | Target | Measurement |
|---|---|---|
| Repurposed content engagement | 70% of original | Social media analytics |
| Blog post SEO ranking | Top 3 (keywords) | SEO tool integration |
| Creator growth (Remix users) | 35% higher | Cohort analysis |

### Technical

| Metric | Target | Measurement |
|---|---|---|
| Average processing time (30-min video) | < 10 minutes | Job logs |
| Transcription accuracy | 95%+ | Human verification sample |
| Video rendering success rate | 99.5%+ | FFmpeg logs |

---

## 11. Security & Compliance

### Data Privacy

- User content stored in S3 with workspace-level encryption
- Transcripts cached per-workspace (no cross-workspace leakage)
- GDPR compliance: Data deletion on workspace deletion
- SOC 2 compliance: Audit logs for all content access

### Content Rights

- Remix operates only on user's own content
- No scraping or third-party content processing
- Terms of Service: User retains copyright of outputs

### API Rate Limiting

```go
// Per-workspace rate limits
RateLimits := map[string]int{
	"UploadVideo":          10,  // per hour
	"GenerateRemix":        5,   // per hour
	"BulkApprove":          20,  // per day
	"SchedulePublish":      50,  // per day
}
```

---

## 12. Glossary

| Term | Definition |
|---|---|
| **Viral Moment** | Content segment with high engagement potential (hook, surprise, emotional peak) |
| **Engagement Score** | ML-computed likelihood of user interaction (0-1) |
| **Brand Voice** | Creator's unique tone, vocabulary, structure preferences |
| **Aspect Ratio** | Width:height dimensions (9:16 = vertical, 1:1 = square, 16:9 = horizontal) |
| **Remix Job** | Single transformation task (e.g., "video → 8 clips + blog + thread") |
| **Review Queue** | Human-approval stage before publishing |
| **Platform Compliance** | Does output meet platform's technical + guideline requirements? |

---

## 13. Appendix: Code Examples

### A1. Complete Clip Generation Flow

```go
package remix

import (
	"context"
	"sync"
	"time"
)

// Full workflow for video → short clips
func (r *RemixEngine) ProcessVideoToClips(ctx context.Context, jobID, videoURL string) error {
	// Log job start
	r.logger.Infof("Processing video %s for clips", jobID)

	// 1. Fetch video from source
	videoFile, err := r.downloadVideo(ctx, videoURL)
	if err != nil {
		return fmt.Errorf("download video: %w", err)
	}
	defer videoFile.Close()

	// 2. Transcribe with caching
	transcript, err := r.transcribeWithCache(ctx, jobID, videoFile)
	if err != nil {
		return fmt.Errorf("transcription failed: %w", err)
	}

	// 3. Analyze segments for engagement
	segments, err := r.analyzeSegmentsForEngagement(ctx, transcript)
	if err != nil {
		return fmt.Errorf("segment analysis: %w", err)
	}

	// 4. Select top clips (parallel processing)
	topSegments := r.selectTopSegments(segments, 8) // Get 8 best clips
	
	var (
		clips []*ClipOutput
		mu    sync.Mutex
		wg    sync.WaitGroup
	)

	for _, segment := range topSegments {
		wg.Add(1)
		go func(seg *Segment) {
			defer wg.Done()
			
			// Generate 3 aspect ratio variants
			variantClips, err := r.generateClipVariants(ctx, videoFile, seg)
			if err != nil {
				r.logger.Errorf("clip generation failed for segment %d: %v", seg.ID, err)
				return
			}

			mu.Lock()
			clips = append(clips, variantClips...)
			mu.Unlock()
		}(segment)
	}

	wg.Wait()

	// 5. Store results in S3
	for _, clip := range clips {
		if err := r.storeClip(ctx, jobID, clip); err != nil {
			r.logger.Errorf("failed to store clip: %v", err)
		}
	}

	// 6. Publish to review queue
	r.jobQueue.Publish("remix:review", &RemixReviewPayload{
		JobID: jobID,
		Type:  "clips",
		Count: len(clips),
	})

	return nil
}
```

### A2. FFmpeg Integration Pattern

```go
package remix

import (
	ffmpeg "github.com/u2takey/ffmpeg-go"
	"os/exec"
)

// Wrapper around FFmpeg for safe, reliable transcoding
type FFmpegTranscoder struct {
	timeout time.Duration
	logger  Logger
}

func (t *FFmpegTranscoder) TranscodeClip(
	inputPath string,
	outputPath string,
	startTime float64,
	duration float64,
	targetResolution string, // "1080x1920" for 9:16, etc.
) error {
	// Build FFmpeg command
	stream := ffmpeg.Input(inputPath).
		Trim(startTime, startTime+duration).
		SetFilter("scale", targetResolution).
		Output(outputPath, ffmpeg.KwArgs{
			"c:v":    "libx264",
			"crf":    "23", // quality (lower = better)
			"preset": "medium", // speed (ultrafast, superfast, medium, slow)
			"c:a":    "aac",
			"b:a":    "128k",
		}).
		Overwrite(true)

	// Run with timeout
	ctx, cancel := context.WithTimeout(context.Background(), t.timeout)
	defer cancel()

	cmd := stream.Run()
	
	done := make(chan error)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-ctx.Done():
		cmd.Process.Kill()
		return fmt.Errorf("FFmpeg timeout after %v", t.timeout)
	case err := <-done:
		if err != nil {
			return fmt.Errorf("FFmpeg error: %w", err)
		}
	}

	return nil
}
```

### A3. AI Quality Scoring

```go
package remix

import (
	"encoding/json"
	openai "github.com/openai/openai-go"
)

// Comprehensive quality check for generated content
func (r *RemixEngine) ScorePiece(ctx context.Context, piece *GeneratedPiece) (*QualityScore, error) {
	// Parallel scoring
	var wg sync.WaitGroup
	var mu sync.Mutex
	score := &QualityScore{}
	errs := []error{}

	// 1. Brand voice match
	wg.Add(1)
	go func() {
		defer wg.Done()
		voiceScore, err := r.checkBrandVoiceMatch(ctx, piece.Content, piece.WorkspaceID)
		if err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
			return
		}
		mu.Lock()
		score.BrandVoiceMatch = voiceScore
		mu.Unlock()
	}()

	// 2. Factual accuracy
	wg.Add(1)
	go func() {
		defer wg.Done()
		accuracy, err := r.verifyFactualAccuracy(ctx, piece.Content, piece.SourceTranscript)
		if err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
			return
		}
		mu.Lock()
		score.FactualAccuracy = accuracy
		mu.Unlock()
	}()

	// 3. Platform compliance
	wg.Add(1)
	go func() {
		defer wg.Done()
		compliance, err := r.checkPlatformCompliance(piece)
		if err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
			return
		}
		mu.Lock()
		score.PlatformCompliance = compliance
		mu.Unlock()
	}()

	// 4. Engagement potential
	wg.Add(1)
	go func() {
		defer wg.Done()
		engagement, err := r.predictEngagement(ctx, piece)
		if err != nil {
			mu.Lock()
			errs = append(errs, err)
			mu.Unlock()
			return
		}
		mu.Lock()
		score.Engagement = engagement
		mu.Unlock()
	}()

	wg.Wait()

	if len(errs) > 0 {
		return nil, fmt.Errorf("scoring errors: %v", errs)
	}

	// Calculate overall score
	score.Overall = (
		score.BrandVoiceMatch*30 +
		score.FactualAccuracy*20 +
		score.PlatformCompliance*20 +
		score.Engagement*20 +
		score.Originality*10,
	) / 100

	return score, nil
}

// Predict engagement using ML model
func (r *RemixEngine) predictEngagement(ctx context.Context, piece *GeneratedPiece) (int, error) {
	// Call GPT-4 for engagement scoring
	prompt := fmt.Sprintf(`
	Given this social media piece, predict engagement (0-100):
	
	Platform: %s
	Content: %s
	
	Consider: Hook strength, clarity, CTAssistant, audience relevance.
	Return only a number 0-100.
	`, piece.Platform, piece.Content)

	resp, err := r.openaiClient.CreateChatCompletion(ctx, &openai.ChatCompletionRequest{
		Model: "gpt-4",
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    "system",
				Content: "You are an expert social media strategist. Evaluate engagement potential.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0, // Deterministic
	})

	if err != nil {
		return 0, fmt.Errorf("openai api: %w", err)
	}

	score := parseScore(resp.Choices[0].Message.Content)
	return score, nil
}
```
## Repurposing Economics

### Credit Cost

- **Full repurposing set** (1 piece → 5-7 variants): **15 credits**
- Breakdown by variant type:
  - TikTok/Reels extraction & editing: 3 credits
  - Blog post conversion: 4 credits
  - Twitter/X thread creation: 2 credits
  - Newsletter version: 3 credits
  - Podcast clip extraction: 3 credits

### Tier Availability

- **FREE tier**: Not available (15 credits would consume 30% of monthly FREE budget)
- **PRO tier**: Available (500 credits/month allows ~33 full repurposing operations per month)
- **ENTERPRISE**: Unlimited (includes unlimited repurposing operations)

### AI Model Routing

- **Text generation** (blog posts, Twitter threads, newsletters): Anthropic Claude (Primary)
- **Transcription quality** (podcast/video clips): Whisper (transcription) + OpenAI GPT (verification)
- **Multi-language adaptation**: OpenAI GPT
- **Fallback strategy**: If Claude unavailable, route to OpenAI GPT (adds 1-2 seconds latency)

### Expected Processing Time

- **Standard repurposing set**: 2-5 seconds (parallel AI processing)
- **Fallback mode**: If Claude unavailable, +1-2 seconds (sequential to GPT)
- **Large videos** (60+ min): May queue for async processing (delivered within 10 minutes)

### Cost Justification

**Why 15 credits?**
- Full set generates 5-7 content pieces (3-4 credits baseline per piece)
- Enables cross-platform reach multiplier (1 piece → 5 platforms = 5x audience potential)
- Reduces creator friction (manual repurposing = 30-45 min per piece)
- Aligns with pricing tiers:
  - FREE (50 credits/mo): Can do 3 full repurposing operations/month (nice-to-have, not primary value)
  - PRO ($12/mo): Can do 33 full operations/month (primary value for growth creators)
  - ENTERPRISE ($29/mo): Unlimited (enables agency/team use)

---


---

**End of Specification**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-10 | Initial specification: 6 transformation types, full technical architecture, Go code patterns |

