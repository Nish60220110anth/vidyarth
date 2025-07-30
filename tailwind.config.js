module.exports = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            colors: {
                surface: {
                    DEFAULT: "#0d1820",
                    soft: "#0b141b",
                    alt: "#091119",
                },
            },
            boxShadow: {
                'elev-sm': "0 4px 12px rgba(0,0,0,0.25)",
                'elev-md': "0 8px 24px rgba(0,0,0,0.28)",
                'elev-lg': "0 12px 32px rgba(0,0,0,0.32)",
            },
            transitionTimingFunction: {
                'brand-ease': "cubic-bezier(0.22, 1, 0.36, 1)", 
            },
            transitionDuration: {
                250: "250ms",
                350: "350ms",
            },
            keyframes: {
                breath: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0)' },
                    '50%': { boxShadow: '0 0 0 6px rgba(34,211,238,0.08)' },
                },
                highlightFlash: {
                    '0%, 100%': { backgroundColor: 'white' },
                    '50%': { backgroundColor: '#ecfeff' },
                },
            },
            animation: {
                breath: "breath 2.8s ease-in-out infinite",
                highlight: 'highlightFlash 2s ease-in-out',
                'pulse-reset': 'pulse-reset 0.3s ease-out',
            },
            ringColor: {
                cyanSoft: "rgba(34,211,238,0.28)",
            },
        },
    },
    safelist: [
        'dark:text-white',
        'dark:bg-blue-950',
        'dark:border-gray-800',
        'dark:text-gray-300',
        'dark:text-cyan-400',
    ],
    plugins: [
        require('tailwind-scrollbar'),
    ],
}
  