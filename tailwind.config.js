/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
      },
      animation: {
        'anim_border_key': "anim_border 2s infinite ease-in",
        'anim_border_key_res': "anim_border_res 2s infinite ease-in-out"
      },
      keyframes: {
        anim_border: {
          '0%': {
            borderColor: '#991b1b'
          },
          '25%': {
            borderColor: '#09090b'
          },
          '50%': {
            borderColor: '#991b1b'
          },
          '100%': {
            borderColor: '#09090b'
          }
        },
        'anim_border_res': {
          '0%': {
            borderColor: '#15803d'
          },
          '25%': {
            borderColor: '#09090b'
          },
          '50%': {
            borderColor: '#15803d'
          },
          '100%': {
            borderColor: '#09090b'
          }
        } 
      }
    },
  },
  plugins: [],
}

