'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { IconButton } from '@/shared/ui/icon-button';
import { SaveIcon, LoadingIcon, PlusIcon, TrashIcon, CloseIcon, ChevronDownIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { Product, ProductFeature, ProductSaveRequest, saveProduct } from '@/entities/product';
import { MultiFileUpload, FileData } from '@/shared/ui/multi-file-upload';
import { uploadFile } from '@/shared/services/api/upload';
import { cn } from '@/shared/lib/utils';

interface FeatureField {
  id: string;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean';
}

interface OptionField {
  id: string;
  name: string;
  price: string;
  discountType: 'none' | 'percent' | 'fixed';
  discountValue: string;
  rating: string;
  ratingCount: string;
  stockCount: string;
  images: string[];
  attributes: FeatureField[];
  features: FeatureField[];
}

const inlineRowClass = 'flex h-12 items-center rounded-[0.75rem] bg-muted text-base text-foreground overflow-hidden';
const inlineLabelClass = 'h-full px-3 flex items-center justify-center border-r border-border/60 bg-muted text-foreground';
const inlineInputClass = 'bg-muted border-0 text-base text-foreground rounded-none shadow-none focus:ring-0 focus:outline-none h-full w-full placeholder:text-muted-foreground';
const inlineSelectClass = 'bg-muted border-0 text-base text-foreground rounded-none rounded-r-[0.75rem] h-full px-3 w-full cursor-pointer focus:outline-none focus:ring-0 appearance-none pr-10';

const generateId = () =>
(typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random()}`);

function createEmptyOption(): OptionField {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return {
    id,
    name: '',
    price: '',
    discountType: 'none',
    discountValue: '',
    rating: '',
    ratingCount: '',
    stockCount: '1',
    images: [],
    attributes: [],
    features: [],
  };
}

const toFeatureField = (feature?: ProductFeature | FeatureField): FeatureField => {
  const valueType = feature?.valueType || 'string';
  const normalizedValue =
    valueType === 'boolean'
      ? String(feature?.value ?? 'false')
      : String(feature?.value ?? '');

  return {
    id: (feature as FeatureField)?.id || generateId(),
    key: feature?.key || '',
    value: normalizedValue,
    valueType,
  };
};

function InlineSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full h-full">
      <select
        {...props}
        className={cn(inlineSelectClass, className)}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

interface ProductFormState {
  title: string;
  description: string;
  images: string[];
  currency: string;
  category: string;
  isNew: boolean;
  isFeatured: boolean;
  status: string;
  features: FeatureField[];
  options: OptionField[];
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
  currency: '$',
  category: '',
  isNew: false,
  isFeatured: false,
  status: '1',
  features: [],
  options: [],
};

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const t = useTranslations('admin.products');
  const tSystem = useTranslations('system');
  const { success, error } = useToastActions();
  const [form, setForm] = useState<ProductFormState>({ ...defaultState, options: [createEmptyOption()] });
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [optionFiles, setOptionFiles] = useState<Record<string, FileData[]>>({});
  const [uploading, setUploading] = useState(false);

  const calculateOptionFinalPrice = (basePrice: number, discountType: OptionField['discountType'], discountValue: number) => {
    if (discountType === 'none' || discountValue <= 0) return basePrice;
    if (discountType === 'percent') {
      return Math.max(basePrice - (basePrice * discountValue) / 100, 0);
    }
    return Math.max(basePrice - discountValue, 0);
  };

  useEffect(() => {
    if (!product) {
      const initialOption = createEmptyOption();
      setForm({ ...defaultState, options: [initialOption] });
      setFiles([]);
      setOptionFiles({ [initialOption.id]: [] });
      return;
    }

    const initialFiles: FileData[] = (product.images || []).map((url) => ({
      file: undefined as unknown as File,
      preview: url,
      type: 'image',
      icon: undefined
    }));

    const optionFields: OptionField[] = (product.options || []).map((option, index) => ({
      id: `${option.name || 'option'}-${index}-${product.id}`,
      name: option.name || '',
      price: option.price ? String(option.price) : '',
      discountType: option.discountType || 'none',
      discountValue: option.discountValue ? String(option.discountValue) : '',
      rating: option.rating ? String(option.rating) : '',
      ratingCount: option.ratingCount ? String(option.ratingCount) : '',
      stockCount: typeof option.stockCount === 'number' ? String(option.stockCount) : '1',
      images: option.images || [],
      attributes: (option.attributes || []).map(toFeatureField),
      features: (option.features || []).map(toFeatureField),
    }));

    const optionsWithFallback = optionFields.length ? optionFields : [createEmptyOption()];
    const optionFilesMap: Record<string, FileData[]> = {};

    optionsWithFallback.forEach((option) => {
      optionFilesMap[option.id] = (option.images || []).map((url) => ({
        file: undefined as unknown as File,
        preview: url,
        type: 'image',
        icon: undefined
      }));
    });

    setForm({
      title: product.title || '',
      description: product.description || '',
      images: product.images || [],
      currency: product.currency || '$',
      category: product.category || '',
      isNew: product.isNew ?? false,
      isFeatured: product.isFeatured ?? false,
      status: product.status ? String(product.status) : '1',
      features: (product.features || []).map((item) => toFeatureField(item)),
      options: optionsWithFallback,
    });
    setFiles(initialFiles);
    setOptionFiles(optionFilesMap);
  }, [product]);

  const handleChange = (field: Exclude<keyof ProductFormState, 'features' | 'options'>, value: string | boolean) => {
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
      features: [...prev.features, toFeatureField()],
    }));
  };

  const handleRemoveFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== index),
    }));
  };

  const handleOptionChange = (optionId: string, field: keyof OptionField, value: string | boolean | string[]) => {
    setForm((prev) => {
      const options = prev.options.map((option) =>
        option.id === optionId
          ? {
            ...option,
            [field]: value,
          }
          : option
      );
      return { ...prev, options };
    });
  };

  const handleOptionFeatureChange = (optionId: string, target: 'attributes' | 'features', index: number, field: keyof FeatureField, value: string) => {
    setForm((prev) => {
      const options = prev.options.map((option) => {
        if (option.id !== optionId) return option;

        const updatedFeatures = [...option[target]];
        const current = updatedFeatures[index];
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

        updatedFeatures[index] = nextFeature;
        return { ...option, [target]: updatedFeatures };
      });

      return { ...prev, options };
    });
  };

  const handleAddOptionFeature = (optionId: string, target: 'attributes' | 'features') => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === optionId
          ? { ...option, [target]: [...option[target], toFeatureField()] }
          : option
      ),
    }));
  };

  const handleRemoveOptionFeature = (optionId: string, target: 'attributes' | 'features', index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === optionId
          ? { ...option, [target]: option[target].filter((_, idx) => idx !== index) }
          : option
      ),
    }));
  };

  const handleAddOption = () => {
    const newOption = createEmptyOption();
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, newOption],
    }));
    setOptionFiles((prev) => ({ ...prev, [newOption.id]: [] }));
  };

  const handleRemoveOption = (optionId: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== optionId),
    }));
    setOptionFiles((prev) => {
      const next = { ...prev };
      delete next[optionId];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

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

    const optionsPayload = form.options.map((option) => {
      const price = Number(option.price) || 0;
      const discountType = option.discountType === 'none' ? undefined : option.discountType;
      const discountValue = discountType ? Number(option.discountValue) || 0 : undefined;
      const rating = option.rating ? Number(option.rating) : undefined;
      const ratingCount = option.ratingCount ? Number(option.ratingCount) : undefined;
      const stockCount = Math.max(0, Math.floor(Number(option.stockCount) || 0));
      const images = option.images?.filter(Boolean) || [];

      const mapFeatures = (list: FeatureField[]) =>
        list
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

      return {
        name: option.name || t('optionUntitled'),
        price,
        discountType,
        discountValue,
        images,
        rating,
        ratingCount,
        stockCount,
        attributes: mapFeatures(option.attributes),
        features: mapFeatures(option.features),
      };
    });

    if (!optionsPayload.length) {
      error(t('optionsRequired'));
      setSaving(false);
      return;
    }

    const payload: ProductSaveRequest = {
      id: product?.id,
      title: form.title,
      description: form.description || undefined,
      images: form.images,
      features,
      options: optionsPayload,
      currency: form.currency || undefined,
      category: form.category || undefined,
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

  const optionFinalPrices = form.options.map((option) => {
    const base = Number(option.price) || 0;
    const discount = Number(option.discountValue) || 0;
    return calculateOptionFinalPrice(base, option.discountType, discount);
  });

  const handleOptionFilesChange = async (optionId: string, newFiles: FileData[]) => {
    setOptionFiles((prev) => ({ ...prev, [optionId]: newFiles }));

    const staticUrls = newFiles
      .filter((f) => !f.file && f.preview)
      .map((f) => String(f.preview));

    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === optionId ? { ...option, images: staticUrls } : option
      ),
    }));

    const filesToUpload = newFiles.filter((f) => f.file);
    if (!filesToUpload.length) return;

    setUploading(true);
    try {
      const uploadedUrls = [...staticUrls];
      const updatedFiles = [...newFiles];

      for (const fileData of filesToUpload) {
        if (!fileData.file) continue;
        const url = await uploadFile(fileData.file);
        uploadedUrls.push(url);
        const idx = updatedFiles.indexOf(fileData);
        if (idx >= 0) {
          updatedFiles[idx] = { ...fileData, preview: url, file: undefined, type: 'image' };
        }
      }

      setOptionFiles((prev) => ({ ...prev, [optionId]: updatedFiles }));
      setForm((prev) => ({
        ...prev,
        options: prev.options.map((option) =>
          option.id === optionId ? { ...option, images: uploadedUrls } : option
        ),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : tSystem('error');
      error(message);
    } finally {
      setUploading(false);
    }
  };

  const pricePreview = optionFinalPrices.length ? Math.min(...optionFinalPrices) : 0;
  const basePricePreview = form.options.length ? Math.min(...form.options.map((option) => Number(option.price) || 0)) : 0;

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
            <span className={inlineLabelClass}>{t('currency')}</span>
            <InlineSelect
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              <option value="$">$</option>
              <option value="€">€</option>
              <option value="₽">₽</option>
            </InlineSelect>
          </div>

          <div className={inlineRowClass}>
            <span className={inlineLabelClass}>{t('status')}</span>
            <InlineSelect
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="1">{t('statusActive')}</option>
              <option value="0">{t('statusInactive')}</option>
            </InlineSelect>
          </div>

          <div className="px-2 text-sm text-muted-foreground space-y-1">
            <div>{t('priceFromPreview', { value: basePricePreview.toFixed(2), currency: form.currency || '' }).trim()}</div>
            <div>{t('finalPricePreview', { value: pricePreview.toFixed(2), currency: form.currency || '' }).trim()}</div>
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
              <div key={feature.id} className="rounded-[1rem] bg-muted/50 p-3 space-y-2">
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
                    <InlineSelect
                      value={feature.valueType}
                      onChange={(e) => handleFeatureChange(index, 'valueType', e.target.value)}
                    >
                      <option value="string">{t('featureTypeString')}</option>
                      <option value="number">{t('featureTypeNumber')}</option>
                      <option value="boolean">{t('featureTypeBoolean')}</option>
                    </InlineSelect>
                  </div>
                  <div className={inlineRowClass}>
                    <span className={inlineLabelClass}>{t('featureValue')}</span>
                    {feature.valueType === 'boolean' ? (
                      <InlineSelect
                        value={feature.value}
                        onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                      >
                        <option value="true">{tSystem('yes')}</option>
                        <option value="false">{tSystem('no')}</option>
                      </InlineSelect>
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{t('optionsTitle')}</span>
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            icon={<PlusIcon size={14} />}
            onClick={handleAddOption}
            responsive
          >
            {t('addOption')}
          </IconButton>
        </div>

        {form.options.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2">{t('optionsEmpty')}</div>
        ) : (
          form.options.map((option) => (
            <div key={option.id} className="rounded-[1rem] bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{option.name || t('optionUntitled')}</span>
                <IconButton
                  type="button"
                  variant="destructive"
                  size="sm"
                  icon={<TrashIcon size={12} />}
                  onClick={() => handleRemoveOption(option.id)}
                  responsive
                >
                  {tSystem('remove')}
                </IconButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('optionName')}</span>
                  <Input
                    placeholder={t('optionName')}
                    value={option.name}
                    onChange={(e) => handleOptionChange(option.id, 'name', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('optionPrice')}</span>
                  <Input
                    placeholder={t('optionPrice')}
                    type="number"
                    min="0"
                    step="0.01"
                    value={option.price}
                    onChange={(e) => handleOptionChange(option.id, 'price', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('discountType')}</span>
                  <InlineSelect
                    value={option.discountType}
                    onChange={(e) => handleOptionChange(option.id, 'discountType', e.target.value as OptionField['discountType'])}
                  >
                    <option value="none">{tSystem('none')}</option>
                    <option value="percent">{t('discountTypePercent')}</option>
                    <option value="fixed">{t('discountTypeFixed')}</option>
                  </InlineSelect>
                </div>

                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('discountValue')}</span>
                  <Input
                    placeholder={t('discountValue')}
                    type="number"
                    min="0"
                    step="0.01"
                    value={option.discountValue}
                    disabled={option.discountType === 'none'}
                    onChange={(e) => handleOptionChange(option.id, 'discountValue', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('rating')}</span>
                  <Input
                    placeholder={t('rating')}
                    type="number"
                    min="0"
                    step="0.1"
                    max="5"
                    value={option.rating}
                    onChange={(e) => handleOptionChange(option.id, 'rating', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('ratingCount')}</span>
                  <Input
                    placeholder={t('ratingCount')}
                    type="number"
                    min="0"
                    step="1"
                    value={option.ratingCount}
                    onChange={(e) => handleOptionChange(option.id, 'ratingCount', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className={inlineRowClass}>
                  <span className={inlineLabelClass}>{t('optionStockCount')}</span>
                  <Input
                    placeholder={t('optionStockCount')}
                    type="number"
                    min="0"
                    step="1"
                    value={option.stockCount}
                    onChange={(e) => handleOptionChange(option.id, 'stockCount', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <span className="text-sm font-semibold px-1">{t('optionImages')}</span>
                  <MultiFileUpload
                    value={optionFiles[option.id] || []}
                    onFilesChange={(newFiles) => handleOptionFilesChange(option.id, newFiles)}
                    fileTypes="images"
                    maxFiles={10}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t('optionAttributesTitle')}</span>
                  <IconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<PlusIcon size={12} />}
                    onClick={() => handleAddOptionFeature(option.id, 'attributes')}
                    responsive
                  >
                    {tSystem('add')}
                  </IconButton>
                </div>
                <div className="space-y-2">
                  {option.attributes.length === 0 ? (
                    <div className="text-sm text-muted-foreground px-2">{t('optionAttributesEmpty')}</div>
                  ) : (
                    option.attributes.map((feature, index) => (
                      <div key={feature.id} className="rounded-[1rem] bg-muted/40 p-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className={inlineRowClass}>
                            <span className={inlineLabelClass}>{t('featureKey')}</span>
                            <Input
                              placeholder={t('featureKey')}
                              value={feature.key}
                              onChange={(e) => handleOptionFeatureChange(option.id, 'attributes', index, 'key', e.target.value)}
                              className={inlineInputClass}
                            />
                          </div>
                          <div className={inlineRowClass}>
                            <span className={inlineLabelClass}>{t('featureType')}</span>
                            <InlineSelect
                              value={feature.valueType}
                              onChange={(e) => handleOptionFeatureChange(option.id, 'attributes', index, 'valueType', e.target.value)}
                            >
                              <option value="string">{t('featureTypeString')}</option>
                              <option value="number">{t('featureTypeNumber')}</option>
                              <option value="boolean">{t('featureTypeBoolean')}</option>
                            </InlineSelect>
                          </div>
                          <div className={inlineRowClass}>
                            <span className={inlineLabelClass}>{t('featureValue')}</span>
                            {feature.valueType === 'boolean' ? (
                              <InlineSelect
                                value={feature.value}
                                onChange={(e) => handleOptionFeatureChange(option.id, 'attributes', index, 'value', e.target.value)}
                              >
                                <option value="true">{tSystem('yes')}</option>
                                <option value="false">{tSystem('no')}</option>
                              </InlineSelect>
                            ) : (
                              <Input
                                placeholder={t('featureValue')}
                                type={feature.valueType === 'number' ? 'number' : 'text'}
                                value={feature.value}
                                onChange={(e) => handleOptionFeatureChange(option.id, 'attributes', index, 'value', e.target.value)}
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
                            onClick={() => handleRemoveOptionFeature(option.id, 'attributes', index)}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t('optionFeaturesTitle')}</span>
                  <IconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<PlusIcon size={12} />}
                    onClick={() => handleAddOptionFeature(option.id, 'features')}
                    responsive
                  >
                    {tSystem('add')}
                  </IconButton>
                </div>
                <div className="space-y-2">
                  {option.features.length === 0 ? (
                    <div className="text-sm text-muted-foreground px-2">{t('optionFeaturesEmpty')}</div>
                  ) : (
                    option.features.map((feature, index) => (
                      <div key={feature.id} className="rounded-[1rem] bg-muted/40 p-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className={inlineRowClass}>
                            <span className={inlineLabelClass}>{t('featureKey')}</span>
                            <Input
                              placeholder={t('featureKey')}
                              value={feature.key}
                              onChange={(e) => handleOptionFeatureChange(option.id, 'features', index, 'key', e.target.value)}
                              className={inlineInputClass}
                            />
                          </div>
                          <div className={inlineRowClass}>
                            <span className={inlineLabelClass}>{t('featureType')}</span>
                            <InlineSelect
                              value={feature.valueType}
                              onChange={(e) => handleOptionFeatureChange(option.id, 'features', index, 'valueType', e.target.value)}
                            >
                              <option value="string">{t('featureTypeString')}</option>
                              <option value="number">{t('featureTypeNumber')}</option>
                              <option value="boolean">{t('featureTypeBoolean')}</option>
                            </InlineSelect>
                          </div>
                          <div className={inlineRowClass}>
                            <span className={inlineLabelClass}>{t('featureValue')}</span>
                            {feature.valueType === 'boolean' ? (
                              <InlineSelect
                                value={feature.value}
                                onChange={(e) => handleOptionFeatureChange(option.id, 'features', index, 'value', e.target.value)}
                              >
                                <option value="true">{tSystem('yes')}</option>
                                <option value="false">{tSystem('no')}</option>
                              </InlineSelect>
                            ) : (
                              <Input
                                placeholder={t('featureValue')}
                                type={feature.valueType === 'number' ? 'number' : 'text'}
                                value={feature.value}
                                onChange={(e) => handleOptionFeatureChange(option.id, 'features', index, 'value', e.target.value)}
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
                            onClick={() => handleRemoveOptionFeature(option.id, 'features', index)}
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
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        {[
          { key: 'isNew' as const, label: t('isNew'), value: form.isNew },
          { key: 'isFeatured' as const, label: t('isFeatured'), value: form.isFeatured },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleChange(item.key, !item.value)}
            className="h-12 w-full rounded-[0.75rem] bg-muted flex items-center px-4 gap-3 cursor-pointer text-left"
          >
            <span className="relative inline-flex items-center justify-center h-5 w-5">
              <input
                type="checkbox"
                checked={item.value}
                readOnly
                className="h-5 w-5 rounded-[0.5rem] accent-primary pointer-events-none"
              />
            </span>
            <span className="text-base text-foreground">{item.label}</span>
          </button>
        ))}
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
