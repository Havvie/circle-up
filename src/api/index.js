import { demoApi } from './demoApi.js';
import { httpApi } from './httpApi.js';

// With VITE_API_URL set at build time the app uses the real server; otherwise the in-browser demo.
export const api = import.meta.env.VITE_API_URL ? httpApi : demoApi;
