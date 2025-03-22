import * as cheerio from 'cheerio';
import { ParserResult, extractText, extractJsonLd, stringToArray, detectLanguage } from './baseParser';

export function parseWTTJ(html: string, url: string): ParserResult {
  const $ = cheerio.load(html);
  
  // Try to get structured data first
  const jsonLd = extractJsonLd($);
  
  if (jsonLd) {
    return {
      title: jsonLd.title,
      company: jsonLd.hiringOrganization?.name,
      location: typeof jsonLd.jobLocation === 'string' ? 
        jsonLd.jobLocation : 
        jsonLd.jobLocation?.address?.addressLocality,
      description: jsonLd.description,
      datePosted: jsonLd.datePosted,
      employmentType: jsonLd.employmentType,
      url: url,
      language: detectLanguage(jsonLd.description || ''),
      needsEnrichment: true,
    };
  }
  
  // Fallback to HTML parsing - WTTJ has a specific structure
  const title = extractText($, 'h1.sc-6559pj-1, .job-title');
  const company = extractText($, '.sc-1lvyirq-2, .company-name');
  const location = extractText($, '.sc-1lvyirq-4, .location-name');
  
  // Extract job type and contract
  const jobTypeSection = $('.sc-1c3ou0x-1, .contract-type');
  const jobType = jobTypeSection.length ? jobTypeSection.text().trim() : '';
  
  // Extract salary if available
  const salarySection = $('.sc-16zcwcs-0, .salary-data');
  const salary = salarySection.length ? salarySection.text().trim() : '';
  
  // Extract the description
  let description = '';
  const descriptionSection = $('.sc-65omev-1, .job-description');
  if (descriptionSection.length > 0) {
    description = descriptionSection.text().trim();
  }
  
  // Welcome to the Jungle often has clearly defined sections
  let requirements: string[] = [];
  let responsibilities: string[] = [];
  let benefits: string[] = [];
  
  // Check for section headings
  descriptionSection.find('h2, h3').each((i, heading) => {
    const headingText = $(heading).text().toLowerCase();
    
    // Get the content following this heading until the next heading
    let content = '';
    let currentNode = heading;
    const contentElements = [];
    
    while (currentNode.next && !$(currentNode.next).is('h2, h3')) {
      currentNode = currentNode.next;
      if ($(currentNode).is('p, ul, ol') && $(currentNode).text().trim()) {
        contentElements.push(currentNode);
      }
    }
    
    // Extract text or list items
    let items: string[] = [];
    contentElements.forEach(element => {
      if ($(element).is('ul, ol')) {
        const listItems = $(element).find('li').map((_, li) => $(li).text().trim()).get();
        items = [...items, ...listItems];
      } else {
        // For paragraphs, split by periods or newlines for potential lists
        const text = $(element).text().trim();
        if (text) {
          if (text.includes('.') || text.includes('\n')) {
            items = [...items, ...text.split(/[.\n]/).map(s => s.trim()).filter(Boolean)];
          } else {
            items.push(text);
          }
        }
      }
    });
    
    // Assign to the appropriate category based on heading text
    if (
      headingText.includes('profile') || 
      headingText.includes('requirement') || 
      headingText.includes('qualif') || 
      headingText.includes('skill') ||
      headingText.includes('profil') ||
      headingText.includes('compétence')
    ) {
      requirements = [...requirements, ...items];
    } else if (
      headingText.includes('mission') || 
      headingText.includes('responsib') || 
      headingText.includes('role') ||
      headingText.includes('what you') ||
      headingText.includes('your job')
    ) {
      responsibilities = [...responsibilities, ...items];
    } else if (
      headingText.includes('offer') || 
      headingText.includes('benefit') || 
      headingText.includes('perks') ||
      headingText.includes('avantage') ||
      headingText.includes('nous offrons')
    ) {
      benefits = [...benefits, ...items];
    }
  });
  
  // Determine language based on page content
  const language = detectLanguage(description || title);
  
  // Get posted date if available
  const postedDate = extractText($, '.sc-1dgnjq5-0, .posting-date');
  
  // Return the parsed data
  return {
    title,
    company,
    location,
    description,
    jobType: jobType || undefined,
    salary: salary || undefined,
    postedDate: postedDate || undefined,
    requirements: requirements.length > 0 ? requirements : undefined,
    responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
    benefits: benefits.length > 0 ? benefits : undefined,
    url,
    language,
    needsEnrichment: true, // Let AI help complete any missing structured data
  };
}