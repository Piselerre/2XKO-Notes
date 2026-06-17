import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { isMobileApp } from '@/utils/platform';
import { isMobilePreviewForced } from '@/utils/mobilePreview';

function detectMobile(): boolean {
  if (isMobilePreviewForced()) return true;
  return isMobileApp();
}

/** True on Android/iOS (Tauri or mobile browser), or with `?mobile=1` in dev. Never from viewport on desktop .exe. */
export function useIsMobile(): boolean {
  const location = useLocation();
  const [mobile, setMobile] = useState(detectMobile);

  useEffect(() => {
    setMobile(detectMobile());
  }, [location.pathname, location.search]);

  return mobile;
}
