import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { useBlogPosts, BlogPost as BlogPostType } from '@/hooks/useBlogPosts';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';

const BlogPost: React.FC = () => {
  const isMobileApp = isMobileOrTabletDevice();
  const { slug } = useParams<{ slug: string }>();
  const { getPostBySlug } = useBlogPosts({ publishedOnly: true });
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchedPost = await getPostBySlug(slug);
      if (fetchedPost) {
        setPost(fetchedPost);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    fetchPost();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- getPostBySlug is unstable (new ref each render from useBlogPosts); slug is the only real trigger
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center">
            <Link to="/" className="text-xl md:text-2xl font-bold text-foreground">
              Zentrix OS
            </Link>
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full mb-8 rounded-xl" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center">
            <Link to="/" className="text-xl md:text-2xl font-bold text-foreground">
              Zentrix OS
            </Link>
          </div>
        </nav>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-32 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Post Not Found</h1>
          <p className="text-secondary-foreground mb-8">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = `https://zentrixos.com/blog/${post.slug}`;

  return (
    <>
      <Helmet>
        <title>{post.title} | Zentrix OS Blog</title>
        <meta name="description" content={post.meta_description || post.title} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {post.cover_image_url && (
          <meta property="og:image" content={post.cover_image_url} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description || post.title} />
        {post.cover_image_url && (
          <meta name="twitter:image" content={post.cover_image_url} />
        )}
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.meta_description || post.title,
            image: post.cover_image_url || undefined,
            author: {
              '@type': 'Person',
              name: post.author,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Zentrix OS',
              logo: {
                '@type': 'ImageObject',
                url: 'https://zentrixos.com/logo.png',
              },
            },
            datePublished: post.published_at,
            dateModified: post.updated_at,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': canonicalUrl,
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Nav */}
        <nav className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
            <Link to="/" className="text-xl md:text-2xl font-bold text-foreground">
              Zentrix OS
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-secondary-foreground">Sign in</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-popover hover:bg-card text-white">
                  {isMobileApp ? 'Get Started' : 'Start Free'}
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Back Link */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8">
          <Link
            to="/blog"
            className="inline-flex items-center text-secondary-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>
        </div>

        {/* Article */}
        <article className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {post.author}
              </span>
              {post.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(post.published_at), 'MMMM d, yyyy')}
                </span>
              )}
            </div>
          </header>

          {/* Cover Image */}
          {post.cover_image_url && (
            <div className="mb-10 rounded-xl overflow-hidden">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg prose-gray max-w-none 
            prose-headings:font-bold prose-headings:text-foreground
            prose-h1:text-3xl prose-h1:mb-6
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-secondary-foreground prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-secondary-foreground prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-ul:my-4 prose-li:my-1
            prose-ol:my-4
            prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-secondary-foreground
            prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm
            prose-pre:bg-popover prose-pre:text-gray-100
            prose-table:border-collapse
            prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-2 prose-th:bg-muted/50
            prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2
          ">
            {post.content.trimStart().startsWith('<') ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
            ) : (
              <ReactMarkdown>{post.content}</ReactMarkdown>
            )}
          </div>
        </article>

        {/* CTA */}
        <section className="py-16 px-4 md:px-8 bg-muted/50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to transform your business?
            </h2>
            <p className="text-lg text-secondary-foreground mb-8">
              Join thousands of teams using Zentrix OS to achieve their goals.
            </p>
            <Link to="/signup">
              <Button size="lg" className="bg-popover hover:bg-card text-white gap-2">
                {isMobileApp ? 'Get Started Free' : 'Start Free Trial'}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-12 px-8">
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

export default BlogPost;
