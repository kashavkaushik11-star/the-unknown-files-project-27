const geminiKey = process.env.GEMINI_API_KEY;
const cfToken = process.env.CLOUDFLARE_API_TOKEN;
const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
const fbToken = process.env.FACEBOOK_PAGE_TOKEN;
const pageId = process.env.FACEBOOK_PAGE_ID;

if (!geminiKey || !cfToken || !cfAccount || !fbToken || !pageId) {
  throw new Error("Required GitHub Secret or Page ID is missing.");
}

// ========================================
// POST SLOT
// ========================================

function getSlot() {
  const now = new Date();
  const istHour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false
    }).format(now)
  );

  if (istHour < 14) return "lunch";
  if (istHour < 17) return "afternoon";
  if (istHour < 19) return "evening";
  return "night";
}

const slot = getSlot();

console.log("================================");
console.log("PROJECT 27 AUTO POSTING");
console.log("Slot:", slot);
console.log("================================");

// ========================================
// GEMINI HELPER
// ========================================

async function askGemini(prompt, temperature = 0.8) {

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" +
    encodeURIComponent(geminiKey);

  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {

    console.log(`Gemini attempt ${attempt}/${maxAttempts}...`);

    try {

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: 2200
          }
        })
      });

      const responseText = await response.text();

      if (response.ok) {

        const data = JSON.parse(responseText);

        const text =
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          console.log("Gemini response received.");
          return text.trim();
        }

        throw new Error("Gemini returned empty content.");
      }

      // Retry only temporary/server/rate-limit errors
      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {

        console.log(
          `Gemini temporary error ${response.status}. Retrying...`
        );

        if (attempt < maxAttempts) {
          const waitTime = attempt * 5000;
          console.log(`Waiting ${waitTime / 1000} seconds...`);

          await new Promise(resolve =>
            setTimeout(resolve, waitTime)
          );

          continue;
        }
      }

      throw new Error(
        `Gemini API Error ${response.status}: ${responseText}`
      );

    } catch (error) {

      console.log("Gemini request failed:", error.message);

      if (attempt === maxAttempts) {
        throw error;
      }

      const waitTime = attempt * 5000;

      console.log(
        `Retrying after ${waitTime / 1000} seconds...`
      );

      await new Promise(resolve =>
        setTimeout(resolve, waitTime)
      );
    }
  }

  throw new Error("Gemini failed after all retry attempts.");
}

// ========================================
// 1. CREATE STORY
// ========================================

console.log("Generating mystery story...");

const storyPrompt = `
You are the lead writer for THE UNKNOWN FILES – PROJECT 27, CASE FILE 001.

This is a FICTIONAL cinematic mystery series.
Never present anything as real news, real crime, or verified investigation.

CURRENT POST SLOT: ${slot}

Create ONE fresh Facebook mystery post in simple Hindi/Hinglish.

SLOT STYLE:
- lunch: evidence/clue discovery that hooks readers quickly
- afternoon: strange person, CCTV-like event, object or unexplained incident
- evening: important Project 27 case development with stronger suspense
- night: strongest cliffhanger, hidden clue and theory-provoking ending

STORY REQUIREMENTS:
- Continue the Project 27 storyline.
- Make the post understandable by itself.
- Dark cinematic investigation atmosphere.
- Psychological suspense.
- A strange location, object, person, event or evidence.
- Include ONE hidden clue that readers can actually solve.
- Do NOT reveal the answer.
- Make the clue visually possible to represent in an image.
- Avoid complicated mathematics.
- Avoid random unrelated details.
- Build curiosity from beginning to end.
- Keep it fictional.
- Make this post meaningfully different from the other daily posts.

IMPORTANT:
The main visual moment must be something concrete that can be shown in a photograph.
For example: a person discovering evidence, an abandoned room, a mysterious object,
a hidden compartment, a corridor, a desk with evidence, a CCTV-like scene,
a strange doorway, or another specific moment from the story.

Do NOT use headings:
Question
Answer
Solution
Explanation

End naturally by asking readers to comment their theory.

Add 5–8 hashtags including:
#TheUnknownFiles
#Project27
#CaseFile001

Do not write anything before or after the post.
`;

const story = await askGemini(storyPrompt, 0.9);
let finalStory = story.trim();

const requiredHashtags =
  "#TheUnknownFiles #Project27 #CaseFile001 #viral #trending #reels";

