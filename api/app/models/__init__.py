from consys import make_base, Attribute

from lib import cfg


_ConSysBase = make_base(
    host=cfg("mongo.host") or "db",
    name=cfg("PROJECT_NAME"),
    login=cfg("mongo.user"),
    password=cfg("mongo.pass"),
)


class Base(_ConSysBase):
    """
    Project-wide base model with callback dispatch on `.save()`.
    """

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        changes = {}
        try:
            changes = self.get_changes() or {}
        except Exception:  # pylint: disable=broad-except
            changes = {}

        result = super().save(*args, **kwargs)

        try:
            model_name = getattr(self, "_name", None)
            if not isinstance(model_name, str) or not model_name:
                return result

            if not changes:
                return result

            from callbacks.enqueue import enqueue
            from callbacks.registry import has_callbacks

            entity_id = getattr(self, "id", None)
            updated = getattr(self, "updated", None)
            try:
                updated_value = int(updated) if updated is not None else None
            except (TypeError, ValueError):
                updated_value = None

            for field, diff in changes.items():
                if field in {"updated"}:
                    continue

                if not has_callbacks(model=model_name, field=field):
                    continue

                old = None
                new = None
                if isinstance(diff, (list, tuple)) and len(diff) == 2:
                    old, new = diff
                else:
                    new = diff

                event_id = f"{model_name}:{entity_id}:{updated_value}:{field}"

                enqueue(
                    {
                        "id": event_id,
                        "model": model_name,
                        "entity_id": entity_id,
                        "updated": updated_value,
                        "field": field,
                        "old": old,
                        "new": new,
                    }
                )
        except Exception as exc:  # pylint: disable=broad-except
            from lib import log

            log.error(
                "Callback dispatch on save failed: {}",
                {"model": getattr(self, "_name", None), "id": getattr(self, "id", None), "error": str(exc)},
            )

        return result


__all__ = (
    "Base",
    "Attribute",
)
