'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EditIcon, TagIcon, StarIcon, DeleteIcon, ImageIcon, CategoriesIcon, DollarIcon } from '@/shared/ui/icons';
import { EntityRow } from '@/shared/ui/entity-management';
import { Product } from '@/entities/product';

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductListItem({ product, onEdit, onDelete }: ProductListItemProps) {
  const t = useTranslations('admin.products');
  const previewImage = (product.images?.[0]) || product.options?.[0]?.images?.[0];
  const basePrice = typeof product.priceFrom === 'number' ? product.priceFrom : product.price || 0;
  const finalPrice = typeof product.finalPriceFrom === 'number' ? product.finalPriceFrom : basePrice;
  const hasDiscount = basePrice > 0 && finalPrice < basePrice;
  const optionsCount = product.options?.length ?? 0;
  const currency = product.currency || '';
  const inStock = typeof product.inStock === 'boolean'
    ? product.inStock
    : (product.options?.some((option) => (option.stockCount ?? 0) > 0) ?? true);
  const productHref = {
    pathname: '/catalog/[id]',
    params: { id: String(product.url || product.id) },
  } as const;

  return (
    <EntityRow
      id={product.id}
      title={product.title}
      url={`catalog/${product.url}`}
      urlHref={productHref}
      leftSlot={
        <div className="relative w-12 h-12 rounded-[0.75rem] overflow-hidden bg-muted flex-shrink-0">
          {previewImage ? (
            <Image
              src={previewImage}
              alt={product.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>
      }
      badges={[
        inStock === false ? <Badge key="stock" variant="destructive">{t('statusInactive')}</Badge> : <Badge key="stock" variant="secondary">{t('inStock')}</Badge>,
        product.isNew ? <Badge key="new" variant="success">{t('isNew')}</Badge> : null,
        product.isFeatured ? <Badge key="featured" variant="secondary">{t('isFeatured')}</Badge> : null,
        optionsCount ? <Badge key="options" variant="secondary">{t('optionsLabel', { count: optionsCount })}</Badge> : null,
      ].filter(Boolean)}
      secondRowItems={
        [
          product.rating
            ? {
                icon: <StarIcon size={12} className="text-amber-500" />,
                keyLabel: t('rating'),
                value: product.rating,
              }
            : null,
          product.ratingCount && product.ratingCount > 0
            ? {
                icon: <TagIcon size={12} />,
                keyLabel: t('ratingCount'),
                value: product.ratingCount,
              }
            : null,
          {
            icon: <DollarIcon size={12} />,
            keyLabel: t('priceFromLabel'),
            value: `${finalPrice} ${currency}`.trim(),
          },
          product.category
            ? {
                icon: <CategoriesIcon size={12} />,
                keyLabel: t('categoryLabel'),
                value: product.category,
              }
            : null,
        ].filter(Boolean) as {
          icon: React.ReactNode;
          keyLabel?: string;
          value: React.ReactNode;
        }[]
      }
      rightActions={
        <ButtonGroup>
          <IconButton
            variant="outline"
            size="sm"
            icon={<EditIcon size={12} />}
            onClick={() => onEdit(product)}
            responsive
          >
            {t('edit')}
          </IconButton>
          <IconButton
            variant="destructive"
            size="sm"
            icon={<DeleteIcon size={12} />}
            onClick={() => onDelete(product)}
            responsive
          >
            {t('delete')}
          </IconButton>
        </ButtonGroup>
      }
    />
  );
}
