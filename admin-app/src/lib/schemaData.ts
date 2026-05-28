// Centralized Schema.org data for Zentrix OS
// Data source: src/pages/Landing3.tsx

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://zentrix.app';

// Organization Schema
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Zentrix OS",
  "description": "The operating system for ambitious companies. Set goals. Track progress. Achieve more.",
  "url": BASE_URL,
  "logo": "https://zentrixos.com/favicon.png"
};

// Software Application Schema
export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Zentrix OS",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "The operating system for ambitious companies. Set goals. Track progress. Achieve more.",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "3"
  },
  "offers": {
    "@type": "Offer",
    "price": "5.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "priceValidUntil": "2025-12-31"
  }
};

// Individual Review Schemas (from Landing3.tsx testimonials)
export const reviewSchemas = [
  {
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": "Amanda Colaco",
      "jobTitle": "General Manager",
      "worksFor": {
        "@type": "Organization",
        "name": "Wisenetix"
      }
    },
    "reviewBody": "Clarity and alignment we were missing. Saving over 120 hours a month.",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "5",
      "bestRating": "5"
    }
  },
  {
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": "Iana Ferreira",
      "jobTitle": "Head of Marketing",
      "worksFor": {
        "@type": "Organization",
        "name": "Wise Scale"
      }
    },
    "reviewBody": "Entire team in alignment. Eliminated six unnecessary meetings every week.",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "5",
      "bestRating": "5"
    }
  },
  {
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": "Marcio Gonçalves",
      "jobTitle": "Founder & CEO",
      "worksFor": {
        "@type": "Organization",
        "name": "WiseVAs"
      }
    },
    "reviewBody": "Chaos to clarity in 30 days. Team efficiency increased 67%.",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "5",
      "bestRating": "5"
    }
  }
];

// Product Schema with Reviews
export const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Zentrix OS",
  "description": "The operating system for ambitious companies",
  "image": "https://zentrixos.com/favicon.png",
  "brand": {
    "@type": "Brand",
    "name": "Zentrix"
  },
  "offers": {
    "@type": "Offer",
    "price": "5.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "priceValidUntil": "2025-12-31"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "3"
  },
  "review": reviewSchemas
};

// Export all schemas as an array for easy consumption
export const allSchemas = [
  organizationSchema,
  softwareApplicationSchema,
  productSchema
];
