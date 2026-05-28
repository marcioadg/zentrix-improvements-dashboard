
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { logger } from '@/utils/logger';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <Card className="max-w-2xl mx-auto border border-border/50 bg-background/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8 sm:p-12 text-center">
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <SearchX className="w-20 h-20 mx-auto text-primary/70" strokeWidth={1.5} />
            </motion.div>

            {/* 404 Text with gradient */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-8xl sm:text-9xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/70 to-primary bg-clip-text text-transparent"
            >
              404
            </motion.h1>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl sm:text-3xl font-semibold text-foreground mb-3"
            >
              Page Not Found
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed"
            >
              Sorry, the page <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{location.pathname}</span> doesn't exist or has been moved.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 justify-center mb-6"
            >
              <Button asChild size="lg" className="group">
                <Link to="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
                  Go Home
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="group">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Back to Dashboard
                </Link>
              </Button>
            </motion.div>

            {/* Support text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-sm text-muted-foreground"
            >
              <p>If you believe this is an error, please contact support.</p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default NotFound;
