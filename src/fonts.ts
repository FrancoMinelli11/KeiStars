/**
 * Tipografías autoalojadas (WOFF2 de google/fonts empaquetadas por Fontsource).
 *
 * Sustituye el <link> a Google Fonts: sin peticiones al exterior, funciona
 * sin red y respeta la privacidad. Cada familia que usa la UI o los presets
 * se importa con sus pesos/cursivas concretas y **solo el subset latino**
 * (cubre el español: tildes y ñ), para no arrastrar cirílico ni vietnamita.
 */
import "@fontsource/cinzel/latin-600.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/playfair-display/latin-500.css";
import "@fontsource/playfair-display/latin-500-italic.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/merriweather/latin-400.css";
import "@fontsource/merriweather/latin-700.css";
import "@fontsource/merriweather/latin-400-italic.css";
import "@fontsource/courier-prime/latin-400.css";
/* Familia de la UI (--font-display en index.css) */
import "@fontsource/cormorant-garamond/latin-600.css";
