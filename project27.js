const geminiKey = process.env.GEMINI_API_KEY;
const cfToken = process.env.CLOUDFLARE_API_TOKEN;
const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
const fbToken = process.env.FACEBOOK_PAGE_TOKEN;
const pageId = process.env.FACEBOOK_PAGE_ID;

if (!geminiKey || !cfToken || !cfAccount || !fbToken) {
  throw new Error("Required GitHub Secret is missing.");
}

function getSlot() {
  const hour = new Date().getUTCHours();

  if (hour === 5) return "morning";
  if (hour === 8) return "afternoon";
  return "evening";
}

const slot = getSlot();

const prompt = `
You are creating ONE Facebook post for
THE UNKNOWN FILES – PROJECT 27, CASE FILE 001.

This is a fictional mystery series.
Never present the story as real news, a verified crime, or a real investigation.

CURRENT POST SLOT: ${slot}

Create ONE fresh cinematic Hindi/Hinglish mystery post.

The post should:
- Continue the Project 27 storyline.
- Still be understandable by itself.
- Feel like a mysterious investigation/evidence discovery.
- Include ONE hidden clue that readers can solve.
- Do NOT reveal the answer.
- Create suspense and curiosity.
- Use simple Hindi/Hinglish suitable for Facebook readers.
- Keep it fictional.

Do NOT use headings such as:
Question, Answer, Solution, Explanation.

Do not write anything before or after the post.

Include:
- A strong mystery opening.
- A short cinematic story.
- One solvable hidden clue.
- A natural CTA asking readers to comment their theory.
- 5–8 relevant hashtags.

Must include:
#TheUnknownFiles
#Project27
#CaseFile001

Do not make the post excessively long.
`;

async function main() {

  console.log("================================");
  console.log("PROJECT 27 AUTO POSTING");
  console.log("Slot:", slot);
  console.log("================================");

  // =========================
  // 1. GEMINI STORY
  // =========================

  console.log("Generating mystery story...");

  const geminiURL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" +
    encodeURIComponent(geminiKey);

  const geminiResponse = await fetch(geminiURL, {
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
        temperature: 0.9,
        maxOutputTokens: 1800
      }
    })
  });

  if (!geminiResponse.ok) {
    throw new Error(
      "Gemini API Error: " + await geminiResponse.text()
    );
  }

  const geminiData = await geminiResponse.json();

  const content =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("Gemini returned empty content.");
  }

  console.log("Story generated successfully.");

  // =========================
  // 2. CLOUDFLARE FLUX IMAGE
  // =========================

  console.log("Generating cinematic image...");

  const imagePrompt = `
Cinematic photorealistic mystery investigation scene for
THE UNKNOWN FILES – PROJECT 27.

Dark psychological mystery atmosphere,
deep shadows, dramatic low-key lighting,
subtle red accents,
realistic location,
realistic evidence,
cinematic film still,
high detail,
photorealistic.

Show the most mysterious or important visual moment
from the story below.

Match the story closely.

IMPORTANT:
No readable text.
No letters.
No numbers.
No logos.
No captions.
No watermark.
No poster.
No collage.
No borders.

STORY:
${content.slice(0, 1300)}
`;

  const cloudflareURL =
    `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const cfResponse = await fetch(cloudflareURL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cfToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: imagePrompt
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
    throw new Error("Cloudflare FLUX returned no image.");
  }

  console.log("Image generated successfully.");

  // =========================
  // 3. CONVERT IMAGE
  // =========================

  const imageBuffer = Buffer.from(imageBase64, "base64");

  // =========================
  // 4. FACEBOOK POST
  // =========================

  console.log("Publishing to Facebook...");

  const form = new FormData();

  form.append(
    "source",
    new Blob(
      [imageBuffer],
      { type: "image/jpeg" }
    ),
    "project-27.jpg"
  );

  form.append("message", content);
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
}

main().catch(error => {
  console.error("PROJECT 27 FAILED");
  console.error(error);
  process.exit(1);
});
