import * as cheerio from 'cheerio';
import { ParserResult, extractText, extractJsonLd, detectLanguage } from './baseParser';

export function parseIndeed(html: string, url: string): ParserResult {
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
      salary: jsonLd.estimatedSalary ? 
        `${jsonLd.estimatedSalary.minValue || ''} - ${jsonLd.estimatedSalary.maxValue || ''} ${jsonLd.estimatedSalary.unitText || ''}` : 
        undefined,
      employmentType: jsonLd.employmentType,
      url: url,
      language: detectLanguage(jsonLd.description || ''),
      needsEnrichment: true,
    };
  }
  
  // Fallback to HTML parsing
  const title = extractText($, 'h1.jobsearch-JobInfoHeader-title, .icl-u-xs-mb--xs');
  const company = extractText($, '.jobsearch-InlineCompanyRating-companyName, .icl-u-lg-mr--sm');
  const location = extractText($, '.jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-subtitle-location');
  
  // Salary can be in different places
  let salary = extractText($, '.jobsearch-JobMetadataHeader-item:contains("salary"), .jobsearch-JobHeader-salary');
  if (!salary) {
    $('.icl-u-xs-mt--xs .attribute_snippet').each((i, el) => {
      const text = $(el).text();
      if (text.includes('$') || text.includes('€') || text.toLowerCase().includes('salary') || text.toLowerCase().includes('salaire')) {
        salary = text;
      }
    });
  }
  
  // Extract the description
  let description = '';
  const descriptionSection = $('#jobDescriptionText, .jobsearch-jobDescriptionText');
  if (descriptionSection.length > 0) {
    description = descriptionSection.text().trim();
  }
  
  // Posted date
  const postedDate = extractText($, '.jobsearch-JobMetadataFooter-item:contains("Posted"), .jobsearch-HiringInsights-entry--age');
  
  // Job type
  let jobType = '';
  $('.jobsearch-JobDescriptionSection-sectionItem').each((i, el) => {
    const label = $(el).find('.jobsearch-JobDescriptionSection-sectionItemKey').text().trim();
    if (label.toLowerCase().includes('job type') || label.toLowerCase().includes("type d'emploi")) {
      jobType = $(el).find('.jobsearch-JobDescriptionSection-sectionItemValue').text().trim();
    }
  });
  
  // Determine language based on page content
  const language = detectLanguage(description || title);
  
  // Try to identify requirements and responsibilities
  let requirements: string[] = [];
  let responsibilities: string[] = [];
  
  // Indeed often has sections with headers and lists
  descriptionSection.find('h3, h4, strong, b').each((i, heading) => {
    const headingText = $(heading).text().toLowerCase();
    
    // Find the following list or paragraph
    let container;
    let currentElem = heading;
    
    while ($(currentElem).next().length) {
      const nextElem = $(currentElem).next()[0];
      currentElem = nextElem;
      
      if ($(currentElem).is('ul, ol, p') && $(currentElem).text().trim()) {
        container = currentElem;
        break;
      }
    }
    
    if (container) {
      const items = $(container).is('ul, ol') ? 
        $(container).find('li').map((_, li) => $(li).text().trim()).get() :
        [$(container).text().trim()];
      
      if (
        headingText.includes('requirement') || 
        headingText.includes('qualif') || 
        headingText.includes('skill') || 
        headingText.includes('compétence') ||
        headingText.includes('exigence')
      ) {
        requirements = [...requirements, ...items];
      } else if (
        headingText.includes('responsib') || 
        headingText.includes('dutie') || 
        headingText.includes('role') ||
        headingText.includes('responsabilité') ||
        headingText.includes('mission')
      ) {
        responsibilities = [...responsibilities, ...items];
      }
    }
  });
  
  // Return the parsed data
  return {
    title,
    company,
    location,
    description,
    salary: salary || undefined,
    postedDate,
    jobType: jobType || undefined,
    requirements: requirements.length > 0 ? requirements : undefined,
    responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
    url,
    language,
    needsEnrichment: true, // Let AI help complete any missing structured data
  };
}