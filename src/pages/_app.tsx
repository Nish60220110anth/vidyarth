// pages/_app.tsx
import '@/styles/globals.css';
import "@/styles/styles.css";
import "@/styles/ContentEditable.css";

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AnimatePresence, motion } from 'framer-motion';
import Head from 'next/head';
import { AuthProvider } from '@/contexts/AuthContext';

const Toaster = dynamic(() => import('react-hot-toast').then(mod => mod.Toaster), {
  ssr: false,
});

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuthProvider>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>

        <Head>
          <title>Shukracharya</title>

          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#0f172a" />
          <meta name="title" content="Shukracharya - Your Placement Companion" />
          <meta name="description" content="Shukracharya is a comprehensive platform for students preparing for placements, offering CV prep, mock interviews, and more." />
          <meta name="keywords" content="Shukracharya, placements, IIM, CV, jobs, student portal" />
          <meta name="author" content="Team Synapse" />

          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://systems.teamsynapse.app/shukracharya" />
          <meta property="og:title" content="Shukracharya - Your Placement Companion" />
          <meta property="og:description" content="Explore jobs, prepare for interviews, and manage your placement journey with Shukracharya." />
          <meta property="og:image" content="https://systems.teamsynapse.app/shukracharya/preview.jpg" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content="https://systems.teamsynapse.app/shukracharya" />
          <meta name="twitter:title" content="Shukracharya - Your Placement Companion" />
          <meta name="twitter:description" content="Explore jobs, prepare for interviews, and manage your placement journey with Shukracharya." />
          <meta name="twitter:image" content="https://systems.teamsynapse.app/shukracharya/preview.jpg" />
          <meta name="twitter:site" content="@TeamSynapse" />
        </Head>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>

        {mounted && (
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'Inter, sans-serif',
                background: '#1f2937',
                color: '#d1d5db',
                border: '1px solid #374151',
              },
              success: {
                iconTheme: {
                  primary: '#06b6d4',
                  secondary: '#1e293b',
                },
              },
              error: {
                style: {
                  background: '#7f1d1d',
                  color: '#fef2f2',
                  fontFamily: 'Inter, sans-serif',
                },
              },
            }}
          />
        )}
      </GoogleOAuthProvider>
    </AuthProvider>
  );
}
