// pages/_app.tsx
import '@/styles/globals.css';
import "@/styles/styles.css";
import "@/styles/ImageNode.css";
import "@/styles/Modal.css";
import "@/styles/Button.css";
import "@/styles/Dialog.css";
import "@/styles/Input.css";
import "@/styles/Select.css";
import "@/styles/Checkbox.css";
import "@/styles/Placeholder.css";
import "@/styles/ContentEditable.css";

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { Metadata } from 'next';


const Toaster = dynamic(() => import('react-hot-toast').then(mod => mod.Toaster), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Vidyarth',
  description: 'Add something',
  keywords: ["here too"]
}

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true); // Prevents mismatch on hydration
  }, []);

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={router.route}
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
  );
}
