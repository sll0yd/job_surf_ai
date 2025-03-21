export interface JobData {
  title: string;
  company: string;
  location?: string; // Made optional
  salary?: string;
  jobType?: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  postedDate?: string;
  applicationDeadline?: string;
  contactInfo?: string;
  url: string;
  language: 'en' | 'fr' | string;
  // Permettre des propriétés supplémentaires avec des types plus précis
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface ExtractResponse {
  success: boolean;
  data?: JobData;
  error?: string;
}

export interface UrlFormData {
  url: string;
}