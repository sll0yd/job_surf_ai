export interface JobInfo {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits?: string[];
  salary?: string;
  employmentType?: string;
  experienceLevel?: string;
  contactInfo?: string;
  postedDate?: string;
  deadline?: string;
  platform: string;
  language: 'en' | 'fr';
  url: string;
}

export interface ExtractorRequest {
  url: string;
}

export interface ExtractorResponse {
  data: JobInfo | null;
  error?: string;
}