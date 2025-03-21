import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to extract job information using OpenAI
export async function extractJobInformation(htmlContent: string, url: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a specialized AI that extracts job information from HTML content. 
          Analyze the provided HTML from a job listing and extract all relevant details.
          Return the data in a clean, structured JSON format.
          You can recognize job descriptions in both English and French.
          If certain fields are not present, omit them. Do not invent information.
          Determine the language of the listing and include it in the response.`
        },
        {
          role: 'user',
          content: `Extract all relevant job information from this HTML content from URL: ${url}. 
          Format your response as a clean JSON object without any additional text or explanations.
          \n\n${htmlContent}`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error extracting job information with OpenAI:', error);
    throw error;
  }
}