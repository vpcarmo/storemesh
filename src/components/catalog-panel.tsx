import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  deleteCurrentStoreCatalogAttribute,
  deleteCurrentStoreCatalogAttributeValue,
  deleteCurrentStoreProductImage,
  deleteCurrentStoreProductVariant,
  getCurrentStoreCatalog,
  saveCurrentStoreCatalogAttribute,
  saveCurrentStoreCatalogAttributeValue,
  saveCurrentStoreCategory,
  saveCurrentStoreProduct,
  saveCurrentStoreProductImage,
  saveCurrentStoreProductVariantWithAttributeValues,
  setCurrentStoreProductAttributeValues,
} from "@/auth/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  CatalogAttribute,
  CatalogAttributeValue,
  Category,
  Product,
  ProductVariant,
} from "@/domain/catalog";

const queryKey = ["store", "current", "catalog"] as const;
const none = "none";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível salvar o catálogo.";
const number = (form: FormData, name: string) => Number(form.get(name));

export function CatalogPanel({
  requiresStoreSelection = false,
}: {
  requiresStoreSelection?: boolean;
}) {
  const client = useQueryClient();
  const load = useServerFn(getCurrentStoreCatalog);
  const saveCategory = useServerFn(saveCurrentStoreCategory);
  const saveProduct = useServerFn(saveCurrentStoreProduct);
  const saveAttribute = useServerFn(saveCurrentStoreCatalogAttribute);
  const removeAttribute = useServerFn(deleteCurrentStoreCatalogAttribute);
  const saveValue = useServerFn(saveCurrentStoreCatalogAttributeValue);
  const removeValue = useServerFn(deleteCurrentStoreCatalogAttributeValue);
  const setProductValues = useServerFn(setCurrentStoreProductAttributeValues);
  const saveVariantWithValues = useServerFn(saveCurrentStoreProductVariantWithAttributeValues);
  const removeVariant = useServerFn(deleteCurrentStoreProductVariant);
  const saveImage = useServerFn(saveCurrentStoreProductImage);
  const removeImage = useServerFn(deleteCurrentStoreProductImage);
  const [slugInput, setSlugInput] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [attribute, setAttribute] = useState<CatalogAttribute | null>(null);
  const [attributeValue, setAttributeValue] = useState<CatalogAttributeValue | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [categoryId, setCategoryId] = useState(none);
  const data = useQuery({
    queryKey: [...queryKey, slug],
    queryFn: () => load({ data: { slug } }),
    enabled: !requiresStoreSelection || slug !== null,
  });
  async function run(action: () => Promise<void>, message: string) {
    setPending(true);
    setFeedback(null);
    try {
      await action();
      await client.invalidateQueries({ queryKey });
      setFeedback(message);
    } catch (e) {
      setFeedback(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  if (requiresStoreSelection && slug === null)
    return (
      <section className="mt-6 border-t pt-6">
        <p className="text-sm font-semibold">Catálogo</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSlug(slugInput);
          }}
        >
          <Input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="Slug da loja"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
          />
          <Button>Abrir</Button>
        </form>
      </section>
    );
  if (data.isPending)
    return <p className="mt-6 text-sm text-muted-foreground">Carregando catálogo…</p>;
  if (data.isError)
    return <p className="mt-6 text-sm text-destructive">{errorMessage(data.error)}</p>;
  const catalog = data.data;
  const selectedProduct =
    product && catalog.products.find((item) => item.id === product.id) ? product : null;
  const valuesFor = (attributeId: string) =>
    catalog.attributeValues.filter((item) => item.attributeId === attributeId);
  return (
    <section className="mt-6 w-full border-t pt-6" aria-label="Administração do catálogo">
      <p className="text-sm font-semibold">Catálogo</p>
      <p className="text-sm text-muted-foreground">{catalog.store.name}</p>
      <Tabs defaultValue="products" className="mt-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="attributes">Atributos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <form
            key={category?.id ?? "new"}
            className="grid gap-3 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await saveCategory({
                  data: {
                    slug,
                    id: category?.id ?? null,
                    name: String(f.get("name")),
                    categorySlug: String(f.get("slug")),
                    description: String(f.get("description")),
                    isActive: Boolean(f.get("active")),
                  },
                });
                setCategory(null);
              }, "Categoria salva.");
            }}
          >
            <Fields
              fields={[
                ["Nome", "name", category?.name ?? ""],
                ["Slug", "slug", category?.slug ?? ""],
              ]}
            />
            <Textarea
              name="description"
              defaultValue={category?.description ?? ""}
              placeholder="Descrição"
              maxLength={2000}
            />
            <Check
              name="active"
              label="Categoria ativa"
              defaultChecked={category?.isActive ?? true}
            />
            <Button className="w-fit" disabled={pending}>
              <Save />
              Salvar categoria
            </Button>
          </form>
          <List
            items={catalog.categories}
            empty="Nenhuma categoria cadastrada."
            pending={pending}
            detail={(x) => x.slug}
            edit={(x) => setCategory(x)}
            toggle={(x) =>
              void run(
                () =>
                  saveCategory({
                    data: {
                      slug,
                      id: x.id,
                      name: x.name,
                      categorySlug: x.slug,
                      description: x.description ?? "",
                      isActive: !x.isActive,
                    },
                  }).then(() => undefined),
                "Categoria atualizada.",
              )
            }
          />
        </TabsContent>
        <TabsContent value="attributes">
          <form
            key={attribute?.id ?? "new"}
            className="grid gap-3 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await saveAttribute({
                  data: {
                    slug,
                    id: attribute?.id ?? null,
                    name: String(f.get("name")),
                    code: String(f.get("code")),
                    displayType: String(f.get("displayType")) as "text" | "swatch",
                    isFilterable: Boolean(f.get("filterable")),
                    isVariantAxis: Boolean(f.get("axis")),
                    position: number(f, "position"),
                  },
                });
                setAttribute(null);
              }, "Atributo salvo.");
            }}
          >
            <Fields
              fields={[
                ["Nome", "name", attribute?.name ?? ""],
                ["Código", "code", attribute?.code ?? ""],
                ["Posição", "position", String(attribute?.position ?? 0), "number"],
              ]}
            />
            <label className="grid gap-2 text-sm">
              Tipo de exibição
              <select
                name="displayType"
                defaultValue={attribute?.displayType ?? "text"}
                className="h-9 rounded-md border bg-background px-3"
              >
                <option value="text">Texto</option>
                <option value="swatch">Amostra</option>
              </select>
            </label>
            <Check
              name="filterable"
              label="Usar em filtros"
              defaultChecked={attribute?.isFilterable ?? false}
            />
            <Check
              name="axis"
              label="Eixo de variante"
              defaultChecked={attribute?.isVariantAxis ?? false}
            />
            <Button className="w-fit" disabled={pending}>
              <Save />
              Salvar atributo
            </Button>
          </form>
          <div className="mt-5 space-y-3">
            {catalog.attributes.length === 0 ? (
              <Empty text="Nenhum atributo cadastrado." />
            ) : (
              catalog.attributes.map((item) => (
                <div key={item.id} className="border p-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <b>{item.name}</b>
                      <p className="text-xs text-muted-foreground">
                        {item.code} · {item.displayType} · posição {item.position}
                      </p>
                    </div>
                    <Actions
                      onEdit={() => {
                        setAttribute(item);
                        setAttributeValue(null);
                      }}
                      onDelete={() =>
                        void run(
                          () =>
                            removeAttribute({ data: { slug, id: item.id } }).then(() => undefined),
                          "Atributo removido.",
                        )
                      }
                    />
                  </div>
                  <AttributeValues
                    attribute={item}
                    values={valuesFor(item.id)}
                    editing={attributeValue?.attributeId === item.id ? attributeValue : null}
                    pending={pending}
                    onEdit={setAttributeValue}
                    onSave={(f) =>
                      void run(async () => {
                        await saveValue({
                          data: {
                            slug,
                            id: attributeValue?.attributeId === item.id ? attributeValue.id : null,
                            attributeId: item.id,
                            value: String(f.get("value")),
                            label: String(f.get("label")),
                            swatchValue:
                              item.displayType === "swatch" ? optional(f.get("swatch")) : null,
                            position: number(f, "position"),
                          },
                        });
                        setAttributeValue(null);
                      }, "Valor salvo.")
                    }
                    onDelete={(id) =>
                      void run(
                        () => removeValue({ data: { slug, id } }).then(() => undefined),
                        "Valor removido.",
                      )
                    }
                  />
                </div>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="products">
          <form
            key={selectedProduct?.id ?? "new"}
            className="grid gap-3 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                const saved = await saveProduct({
                  data: {
                    slug,
                    id: selectedProduct?.id ?? null,
                    categoryId: categoryId === none ? null : categoryId,
                    name: String(f.get("name")),
                    productSlug: String(f.get("slug")),
                    description: String(f.get("description")),
                    price: number(f, "price"),
                    isActive: Boolean(f.get("active")),
                  },
                });
                setProduct(saved);
              }, "Produto salvo.");
            }}
          >
            <Fields
              fields={[
                ["Nome", "name", selectedProduct?.name ?? ""],
                ["Slug", "slug", selectedProduct?.slug ?? ""],
                ["Preço", "price", String(selectedProduct?.price ?? 0), "number"],
              ]}
            />
            <label className="grid gap-2 text-sm">
              Categoria
              <select
                className="h-9 rounded-md border bg-background px-3"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value={none}>Sem categoria</option>
                {catalog.categories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <Textarea
              name="description"
              defaultValue={selectedProduct?.description ?? ""}
              placeholder="Descrição"
              maxLength={20000}
              required
            />
            <Check
              name="active"
              label="Produto ativo"
              defaultChecked={selectedProduct?.isActive ?? true}
            />
            <Button className="w-fit" disabled={pending}>
              <Save />
              Salvar produto
            </Button>
          </form>
          <List
            items={catalog.products}
            empty="Nenhum produto cadastrado."
            pending={pending}
            detail={(x) => `${x.slug} · R$ ${x.price.toFixed(2)}`}
            edit={(x) => {
              setProduct(x);
              setCategoryId(x.categoryId ?? none);
              setVariant(null);
            }}
            toggle={(x) =>
              void run(
                () =>
                  saveProduct({
                    data: {
                      slug,
                      id: x.id,
                      categoryId: x.categoryId,
                      name: x.name,
                      productSlug: x.slug,
                      description: x.description,
                      price: x.price,
                      isActive: !x.isActive,
                    },
                  }).then(() => undefined),
                "Produto atualizado.",
              )
            }
          />
          {selectedProduct ? (
            <ProductDetails
              product={selectedProduct}
              catalog={catalog}
              variant={variant}
              pending={pending}
              onSetValues={(ids) =>
                void run(
                  () =>
                    setProductValues({
                      data: { slug, productId: selectedProduct.id, attributeValueIds: ids },
                    }).then(() => undefined),
                  "Atributos do produto salvos.",
                )
              }
              onSaveVariant={(f, selections) =>
                void run(async () => {
                  await saveVariantWithValues({
                    data: {
                      slug,
                      id: variant?.id ?? null,
                      productId: selectedProduct.id,
                      sku: optional(f.get("sku")),
                      price: number(f, "variantPrice"),
                      compareAtPrice: optionalNumber(f.get("compare")),
                      isActive: Boolean(f.get("variantActive")),
                      position: number(f, "variantPosition"),
                      values: selections,
                    },
                  });
                  setVariant(null);
                }, "Variante salva.")
              }
              onEditVariant={setVariant}
              onDeleteVariant={(id) =>
                void run(
                  () => removeVariant({ data: { slug, id } }).then(() => undefined),
                  "Variante removida.",
                )
              }
              onSaveImage={(f, id) =>
                void run(
                  () =>
                    saveImage({
                      data: {
                        slug,
                        id,
                        productId: selectedProduct.id,
                        url: String(f.get("url")),
                        altText: optional(f.get("alt")),
                        position: number(f, "imagePosition"),
                        isPrimary: Boolean(f.get("primary")),
                      },
                    }).then(() => undefined),
                  "Imagem salva.",
                )
              }
              onDeleteImage={(id) =>
                void run(
                  () => removeImage({ data: { slug, id } }).then(() => undefined),
                  "Imagem removida.",
                )
              }
            />
          ) : null}
        </TabsContent>
      </Tabs>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
function Fields({ fields }: { fields: [string, string, string, string?][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, name, value, type]) => (
        <label key={name} className="grid gap-2 text-sm">
          {label}
          <Input
            name={name}
            type={type}
            defaultValue={value}
            min={type === "number" ? "0" : undefined}
            step={type === "number" ? "0.01" : undefined}
            maxLength={name === "description" ? 20000 : 160}
            pattern={name === "slug" ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined}
            required
          />
        </label>
      ))}
    </div>
  );
}
function Check({
  name,
  label,
  defaultChecked,
  value,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  value?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input name={name} type="checkbox" value={value} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="mt-4 text-sm text-muted-foreground">{text}</p>;
}
function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1">
      <Button type="button" size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
        <Pencil />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => {
          if (window.confirm("Confirmar remoção?")) onDelete();
        }}
        aria-label="Remover"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
