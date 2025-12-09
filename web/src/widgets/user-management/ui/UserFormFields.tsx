'use client';

import { Input } from '@/shared/ui/input';
import { FileUpload, type FileData } from '@/shared/ui/file-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui/select';
import { UserFormState } from '../lib/userFormUtils';

interface UserFormFieldsProps {
  data: UserFormState;
  onChange: (field: keyof UserFormState, value: string) => void;
  onFileChange: (file: File | null, preview: string | null, data: FileData | null) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  uploadingImage?: boolean;
  imageFileData?: FileData | null;
  labels: {
    name: string;
    surname: string;
    login: string;
    mail: string;
    phone: string;
    password?: string;
    balance?: string;
    status?: string;
    statusUnset?: string;
  };
  balancePlaceholder?: string;
  showPasswordPlaceholder?: boolean;
  showAdminFields?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
}

export function UserFormFields({
  data,
  onChange,
  onFileChange,
  onFileRemove,
  disabled,
  uploadingImage,
  imageFileData,
  labels,
  balancePlaceholder,
  showPasswordPlaceholder = false,
  showAdminFields = false,
  statusOptions = [],
}: UserFormFieldsProps) {
  const unsetValue = 'unset';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <div className="h-full">
        <FileUpload
          value={data.image}
          fileData={imageFileData ? { ...imageFileData, type: 'image' as const } : null}
          onFileChange={onFileChange}
          onFileRemove={onFileRemove}
          fileTypes="images"
          width="w-full h-full"
          height={320}
          disabled={disabled || uploadingImage}
        />
      </div>
      <div className="space-y-3 h-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder={labels.name}
            value={data.name}
            onChange={(event) => onChange('name', event.target.value)}
            disabled={disabled}
            className="bg-muted border-0 text-base text-foreground"
          />
          <Input
            placeholder={labels.surname}
            value={data.surname}
            onChange={(event) => onChange('surname', event.target.value)}
            disabled={disabled}
            className="bg-muted border-0 text-base text-foreground"
          />
        </div>
        <div className="flex items-center rounded-[0.75rem] bg-muted h-12 overflow-hidden px-3 gap-3">
          <span className="text-base text-muted-foreground">@</span>
          <Input
            placeholder={labels.login}
            value={data.login}
            onChange={(event) => onChange('login', event.target.value)}
            disabled={disabled}
            className="bg-transparent border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full px-0"
          />
        </div>
        <Input
          placeholder={labels.mail}
          value={data.mail}
          onChange={(event) => onChange('mail', event.target.value)}
          disabled={disabled}
          className="bg-muted border-0 text-base text-foreground"
        />
        <div className="flex items-center rounded-[0.75rem] bg-muted h-12 overflow-hidden px-3 gap-3">
          <span className="text-base text-muted-foreground">+</span>
          <Input
            placeholder={labels.phone}
            value={data.phone}
            onChange={(event) => onChange('phone', event.target.value)}
            disabled={disabled}
            inputMode="numeric"
            pattern="[0-9]*"
            className="bg-transparent border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full px-0"
          />
        </div>

        {showAdminFields ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={data.status || unsetValue}
              onValueChange={(value) => onChange('status', value === unsetValue ? '' : value)}
              disabled={disabled}
            >
              <SelectTrigger className="bg-muted border-0 text-base text-foreground h-12 cursor-pointer">
                <SelectValue placeholder={labels.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={unsetValue} className="cursor-pointer">
                  {labels.statusUnset || labels.status}
                </SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-[0.75rem] bg-muted h-12 overflow-hidden px-3 gap-3">
              <span className="text-base text-muted-foreground">
                {labels.balance}
              </span>
              <Input
                placeholder={balancePlaceholder || labels.balance}
                value={data.balance}
                onChange={(event) => onChange('balance', event.target.value)}
                disabled={disabled}
                inputMode="numeric"
                pattern="[0-9]*"
                className="bg-transparent border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full px-0"
              />
            </div>
          </div>
        ) : null}

        {showPasswordPlaceholder ? (
          <Input
            placeholder={labels.password}
            value="••••••••"
            readOnly
            disabled
            className="bg-muted border-0 text-base text-foreground"
          />
        ) : null}
      </div>
    </div>
  );
}
