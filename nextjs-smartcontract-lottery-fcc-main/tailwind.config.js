module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        // Add any other directories or file types where Tailwind classes are used
    ],
    theme: {
        extend: {
            // Customize your theme here
            // Example: colors: { primary: '#4ade80' }, fontFamily: { sans: ['Graphik', 'sans-serif'] }
        },
    },
    plugins: [
        // Add Tailwind CSS plugins here if needed
        // Example: require('@tailwindcss/forms'), require('@tailwindcss/typography')
    ],
    // If you're using JIT mode, uncomment the following line
    // mode: 'jit',
    purge: {
        content: ['./pages/**/*.js', './components/**/*.js'],
        options: {
            safelist: ['some-classes-you-want-to-safelist']
        }
    }
    // Add any other Tailwind CSS configuration options here
};
