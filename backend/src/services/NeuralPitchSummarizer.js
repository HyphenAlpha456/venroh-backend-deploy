import axios from 'axios';

class EnterprisePitchSummarizer {
  async summarizeFile(base64Data, mimeType, targetSentencesCount = 3) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const model = "gemini-3.5-flash";

      console.log("\n--- AI REQUEST DEBUG START ---");
      console.log("MIME Type Sent:", mimeType);
      console.log("Base64 Length:", base64Data.length);
      
      // If it's plain text (fallback), let's print exactly what text the AI is seeing
      if (mimeType === 'text/plain') {
          console.log("Fallback Text Content:", Buffer.from(base64Data, 'base64').toString('utf-8'));
      }
      console.log("--- AI REQUEST DEBUG END ---\n");

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [
              { text: `Summarize this document into ${targetSentencesCount} professional sentences.` },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }]
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error("Gemini AI API Error:", error.response?.data?.error || error.message);
      return "";
    }
  }
}

export default new EnterprisePitchSummarizer();