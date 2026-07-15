import type { CapacitorConfig } from '@capacitor/cli';

// For LOCAL dev on device with hot reload from Lovable sandbox, uncomment
// the `server` block. It MUST be removed/commented for any Play Store or
// production build so the bundled `dist/` (or the live custom domain) is
// used.
const config: CapacitorConfig = {
  appId: 'com.nesake.gharlog',
  appName: 'GharLog',
  webDir: 'dist',
  // server: {
  //   url: 'https://c8919573-48a0-4dc1-9246-0e16d4f87bfe.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F1F4B',
      showSpinner: false,
    },
  },
};

export default config;
