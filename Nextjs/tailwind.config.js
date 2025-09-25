/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,md}',
    './components/**/*.{js,ts,jsx,tsx,md}',
    './app/**/*.{js,ts,jsx,tsx,md}',
    './src/**/*.{js,ts,jsx,tsx,md}',
  ],
  darkMode: ['class', 'class'],
  theme: {
  	extend: {
		fontFamily: {
			sans: [
				'-apple-system',
				'BlinkMacSystemFont',
				'Segoe UI',
				'Roboto',
				'Oxygen',
				'Ubuntu',
				'Cantarell',
				'Open Sans',
				'Helvetica Neue',
				'Arial',
				'sans-serif'
			]
		},
  		colors: {
  			b1: '#000000',
  			b2: '#0D0D0D',
  			b3: '#262626',
  			b4: '#404040',
  			b5: '#595959',
  			b6: '#737373',
  			b7: '#8C8C8C',
  			b8: '#A6A6A6',
  			b9: '#BFBFBF',
  			b10: '#D9D9D9',
  			b11: '#E6E6E6',
  			b12: '#F2F2F2',
  			b13: '#F9F9F9',
  			b14: '#FCFCFC',
  			b15: '#FFFFFF',
  			w1: '#FFFFFF',
  			w2: '#F2F2F2',
  			w3: '#D9D9D9',
  			w4: '#BFBFBF',
  			w5: '#A6A6A6',
  			w6: '#8C8C8C',
  			w7: '#737373',
  			w8: '#595959',
  			w9: '#404040',
  			w10: '#262626',
  			w11: '#212121',
  			w12: '#191919',
  			w13: '#0D0D0D',
  			w14: '#000000',
  			red: '#EC4141',
  			reddark: '#BB3F3F',
  			reddarkhover: '#A83636',
  			green: '#40BD7E',
  			greendark: '#43855B',
  			greenlight: '#F6FEF2',
  			blue: '#6637EC',
  			blue5: '#ebe7f4',
  			bluelight: '#F3F3FF',
  			bluehover: '#1D4ED8',
  			bluedark: '#5050f6',
  			orange: '#FB923C',
  			purple: '#8D3CE2',
  			ligheter: '#F5F5FF',
  			highlighter: '#EAE2FF',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			primaryforeground: '#FFFFFF',
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			secondaryforeground: '#262626',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			mutedforeground: '#737373',
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			accentforeground: '#6637EC',
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			destructiveforeground: '#FFFFFF',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			cardforeground: '#262626',
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			popoverforeground: '#262626',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			'custom-1': '0 0 4px 0 rgba(0, 0, 0, 0.05)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'slide-in-from-top': {
  				from: {
  					transform: 'translateY(-100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'slide-in-from-top': 'slide-in-from-top 0.3s ease-out'
  		},
  		borderRadius: {
  			'10': '10px',
  			none: '0',
  			sm: 'calc(var(--radius) - 4px)',
  			DEFAULT: '4px',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			full: '9999px',
  			large: '12px',
  			custom: '5px'
  		}
  	},
  	screens: {
  		sm: '576px',
  		md: '768px',
  		lg: '1024px',
  		xl: '1200px',
  		'2xl': '1360px',
  		'3xl': '1560px',
  		'max-3xl': {
  			max: '1559px'
  		},
  		'max-2xl': {
  			max: '1359px'
  		},
  		'max-xl': {
  			max: '1199px'
  		},
  		'max-lg': {
  			max: '1023px'
  		},
  		'max-md': {
  			max: '767px'
  		},
  		'max-sm': {
  			max: '575px'
  		}
  	},
  	container: {
  		padding: {
  			DEFAULT: '15px'
  		},
  		screens: {
  			sm: '576px',
  			md: '768px',
  			lg: '1024px',
  			xl: '1200px',
  			'2xl': '1360px'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
}
