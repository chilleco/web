'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { IconButton } from '@/shared/ui/icon-button';
import { SaveIcon, LoadingIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { Product, ProductSaveRequest, saveProduct } from '@/entities/product';
import { MultiFileUpload, FileData } from '@/shared/ui/multi-file-upload';
import { uploadFile } from '@/shared/services/api/upload';

interface ProductFormState {
  title: string;
  description: string;
  images: string[];
  price: string;
  originalPrice: string;
  currency: string;
  rating: string;
  ratingCount: string;
  category: string;
  inStock: boolean;
  isNew: boolean;
  isFeatured: boolean;
  status: string;
}

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

const defaultState: ProductFormState = {
  title: '',
  description: '',
  images: [],
  price: '',
  originalPrice: '',
  currency: '$',
  rating: '',
  ratingCount: '',
  category: '',
  inStock: true,
  isNew: false,
  isFeatured: false,
  status: '1',
};

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const t = useTranslations('admin.products');
  const tSystem = useTranslations('system');
  const { success, error } = useToastActions();
  const [form, setForm] = useState<ProductFormState>(defaultState);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [uploading, setUploading] = useState(false);
  const inlineRowClass = 'flex h-12 items-center rounded-[0.75rem] bg-muted text-base text-foreground overflow-hidden';
  const inlineLabelClass = 'h-full px-3 flex items-center justify-center border-r border-border/60';
  const inlineInputClass = 'bg-muted border-0 text-base text-foreground rounded-l-none shadow-none focus:ring-0 focus:outline-none h-full';
  const inlineSelectClass = 'bg-muted border-0 text-base text-foreground rounded-l-none rounded-r-[0.75rem] h-full px-3 w-full cursor-pointer focus:outline-none focus:ring-0';

  useEffect(() => {
    if (!product) {
      setForm(defaultState);
      setFiles([]);
      return;
    }

    const initialFiles: FileData[] = (product.images || []).map((url) => ({
      file: undefined as unknown as File,
      preview: url,
      type: 'image',
      icon: undefined
    }));

    setForm({
      title: product.title || '',
      description: product.description || '',
      images: product.images || [],
      price: product.price ? String(product.price) : '',
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      currency: product.currency || '$',
      rating: product.rating ? String(product.rating) : '',
      ratingCount: product.ratingCount ? String(product.ratingCount) : '',
      category: product.category || '',
      inStock: product.inStock ?? true,
      isNew: product.isNew ?? false,
      isFeatured: product.isFeatured ?? false,
      status: product.status ? String(product.status) : '1',
    });
    setFiles(initialFiles);
  }, [product]);

  const handleChange = (field: keyof ProductFormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload: ProductSaveRequest = {
      id: product?.id,
      title: form.title,
      description: form.description || undefined,
      images: form.images,
      price: Number(form.price) || 0,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      currency: form.currency || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      ratingCount: form.ratingCount ? Number(form.ratingCount) : undefined,
      category: form.category || undefined,
      inStock: form.inStock,
      isNew: form.isNew,
      isFeatured: form.isFeatured,
      status: form.status ? Number(form.status) : undefined,
    };

    try {
      await saveProduct(payload);
      success(t('saved'));
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error');
      error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleFilesChange = async (newFiles: FileData[]) => {
    setFiles(newFiles);
    const staticUrls = newFiles.filter((f) => !f.file && f.preview).map((f) => String(f.preview));
    setForm((prev) => ({ ...prev, images: staticUrls }));

    const filesToUpload = newFiles.filter((f) => f.file);
    if (!filesToUpload.length) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileData = filesToUpload[i];
        if (!fileData.file) continue;
        const url = await uploadFile(fileData.file);
        uploaded.push(url);
        newFiles[newFiles.indexOf(fileData)] = { ...fileData, preview: url, file: undefined, type: 'image' };
        setFiles([...newFiles]);
      }
      setForm((prev) => ({ ...prev, images: [...staticUrls, ...uploaded] }));
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Input
          id="title"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder={t('name')}
          required
          className="bg-muted border-0 text-base text-foreground h-12"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-full">
          <MultiFileUpload
            value={files}
            onFilesChange={handleFilesChange}
            fileTypes="images"
            maxFiles={10}
            className="h-full"
          />
        </div>
        <div className="space-y-3 h-full">
          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('category')}</span>
            <Input
              placeholder={t('category')}
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={inlineInputClass}
            />
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('price')}</span>
            <Input
              placeholder={t('price')}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              required
              className={inlineInputClass}
            />
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('originalPrice')}</span>
            <Input
              placeholder={t('originalPrice')}
              type="number"
              min="0"
              step="0.01"
              value={form.originalPrice}
              onChange={(e) => handleChange('originalPrice', e.target.value)}
              className={inlineInputClass}
            />
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('currency')}</span>
            <select
              className={inlineSelectClass}
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <option value="$">$</option>
              <option value="€">€</option>
              <option value="₽">₽</option>
            </select>
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('status')}</span>
            <select
              className={inlineSelectClass}
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="1">{t('statusActive')}</option>
              <option value="0">{t('statusInactive')}</option>
            </select>
          </div>
        </div>
      </div>

      <Textarea
        placeholder={t('descriptionLabel')}
        value={form.description}
        onChange={(e) => handleChange('description', e.target.value)}
        rows={5}
        className="bg-muted border-0 text-base text-foreground"
      />

      <div className="space-y-2">
        <div className="h-12 rounded-[0.75rem] bg-muted flex items-center px-4 gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={(e) => handleChange('inStock', e.target.checked)}
            className="h-4 w-4 rounded-[0.75rem] accent-primary"
          />
          <span className="text-base text-foreground">{t('inStock')}</span>
        </div>
        <div className="h-12 rounded-[0.75rem] bg-muted flex items-center px-4 gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(e) => handleChange('isNew', e.target.checked)}
            className="h-4 w-4 rounded-[0.75rem] accent-primary"
          />
          <span className="text-base text-foreground">{t('isNew')}</span>
        </div>
        <div className="h-12 rounded-[0.75rem] bg-muted flex items-center px-4 gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => handleChange('isFeatured', e.target.checked)}
            className="h-4 w-4 rounded-[0.75rem] accent-primary"
          />
          <span className="text-base text-foreground">{t('isFeatured')}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <IconButton
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving || uploading}
        >
          {tSystem('cancel')}
        </IconButton>
        <IconButton
          type="submit"
          variant="default"
          disabled={saving || uploading}
          icon={(saving || uploading) ? <LoadingIcon size={16} className="animate-spin" /> : <SaveIcon size={16} />}
          responsive
          className="min-w-[10rem]"
        >
          {saving || uploading ? tSystem('saving') : tSystem('save')}
        </IconButton>
      </div>
    </form>
  );
}
