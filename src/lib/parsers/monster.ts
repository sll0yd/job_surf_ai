import * as cheerio from 'cheerio';
import { ParserResult, extractText, extractJsonLd, stringToArray, detectLanguage } from './baseParser';

export function parseMonster(html: string, url: string): ParserResult {
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
  
  // Fallback to HTML parsing
  const title = extractText($, 'h1.job-title, .job-title');
  const company = extractText($, '.company .name, .job-company-name');
  const location = extractText($, '.location .name, .job-location');
  
  // Extract the description
  let description = '';
  const descriptionSection = $('#JobDescription, .job-description');
  if (descriptionSection.length > 0) {
    description = descriptionSection.text().trim();
  }
  
  // Posted date
  const postedDate = extractText($, '.posted-date, .job-age');
  
  // Extract job type
  const jobType = extractText($, '.job-type, .meta-employment-type');
  
  // Determine language based on page content
  const language = detectLanguage(description || title);
  
  // Try to identify some sections
  let requirements: string[] = [];
  let responsibilities: string[] = [];
  
  // Monster often has lists with requirements and responsibilities
  const lists = descriptionSection.find('ul');
  
  lists.each((i, el) => {
    const listTitle = $(el).prev().text().toLowerCase();
    const items = $(el).find('li').map((_, li) => $(li).text().trim()).get();
    
    if (listTitle.includes('requirement') || listTitle.includes('qualif') || listTitle.includes('compétence')) {
      requirements = [...requirements, ...items];
    } else if (listTitle.includes('responsib') || listTitle.includes('dutie') || listTitle.includes('responsabilité')) {
      responsibilities = [...responsibilities, ...items];
    }
  });
  
  // Return the parsed data
  return {
    title,
    company,
    location,
    description,
    postedDate,
    jobType,
    requirements: requirements.length > 0 ? requirements : undefined,
    responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
    url,
    language,
    needsEnrichment: true, // Let AI help with additional structured extraction
  };
}