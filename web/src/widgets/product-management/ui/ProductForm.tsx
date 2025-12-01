'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { IconButton } from '@/shared/ui/icon-button';
import { SaveIcon, LoadingIcon, PlusIcon, TrashIcon, CloseIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { Product, ProductSaveRequest, saveProduct } from '@/entities/product';
import { MultiFileUpload, FileData } from '@/shared/ui/multi-file-upload';
import { uploadFile } from '@/shared/services/api/upload';

interface FeatureField {
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean';
}

interface ProductFormState {
  title: string;
  description: string;
  images: string[];
  price: string;
  discountType: 'none' | 'percent' | 'fixed';
  discountValue: string;
  currency: string;
  rating: string;
  ratingCount: string;
  category: string;
  inStock: boolean;
  isNew: boolean;
  isFeatured: boolean;
  status: string;
  features: FeatureField[];
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
  discountType: 'none',
  discountValue: '',
  currency: '$',
  rating: '',
  ratingCount: '',
  category: '',
  inStock: true,
  isNew: false,
  isFeatured: false,
  status: '1',
  features: [],
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

  const calculateFinalPrice = (basePrice: number, discountType: ProductFormState['discountType'], discountValue: number) => {
    if (discountType === 'none' || discountValue <= 0) return basePrice;
    if (discountType === 'percent') {
      return Math.max(basePrice - (basePrice * discountValue) / 100, 0);
    }
    return Math.max(basePrice - discountValue, 0);
  };

  const toFeatureField = (feature: Product['features'][number] | FeatureField): FeatureField => ({
    key: feature.key || '',
    value: feature.valueType === 'boolean' ? String(feature.value) : String(feature.value ?? ''),
    valueType: feature.valueType || 'string',
  });

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
      discountType: product.discountType || 'none',
      discountValue: product.discountValue ? String(product.discountValue) : '',
      currency: product.currency || '$',
      rating: product.rating ? String(product.rating) : '',
      ratingCount: product.ratingCount ? String(product.ratingCount) : '',
      category: product.category || '',
      inStock: product.inStock ?? true,
      isNew: product.isNew ?? false,
      isFeatured: product.isFeatured ?? false,
      status: product.status ? String(product.status) : '1',
      features: (product.features || []).map(toFeatureField),
    });
    setFiles(initialFiles);
  }, [product]);

  const handleChange = (field: Exclude<keyof ProductFormState, 'features'>, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFeatureChange = (index: number, field: keyof FeatureField, value: string) => {
    setForm((prev) => {
      const updated = [...prev.features];
      const current = updated[index];
      const nextFeature: FeatureField = {
        ...current,
        [field]: value,
      };

      if (field === 'valueType') {
        nextFeature.valueType = value as FeatureField['valueType'];
        if (nextFeature.valueType === 'boolean') {
          nextFeature.value = nextFeature.value === 'false' ? 'false' : 'true';
        }
      }

      updated[index] = nextFeature;
      return { ...prev, features: updated };
    });
  };

  const handleAddFeature = () => {
    setForm((prev) => ({
      ...prev,
      features: [...prev.features, { key: '', value: '', valueType: 'string' }],
    }));
  };

  const handleRemoveFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const discountType = form.discountType === 'none' ? undefined : form.discountType;
    const discountValue = discountType ? Number(form.discountValue) || 0 : undefined;
    const features = form.features
      .filter((feature) => feature.key.trim().length > 0)
      .map((feature) => {
        const valueType = feature.valueType || 'string';
        let value: string | number | boolean = feature.value;

        if (valueType === 'number') {
          value = Number(feature.value) || 0;
        } else if (valueType === 'boolean') {
          value = ['true', '1', 'yes', 'on'].includes(String(feature.value).toLowerCase());
        }

        return {
          key: feature.key.trim(),
          value,
          valueType,
        };
      });

    const payload: ProductSaveRequest = {
      id: product?.id,
      title: form.title,
      description: form.description || undefined,
      images: form.images,
      price: Number(form.price) || 0,
      discountType,
      discountValue,
      features,
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

  const finalPricePreview = calculateFinalPrice(Number(form.price) || 0, form.discountType, Number(form.discountValue) || 0);

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
            <span className={inlineLabelClass}>{t('discountType')}</span>
            <select
              className={inlineSelectClass}
              value={form.discountType}
              onChange={(e) => handleChange('discountType', e.target.value as ProductFormState['discountType'])}
            >
              <option value="none">{tSystem('none')}</option>
              <option value="percent">{t('discountTypePercent')}</option>
              <option value="fixed">{t('discountTypeFixed')}</option>
            </select>
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('discountValue')}</span>
            <Input
              placeholder={t('discountValue')}
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              disabled={form.discountType === 'none'}
              onChange={(e) => handleChange('discountValue', e.target.value)}
              className={inlineInputClass}
            />
          </div>

          <div className="px-2 text-sm text-muted-foreground">
            {t('finalPricePreview', { value: finalPricePreview.toFixed(2), currency: form.currency || '' }).trim()}
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{t('featuresTitle')}</span>
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            icon={<PlusIcon size={14} />}
            onClick={handleAddFeature}
            responsive
          >
            {tSystem('add')}
          </IconButton>
        </div>

        <div className="space-y-2">
          {form.features.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2">{t('featuresEmpty')}</div>
          ) : (
            form.features.map((feature, index) => (
              <div key={`${feature.key}-${index}`} className="rounded-[1rem] bg-muted/50 p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className={inlineRowClass}>
                    <span className={inlineLabelClass}>{t('featureKey')}</span>
                    <Input
                      placeholder={t('featureKey')}
                      value={feature.key}
                      onChange={(e) => handleFeatureChange(index, 'key', e.target.value)}
                      className={inlineInputClass}
                    />
                  </div>
                  <div className={inlineRowClass}>
                    <span className={inlineLabelClass}>{t('featureType')}</span>
                    <select
                      className={inlineSelectClass}
                      value={feature.valueType}
                      onChange={(e) => handleFeatureChange(index, 'valueType', e.target.value)}
                    >
                      <option value="string">{t('featureTypeString')}</option>
                      <option value="number">{t('featureTypeNumber')}</option>
                      <option value="boolean">{t('featureTypeBoolean')}</option>
                    </select>
                  </div>
                  <div className={inlineRowClass}>
                    <span className={inlineLabelClass}>{t('featureValue')}</span>
                    {feature.valueType === 'boolean' ? (
                      <select
                        className={inlineSelectClass}
                        value={feature.value}
                        onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                      >
                        <option value="true">{t('valueYes')}</option>
                        <option value="false">{t('valueNo')}</option>
                      </select>
                    ) : (
                      <Input
                        placeholder={t('featureValue')}
                        type={feature.valueType === 'number' ? 'number' : 'text'}
                        value={feature.value}
                        onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                        className={inlineInputClass}
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <IconButton
                    type="button"
                    variant="destructive"
                    size="sm"
                    icon={<TrashIcon size={12} />}
                    onClick={() => handleRemoveFeature(index)}
                    responsive
                  >
                    {tSystem('remove')}
                  </IconButton>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
          icon={<CloseIcon size={16} />}
          responsive
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
