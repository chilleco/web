'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { ButtonGroup } from '@/shared/ui/button-group';
import { EditIcon, TagIcon, StarIcon, ShoppingIcon, DeleteIcon, ImageIcon } from '@/shared/ui/icons';
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
    <div className="flex items-center gap-4 p-4">
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

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 text-lg font-semibold truncate">
          <span className="truncate">{product.title}</span>
          {product.category && (
            <span className="text-sm text-muted-foreground truncate">{product.category}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground">
              {product.price} {product.currency || ''}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="line-through opacity-70">
                {product.originalPrice} {product.currency || ''}
              </span>
            )}
            {product.rating && (
              <span className="flex items-center gap-1">
                <StarIcon size={12} className="text-amber-500" />
                {product.rating}
              </span>
            )}
            {product.ratingCount && (
              <span className="flex items-center gap-1">
                <TagIcon size={12} />
                {product.ratingCount}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {product.inStock === false && (
              <Badge variant="destructive">{t('statusInactive')}</Badge>
            )}
            {product.inStock !== false && (
              <Badge variant="secondary">{t('inStock')}</Badge>
            )}
            {product.isNew && <Badge variant="success">{t('isNew')}</Badge>}
            {product.isFeatured && <Badge variant="warning">{t('isFeatured')}</Badge>}
            {product.originalPrice && product.originalPrice > product.price ? (
              <Badge variant="default">
                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

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
    </div>
  );
}
