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
import { getCurrentStoreMedia } from "@/auth/media.functions";
import { FormHelp } from "@/components/admin/form-help";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  CatalogAttribute,
  CatalogAttributeValue,
  Category,
  Product,
  ProductImage,
  ProductVariant,
} from "@/domain/catalog";
import type { MediaAsset } from "@/domain/media";

const queryKey = ["store", "current", "catalog"] as const;
const none = "none";
type CatalogSection = "products" | "categories" | "attributes";
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível salvar o catálogo.";
const number = (form: FormData, name: string) => Number(form.get(name));

export function CatalogPanel({
  requiresStoreSelection = false,
  storeSlug,
  section = "products",
}: {
  requiresStoreSelection?: boolean;
  storeSlug?: string | null;
  /** Abre uma seção existente do catálogo, mantendo Produtos como padrão. */
  section?: CatalogSection;
}) {
  // The admin shell is the only owner of the selected store. Keep this alias
  // solely for the existing server-function payloads below.
  const slug = storeSlug;
  const client = useQueryClient();
  const load = useServerFn(getCurrentStoreCatalog);
  const loadMedia = useServerFn(getCurrentStoreMedia);
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [attribute, setAttribute] = useState<CatalogAttribute | null>(null);
  const [attributeValue, setAttributeValue] = useState<CatalogAttributeValue | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [categoryId, setCategoryId] = useState(none);
  const data = useQuery({
    queryKey: [...queryKey, storeSlug],
    queryFn: () => load({ data: { slug: storeSlug } }),
    enabled: !requiresStoreSelection || storeSlug !== null,
  });
  const mediaData = useQuery({
    queryKey: ["store", "current", "media", storeSlug],
    queryFn: () => loadMedia({ data: { slug: storeSlug } }),
    enabled: section === "products" && (!requiresStoreSelection || storeSlug !== null),
  });
  async function run(action: () => Promise<void>, message: string, invalidatePreview = false) {
    setPending(true);
    setFeedback(null);
    try {
      await action();
      await client.invalidateQueries({ queryKey });
      if (invalidatePreview) {
        await client.invalidateQueries({ queryKey: ["admin-page-preview", storeSlug] });
      }
      setFeedback(message);
    } catch (e) {
      setFeedback(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  if (requiresStoreSelection && storeSlug === null)
    return (
      <section className="mt-6 border-t pt-6">
        <p className="text-sm font-semibold">Catálogo</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Selecione uma loja autorizada para administrar o catálogo.
        </p>
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
      <div className="mt-4">
        <div hidden={section !== "categories"}>
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
            <FormHelp variant="callout">
              Cadastre uma categoria para identificar e organizar os produtos relacionados.
            </FormHelp>
            <Fields
              fields={[
                [
                  "Nome",
                  "name",
                  category?.name ?? "",
                  undefined,
                  "Nome usado para identificar e organizar os produtos desta categoria.",
                ],
                [
                  "Slug",
                  "slug",
                  category?.slug ?? "",
                  undefined,
                  "Endereço/identificador amigável da categoria. Use letras minúsculas, números e hífens. Exemplo: camisetas",
                  "Nome técnico usado como identificador amigável no endereço.",
                ],
              ]}
            />
            <label className="grid gap-2 text-sm">
              Descrição
              <Textarea
                name="description"
                defaultValue={category?.description ?? ""}
                placeholder="Descrição"
                maxLength={2000}
              />
              <FormHelp>
                Resumo da categoria. Pode ser usado quando essa categoria for apresentada em uma
                área pública que suporte descrição.
              </FormHelp>
            </label>
            <Check
              name="active"
              label="Categoria ativa"
              defaultChecked={category?.isActive ?? true}
              help="Indica se esta categoria está ativa no catálogo. Ativar não cria automaticamente um item no menu."
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
        </div>
        <div hidden={section !== "attributes"}>
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
            <FormHelp variant="callout">
              Um atributo define uma característica reutilizável, como Cor ou Tamanho. Depois de
              criar o atributo, cadastre seus valores. Se ele for marcado como eixo de variante,
              esses valores poderão ser usados para montar versões diferentes do produto.
            </FormHelp>
            <Fields
              fields={[
                [
                  "Nome",
                  "name",
                  attribute?.name ?? "",
                  undefined,
                  "Nome da característica. Exemplo: Cor",
                  "Característica do produto, como Cor ou Tamanho.",
                ],
                [
                  "Código",
                  "code",
                  attribute?.code ?? "",
                  undefined,
                  "Identificador interno da característica. Exemplo: cor",
                ],
                [
                  "Posição",
                  "position",
                  String(attribute?.position ?? 0),
                  "number",
                  "Define a ordem em que o atributo é apresentado nas listas.",
                ],
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
              <FormHelp>
                Texto: mostra o valor como texto. Amostra: permite registrar uma amostra associada
                ao valor.
              </FormHelp>
            </label>
            <Check
              name="filterable"
              label="Usar em filtros"
              defaultChecked={attribute?.isFilterable ?? false}
              help="Indica que este atributo foi preparado para filtros. O filtro público ainda depende de uma interface própria."
            />
            <Check
              name="axis"
              label="Eixo de variante"
              defaultChecked={attribute?.isVariantAxis ?? false}
              help="Use quando os valores deste atributo diferenciarem versões do mesmo produto, como tamanho ou cor."
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
        </div>
        <div hidden={section !== "products"}>
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
            <FormHelp variant="callout">
              Cadastre aqui os dados básicos do produto. Para aparecer em uma página pública, ele
              também precisa fazer parte da composição dessa página.
            </FormHelp>
            <Fields
              fields={[
                [
                  "Nome",
                  "name",
                  selectedProduct?.name ?? "",
                  undefined,
                  "Nome do produto apresentado no catálogo.",
                ],
                [
                  "Slug",
                  "slug",
                  selectedProduct?.slug ?? "",
                  undefined,
                  "Identificador amigável usado pelo sistema para representar o produto. Exemplo: camiseta-basica",
                  "Nome técnico usado como identificador amigável no endereço.",
                ],
                [
                  "Preço",
                  "price",
                  String(selectedProduct?.price ?? 0),
                  "number",
                  "Preço base do produto. O preenchimento não significa que o produto já esteja disponível para venda ou checkout.",
                ],
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
              <FormHelp>Categoria usada para organizar este produto.</FormHelp>
            </label>
            <label className="grid gap-2 text-sm">
              Descrição
              <Textarea
                name="description"
                defaultValue={selectedProduct?.description ?? ""}
                placeholder="Descrição"
                maxLength={20000}
                required
              />
              <FormHelp>Informações descritivas do produto.</FormHelp>
            </label>
            <Check
              name="active"
              label="Produto ativo"
              defaultChecked={selectedProduct?.isActive ?? true}
              help="Indica se o produto está ativo no catálogo. Isso não publica automaticamente uma página de produto."
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
              mediaAssets={mediaData.data ?? []}
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
                        url: optional(f.get("url")),
                        mediaAssetId: optional(f.get("mediaAssetId")),
                        altText: optional(f.get("alt")),
                        position: number(f, "imagePosition"),
                        isPrimary: Boolean(f.get("primary")),
                      },
                    }).then(() => undefined),
                  "Imagem salva.",
                  true,
                )
              }
              onDeleteImage={(id) =>
                void run(
                  () => removeImage({ data: { slug, id } }).then(() => undefined),
                  "Imagem removida.",
                  true,
                )
              }
            />
          ) : null}
        </div>
      </div>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
function Fields({
  fields,
}: {
  fields: [
    string,
    string,
    string,
    (string | undefined)?,
    (string | undefined)?,
    (string | undefined)?,
  ][];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, name, value, type, help, tooltip]) => (
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
          {help ? <FormHelp tooltip={tooltip}>{help}</FormHelp> : null}
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
  help,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  value?: string;
  help?: string;
}) {
  return (
    <div className="grid gap-1">
      <label className="flex items-center gap-2 text-sm">
        <input name={name} type="checkbox" value={value} defaultChecked={defaultChecked} />
        {label}
      </label>
      {help ? <FormHelp>{help}</FormHelp> : null}
    </div>
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
      <FormHelp tooltip="Atributo = Cor. Valor = azul. Rótulo = Azul.">
        No atributo &quot;Cor&quot;, por exemplo, cada valor representa uma opção como Azul, Preto
        ou Branco.
      </FormHelp>
      <form
        key={editing?.id ?? "new"}
        className="mt-2 grid gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(new FormData(e.currentTarget));
        }}
      >
        <label className="grid gap-1 text-sm">
          Valor
          <Input
            name="value"
            defaultValue={editing?.value ?? ""}
            placeholder="Valor"
            maxLength={160}
            required
          />
          <FormHelp tooltip="Uma opção de um atributo, como Azul para o atributo Cor.">
            Identificador da opção. Exemplo: azul
          </FormHelp>
        </label>
        <label className="grid gap-1 text-sm">
          Rótulo
          <Input
            name="label"
            defaultValue={editing?.label ?? ""}
            placeholder="Rótulo"
            maxLength={160}
            required
          />
          <FormHelp>Nome legível apresentado para o usuário. Exemplo: Azul</FormHelp>
        </label>
        {attribute.displayType === "swatch" ? (
          <label className="grid gap-1 text-sm">
            Amostra
            <Input
              name="swatch"
              defaultValue={editing?.swatchValue ?? ""}
              placeholder="Amostra"
              maxLength={160}
            />
            <FormHelp>
              Informação adicional usada quando o atributo utiliza o tipo &quot;Amostra&quot;.
            </FormHelp>
          </label>
        ) : null}
        <label className="grid gap-1 text-sm">
          Posição
          <Input
            name="position"
            type="number"
            min="0"
            defaultValue={editing?.position ?? 0}
            required
          />
          <FormHelp>Define a ordem dessa opção.</FormHelp>
        </label>
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
  mediaAssets,
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
  mediaAssets: MediaAsset[];
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
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
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
          <FormHelp variant="callout">
            Selecione os valores de atributos que realmente estão disponíveis neste produto.
            Exemplo: para Tamanho, marque P, M e G.
          </FormHelp>
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
          <FormHelp>Associar valores ao produto não cria variantes automaticamente.</FormHelp>
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
        <FormHelp variant="callout">
          Como funciona: uma variante representa uma versão específica do produto. Use variantes
          quando o mesmo produto tiver combinações diferentes de atributos, como Camiseta + Azul +
          M.
        </FormHelp>
        <p className="text-xs text-muted-foreground">
          Exemplo: Produto: Camiseta básica · Variante: Azul / M · SKU: CAM-AZ-M · Preço: 59,90
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
              [
                "SKU",
                "sku",
                variant?.sku ?? "",
                undefined,
                "Identificador da variante, normalmente usado para controle interno. Exemplo: CAM-AZ-M",
                "Identificador usado para controlar uma variante do produto.",
              ],
              [
                "Preço",
                "variantPrice",
                String(variant?.price ?? product.price),
                "number",
                "Preço específico desta variante.",
              ],
              [
                "Preço comparativo",
                "compare",
                variant?.compareAtPrice?.toString() ?? "",
                "number",
                "Outro valor de referência registrado para a variante. Não representa automaticamente uma promoção ou desconto.",
              ],
              [
                "Posição",
                "variantPosition",
                String(variant?.position ?? 0),
                "number",
                "Define a ordem da variante.",
              ],
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
              <FormHelp>
                Escolha valores já associados ao produto para definir esta variante.
              </FormHelp>
            </label>
          ))}
          <Check
            name="variantActive"
            label="Variante ativa"
            defaultChecked={variant?.isActive ?? true}
            help="Indica se esta variante está ativa."
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
        <h3 className="font-medium">Imagens do produto</h3>
        <FormHelp variant="callout">
          A imagem do produto pode vir da Biblioteca de mídia ou de uma URL externa. Escolha apenas
          uma fonte.
        </FormHelp>
        <FormHelp>
          Selecionar uma mídia da biblioteca não cria um novo upload; apenas associa a mídia ao
          produto.
        </FormHelp>
        <form
          key={editingImage?.id ?? "new-image"}
          className="mt-2 grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveImage(new FormData(e.currentTarget), editingImage?.id ?? null);
            setEditingImage(null);
          }}
        >
          <label className="grid gap-2 text-sm">
            Mídia da biblioteca
            <select
              name="mediaAssetId"
              defaultValue={editingImage?.mediaAssetId ?? ""}
              className="h-9 rounded-md border bg-background px-3"
              onChange={(event) => {
                if (event.currentTarget.value) {
                  const url = event.currentTarget.form?.elements.namedItem("url");
                  if (url instanceof HTMLInputElement) url.value = "";
                }
              }}
            >
              <option value="">Nenhuma</option>
              {mediaAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.filename}
                </option>
              ))}
            </select>
            <FormHelp>
              Mídia é uma imagem armazenada ou referenciada na Biblioteca de mídia. Selecione uma
              mídia já cadastrada na Biblioteca.
            </FormHelp>
          </label>
          <label className="grid gap-1 text-sm">
            URL externa
            <Input
              name="url"
              type="url"
              placeholder="URL externa https://..."
              maxLength={2000}
              defaultValue={editingImage?.url ?? ""}
              onChange={(event) => {
                if (event.currentTarget.value) {
                  const media = event.currentTarget.form?.elements.namedItem("mediaAssetId");
                  if (media instanceof HTMLSelectElement) media.value = "";
                }
              }}
            />
            <FormHelp>Use o endereço HTTP(S) direto de uma imagem hospedada externamente.</FormHelp>
          </label>
          <label className="grid gap-1 text-sm">
            Alt
            <Input
              name="alt"
              placeholder="Texto alternativo"
              maxLength={500}
              defaultValue={editingImage?.altText ?? ""}
            />
            <FormHelp tooltip="Descrição textual da imagem para acessibilidade.">
              Descreva a imagem de forma útil para quem não consegue vê-la. Exemplo: Camiseta azul
              de manga curta vista de frente
            </FormHelp>
          </label>
          <label className="grid gap-1 text-sm">
            Posição
            <Input
              name="imagePosition"
              type="number"
              min="0"
              defaultValue={String(editingImage?.position ?? 0)}
              required
            />
            <FormHelp>Define a ordem das imagens do produto.</FormHelp>
          </label>
          <Check
            name="primary"
            label="Imagem principal"
            defaultChecked={editingImage?.isPrimary ?? images.length === 0}
            help="Marque a imagem que melhor representa o produto."
          />
          <Button className="w-fit" disabled={pending}>
            <Plus />
            {editingImage ? "Salvar imagem" : "Adicionar imagem"}
          </Button>
          {editingImage ? (
            <Button
              type="button"
              variant="ghost"
              className="w-fit"
              onClick={() => setEditingImage(null)}
            >
              Cancelar
            </Button>
          ) : null}
        </form>
        {images.length ? (
          <ul className="mt-3 divide-y">
            {images.map((image) => (
              <li key={image.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  {(() => {
                    const asset = mediaAssets.find((item) => item.id === image.mediaAssetId);
                    const src = image.url ?? asset?.imageUrl;
                    return src ? (
                      <img
                        className="size-12 shrink-0 object-cover"
                        src={src}
                        alt={image.altText ?? asset?.filename ?? ""}
                      />
                    ) : null;
                  })()}
                  <span className="truncate">
                    {image.isPrimary ? "Principal · " : ""}
                    {image.url ??
                      mediaAssets.find((item) => item.id === image.mediaAssetId)?.filename ??
                      "Mídia associada"}
                  </span>
                </div>
                <Actions
                  onEdit={() => setEditingImage(image)}
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
