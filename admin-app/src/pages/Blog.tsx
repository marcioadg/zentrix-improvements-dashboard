import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';

const Blog: React.FC = () => {
  const { posts, loading } = useBlogPosts({ publishedOnly: true });
  const isMobileApp = isMobileOrTabletDevice();

  return (
    <>
      <Helmet>
        <title>Blog | Zentrix OS - Business Operating System Insights</title>
        <meta 
          name="description" 
          content="Discover insights, guides, and best practices for running your business on an operating system. Learn about EOS, OKRs, metrics, and team alignment." 
        />
        <meta property="og:title" content="Blog | Zentrix OS" />
        <meta property="og:description" content="Business operating system insights and guides" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zentrixos.com/blog" />
        <link rel="canonical" href="https://zentrixos.com/blog" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Nav */}
        <nav className="border-b border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
            <Link to="/" className="text-xl md:text-2xl font-bold text-foreground">
              Zentrix OS
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-muted-foreground">Sign in</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-foreground hover:bg-foreground/90 text-background">
                  {isMobileApp ? 'Get Started' : 'Start Free'}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="pt-16 md:pt-24 pb-12 px-4 md:px-8 border-b border-border">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              The Zentrix OS Blog
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Insights, guides, and best practices for running your business with clarity and alignment.
            </p>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group block"
                  >
                    <article className="space-y-4">
                      {/* Cover Image */}
                      <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                            <span className="text-4xl font-bold text-purple-300">Z</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                        {post.meta_description && (
                          <p className="text-muted-foreground line-clamp-2">
                            {post.meta_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {post.author}
                          </span>
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(post.published_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Read More */}
                      <div className="flex items-center text-primary font-medium group-hover:text-primary/80">
                        Read more
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 md:px-8 bg-muted border-t border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to transform your business?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of teams using Zentrix OS to achieve their goals.
            </p>
            <Link to="/signup">
              <Button size="lg" className="bg-foreground hover:bg-foreground/90 text-background gap-2">
                {isMobileApp ? 'Get Started Free' : 'Start Free Trial'}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-12 px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>© 2025 Zentrix</div>
            <div className="flex gap-8">
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <Link to="/science" className="hover:text-foreground transition-colors">The Science</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Blog;
