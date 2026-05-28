
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, renameSync } from "fs";

// Function to get simplified version info
function getVersionInfo() {
  try {
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    // Create EST timestamp in readable format like "6-29 1:09 PM EST"
    const now = new Date();
    const estDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const month = estDate.getMonth() + 1;
    const day = estDate.getDate();
    const hours = estDate.getHours();
    const minutes = estDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    const buildTime = `${month}-${day} ${displayHours}:${minutes} ${ampm} EST`;
    const buildTimestamp = Date.now();
    
    // Set version to 0.1 as requested
    const baseVersion = "0.1.0";
    const displayVersion = `v0.1`;
    
    return {
      version: displayVersion,
      gitHash,
      gitBranch,
      buildTime,
      buildTimestamp,
      baseVersion: "0.1",
      fullVersion: `${displayVersion} - ${buildTime}`
    };
  } catch (error) {
    // Fallback for environments without Git
    const now = new Date();
    const estDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const month = estDate.getMonth() + 1;
    const day = estDate.getDate();
    const hours = estDate.getHours();
    const minutes = estDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    const buildTime = `${month}-${day} ${displayHours}:${minutes} ${ampm} EST`;
    const buildTimestamp = Date.now();
    const displayVersion = `v0.1`;
    
    return {
      version: displayVersion,
      gitHash: 'unknown',
      gitBranch: 'unknown',
      buildTime,
      buildTimestamp,
      baseVersion: "0.1",
      fullVersion: `${displayVersion} - ${buildTime}`
    };
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const versionInfo = getVersionInfo();
  
  return {
    base: "/admin-bundle/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
      // Inject build timestamp into HTML for version verification
      mode === 'production' && {
        name: 'inject-html-timestamp',
        transformIndexHtml(html: string) {
          return html.replace(
            '<meta http-equiv="Expires" content="0" />',
            `<meta http-equiv="Expires" content="0" />\n    <!-- Build: ${versionInfo.buildTime} (${versionInfo.buildTimestamp}) -->`
          );
        }
      },
      // Rename the SPA entry from dist/index.html to dist/app.html so the
      // root path (/) is not auto-served as the React app. This frees `/`
      // for the Vercel rewrite that serves /v2/index.html (see vercel.json).
      // Fail the build loudly if the rename can't happen — better to fail
      // the deploy than ship a broken state.
      mode === 'production' && {
        name: 'rename-spa-entry',
        apply: 'build' as const,
        closeBundle() {
          const distDir = path.resolve(__dirname, '../admin-bundle');
          const src = path.join(distDir, 'index.html');
          const dst = path.join(distDir, 'app.html');
          if (!existsSync(src)) {
            throw new Error(
              `[rename-spa-entry] expected ${src} to exist after build but it does not. ` +
              `Refusing to continue — this would break SPA routing on Vercel.`
            );
          }
          if (existsSync(dst)) {
            throw new Error(
              `[rename-spa-entry] ${dst} already exists. Refusing to overwrite.`
            );
          }
          renameSync(src, dst);
        }
      }
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // APPLE APP STORE COMPLIANCE: Swap subscription hook for mobile builds
        // This completely excludes payment-related code from iOS binary
        ...(process.env.VITE_PLATFORM === 'mobile' && {
          '@/hooks/useSubscription': path.resolve(__dirname, './src/hooks/useSubscription.mobile.ts'),
        }),
      },
    },
    build: {
      outDir: "../admin-bundle",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and core libraries
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // UI components chunk
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast', 'lucide-react'],
            // Data fetching chunk
            'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
            // Form and validation chunk
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // Charts and visualization
            'vendor-charts': ['recharts', 'framer-motion'],
            // Utility libraries
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            // DND Kit
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/modifiers'],
          },
        },
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      // Enhanced minification
      minify: mode === 'production' ? 'esbuild' : false,
      // Enable source maps only in development
      sourcemap: mode === 'development',
      // Optimize CSS
      cssMinify: mode === 'production',
      // Asset optimization
      assetsInlineLimit: 4096, // Inline small assets
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        '@supabase/supabase-js',
        'lucide-react',
      ],
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(versionInfo.version),
      'import.meta.env.VITE_BASE_VERSION': JSON.stringify(versionInfo.baseVersion),
      'import.meta.env.VITE_GIT_HASH': JSON.stringify(versionInfo.gitHash),
      'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(versionInfo.gitBranch),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(versionInfo.buildTime),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(versionInfo.buildTimestamp),
      'import.meta.env.VITE_FULL_VERSION': JSON.stringify(versionInfo.fullVersion),
      'import.meta.env.VITE_PLATFORM': JSON.stringify(process.env.VITE_PLATFORM || 'web'),
    },
    // Enhanced CSS processing
    css: {
      devSourcemap: mode === 'development',
      preprocessorOptions: {
        css: {
          charset: false, // Avoid charset issues
        },
      },
    },
    // Prevent aggressive browser caching of HTML
    preview: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  };
});
