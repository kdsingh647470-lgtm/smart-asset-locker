import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c891957348a04dc192460e16d4f87bfe',
  appName: 'Smart Asset Locker',
  webDir: 'dist',
  server: {
    // Hot-reload from the Lovable sandbox. Remove `url` before building a
    // store-ready release so the bundled `dist/` is used instead.
    url: 'https://c8919573-48a0-4dc1-9246-0e16d4f87bfe.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
  },
};

export default config;
