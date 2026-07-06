import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Agregamos Tailwind aquí para que procese tus estilos
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
 base: '/FinanzasPro/', // <-- AÑADE ESTA LÍNEA (con las barras diagonales)
}); // <-- Corregido el cierre aquí (eliminamos la llave extra que rompía el código)
