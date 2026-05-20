// Runtime configuration for the Shello frontend.
//
// This file is loaded before the Angular bundle so it can flip the app between
// "full-stack" mode (default) and "static mode" without rebuilding the app.
//
// HOW TO USE:
//   * Full-stack mode (default): leave staticMode false. The app will call
//     the backend API as usual.
//   * Static mode: set staticMode to true. The app will skip every backend
//     request and render the local catalog from src/app/data/products.static.ts.
//
// On Vercel this file is overwritten at build time by
// scripts/prepare-vercel-output.mjs based on the SHELLO_STATIC_MODE env var.
window.__SHELLO_CONFIG__ = window.__SHELLO_CONFIG__ || {};
window.__SHELLO_CONFIG__.staticMode = true;
