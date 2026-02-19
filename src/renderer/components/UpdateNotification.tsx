import { useEffect, useRef } from 'react';
import { useToast } from './Toast';

export default function UpdateNotification(): null {
  const { showToast } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    const cleanupChecking = window.ghostAPI.on('update:checking', () => {
      showToast('info', 'Checking for updates...');
    });

    const cleanupAvailable = window.ghostAPI.on('update:available', (data: unknown) => {
      const { version } = data as { version: string };
      if (shownRef.current) return;
      shownRef.current = true;

      showToast('info', `Update v${version} available`, {
        label: 'Download',
        onClick: () => {
          window.ghostAPI.update.download();
        },
      });
    });

    const cleanupNotAvailable = window.ghostAPI.on('update:not-available', () => {
      showToast('success', 'You\'re already on the latest version!');
    });

    const cleanupDownloaded = window.ghostAPI.on('update:downloaded', (data: unknown) => {
      const { version } = data as { version: string };
      showToast('success', `v${version} ready to install`, {
        label: 'Install & Restart',
        onClick: () => {
          window.ghostAPI.update.install();
        },
      });
    });

    const cleanupError = window.ghostAPI.on('update:error', (data: unknown) => {
      const { message } = data as { message: string };
      showToast('error', 'Update check failed');
      console.error('[Update] Error:', message);
    });

    return () => {
      cleanupChecking();
      cleanupAvailable();
      cleanupNotAvailable();
      cleanupDownloaded();
      cleanupError();
    };
  }, [showToast]);

  return null;
}
