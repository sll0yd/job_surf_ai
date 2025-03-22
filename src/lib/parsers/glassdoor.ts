import * as cheerio from 'cheerio';
import { ParserResult, extractText, extractJsonLd, detectLanguage } from './baseParser';

export function parseGlassdoor(html: string, url: string): ParserResult {
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
  const title = extractText($, 'h1.job-title, .title');
  const company = extractText($, '.employer-name, .employerName, .css-87uc0g');
  const location = extractText($, '.location, .css-1buaf54');
  
  // Extract salary if available
  let salary = '';
  $('.salary, .css-1uyte9r, .css-1hf3kbr').each((i, el) => {
    const text = $(el).text().trim();
    if (
      text.includes('$') || 
      text.includes('€') || 
      text.includes('£') || 
      text.toLowerCase().includes('salary') ||
      text.toLowerCase().includes('salaire')
    ) {
      salary = text;
    }
  });
  
  // Extract job type
  let jobType = '';
  $('.jobDetailsHeader ul li, .css-zv7e6h').each((i, el) => {
    const text = $(el).text().toLowerCase();
    if (
      text.includes('full-time') || 
      text.includes('part-time') || 
      text.includes('contract') ||
      text.includes('temps plein') ||
      text.includes('temps partiel') ||
      text.includes('cdd') ||
      text.includes('cdi')
    ) {
      jobType = $(el).text().trim();
    }
  });
  
  // Extract the description
  let description = '';
  const descriptionSection = $('#JobDescriptionContainer, .jobDescriptionContent, .css-1rzlan3');
  if (descriptionSection.length > 0) {
    description = descriptionSection.text().trim();
  }
  
  // Glassdoor often has section headers in bold or with specific classes
  let requirements: string[] = [];
  let responsibilities: string[] = [];
  let benefits: string[] = [];
  
  // Function to process sections
  const processSections = () => {
    descriptionSection.find('strong, b, .strong').each((i, heading) => {
      const headingText = $(heading).text().toLowerCase();
      
      // Get the content following this heading
      let currentElement = heading;
      const items: string[] = [];
      
      // Collect text until we hit another heading or run out of siblings
      while ($(currentElement).next().length && !$(currentElement).next().is('strong, b, .strong')) {
        currentElement = $(currentElement).next()[0];
        
        // If it's a list, get the items
        if ($(currentElement).is('ul, ol')) {
          const listItems = $(currentElement).find('li').map((_, li) => $(li).text().trim()).get();
          items.push(...listItems);
        } 
        // If it's a paragraph, add it as text
        else if ($(currentElement).is('p') && $(currentElement).text().trim()) {
          const text = $(currentElement).text().trim();
          
          // If it contains bullet points or numbered items, split it
          if (/•|\*|^\d+\./.test(text)) {
            items.push(...text.split(/•|\*|\d+\./).map(s => s.trim()).filter(Boolean));
          } else {
            items.push(text);
          }
        }
      }
      
      // Categorize by heading text
      if (
        headingText.includes('requirements') || 
        headingText.includes('qualifications') || 
        headingText.includes('skills') ||
        headingText.includes('compétences') ||
        headingText.includes('profil')
      ) {
        requirements = [...requirements, ...items];
      } else if (
        headingText.includes('responsibilities') || 
        headingText.includes('duties') || 
        headingText.includes('role') ||
        headingText.includes('job description') ||
        headingText.includes('responsabilités') ||
        headingText.includes('missions')
      ) {
        responsibilities = [...responsibilities, ...items];
      } else if (
        headingText.includes('benefits') || 
        headingText.includes('perks') || 
        headingText.includes('offer') ||
        headingText.includes('we provide') ||
        headingText.includes('avantages')
      ) {
        benefits = [...benefits, ...items];
      }
    });
  };
  
  processSections();
  
  // If we didn't find any sections, try looking for common patterns in the description
  if (!requirements.length && !responsibilities.length && !benefits.length) {
    // Look for lists in the description
    descriptionSection.find('ul').each((i, list) => {
      const prevText = $(list).prev().text().toLowerCase();
      const items = $(list).find('li').map((_, li) => $(li).text().trim()).get();
      
      if (
        prevText.includes('requirements') || 
        prevText.includes('qualifications') || 
        prevText.includes('profil')
      ) {
        requirements = [...requirements, ...items];
      } else if (
        prevText.includes('responsibilities') || 
        prevText.includes('duties') || 
        prevText.includes('missions')
      ) {
        responsibilities = [...responsibilities, ...items];
      } else if (
        prevText.includes('benefits') || 
        prevText.includes('perks') || 
        prevText.includes('avantages')
      ) {
        benefits = [...benefits, ...items];
      }
    });
  }
  
  // Determine language based on page content
  const language = detectLanguage(description || title);
  
  // Get posted date if available
  const postedDate = extractText($, '.posted, .css-13yjpkp');
  
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
    needsEnrichment: true, // Let AI help with any missing structured data
  };
}