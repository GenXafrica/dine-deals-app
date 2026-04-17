import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Prevent duplicate bundles and ensure single entry point
      rollupOptions: {
        output: {
          manualChunks: undefined, // Disable manual chunking to prevent duplicates
        },
      },
      // Clear output directory before build
      emptyOutDir: true,
      // Ensure consistent builds
      sourcemap: false,
    },
    // Explicitly define environment variables for better type safety and validation
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    // Ensure environment variables are loaded properly
    envPrefix: 'VITE_',
  };
});
