# ConSys ORM Handbook

This document explains how to use the `consys` package as the base object model for MongoDB-backed applications. It is intentionally verbose so teams can drop the file into `docs/` of any project that depends on this ORM and let automated tools review code against the rules described here.

- **Package**: [`consys`](https://pypi.org/project/consys/) (custom ORM for MongoDB)
- **Modules**: `consys` (ORM core), `consys.handlers` (validators), `consys.files` (upload helpers), `consys.types` (Pydantic bridge), `consys.errors` (shared error codes)
- **Primary entrypoint**: `consys.make_base()` which returns a ready-to-use base class for your models.

## Installation & Runtime Expectations

```bash
pip install consys
```

- Requires a reachable MongoDB instance (default port `27017`).
- The ORM talks directly to MongoDB via `pymongo`. Create your collections manually or let MongoDB create them on first write; migrations are not part of ConSys.
- Keep one `Base = make_base(...)` per database; subclasses of that `Base` map to collections.

## Creating the Base Class

```python
from consys import make_base

Base = make_base(
    host="localhost:27017",
    name="my_db",
    login="admin",
    password="secret",
)
```

`make_base` builds an abstract model class wired to a Mongo database. Every concrete model must inherit from `Base` and set the `_name` property to the collection name.

## Declaring Models

```python
from consys import Attribute

class User(Base):
    _name = "users"

    login = Attribute(
        types=str,
        checking=handlers.check_login_uniq,
        processing=str.lower,
    )
    password = Attribute(
        types=str,
        checking=handlers.check_password,
        processing=handlers.process_password,
    )
    profile = Attribute(types=dict, default=dict)
```

**Rules that differ from conventional ORMs**
- Attributes must be declared with `Attribute` descriptors; setting undeclared attributes raises `AttributeError`.
- `_name` is required for persistent collections. Set `_name = None` only for embedded/sub-object models that live inside other documents.
- Object instantiation is strict: each value goes through the descriptor pipeline during `__init__` unless it was loaded from the database.

### Built-in Fields on `BaseModel`

Field | Type | Default | Notes
---|---|---|---
`id` | `int` | `0` | Auto-incremented by `_next_id()` during first `save()`.
`title` | `str` | `""` | Included in `_search_fields` by default.
`data` | `str` | `""` | Free-form payload.
`image` | `str` | `None` | Can be linked with `consys.files` helpers.
`user` | `int` | `0` | `0` means unauthenticated.
`status` | `int` | `None`
`locale` | `str` | `None` | `None` → multi locale entry.
`created` | `int` | auto | `time.time()` when instance created (unless loaded).
`updated` | `int` | `None` → set on each `save()`.
`expired` | `int` | `None`

### Attribute Descriptor Parameters

Parameter | Purpose | Reminder
---|---|---
`types` | Expected python type(s). Non-matching inputs are cast when possible. | When casting fails, `ErrorInvalid` is raised unless `ignore=True`.
`default` | Static value or callable. | Callables receive the instance (or owner when accessed on the class).
`checking` | Callable `(collection, id, value) -> bool`. | Use validators from `consys.handlers` or custom ones for uniqueness/format rules.
`pre_processing` | Callable run before type casting. | Use for normalization (e.g., stripping spaces).
`processing` | Callable run after validation. | Example: hashing passwords.
`ignore` | Skip assignment errors silently. | Use sparingly; errors simply drop the assignment.

Reusable validators & processors live in `consys.handlers` (see below).

### Lifecycle Internals

- `_db` is injected by `make_base`; `_coll` resolves to `self._db[self._name]`.
- `_loaded_values` stores the state retrieved from Mongo; ConSys compares it to current values to compute fine-grained updates.
- `_specified_fields` tracks which fields were explicitly requested when fetching (critical for partial-document workflows).
- `_search_fields` (default `{"title"}`) controls which fields participate in the automatic `search` helper.
- `_ignore_fields` lists attributes you want to silently skip when initialization fails.

## Querying Documents

### `Model.get(...)`

Arguments | Meaning
---|---
`ids` | `int`, `str`, iterable, or `None`. Combined with `by` (default `id`). When a single value is provided, returns one instance; iterables return a list.
`limit`, `offset` | Pagination helpers applied after sorting.
`search` | String (`len >= 3`) or `int`. Uses `_search_fields` to build `$or` regex/number conditions.
`fields` | Iterable of field names to load. ConSys always adds `id` and `by` to keep the instance saveable. Unrequested fields are stripped from the in-memory object.
`extra` | Dict merged into the Mongo filter as-is (use for operators like `$gte`).
`sort` / `sortby` | Direction (`"asc"`/`"desc"`) and field name.
`sortfields` | Tuple of field names to sort by “field existence”. The ORM builds an aggregation pipeline that scores each field via `has_<field>` before sorting.
`pipeline` | Prepend your own aggregation stages when you need more than filtering + sort.
`**kwargs` | Equality filters shortcut.

Examples:

```python
# Load a single document by login
user = User.get("alice", by="login")

# Partial fetch: only `title` and `status`
stub = Article.get(ids=123, fields={"title", "status"})

# Search with fuzzy text + custom constraint
results = Article.get(search="invoice", extra={"status": {"$ne": 0}})

# Sort by whether a document has `meta` or `extra` populated
ranked = Article.get(sortfields=("meta", "extra"))
```

### `Model.count(...)`
Uses the same filter semantics (including `search`, `extra`, `kwargs`) and supports `offset` to skip the first *n* matches server-side.

### `Model.complex(..., handler=callable)`
Runs `get`, then applies `handler` to each result. Objects are passed as dictionaries (via `json(fields=...)`), which is handy for building DTOs directly from the ORM.

## Persisting Changes

### `instance.save()`

- On first save, `id` is auto-generated (if still `0`) via `_next_id()`; `_id` in Mongo mirrors `id`.
- `created` is filled only when constructing objects that were not loaded from the DB. `updated` is refreshed only when the ORM detects actual changes.
- `json(default=False)` ensures only non-default values hit the database. Setting an attribute back to its default or deleting it removes the field from Mongo, allowing `$exists` queries to reflect real intent.
- Change detection splits updates into `$set`, `$unset`, `$push`, `$pull`, `$set` per embedded element. This is what lets ConSys modify nested arrays without clobbering untouched sibling objects.
- Optimistic concurrency: ConSys compares `_loaded_values` against the modification filter. If Mongo reports no document changed and no embedded updates were applied, `ErrorRepeat` is raised—indicating the document changed since you loaded it.

### Editing Rules

- Assigning `None` to a descriptor is a no-op. To remove a field, use `del instance.field` before `save()`.
- For embedded arrays, mutate the list in place. New subobjects must already contain an `id` (see "Embedded subobjects").
- After direct `rm`/`rm_sub`/`reload`, unsaved in-memory changes are wiped because the ORM reloads from the database.

### Inspecting Changes

`instance.get_changes()` returns `{field: (old_value, new_value)}` compared against `_loaded_values`. Useful for audits and tests.

## Working with Partial Documents

When you fetch with `fields={...}` ConSys marks the object as "partial":

- `_loaded_values` contains only what Mongo returned.
- `_specified_fields` includes the fetched list plus `id`. `__repr__` renders as `PartialObject ...` to warn you.
- Saving only updates the touched fields; untouched (and unloaded) fields remain as they were in Mongo.
- `reload(fields=...)` refreshes the in-memory document. Pass `None` to load the entire document.

## Embedded Subobjects

Define a model with `_name = None` to represent embedded documents. Subobjects never create their own collections—they are stored inside parent arrays/dicts.

```python
class Address(Base):
    _name = None

    id = Attribute(types=str)  # required
    city = Attribute(types=str)
    zip_code = Attribute(types=int, default=0)

addr = Address(city="Berlin")
user = User(addresses=[addr.json(default=False)])
user.save()
```

Guidelines:
- Subobjects need an `id`. When omitted, ConSys auto-generates a 32-character string.
- Use `.json(default=False)` when embedding so internal helper fields (`created`, etc.) stay out of the stored subdocument unless you explicitly need them.
- `BaseModel._is_subobject` detects lists/tuples of dicts with `id`; ConSys uses that to split `$push/$pull` updates.
- Use `rm_sub(field, ids)` to delete embedded records (`ids` can be a single identifier). The method handles `$pull`, updates `updated`, and refreshes the in-memory object.

## Removing Documents

- `instance.rm()` deletes by `id`. Raises `ErrorWrong` when the document does not exist.
- `instance.rm_sub(field, ids)` removes elements from an embedded array and reloads the parent.

## Search & Sorting Particularities

- `_search_fields` supports dotted paths (e.g., `"profile.name"`). Register every field you want the `search` parameter to inspect.
- Text search is case-insensitive. The ORM composes `$regex` filters and includes numeric search fallbacks (e.g., digits treated as ints).
- Strings shorter than 3 characters trigger `ErrorInvalid("search")`. When you need 1–2 character searches, implement a custom `extra` filter or build your own pipeline.
- `sortfields` ranks documents by whether a field exists or (for arrays) has elements. Mongo aggregation is used so the cursor already contains the requested ordering before you page through it.

## Error Model (`consys.errors`)

Error | Code | Meaning
---|---|---
`ErrorInvalid` | `6` | Value failed validation (type, `checking`, regex, etc.).
`ErrorWrong` | `7` | Referenced entity not found / wrong identifier.
`ErrorRepeat` | `15` | Duplicate record (insert) or optimistic lock failure (update).
`ErrorUnsaved` | `17` | Tried to mutate/remove a document that exists only in memory.
`ErrorUpload`, `ErrorAccess`, ... | See `consys/errors.py` for the full list used by auxiliary modules.

Always bubble these errors up or map them to your API error format. Do **not** swallow them silently; tests expect the precise behavior.

## Using the Handlers Module

`consys.handlers` hosts pre-built validators/processors for everyday account fields. Examples:

Function | Use Case
---|---
`default_login(instance)` | Generates `id<pk>` style placeholder logins.
`check_login` / `check_login_uniq` | Syntactic + uniqueness checks (reserved words, minimum length, etc.).
`check_password` / `process_password` | Password policy + hashing (`md5` by default—override if you need stronger hashing).
`pre_process_name`, `check_name` | Normalize and validate human names.
`check_phone`, `check_phone_uniq`, `pre_process_phone` | Phone number sanitation.
`check_mail`, `check_mail_uniq` | Email validation + uniqueness.

You can attach these callables to `Attribute` descriptors (`checking=`, `pre_processing=`, `processing=`) to keep model logic DRY.

## File Upload Helpers

`consys.files.FileUploader` centralizes image ingestion:

- Accepts raw filenames, base64 payloads, or external URLs (`reimg` scrapes `<img src>` tags and uploads remote images).
- Automatically increments filenames, strips EXIF rotation, optionally creates optimized copies (`side_optimized`).
- Depends on `requests` and `Pillow`. Be mindful of disk permissions when configuring `path` and `prefix`.

Use it inside service layers (not inside the model) and store the resulting relative path in a model field (e.g., `image = Attribute(types=str)`).

## Request Validation Helpers

`consys.types` exposes:

- `BaseType` → alias for `pydantic.BaseModel` to declare DTOs.
- `validate(filters)` decorator → wraps a handler so incoming payloads are validated and stripped before your business logic runs.

Example:

```python
from consys.types import BaseType, validate

class CreateUser(BaseType):
    login: str
    password: str

@validate(CreateUser)
def handle_create(request, data: CreateUser):
    user = User(**data.dict())
    user.save()
    return user.json()
```

## Differences vs Conventional ORMs

1. **Descriptor-First Schema**: Fields are descriptors, not dynamic dict keys. The only mutable data lives in predefined attributes.
2. **Mongo Native Operations**: Instead of SQL-like sessions, ConSys directly issues Mongo update operators (set/unset/push/pull). Embedded collections stay in sync without manual positional operators.
3. **Optimistic Locking by Payload Comparison**: Every loaded object remembers the original payload and only writes the parts that changed. Updates fail fast when the database state diverges.
4. **Default-Stripping Persistence**: Default values and `None`s never reach the database, so `$exists` queries and sparse indexes reflect truth.
5. **Partial Documents as First-Class Citizens**: Fetching a subset of fields produces "partial" objects—an uncommon but powerful pattern when dealing with large documents or bandwidth-sensitive APIs.
6. **Embedded Submodels Instead of Joins**: `_name = None` models let you treat nested documents as strongly-typed entities without separate collections or joins.
7. **Validator Hooks per Field**: Instead of relying on declarative constraints (unique indexes, etc.), ConSys lets you inject arbitrary Python in the attribute pipeline (`pre_processing`, `checking`, `processing`).

## Practical Checklist

- [ ] Declare `_name` and every custom field with `Attribute`.
- [ ] Keep `_search_fields` in sync with what your UI searches through.
- [ ] Use `fields={...}` for read-heavy endpoints; call `reload()` before touching missing attributes.
- [ ] Wrap user-provided identifiers in `try/except ErrorWrong` to surface 404s properly.
- [ ] When mutating embedded arrays, touch them in place (`list.append`, `del`, etc.) so `_get_changes` can compute `$push/$pull` operations.
- [ ] If a field must truly allow clearing, expose a service method that calls `del instance.field` rather than setting `None`.
- [ ] Construct subobjects via `.json(default=False)` to keep stored blobs lean.
- [ ] Handle `ErrorRepeat` from `.save()` and decide whether to retry (`reload()` → reapply changes) or report a conflict to the client.

With these conventions documented, contributors (human or AI) can confidently extend any repository built on top of ConSys without re-learning its invariants.
