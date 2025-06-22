module.exports = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            animation: {
                highlight: 'highlightFlash 2s ease-in-out',
                'pulse-reset': 'pulse-reset 0.3s ease-out',
            },
            keyframes: {
                highlightFlash: {
                    '0%, 100%': { backgroundColor: 'white' },
                    '50%': { backgroundColor: '#ecfeff' }, 
                },
              },
        },
    },
    plugins: [
        require('tailwind-scrollbar'),
    ],
  
}
  