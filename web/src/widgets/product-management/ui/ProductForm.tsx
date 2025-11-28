'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { IconButton } from '@/shared/ui/icon-button';
import { SaveIcon, LoadingIcon } from '@/shared/ui/icons';
import { useToastActions } from '@/shared/hooks/useToast';
import { Product, ProductSaveRequest, saveProduct } from '@/entities/product';

interface ProductFormState {
  title: string;
  description: string;
  images: string;
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
  images: '',
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

  useEffect(() => {
    if (!product) {
      setForm(defaultState);
      return;
    }

    setForm({
      title: product.title || '',
      description: product.description || '',
      images: (product.images || []).join(', '),
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

    const images = form.images
      .split(',')
      .map((image) => image.trim())
      .filter(Boolean);

    const payload: ProductSaveRequest = {
      id: product?.id,
      title: form.title,
      description: form.description || undefined,
      images,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">{t('name')}</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={t('name')}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">{t('category')}</Label>
          <Input
            id="category"
            value={form.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder={t('category')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionLabel')}</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t('descriptionLabel')}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">{t('price')}</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="originalPrice">{t('originalPrice')}</Label>
          <Input
            id="originalPrice"
            type="number"
            min="0"
            step="0.01"
            value={form.originalPrice}
            onChange={(e) => handleChange('originalPrice', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">{t('currency')}</Label>
          <Input
            id="currency"
            value={form.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
            placeholder="$"
            maxLength={8}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rating">{t('rating')}</Label>
          <Input
            id="rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={form.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            placeholder="4.8"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ratingCount">{t('ratingCount')}</Label>
          <Input
            id="ratingCount"
            type="number"
            min="0"
            step="1"
            value={form.ratingCount}
            onChange={(e) => handleChange('ratingCount', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="images">{t('images')}</Label>
        <Textarea
          id="images"
          value={form.images}
          onChange={(e) => handleChange('images', e.target.value)}
          placeholder={t('images')}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.inStock}
            onChange={(e) => handleChange('inStock', e.target.checked)}
            className="h-4 w-4 rounded-[0.75rem] accent-primary"
          />
          <span>{t('inStock')}</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(e) => handleChange('isNew', e.target.checked)}
            className="h-4 w-4 rounded-[0.75rem] accent-primary"
          />
          <span>{t('isNew')}</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => handleChange('isFeatured', e.target.checked)}
            className="h-4 w-4 rounded-[0.75rem] accent-primary"
          />
          <span>{t('isFeatured')}</span>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">{t('status')}</Label>
        <Input
          id="status"
          type="number"
          min="0"
          step="1"
          value={form.status}
          onChange={(e) => handleChange('status', e.target.value)}
          placeholder={t('statusActive')}
        />
      </div>

      <div className="flex items-center justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {tSystem('cancel')}
        </Button>
        <IconButton
          type="submit"
          variant="default"
          disabled={saving}
          icon={saving ? <LoadingIcon size={16} className="animate-spin" /> : <SaveIcon size={16} />}
          responsive
          className="min-w-[10rem]"
        >
          {saving ? tSystem('saving') : tSystem('save')}
        </IconButton>
      </div>
    </form>
  );
}
