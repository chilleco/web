"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";

import { Box } from "@/shared/ui/box";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { AlertIcon, RefreshIcon } from "@/shared/ui/icons";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const tSystem = useTranslations("system");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tSystem("server_error")}
        description={tSystem("server_error_description")}
        icon={<AlertIcon size={24} />}
      />
      <Box className="flex flex-col gap-4">
        {error.digest ? (
          <div className="text-sm text-muted-foreground">
            {tSystem("error_code", { code: error.digest })}
          </div>
        ) : null}
        <Button onClick={reset} className="w-fit cursor-pointer">
          <RefreshIcon size={14} />
          {tSystem("refresh")}
        </Button>
      </Box>
    </div>
  );
}