function List<T extends { id: string; name: string; isActive: boolean }>({
  items,
  empty,
  pending,
  detail,
  edit,
  toggle,
}: {
  items: T[];
  empty: string;
  pending: boolean;
  detail: (item: T) => string;
  edit: (item: T) => void;
  toggle: (item: T) => void;
}) {
  if (!items.length) return <Empty text={empty} />;
  return (
    <ul className="mt-5 divide-y border-y">
      {items.map((item) => (
        <li className="flex items-center justify-between gap-3 py-3" key={item.id}>
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{detail(item)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={item.isActive}
              disabled={pending}
              onCheckedChange={() => toggle(item)}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => edit(item)}
              aria-label={`Editar ${item.name}`}
            >
              <Pencil />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
function AttributeValues({
  attribute,
  values,
  editing,
  pending,
  onEdit,
  onSave,
  onDelete,
}: {
  attribute: CatalogAttribute;
  values: CatalogAttributeValue[];
  editing: CatalogAttributeValue | null;
  pending: boolean;
  onEdit: (value: CatalogAttributeValue) => void;
  onSave: (form: FormData) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-sm font-medium">Valores</p>
      <form
        key={editing?.id ?? "new"}
        className="mt-2 grid gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
      >
        <Input
          name="value"
          defaultValue={editing?.value ?? ""}
          placeholder="Valor"
          maxLength={160}
          required
        />
        <Input
          name="label"
          defaultValue={editing?.label ?? ""}
          placeholder="Rótulo"
          maxLength={160}
          required
        />
        {attribute.displayType === "swatch" ? (
          <Input
            name="swatch"
            defaultValue={editing?.swatchValue ?? ""}
            placeholder="Amostra"
            maxLength={160}
          />
        ) : null}
        <Input
          name="position"
          type="number"
          min="0"
          defaultValue={editing?.position ?? 0}
          required
        />
        <Button disabled={pending} className="w-fit">
          <Plus />
          Salvar valor
        </Button>
      </form>
      {values.length ? (
        <ul className="mt-3 divide-y">
          {values.map((x) => (
            <li className="flex items-center justify-between py-2 text-sm" key={x.id}>
              <span>
                {x.label} <span className="text-muted-foreground">({x.value})</span>
              </span>
              <Actions onEdit={() => onEdit(x)} onDelete={() => onDelete(x.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty text="Nenhum valor cadastrado." />
      )}
    </div>
  );
}
function ProductDetails({
  product,
  catalog,
  variant,
  pending,
  onSetValues,
  onSaveVariant,
  onEditVariant,
  onDeleteVariant,
  onSaveImage,
  onDeleteImage,
}: {
  product: Product;
  catalog: Awaited<ReturnType<typeof getCurrentStoreCatalog>>;
  variant: ProductVariant | null;
  pending: boolean;
  onSetValues: (ids: string[]) => void;
  onSaveVariant: (
    form: FormData,
    values: { attributeId: string; attributeValueId: string }[],
  ) => void;
  onEditVariant: (item: ProductVariant) => void;
  onDeleteVariant: (id: string) => void;
  onSaveImage: (form: FormData, id: string | null) => void;
  onDeleteImage: (id: string) => void;
}) {
  const productValueIds = new Set(
    catalog.productAttributeValues
      .filter((x) => x.productId === product.id)
      .map((x) => x.attributeValueId),
  );
  const variants = catalog.variants.filter((x) => x.productId === product.id);
  const images = catalog.images.filter((x) => x.productId === product.id);
  const axes = catalog.attributes.filter((x) => x.isVariantAxis);
  const variantValues = new Map(
    catalog.variantAttributeValues
      .filter((x) => x.variantId === variant?.id)
      .map((x) => [x.attributeId, x.attributeValueId]),
  );
  return (
    <div className="mt-6 grid gap-6 border-t pt-5">
      <div>
        <h3 className="font-medium">Atributos do produto</h3>
        <form
          className="mt-2 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSetValues(f.getAll("value").map(String));
          }}
        >
          {catalog.attributes.length ? (
            catalog.attributes.map((attribute) => (
              <fieldset key={attribute.id} className="rounded border p-2">
                <legend className="px-1 text-sm">{attribute.name}</legend>
                {catalog.attributeValues
                  .filter((value) => value.attributeId === attribute.id)
                  .map((value) => (
                    <Check
                      key={value.id}
                      name="value"
                      value={value.id}
                      label={value.label}
                      defaultChecked={productValueIds.has(value.id)}
                    />
                  ))}
              </fieldset>
            ))
          ) : (
            <Empty text="Crie atributos e valores para associá-los ao produto." />
          )}
          <Button className="w-fit" disabled={pending || !catalog.attributes.length}>
            <Save />
            Salvar atributos
          </Button>
        </form>
      </div>
      <div>
        <h3 className="font-medium">Variantes</h3>
        <p className="text-xs text-muted-foreground">
          Variantes são opcionais. Use somente valores de eixos de variante.
        </p>
        <form
          key={variant?.id ?? "new"}
          className="mt-2 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const choices = axes
              .map((axis) => ({
                attributeId: axis.id,
                attributeValueId: String(f.get(`axis-${axis.id}`) ?? ""),
              }))
              .filter((x) => x.attributeValueId);
            onSaveVariant(f, choices);
          }}
        >
          <Fields
            fields={[
              ["SKU", "sku", variant?.sku ?? ""],
              ["Preço", "variantPrice", String(variant?.price ?? product.price), "number"],
              ["Preço comparativo", "compare", variant?.compareAtPrice?.toString() ?? "", "number"],
              ["Posição", "variantPosition", String(variant?.position ?? 0), "number"],
            ]}
          />
          {axes.map((axis) => (
            <label key={axis.id} className="grid gap-2 text-sm">
              {axis.name}
              <select
                name={`axis-${axis.id}`}
                defaultValue={variantValues.get(axis.id) ?? ""}
                className="h-9 rounded-md border bg-background px-3"
              >
                <option value="">Sem seleção</option>
                {catalog.attributeValues
                  .filter((value) => value.attributeId === axis.id && productValueIds.has(value.id))
                  .map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.label}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <Check
            name="variantActive"
            label="Variante ativa"
            defaultChecked={variant?.isActive ?? true}
          />
          <Button className="w-fit" disabled={pending}>
            <Save />
            Salvar variante
          </Button>
        </form>
        {variants.length ? (
          <ul className="mt-3 divide-y">
            {variants.map((x) => (
              <li className="flex items-center justify-between py-2 text-sm" key={x.id}>
                <span>
                  {x.sku ?? "Sem SKU"} · R$ {x.price.toFixed(2)}
                </span>
                <Actions onEdit={() => onEditVariant(x)} onDelete={() => onDeleteVariant(x.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Este produto não possui variantes." />
        )}
      </div>
      <div>
        <h3 className="font-medium">Imagens por URL</h3>
        <form
          className="mt-2 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveImage(new FormData(e.currentTarget), null);
            e.currentTarget.reset();
          }}
        >
          <Input name="url" type="url" placeholder="https://..." maxLength={2000} required />
          <Input name="alt" placeholder="Texto alternativo" maxLength={500} />
          <Input name="imagePosition" type="number" min="0" defaultValue="0" required />
          <Check name="primary" label="Imagem principal" defaultChecked={images.length === 0} />
          <Button className="w-fit" disabled={pending}>
            <Plus />
            Adicionar imagem
          </Button>
        </form>
        {images.length ? (
          <ul className="mt-3 divide-y">
            {images.map((image) => (
              <li key={image.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a className="truncate underline" href={image.url} target="_blank" rel="noreferrer">
                  {image.isPrimary ? "Principal · " : ""}
                  {image.url}
                </a>
                <Actions
                  onEdit={() => {
                    const url = window.prompt("URL da imagem", image.url);
                    if (url)
                      onSaveImage(
                        formData({
                          url,
                          alt: image.altText ?? "",
                          imagePosition: String(image.position),
                          primary: image.isPrimary ? "on" : "",
                        }),
                        image.id,
                      );
                  }}
                  onDelete={() => onDeleteImage(image.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Nenhuma imagem cadastrada." />
        )}
      </div>
    </div>
  );
}
function formData(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}
