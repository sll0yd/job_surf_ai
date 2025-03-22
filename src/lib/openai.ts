import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to clean and extract key elements from HTML content
function prepareHtmlContent(html: string): {
  content: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  metadata: Record<string, string>;
} {
  try {
    // Use cheerio to parse HTML
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, svg, img, link, meta, noscript, iframe').remove();
    
    // Extract metadata
    const metadata: Record<string, string> = {};
    
    // Extract title - common patterns
    const title = $('h1').first().text().trim() || 
                 $('title').text().trim().split('|')[0].trim() || 
                 '';
    
    // Extract company name - common patterns
    let company = '';
    $('.company, .employer, [itemprop="hiringOrganization"], .companyName').each((i, el) => {
      if (!company) company = $(el).text().trim();
    });
    
    // Extract location - common patterns
    let location = '';
    $('.location, [itemprop="jobLocation"], .jobLocation').each((i, el) => {
      if (!location) location = $(el).text().trim();
    });
    
    // Look for job description specific elements
    let description = '';
    $('#job-description, .job-description, [itemprop="description"], #JobDescription').each((i, el) => {
      if (!description) description = $(el).text().trim();
    });
    
    // Extract job details section
    const mainContent = [];
    
    // Try to find job description specific elements
    const jobContainer = $('.job-description, .job-details, .description, article, main, [role="main"], .job-posting');
    
    if (jobContainer.length > 0) {
      // Use the identified job container
      mainContent.push(jobContainer.text());
    } else {
      // If we can't find specific job containers, grab the most important parts of the page
      // Try to get salary info
      const salary = $('[itemprop="baseSalary"], .salary, .compensation').text().trim();
      if (salary) metadata['salary'] = salary;
      
      // Job type
      const jobType = $('[itemprop="employmentType"], .job-type, .employmentType').text().trim();
      if (jobType) metadata['jobType'] = jobType;
      
      // Posted date
      const postedDate = $('[itemprop="datePosted"], .posted-date, .date-posted').text().trim();
      if (postedDate) metadata['postedDate'] = postedDate;
      
      // Main content areas - paragraphs and lists
      $('p, li, h3, h4, h5, div.section, div.description, div.requirements, div.responsibilities').each(function() {
        const text = $(this).text().trim();
        if (text.length > 30) { // Only include substantial text blocks
          mainContent.push(text);
        }
      });
    }
    
    // Look for structured sections
    let requirements = extractSection($, 'requirements', 'qualifications', 'skills', 'profile');
    let responsibilities = extractSection($, 'responsibilities', 'duties', 'role', 'mission');
    let benefits = extractSection($, 'benefits', 'perks', 'offer', 'advantages');
    
    if (requirements) metadata['requirements'] = requirements;
    if (responsibilities) metadata['responsibilities'] = responsibilities;
    if (benefits) metadata['benefits'] = benefits;
    
    // Join it all together
    let content = mainContent.join('\n\n');
    
    // Remove excessive whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    // Truncate to approximately 4k tokens (about 16k characters) for better AI performance
    const MAX_CHARS = 16000;
    if (content.length > MAX_CHARS) {
      content = content.substring(0, MAX_CHARS) + '... [content truncated due to length]';
    }
    
    return {
      content,
      title,
      company,
      location,
      description,
      metadata
    };
  } catch (error) {
    console.error('Error processing HTML:', error);
    // If there's an error in parsing, return truncated raw HTML
    return {
      content: html.substring(0, 16000) + '... [content truncated due to length]',
      metadata: {}
    };
  }
}

// Helper function to extract common sections from the HTML
function extractSection($: cheerio.CheerioAPI, ...sectionNames: string[]): string {
  let sectionContent = '';
  
  // Create a regex pattern to match section headings
  const pattern = new RegExp(sectionNames.join('|'), 'i');
  
  // Look for headings that match one of the section names
  $('h1, h2, h3, h4, h5, h6, strong, b, .section-title').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    
    if (pattern.test(text)) {
      // Found a matching section heading
      let section = '';
      let node = el;
      
      // Get the content until the next heading
      while (node.next && !$(node.next).is('h1, h2, h3, h4, h5, h6, strong, b, .section-title')) {
        node = node.next;
        
        // If it's a list, get the items
        if ($(node).is('ul, ol')) {
          section += $(node).text().trim() + '\n';
        } 
        // If it's a paragraph, add its text
        else if ($(node).is('p, div') && $(node).text().trim()) {
          section += $(node).text().trim() + '\n';
        }
      }
      
      if (section) {
        sectionContent += section + '\n';
      }
    }
  });
  
  return sectionContent.trim();
}

// Function to extract job information using OpenAI
export async function extractJobInformation(htmlContent: string, url: string) {
  try {
    // Clean and extract key elements from the HTML content
    const { content, title, company, location, description, metadata } = prepareHtmlContent(htmlContent);
    
    console.log(`Processed content length: ${content.length} characters`);
    console.log(`Pre-extracted metadata: ${Object.keys(metadata).join(', ')}`);
    
    // First try with gpt-3.5-turbo
    const response = await openai.chat.completions.create({
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
          I've already pre-extracted some information that you can use:
          ${title ? `- Title: ${title}` : ''}
          ${company ? `- Company: ${company}` : ''}
          ${location ? `- Location: ${location}` : ''}
          
          Format your response as a clean JSON object without any additional text or explanations.
          \n\n${content}`
        }
      ],
      temperature: 0.1, // Using lower temperature for more deterministic output
      max_tokens: 1024, // Reduced tokens for output
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const content_response = response.choices[0]?.message?.content || '';
    try {
      const parsedData = JSON.parse(content_response);
      
      // Merge pre-extracted metadata with AI extracted data
      // Pre-extracted metadata takes precedence over AI-extracted data
      const result = {
        title: title || parsedData.title || "Unknown Title",
        company: company || parsedData.company || "Unknown Company",
        description: description || parsedData.description || "No description available",
        location: location || parsedData.location || "Unknown Location",
        language: parsedData.language || "en",
        url: url,
        ...parsedData // Include any other fields AI extracted
      };
      
      // Add metadata that wasn't overridden by the AI
      Object.entries(metadata).forEach(([key, value]) => {
        if (!result[key]) {
          result[key] = value;
        }
      });
      
      return result;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      console.log('Raw content:', content_response);
      
      // If JSON parsing fails, construct a response using the pre-extracted data
      return {
        title: title || "Could not extract job title",
        company: company || "Unknown company",
        description: description || "Could not parse job description properly.",
        location: location || "Unknown Location",
        language: "en", // Default to English
        url: url,
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
      location: "Unknown Location"
    };
  }
}