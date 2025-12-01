'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { IconButton } from '@/shared/ui/icon-button';
import { SaveIcon, LoadingIcon, PlusIcon, TrashIcon, CloseIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { Product, ProductFeature, ProductSaveRequest, saveProduct } from '@/entities/product';
import { MultiFileUpload, FileData } from '@/shared/ui/multi-file-upload';
import { uploadFile } from '@/shared/services/api/upload';

interface FeatureField {
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
  inStock: boolean;
  images: string;
  attributes: FeatureField[];
  features: FeatureField[];
}

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
    inStock: true,
    images: '',
    attributes: [],
    features: [],
  };
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
  const [uploading, setUploading] = useState(false);
  const inlineRowClass = 'flex h-12 items-center rounded-[0.75rem] bg-muted text-base text-foreground overflow-hidden';
  const inlineLabelClass = 'h-full px-3 flex items-center justify-center border-r border-border/60';
  const inlineInputClass = 'bg-muted border-0 text-base text-foreground rounded-l-none shadow-none focus:ring-0 focus:outline-none h-full';
  const inlineSelectClass = 'bg-muted border-0 text-base text-foreground rounded-l-none rounded-r-[0.75rem] h-full px-3 w-full cursor-pointer focus:outline-none focus:ring-0';

  const calculateOptionFinalPrice = (basePrice: number, discountType: OptionField['discountType'], discountValue: number) => {
    if (discountType === 'none' || discountValue <= 0) return basePrice;
    if (discountType === 'percent') {
      return Math.max(basePrice - (basePrice * discountValue) / 100, 0);
    }
    return Math.max(basePrice - discountValue, 0);
  };

  const toFeatureField = (feature: ProductFeature | FeatureField): FeatureField => ({
    key: feature.key || '',
    value: feature.valueType === 'boolean' ? String(feature.value) : String(feature.value ?? ''),
    valueType: feature.valueType || 'string',
  });

  useEffect(() => {
    if (!product) {
      setForm({ ...defaultState, options: [createEmptyOption()] });
      setFiles([]);
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
      inStock: option.inStock ?? true,
      images: option.images ? option.images.join(', ') : '',
      attributes: (option.attributes || []).map(toFeatureField),
      features: (option.features || []).map(toFeatureField),
    }));

    setForm({
      title: product.title || '',
      description: product.description || '',
      images: product.images || [],
      currency: product.currency || '$',
      category: product.category || '',
      isNew: product.isNew ?? false,
      isFeatured: product.isFeatured ?? false,
      status: product.status ? String(product.status) : '1',
      features: (product.features || []).map(toFeatureField),
      options: optionFields.length ? optionFields : [createEmptyOption()],
    });
    setFiles(initialFiles);
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
      features: [...prev.features, { key: '', value: '', valueType: 'string' }],
    }));
  };

  const handleRemoveFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== index),
    }));
  };

  const handleOptionChange = (optionId: string, field: keyof OptionField, value: string | boolean) => {
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
          ? { ...option, [target]: [...option[target], { key: '', value: '', valueType: 'string' }] }
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
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, createEmptyOption()],
    }));
  };

  const handleRemoveOption = (optionId: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== optionId),
    }));
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
      const images = option.images
        ? option.images.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

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
        inStock: option.inStock,
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
                  <select
                    className={inlineSelectClass}
                    value={option.discountType}
                    onChange={(e) => handleOptionChange(option.id, 'discountType', e.target.value as OptionField['discountType'])}
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
                  <span className={inlineLabelClass}>{t('optionImages')}</span>
                  <Input
                    placeholder={t('optionImages')}
                    value={option.images}
                    onChange={(e) => handleOptionChange(option.id, 'images', e.target.value)}
                    className={inlineInputClass}
                  />
                </div>

                <div className="h-12 rounded-[0.75rem] bg-muted flex items-center px-4 gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={option.inStock}
                    onChange={(e) => handleOptionChange(option.id, 'inStock', e.target.checked)}
                    className="h-4 w-4 rounded-[0.75rem] accent-primary"
                  />
                  <span className="text-base text-foreground">{t('optionInStock')}</span>
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
                      <div key={`${option.id}-attr-${index}`} className="rounded-[1rem] bg-muted/40 p-3 space-y-2">
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
                            <select
                              className={inlineSelectClass}
                              value={feature.valueType}
                              onChange={(e) => handleOptionFeatureChange(option.id, 'attributes', index, 'valueType', e.target.value)}
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
                                onChange={(e) => handleOptionFeatureChange(option.id, 'attributes', index, 'value', e.target.value)}
                              >
                                <option value="true">{t('valueYes')}</option>
                                <option value="false">{t('valueNo')}</option>
                              </select>
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
                      <div key={`${option.id}-feature-${index}`} className="rounded-[1rem] bg-muted/40 p-3 space-y-2">
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
                            <select
                              className={inlineSelectClass}
                              value={feature.valueType}
                              onChange={(e) => handleOptionFeatureChange(option.id, 'features', index, 'valueType', e.target.value)}
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
                                onChange={(e) => handleOptionFeatureChange(option.id, 'features', index, 'value', e.target.value)}
                              >
                                <option value="true">{t('valueYes')}</option>
                                <option value="false">{t('valueNo')}</option>
                              </select>
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
