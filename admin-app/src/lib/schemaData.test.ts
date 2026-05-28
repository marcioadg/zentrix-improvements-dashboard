import { describe, it, expect } from 'vitest';
import {
  organizationSchema,
  softwareApplicationSchema,
  reviewSchemas,
  productSchema,
  allSchemas,
} from './schemaData';

describe('organizationSchema', () => {
  it('has correct @type', () => {
    expect(organizationSchema['@type']).toBe('Organization');
  });

  it('has required fields', () => {
    expect(organizationSchema['@context']).toBe('https://schema.org');
    expect(organizationSchema.name).toBe('Zentrix OS');
    expect(organizationSchema.url).toBeDefined();
    expect(organizationSchema.description).toBeDefined();
  });
});

describe('softwareApplicationSchema', () => {
  it('has correct @type', () => {
    expect(softwareApplicationSchema['@type']).toBe('SoftwareApplication');
  });

  it('has applicationCategory', () => {
    expect(softwareApplicationSchema.applicationCategory).toBe('BusinessApplication');
  });

  it('has aggregateRating', () => {
    expect(softwareApplicationSchema.aggregateRating).toBeDefined();
    expect(softwareApplicationSchema.aggregateRating['@type']).toBe('AggregateRating');
  });

  it('has offers', () => {
    expect(softwareApplicationSchema.offers).toBeDefined();
    expect(softwareApplicationSchema.offers['@type']).toBe('Offer');
    expect(softwareApplicationSchema.offers.priceCurrency).toBe('USD');
  });
});

describe('reviewSchemas', () => {
  it('is an array of 3 reviews', () => {
    expect(reviewSchemas).toHaveLength(3);
  });

  it('each review has required fields', () => {
    reviewSchemas.forEach((review) => {
      expect(review['@type']).toBe('Review');
      expect(review.author).toBeDefined();
      expect(review.author['@type']).toBe('Person');
      expect(review.author.name).toBeDefined();
      expect(review.reviewBody).toBeDefined();
      expect(review.reviewRating).toBeDefined();
      expect(review.reviewRating.ratingValue).toBe('5');
    });
  });
});

describe('productSchema', () => {
  it('has correct @type', () => {
    expect(productSchema['@type']).toBe('Product');
  });

  it('includes review array', () => {
    expect(productSchema.review).toBe(reviewSchemas);
  });

  it('has brand', () => {
    expect(productSchema.brand['@type']).toBe('Brand');
    expect(productSchema.brand.name).toBe('Zentrix');
  });
});

describe('allSchemas', () => {
  it('contains 3 schemas', () => {
    expect(allSchemas).toHaveLength(3);
  });

  it('includes organization, software, and product schemas', () => {
    expect(allSchemas).toContain(organizationSchema);
    expect(allSchemas).toContain(softwareApplicationSchema);
    expect(allSchemas).toContain(productSchema);
  });
});