finalStory = finalStory
  .replace(/#TheUnknownFiles/gi, "")
  .replace(/#Project27/gi, "")
  .replace(/#CaseFile001/gi, "")
  .replace(/#viral/gi, "")
  .replace(/#trending/gi, "")
  .replace(/#reels/gi, "")
  .trim();

finalStory += "\n\n" + requiredHashtags;
console.log("Story generated.");
console.log("Story length:", finalStory.length);

// ========================================
// 2. GEMINI CREATES VISUAL DIRECTION
// ========================================

console.log("Creating story-specific visual direction...");

const visualPrompt = `
You are a professional Hollywood mystery-film cinematographer.

Read the fictional Facebook story below.

Your job is to convert the story into ONE extremely specific visual scene for an AI image generator.

The image MUST show an actual moment from the story, NOT a generic mystery image.

Identify the most important cinematic moment and describe:

1. EXACT LOCATION
2. TIME OF DAY
3. MAIN PERSON/CHARACTER
4. CLOTHING AND APPEARANCE
5. EXACT ACTION THEY ARE DOING
6. IMPORTANT OBJECTS/EVIDENCE
7. WHERE EACH OBJECT IS LOCATED
8. CAMERA POSITION
9. CAMERA ANGLE
10. COMPOSITION
11. LIGHTING
12. MOOD
13. ENVIRONMENT DETAILS
14. DEPTH / BACKGROUND
15. VISUAL DETAILS THAT CONNECT DIRECTLY TO THE STORY

The scene should feel like a frame taken directly from a serious psychological mystery film.

CRITICAL:
Do not invent a completely different scene.
Use the actual events, objects and location from the story.
If the story contains a person discovering something, show that discovery.
If the story contains an object, make that object clearly visible.
If the story contains a room or location, reproduce that environment.

Do NOT create readable text, letters, numbers, logos or captions inside the image.

Return ONLY the visual scene description.
Do not explain your reasoning.

STORY:
${story}
`;

const visualDirection = await askGemini(visualPrompt, 0.5);

console.log("Visual direction generated.");
console.log("Visual direction length:", visualDirection.length);

// ========================================
// 3. FLUX IMAGE
// ========================================

console.log("Generating story-matched FLUX image...");

const imagePrompt = `
Photorealistic cinematic film still from a dark psychological mystery thriller.

THE UNKNOWN FILES – PROJECT 27.

IMPORTANT:
The image must visually reproduce the exact scene described below.

SCENE:
${visualDirection}

VISUAL QUALITY:
realistic human proportions,
natural skin and clothing,
realistic architecture,
realistic physical objects,
cinematic composition,
dramatic low-key lighting,
deep shadows,
subtle cold blue-green atmosphere,
subtle red accent lighting only where appropriate,
realistic depth,
professional movie cinematography,
35mm film look,
high detail,
photorealistic,
suspenseful atmosphere.

STORY CONNECTION:
Every major visible element must come from the described scene.
Do not replace the location, character action or important evidence with generic mystery imagery.

NO:
readable text,
letters,
numbers,
logos,
captions,
watermarks,
poster design,
collage,
split screen,
borders,
graphic design,
random text,
generic detective scene.

Create ONE single realistic cinematic scene.
`;

const cfURL =
  `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

const cfResponse = await fetch(cfURL, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${cfToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: imagePrompt.slice(0, 2000)
  })
});

if (!cfResponse.ok) {
  throw new Error(
    "Cloudflare API Error: " + await cfResponse.text()
  );
}

const cfData = await cfResponse.json();

const imageBase64 = cfData.result?.image;

if (!imageBase64) {
  throw new Error("FLUX returned no image.");
}

console.log("FLUX image generated.");

// ========================================
// 4. FACEBOOK POST
// ========================================

console.log("Publishing to Facebook...");

const imageBuffer = Buffer.from(imageBase64, "base64");

const form = new FormData();

form.append(
  "source",
  new Blob(
    [imageBuffer],
    { type: "image/jpeg" }
  ),
  "project-27.jpg"
);

form.append("message", finalStory);
form.append("published", "true");
form.append("access_token", fbToken);

const facebookResponse = await fetch(
  `https://graph.facebook.com/v25.0/${pageId}/photos`,
  {
    method: "POST",
    body: form
  }
);

const facebookText = await facebookResponse.text();

if (!facebookResponse.ok) {
  throw new Error(
    "Facebook API Error: " + facebookText
  );
}

console.log("================================");
console.log("FACEBOOK POST SUCCESS");
console.log(facebookText);
console.log("================================");
console.log("PROJECT 27 COMPLETE");
