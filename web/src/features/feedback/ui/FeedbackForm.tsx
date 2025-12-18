'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/lib/utils';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { MultiFileUpload, type FileData } from '@/shared/ui/multi-file-upload';
import { IconButton } from '@/shared/ui/icon-button';
import { SendIcon } from '@/shared/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToastActions } from '@/shared/hooks/useToast';
import { useApiErrorMessage } from '@/shared/hooks/useApiErrorMessage';
import { ApiError } from '@/shared/services/api/client';
import { uploadFile } from '@/shared/services/api/upload';
import { saveFeedback, type FeedbackType } from '@/entities/feedback';

type FeedbackFieldKey = 'type' | 'data' | 'files';

const FEEDBACK_TYPES: FeedbackType[] = ['question', 'bug', 'request', 'improve'];

const extractDetail = (error: unknown): string | null => {
  if (!(error instanceof ApiError)) return null;
  const detail = error.data && typeof error.data === 'object'
    ? (error.data as { detail?: unknown }).detail
    : undefined;

  if (typeof detail === 'string') return detail;
  if (detail === null || detail === undefined) return null;
  return String(detail);
};

export interface FeedbackFormProps {
  initialType?: FeedbackType;
  typeLocked?: boolean;
  source?: string;
  onSubmitted?: (id: number) => void;
  className?: string;
}

export function FeedbackForm({
  initialType = 'question',
  typeLocked = false,
  source,
  onSubmitted,
  className,
}: FeedbackFormProps) {
  const t = useTranslations('feedback');
  const tSystem = useTranslations('system');
  const { success, error } = useToastActions();
  const formatApiErrorMessage = useApiErrorMessage();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>(initialType);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileData[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<FeedbackFieldKey | null>(null);

  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setFeedbackType(initialType);
  }, [initialType]);

  const typeOptions = useMemo(
    () =>
      FEEDBACK_TYPES.map((type) => ({
        value: type,
        label: t(`types.${type}`),
      })),
    [t]
  );

  const handleFilesChange = useCallback(
    async (newFiles: FileData[]) => {
      const previousFiles = files;
      const previousUrls = fileUrls;
      setFiles(newFiles);

      const staticUrls = newFiles
        .filter((file) => !file.file && file.preview)
        .map((file) => String(file.preview));
      setFileUrls(staticUrls);

      const filesToUpload = newFiles.filter((file) => file.file);
      if (!filesToUpload.length) return;

      setIsUploading(true);
      try {
        const uploaded: string[] = [];
        for (const fileData of filesToUpload) {
          if (!fileData.file) continue;
          const url = await uploadFile(fileData.file);
          uploaded.push(url);
          const idx = newFiles.indexOf(fileData);
          if (idx >= 0) {
            newFiles[idx] = {
              ...fileData,
              preview: url,
              file: undefined,
              name: fileData.file.name,
              size: fileData.file.size,
            };
            setFiles([...newFiles]);
          }
        }
        setFileUrls([...staticUrls, ...uploaded]);
      } catch (err) {
        setFiles(previousFiles);
        setFileUrls(previousUrls);
        error(formatApiErrorMessage(err, tSystem('server_error')));
      } finally {
        setIsUploading(false);
      }
    },
    [error, fileUrls, files, formatApiErrorMessage, tSystem]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting || isUploading) return;

      const trimmed = message.trim();
      if (!trimmed) {
        setFieldError('data');
        messageRef.current?.focus();
        return;
      }

      setFieldError(null);
      setIsSubmitting(true);

      try {
        const response = await saveFeedback({
          type: feedbackType,
          data: trimmed,
          files: fileUrls,
          source,
        });

        success(t('success'));
        setMessage('');
        setFiles([]);
        setFileUrls([]);
        onSubmitted?.(response.id);
      } catch (err) {
        const detail = extractDetail(err);
        if (detail === 'type' || detail === 'data' || detail === 'files') {
          setFieldError(detail);
          if (detail === 'data') {
            messageRef.current?.focus();
          }
        }

        error(formatApiErrorMessage(err, tSystem('server_error')));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      error,
      feedbackType,
      fileUrls,
      formatApiErrorMessage,
      isSubmitting,
      isUploading,
      message,
      onSubmitted,
      source,
      success,
      t,
      tSystem,
    ]
  );

  const isTypeInvalid = fieldError === 'type';
  const isDataInvalid = fieldError === 'data';
  const isFilesInvalid = fieldError === 'files';

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {!typeLocked && (
        <div className="space-y-2">
          <Label htmlFor="feedback-type" className="text-sm font-medium text-foreground">
            {t('fields.type')} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={feedbackType}
            onValueChange={(value) => {
              setFeedbackType(value as FeedbackType);
              setFieldError(null);
            }}
          >
            <SelectTrigger
              id="feedback-type"
              className={cn('cursor-pointer', isTypeInvalid && 'ring-2 ring-destructive')}
              aria-invalid={isTypeInvalid}
            >
              <SelectValue placeholder={t('fields.type')} />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="feedback-message" className="text-sm font-medium text-foreground">
          {t('fields.message')} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="feedback-message"
          ref={messageRef}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            if (fieldError === 'data') setFieldError(null);
          }}
          placeholder={t('placeholders.message')}
          rows={5}
          required
          aria-invalid={isDataInvalid}
          className={cn(isDataInvalid && 'ring-2 ring-destructive')}
        />
      </div>

      <div
        className={cn(
          'rounded-[0.75rem]',
          isFilesInvalid && 'ring-2 ring-destructive'
        )}
      >
        <MultiFileUpload
          value={files}
          onFilesChange={handleFilesChange}
          fileTypes="any"
          maxFiles={8}
          label={t('fields.files')}
          disabled={isUploading || isSubmitting}
        />
      </div>

      <IconButton
        type="submit"
        icon={<SendIcon size={16} />}
        variant="success"
        responsive
        className="w-full"
        disabled={isSubmitting || isUploading}
      >
        {tSystem('send')}
      </IconButton>
    </form>
  );
}
