import React from 'react';

export const DataFlowDecorations: React.FC = () => {
  return (
    <div className="hidden md:block">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            opacity: 0.4;
          }
          50% {
            transform: translate(20px, -20px) rotate(2deg);
            opacity: 0.2;
          }
          75% {
            opacity: 0.35;
          }
        }

        @keyframes float-medium {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.25;
          }
          33% {
            opacity: 0.35;
          }
          50% {
            transform: translate(-15px, 15px) rotate(-2deg);
            opacity: 0.15;
          }
          66% {
            opacity: 0.3;
          }
        }

        @keyframes float-fast {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translate(10px, -15px) scale(1.05);
            opacity: 0.3;
          }
        }

        @keyframes dash {
          0% {
            stroke-dashoffset: 1000;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes dash-reverse {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 1000;
          }
        }

        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }

        .animate-float-medium {
          animation: float-medium 15s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: float-fast 12s ease-in-out infinite;
        }

        .animate-dash {
          stroke-dasharray: 1000;
          animation: dash 30s linear infinite;
        }

        .animate-dash-reverse {
          stroke-dasharray: 1000;
          animation: dash-reverse 25s linear infinite;
        }
      `}} />

      {/* Curved Line 1 - Top Right */}
      <svg
        className="absolute top-32 right-0 w-96 h-96 opacity-30 animate-float-slow pointer-events-none"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 50 200 Q 150 50, 350 150"
          stroke="url(#gradient1)"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-dash"
        />
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dotted Arc 1 - Top Left */}
      <svg
        className="absolute top-48 left-0 w-80 h-80 opacity-25 animate-float-medium pointer-events-none"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 50 250 Q 100 100, 250 50"
          stroke="url(#gradient2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 8"
          className="animate-dash-reverse"
        />
        <defs>
          <linearGradient id="gradient2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Curved Line 2 - Middle Right */}
      <svg
        className="absolute top-[60%] right-10 w-72 h-72 opacity-20 animate-float-fast pointer-events-none"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 250 50 Q 150 150, 50 250"
          stroke="url(#gradient3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 10"
          className="animate-dash"
        />
        <defs>
          <linearGradient id="gradient3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(236, 72, 153)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(251, 146, 60)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dotted Arc 2 - Bottom Left */}
      <svg
        className="absolute bottom-32 left-20 w-64 h-64 opacity-30 animate-float-slow pointer-events-none"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 50 50 Q 150 100, 250 150"
          stroke="url(#gradient4)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 6"
          className="animate-dash-reverse"
        />
        <defs>
          <linearGradient id="gradient4" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
