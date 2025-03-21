import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ExtractResponse } from '@/lib/types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Extract job information using OpenAI
    const jobData = await extractJobInformationFromText(text);
    
    return NextResponse.json<ExtractResponse>(
      { success: true, data: jobData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing job extraction from text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json<ExtractResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Function to extract job information from text using OpenAI
async function extractJobInformationFromText(jobText: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a specialized AI that extracts job information from text content. 
          Analyze the provided job listing text and extract all relevant details.
          Return the data in a clean, structured JSON format.
          You can recognize job descriptions in both English and French.
          If certain fields are not present, omit them. Do not invent information.
          Determine the language of the listing and include it in the response.`
        },
        {
          role: 'user',
          content: `Extract all relevant job information from this job listing text. 
          Format your response as a clean JSON object without any additional text or explanations.
          \n\n${jobText}`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '';
    const jobData = JSON.parse(content);
    
    // Add a placeholder URL since we're processing text directly
    jobData.url = "N/A - Direct text input";
    
    return jobData;
  } catch (error) {
    console.error('Error extracting job information with OpenAI:', error);
    throw error;
  }
}