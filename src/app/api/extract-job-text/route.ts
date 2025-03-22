import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ExtractResponse } from '@/lib/types';
import { jobCache } from '@/lib/cache';
import crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to clean and truncate text
function prepareTextContent(text: string): string {
  // Remove excessive whitespace
  let content = text.replace(/\s+/g, ' ').trim();
  
  // Truncate to approximately 8k tokens (about 32k characters) for GPT-3.5
  const MAX_CHARS = 32000;
  if (content.length > MAX_CHARS) {
    content = content.substring(0, MAX_CHARS) + '... [content truncated due to length]';
  }
  
  return content;
}

// Function to create a cache key for text content
function createCacheKey(text: string): string {
  // Create a hash of the text to use as a cache key
  const hash = crypto.createHash('md5').update(text).digest('hex');
  return `text-${hash}`;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length < 50) {
      return NextResponse.json<ExtractResponse>(
        { success: false, error: 'Please provide more text content from the job offer (minimum 50 characters)' },
        { status: 400 }
      );
    }

    // Generate a cache key for this text
    const cacheKey = createCacheKey(text);
    
    // Check if we have a cached result
    const cachedData = jobCache.get(cacheKey);
    if (cachedData) {
      console.log('Cache hit for text input');
      return NextResponse.json<ExtractResponse>(
        { success: true, data: cachedData },
        { status: 200 }
      );
    }

    // Extract job information using OpenAI
    try {
      const jobData = await extractJobInformationFromText(text);
      
      // Cache the result
      jobCache.set(cacheKey, jobData);
      
      return NextResponse.json<ExtractResponse>(
        { success: true, data: jobData },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in OpenAI processing:', error);
      
      // Return an error response with all required fields
      return NextResponse.json<ExtractResponse>(
        { 
          success: false, 
          error: error instanceof Error ? 
            `Error processing job data: ${error.message}` : 
            'Unknown error occurred while processing job data',
          data: {
            title: "Processing Error",
            company: "Unknown",
            description: "An error occurred while processing the job text.",
            language: "en",
            url: "N/A - Direct text input",
            location: "Unknown Location"
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing job extraction from text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json<ExtractResponse>(
      { 
        success: false, 
        error: errorMessage,
        data: {
          title: "Error",
          company: "Unknown",
          description: "An error occurred while processing the request.",
          language: "en",
          url: "N/A - Direct text input",
          location: "Unknown Location"
        }
      },
      { status: 500 }
    );
  }
}

// Function to extract job information from text using OpenAI
async function extractJobInformationFromText(jobText: string) {
  // Clean and truncate the text content
  const processedContent = prepareTextContent(jobText);
  
  console.log(`Processed text content length: ${processedContent.length} characters`);
  
  try {
    // Try to detect language first for better prompt customization
    const languageHint = detectLanguage(processedContent);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo for better rate limits
      messages: [
        {
          role: 'system',
          content: `You are a specialized AI that extracts job information from text content. 
          Analyze the provided job listing text and extract all relevant details.
          The text appears to be in ${languageHint === 'fr' ? 'French' : 'English'}.
          
          Return the data in a clean, structured JSON format with the following fields where available:
          - title: job title
          - company: company name
          - location: job location
          - description: main job description (summarized if needed)
          - requirements: array of job requirements (extract as individual items)
          - responsibilities: array of job responsibilities (extract as individual items)
          - benefits: array of job benefits (extract as individual items)
          - salary: salary information if available
          - jobType: full-time, part-time, contract, etc.
          - postedDate: when the job was posted
          - applicationDeadline: application deadline if available
          - contactInfo: contact information if available
          - language: "${languageHint}" (already determined)
          
          If certain fields are not present, omit them. Do not invent information.
          For arrays, extract actual items from the text, don't create general statements.`
        },
        {
          role: 'user',
          content: `Extract all relevant job information from this job listing text. 
          Format your response as a clean JSON object without any additional text or explanations.
          \n\n${processedContent}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '';
    try {
      const parsedData = JSON.parse(content);
      
      // Ensure all required fields are present
      return {
        title: parsedData.title || "Unknown Title",
        company: parsedData.company || "Unknown Company",
        description: parsedData.description || "No description available",
        language: parsedData.language || languageHint || "en",
        url: "N/A - Direct text input",
        location: parsedData.location || "Unknown Location",
        ...parsedData // Include any other fields that were successfully extracted
      };
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      console.log('Raw content:', content);
      
      // Return a minimal valid JSON with all required fields
      return {
        title: "Could not extract job title",
        company: "Unknown company",
        description: "Could not parse job description properly.",
        language: languageHint || "en",
        url: "N/A - Direct text input",
        location: "Unknown Location",
        error: "Failed to parse the full job details."
      };
    }
  } catch (error) {
    console.error('Error extracting job information with OpenAI:', error);
    throw error;
  }
}

// Simple function to detect language from text content
function detectLanguage(text: string): 'en' | 'fr' {
  // Count French-specific words
  const frenchWords = ['emploi', 'poste', 'entreprise', 'travail', 'société', 'salaire', 
                      'expérience', 'compétences', 'responsabilités', 'missions'];
  
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Count occurrences of French words
  const frenchCount = frenchWords.reduce((count, word) => {
    return count + (lowerText.match(new RegExp(word, 'g')) || []).length;
  }, 0);
  
  // If we detect multiple French words, assume it's French
  return frenchCount > 2 ? 'fr' : 'en';
}