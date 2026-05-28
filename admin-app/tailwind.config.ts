
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		boxShadow: {
			none: 'none',
			sm: '0 1px 2px rgba(0,0,0,0.1)',
			DEFAULT: '0 1px 2px rgba(0,0,0,0.1)',
			md: '0 4px 12px rgba(0,0,0,0.15)',
			lg: '0 4px 12px rgba(0,0,0,0.15)',
			xl: '0 4px 12px rgba(0,0,0,0.15)',
			'2xl': '0 4px 12px rgba(0,0,0,0.15)',
			inner: 'none',
			focus: '0 0 0 2px rgba(92,132,254,0.25)',
			subtle: '0 1px 2px rgba(0,0,0,0.1)',
			medium: '0 4px 12px rgba(0,0,0,0.15)',
		},
		borderRadius: {
			none: '0',
			sm: '2px',
			DEFAULT: '4px',
			md: '5px',
			lg: '6px',
			xl: '8px',
			'2xl': '8px',
			'3xl': '8px',
			full: '9999px',
		},
		extend: {
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
			},
			fontSize: {
				'2xs': ['0.625rem', { lineHeight: '0.875rem' }],
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],
			},
			backdropBlur: {
				xs: '2px',
				'3xl': '64px',
			},
			backgroundImage: {
				'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%)',
				'glass-gradient-dark': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)',
			},
			colors: {
				border: 'var(--border)',
				input: 'var(--input)',
				ring: 'var(--ring)',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					light: 'hsl(var(--primary-light))',
					dark: 'hsl(var(--primary-dark))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'var(--destructive)',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'var(--success)',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'var(--warning)',
					foreground: 'hsl(var(--warning-foreground))'
				},
				error: {
					DEFAULT: 'var(--error)',
					foreground: 'hsl(var(--error-foreground))'
				},
				info: {
					DEFAULT: 'var(--info)',
					foreground: 'hsl(var(--info-foreground))'
				},
				gray: {
					50: 'hsl(var(--gray-50))',
					100: 'hsl(var(--gray-100))',
					200: 'hsl(var(--gray-200))',
					300: 'hsl(var(--gray-300))',
					400: 'hsl(var(--gray-400))',
					500: 'hsl(var(--gray-500))',
					600: 'hsl(var(--gray-600))',
					700: 'hsl(var(--gray-700))',
					800: 'hsl(var(--gray-800))',
					900: 'hsl(var(--gray-900))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				tesla: {
					black: 'hsl(var(--tesla-black))',
					dark: 'hsl(var(--tesla-dark))',
					darker: 'hsl(var(--tesla-darker))',
					blue: 'hsl(var(--tesla-electric-blue))',
					green: 'hsl(var(--tesla-neon-green))',
					red: 'hsl(var(--tesla-red))',
					white: 'hsl(var(--tesla-white))',
					gray: 'hsl(var(--tesla-gray))',
					'light-gray': 'hsl(var(--tesla-light-gray))'
				},
				orgChart: {
					yellow: 'hsl(var(--org-yellow))',
					'yellow-light': 'hsl(var(--org-yellow-light))',
					'yellow-dark': 'hsl(var(--org-yellow-dark))',
					'red-start': 'hsl(var(--org-red-start))',
					'red-end': 'hsl(var(--org-red-end))',
					'red-light': 'hsl(var(--org-red-light))',
					'red-border': 'hsl(var(--org-red-border))',
					'yellow-start': 'hsl(var(--org-yellow-start))',
					'yellow-end': 'hsl(var(--org-yellow-end))',
					'yellow-border': 'hsl(var(--org-yellow-border))',
					'green-start': 'hsl(var(--org-green-start))',
					'green-end': 'hsl(var(--org-green-end))',
					'green-light': 'hsl(var(--org-green-light))',
					'green-border': 'hsl(var(--org-green-border))',
					'blue-start': 'hsl(var(--org-blue-start))',
					'blue-end': 'hsl(var(--org-blue-end))',
					'blue-light': 'hsl(var(--org-blue-light))',
					'blue-border': 'hsl(var(--org-blue-border))'
				},
				surface: {
					sidebar: 'var(--surface-sidebar)',
					raised: 'var(--surface-raised)',
					overlay: 'var(--surface-overlay)',
				},
				state: {
					hover: 'var(--state-hover)',
					active: 'var(--state-active)',
				},
				'border-subtle': 'var(--border-subtle)',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))'
				},
				/* Zentrix Design System Tokens */
				'page-bg': 'var(--page-bg)',
				'sidebar-bg': 'var(--sidebar-bg)',
				'card-bg': 'var(--card-bg)',
				'surface-raised': 'var(--surface-raised)',
				'surface-overlay': 'var(--surface-overlay)',
				'active-bg': 'var(--active)',
				'hover-bg': 'var(--hover)',
				'border-default': 'var(--border)',
				'text-primary': 'var(--text-primary)',
				'text-secondary': 'var(--text-secondary)',
				'text-muted': 'var(--text-muted)',
				'text-disabled': 'var(--text-disabled)',
				'accent-hover': 'var(--accent-hover)',
				'accent-muted': 'var(--accent-muted)',
				'status-success': 'var(--success)',
				'status-warning': 'var(--warning)',
				'status-error': 'var(--error)',
				'status-info': 'var(--info)',
			},
			spacing: {
				'18': '4.5rem',
				'22': '5.5rem',
				'26': '6.5rem',
				'30': '7.5rem',
				'34': '8.5rem',
				'38': '9.5rem',
				'xs': '0.25rem',
				'sm': '0.5rem',
				'md': '1rem',
				'lg': '1.5rem',
				'xl': '2rem',
				'2xl': '3rem',
				'3xl': '4rem'
			},
			fontFamily: {
				sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: 'normal' }],
				'sm': ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: 'normal' }],
				'base': ['0.875rem', { lineHeight: '1.375rem', letterSpacing: 'normal' }],
				'lg': ['1rem', { lineHeight: '1.625rem', letterSpacing: 'normal' }],
				'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
				'2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
				'3xl': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.015em' }],
				'4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
				'display': ['3rem', { lineHeight: '3.75rem', letterSpacing: '-0.02em' }],
				'2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
				'3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
				'4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
				'5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
				'6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
				'7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
				'8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
				'9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
				'10xl': ['10rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
				'11xl': ['12rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
				'12xl': ['14rem', { lineHeight: '1', letterSpacing: '-0.06em' }],
			},
			backdropBlur: {
				'xs': '2px',
				'4xl': '72px',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0',
						opacity: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)',
						opacity: '1'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)',
						opacity: '1'
					},
					to: {
						height: '0',
						opacity: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px)'
					}
				},
				'slide-in': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-in-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(100%)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'slide-out-right': {
					'0%': {
						opacity: '1',
						transform: 'translateX(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateX(100%)'
					}
				},
				'slide-in-left': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-100%)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'scale-out': {
					'0%': {
						opacity: '1',
						transform: 'scale(1)'
					},
					'100%': {
						opacity: '0',
						transform: 'scale(0.95)'
					}
				},
				'shimmer': {
					'0%': { 
						backgroundPosition: '-200% 0' 
					},
					'100%': { 
						backgroundPosition: '200% 0' 
					}
				},
				'tesla-float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'tesla-pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 20px hsl(var(--tesla-electric-blue) / 0.3)' 
					},
					'50%': { 
						boxShadow: '0 0 40px hsl(var(--tesla-electric-blue) / 0.6)' 
					}
				},
				'grid': {
					'0%': { transform: 'translateY(-50%)' },
					'100%': { transform: 'translateY(0)' }
				},
				'press-scale': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.98)' },
					'100%': { transform: 'scale(1)' }
				},
				'button-press': {
					'0%': { transform: 'scale(1)', filter: 'brightness(1)' },
					'50%': { transform: 'scale(0.98)', filter: 'brightness(0.95)' },
					'100%': { transform: 'scale(1)', filter: 'brightness(1)' }
				},
				'ripple': {
					'0%': { transform: 'scale(0)', opacity: '1' },
					'100%': { transform: 'scale(4)', opacity: '0' }
				},
				'icon-bounce': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.1)' }
				},
				'success-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
						backgroundColor: 'var(--success)'
					},
					'50%': {
						boxShadow: '0 0 0 8px rgba(34, 197, 94, 0)',
						backgroundColor: 'var(--success)'
					}
				},
				'error-shake': {
					'0%, 100%': { transform: 'translateX(0)' },
					'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
					'20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
				},
				'badge-in': {
					'0%': { transform: 'scale(0)', opacity: '0' },
					'50%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'badge-out': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(0)', opacity: '0' }
				},
				'badge-pulse': {
					'0%, 100%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.05)', opacity: '0.9' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'fade-out': 'fade-out 0.3s ease-out',
				'slide-in': 'slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'scale-in': 'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'scale-out': 'scale-out 0.2s ease-out',
				'shimmer': 'shimmer 2s infinite linear',
				'tesla-float': 'tesla-float 3s ease-in-out infinite',
				'tesla-pulse-glow': 'tesla-pulse-glow 2s ease-in-out infinite',
				'grid': 'grid 15s linear infinite',
				'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
				'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out',
				'press-scale': 'press-scale 0.1s ease-out',
				'button-press': 'button-press 0.15s ease-out',
				'ripple': 'ripple 0.6s ease-out',
				'icon-bounce': 'icon-bounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'success-pulse': 'success-pulse 0.6s ease-out',
				'error-shake': 'error-shake 0.4s ease-out',
				'badge-in': 'badge-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'badge-out': 'badge-out 0.2s ease-out',
				'badge-pulse': 'badge-pulse 2s ease-in-out infinite'
			},
			transitionTimingFunction: {
				'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
			},
			transitionDuration: {
				'fast': '150ms',
				'base': '200ms',
				'smooth': '300ms',
				'slow': '500ms'
			},
			perspective: {
				'1000': '1000px',
				'2000': '2000px',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
