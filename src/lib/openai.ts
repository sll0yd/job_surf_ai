import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to clean and truncate HTML content
function prepareHtmlContent(html: string): string {
  try {
    // Use cheerio to parse HTML
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, svg, img, link, meta, noscript, iframe').remove();
    
    // Extract the main content - focus on typical job description elements
    const mainContent = [];
    
    // Try to find job description specific elements
    const jobContainer = $('.job-description, .job-details, .description, article, main, [role="main"], .job-posting');
    
    if (jobContainer.length > 0) {
      // Use the identified job container
      mainContent.push(jobContainer.text());
    } else {
      // If we can't find specific job containers, grab the most important parts of the page
      // Title - often in h1 or h2
      const title = $('h1, h2').first().text();
      if (title) mainContent.push(`Title: ${title}`);
      
      // Try to get the company name
      const company = $('.company, .employer, [itemprop="hiringOrganization"]').first().text() || 
                     $('header h3, header p, .sub-title').first().text();
      if (company) mainContent.push(`Company: ${company}`);
      
      // Location
      const location = $('.location, [itemprop="jobLocation"]').first().text();
      if (location) mainContent.push(`Location: ${location}`);
      
      // Main content areas
      $('p, li, h3, h4, h5, div.section, div.description, div.requirements, div.responsibilities').each(function() {
        const text = $(this).text().trim();
        if (text.length > 30) { // Only include substantial text blocks
          mainContent.push(text);
        }
      });
    }
    
    // Join it all together
    let content = mainContent.join('\n\n');
    
    // Remove excessive whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    // Truncate to approximately 8k tokens (about 32k characters) for GPT-3.5
    const MAX_CHARS = 32000;
    if (content.length > MAX_CHARS) {
      content = content.substring(0, MAX_CHARS) + '... [content truncated due to length]';
    }
    
    return content;
  } catch (error) {
    console.error('Error processing HTML:', error);
    // If there's an error in parsing, return truncated raw HTML
    return html.substring(0, 32000) + '... [content truncated due to length]';
  }
}

// Function to extract job information using OpenAI
export async function extractJobInformation(htmlContent: string, url: string) {
  try {
    // Clean and truncate the HTML content
    const processedContent = prepareHtmlContent(htmlContent);
    
    console.log(`Processed content length: ${processedContent.length} characters`);
    
    // First try with gpt-3.5-turbo
    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo for better rate limits
        messages: [
          {
            role: 'system',
            content: `You are a specialized AI that extracts job information from content. 
            Analyze the provided text from a job listing and extract all relevant details.
            Return the data in a clean, structured JSON format with the following fields where available:
            - title: job title
            - company: company name
            - location: job location
            - description: main job description
            - requirements: array of job requirements
            - responsibilities: array of job responsibilities
            - benefits: array of job benefits
            - salary: salary information if available
            - jobType: full-time, part-time, contract, etc.
            - postedDate: when the job was posted
            - applicationDeadline: application deadline if available
            - contactInfo: contact information if available
            - language: determine if the job posting is in English ('en') or French ('fr')
            
            If certain fields are not present, omit them. Do not invent information.`
          },
          {
            role: 'user',
            content: `Extract all relevant job information from this job listing content from URL: ${url}. 
            Format your response as a clean JSON object without any additional text or explanations.
            \n\n${processedContent}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2048, // Reduced tokens for output
        response_format: { type: 'json_object' }
      });
    } catch (error) {
      console.error('Error with primary model, attempting fallback:', error);
      // If there's an error with the primary model, try a different model as fallback
      response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-instruct', // Ultra fallback option
        messages: [
          {
            role: 'system',
            content: `Extract job information in JSON format.`
          },
          {
            role: 'user',
            content: `Extract job information from this text: ${processedContent.substring(0, 16000)}. Return JSON only.`
          }
        ],
        temperature: 0.2,
        max_tokens: 1024
      });
    }

    // Parse the response
    const content = response.choices[0]?.message?.content || '';
    try {
      const parsedData = JSON.parse(content);
      
      // Ensure all required fields are present
      return {
        title: parsedData.title || "Unknown Title",
        company: parsedData.company || "Unknown Company",
        description: parsedData.description || "No description available",
        language: parsedData.language || "en",
        url: url,
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
        language: "en",
        url: url,
        location: "Unknown Location", // Added required field
        error: "Failed to parse the full job details."
      };
    }
  } catch (error) {
    console.error('Error extracting job information with OpenAI:', error);
    // Return a valid error response rather than throwing
    return {
      title: "Error processing job",
      company: "Unknown company",
      description: "An error occurred while processing the job information.",
      error: error instanceof Error ? error.message : "Unknown error",
      language: "en",
      url: url,
      location: "Unknown Location" // Added required field
    };
  }
}