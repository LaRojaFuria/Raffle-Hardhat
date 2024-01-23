module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        // Include any additional paths where Tailwind CSS classes might be used.
    ],
    theme: {
        extend: {
            // Customize your theme here.
            // For example, to extend colors or fonts:
            // colors: { primary: '#4ade80' },
            // fontFamily: { sans: ['Graphik', 'sans-serif'] },
        },
    },
    plugins: [
        // Include Tailwind CSS plugins here if needed.
        // For example: require('@tailwindcss/forms'), require('@tailwindcss/typography')
    ],
    // Enable JIT mode for improved performance. Uncomment the next line in production.
    mode: 'jit',
    purge: {
        content: ['./pages/**/*.js', './components/**/*.js'],
        options: {
            safelist: [
                // Add any classes you want to ensure are not purged here.
                // For example, dynamic classes that might not be detected by the purge process.
            ],
        },
    },
    // Add any additional Tailwind CSS configuration options here.
};
