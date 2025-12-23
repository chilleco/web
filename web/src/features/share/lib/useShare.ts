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
          try {
            await navigator.share({ title, url });
            success(shareMessage);
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;

            if (supportsClipboard) {
              try {
                await navigator.clipboard.writeText(url);
                success(shareMessage);
                return;
              } catch {
                // Fall through to unavailable message.
              }
            }

            error(unavailableMessage);
            return;
          }
        }

        if (supportsClipboard) {
          await navigator.clipboard.writeText(url);
          success(shareMessage);
          return;
        }

        error(unavailableMessage);
      } catch {
        error(errorMessage);
      } finally {
        setSharing(false);
      }
    },
    [sharing, supportsNativeShare, supportsClipboard, success, error, shareMessage, unavailableMessage, errorMessage]
  );

  const available = supportsNativeShare || supportsClipboard;

  return { share, sharing, available };
}
