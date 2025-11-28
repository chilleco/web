'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EditIcon, TagIcon, StarIcon, DeleteIcon, ImageIcon } from '@/shared/ui/icons';
import { EntityRow } from '@/shared/ui/entity-management';
import { Product } from '@/entities/product';

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductListItem({ product, onEdit, onDelete }: ProductListItemProps) {
  const t = useTranslations('admin.products');
  const previewImage = product.images?.[0];

  return (
    <EntityRow
      id={product.id}
      title={product.title}
      url={product.url}
      leftSlot={
        <div className="w-12 h-12 rounded-[0.75rem] overflow-hidden bg-muted flex-shrink-0">
          {previewImage ? (
            <img
              src={previewImage}
              alt={product.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={16} className="text-muted-foreground" />
            </div>
          )}
        </div>
      }
      badges={[
        product.inStock === false ? <Badge key="stock" variant="destructive">{t('statusInactive')}</Badge> : <Badge key="stock" variant="secondary">{t('inStock')}</Badge>,
        product.isNew ? <Badge key="new" variant="success">{t('isNew')}</Badge> : null,
        product.isFeatured ? <Badge key="featured" variant="warning">{t('isFeatured')}</Badge> : null,
        product.originalPrice && product.originalPrice > product.price ? (
          <Badge key="discount" variant="default">
            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
          </Badge>
        ) : null,
      ].filter(Boolean)}
      secondRowItems={(() => {
        const items: React.ReactNode[] = [];
        if (product.rating) {
          items.push(
            <span className="inline-flex items-center gap-1" key="rating">
              <StarIcon size={12} className="text-amber-500" />
              {product.rating}
            </span>
          );
        }
        if (product.ratingCount) {
          items.push(
            <span className="inline-flex items-center gap-1" key="ratingCount">
              <TagIcon size={12} />
              {product.ratingCount}
            </span>
          );
        }
        items.push(`${t('priceLabel')}: ${product.price} ${product.currency || ''}`.trim());
        if (product.originalPrice && product.originalPrice > product.price) {
          items.push(`${t('originalPriceLabel')}: ${product.originalPrice} ${product.currency || ''}`.trim());
        }
        if (product.category) {
          items.push(`${t('categoryLabel')}: ${product.category}`);
        }
        return items;
      })()}
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
