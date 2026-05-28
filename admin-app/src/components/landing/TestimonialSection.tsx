import React from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "Zentrix transformed how we run our business. We're more aligned than ever.",
    author: "Sarah Chen",
    role: "CEO at TechFlow",
    avatar: "SC"
  },
  {
    quote: "Finally, a tool that brings strategy and execution together seamlessly.",
    author: "Michael Roberts",
    role: "COO at GrowthLabs",
    avatar: "MR"
  },
  {
    quote: "The best investment we've made in our operations. ROI in the first month.",
    author: "Emily Martinez",
    role: "Director at InnovateCo",
    avatar: "EM"
  }
];

export const TestimonialSection: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="mobile-h2 text-text-primary mb-4">
          Loved by teams everywhere
        </h2>
        <div className="flex items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="ml-2 text-text-secondary">4.9 out of 5 stars</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {testimonials.map((testimonial, index) => (
          <div 
            key={index}
            className="bg-background border border-border rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow"
          >
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm md:text-base text-text-secondary mb-6 leading-relaxed">
              "{testimonial.quote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                {testimonial.avatar}
              </div>
              <div>
                <div className="font-medium text-text-primary">{testimonial.author}</div>
                <div className="text-sm text-text-secondary">{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
