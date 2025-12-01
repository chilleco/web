import { useState, useMemo, useCallback } from 'react';
import { useToastActions } from '@/shared/hooks/useToast';

interface UseShareParams {
  shareMessage: string;
  unavailableMessage: string;
  errorMessage: string;
}

interface ShareInput {
  title: string;
  url: string;
}

export function useShare({ shareMessage, unavailableMessage, errorMessage }: UseShareParams) {
  const { success, error } = useToastActions();
  const [sharing, setSharing] = useState(false);

  const supportsNativeShare = useMemo(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    []
  );
  const supportsClipboard = useMemo(
    () => typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText,
    []
  );

  const share = useCallback(
    async ({ title, url }: ShareInput) => {
      if (sharing) return;
      setSharing(true);

      try {
        if (supportsNativeShare) {
          await navigator.share({ title, url });
          success(shareMessage);
          return;
        }

        if (supportsClipboard) {
          await navigator.clipboard.writeText(url);
          success(shareMessage);
          return;
        }

        error(unavailableMessage);
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage;
        error(message);
      } finally {
        setSharing(false);
      }
    },
    [sharing, supportsNativeShare, supportsClipboard, success, error, shareMessage, unavailableMessage, errorMessage]
  );

  const available = supportsNativeShare || supportsClipboard;

  return { share, sharing, available };
}
