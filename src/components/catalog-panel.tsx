import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import {
  getCurrentStoreCatalog,
  saveCurrentStoreCategory,
  saveCurrentStoreProduct,
} from "@/auth/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Product } from "@/domain/catalog";

const catalogQueryKey = ["store", "current", "catalog"] as const;
const noCategory = "none";

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível salvar o catálogo.";
}

export function CatalogPanel() {
  const queryClient = useQueryClient();
  const loadCatalog = useServerFn(getCurrentStoreCatalog);
  const saveCategory = useServerFn(saveCurrentStoreCategory);
  const saveProduct = useServerFn(saveCurrentStoreProduct);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryActive, setCategoryActive] = useState(true);
  const [productActive, setProductActive] = useState(true);
  const [categoryId, setCategoryId] = useState(noCategory);
  const catalogQuery = useQuery({
    queryKey: catalogQueryKey,
    queryFn: () => loadCatalog({ data: {} }),
  });

  async function refresh(message: string) {
    await queryClient.invalidateQueries({ queryKey: catalogQueryKey });
    setFeedback(message);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFeedback(null);
    try {
      await saveCategory({
        data: {
          id: category?.id ?? null,
          name: String(form.get("categoryName") ?? ""),
          categorySlug: String(form.get("categorySlug") ?? ""),
          description: String(form.get("categoryDescription") ?? ""),
          isActive: categoryActive,
        },
      });
      setCategory(null);
      setCategoryActive(true);
      event.currentTarget.reset();
      await refresh("Categoria salva.");
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFeedback(null);
    try {
      await saveProduct({
        data: {
          id: product?.id ?? null,
          categoryId: categoryId === noCategory ? null : categoryId,
          name: String(form.get("productName") ?? ""),
          productSlug: String(form.get("productSlug") ?? ""),
          description: String(form.get("productDescription") ?? ""),
          price: Number(form.get("price")),
          isActive: productActive,
        },
      });
      setProduct(null);
      setProductActive(true);
      setCategoryId(noCategory);
      event.currentTarget.reset();
      await refresh("Produto salvo.");
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  async function toggleCategory(item: Category) {
    setPending(true);
    try {
      await saveCategory({
        data: {
          id: item.id,
          name: item.name,
          categorySlug: item.slug,
          description: item.description ?? "",
          isActive: !item.isActive,
        },
      });
      await refresh("Categoria atualizada.");
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  async function toggleProduct(item: Product) {
    setPending(true);
    try {
      await saveProduct({
        data: {
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          productSlug: item.slug,
          description: item.description,
          price: item.price,
          isActive: !item.isActive,
        },
      });
      await refresh("Produto atualizado.");
    } catch (error) {
      setFeedback(messageFrom(error));
    } finally {
      setPending(false);
    }
  }

  if (catalogQuery.isPending)
    return <p className="mt-6 text-sm text-muted-foreground">Carregando catálogo…</p>;
  if (catalogQuery.isError)
    return <p className="mt-6 text-sm text-destructive">{messageFrom(catalogQuery.error)}</p>;

  const { categories, products } = catalogQuery.data;
  return (
    <section className="mt-6 w-full border-t border-border pt-6" aria-label="Catálogo da loja">
      <p className="text-sm font-semibold">Catálogo</p>
      <p className="mt-1 text-sm text-muted-foreground">{catalogQuery.data.store.name}</p>
      <Tabs defaultValue="categories" className="mt-4">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="pt-3">
          <form
            key={category?.id ?? "new-category"}
            className="grid gap-3"
            onSubmit={handleCategorySubmit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" id="category-name">
                <Input
                  id="category-name"
                  name="categoryName"
                  defaultValue={category?.name}
                  maxLength={120}
                  required
                />
              </Field>
              <Field label="Slug" id="category-slug">
                <Input
                  id="category-slug"
                  name="categorySlug"
                  defaultValue={category?.slug}
                  maxLength={160}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </Field>
            </div>
            <Field label="Descrição" id="category-description">
              <Textarea
                id="category-description"
                name="categoryDescription"
                defaultValue={category?.description ?? ""}
                maxLength={2000}
              />
            </Field>
            <StatusField
              id="category-active"
              label="Categoria ativa"
              checked={categoryActive}
              onChange={setCategoryActive}
            />
            <Button className="w-fit" type="submit" disabled={pending}>
              {category ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
              {category ? "Salvar categoria" : "Criar categoria"}
            </Button>
          </form>
          <CatalogList
            empty="Nenhuma categoria cadastrada."
            pending={pending}
            items={categories.map((item) => ({
              id: item.id,
              title: item.name,
              detail: item.slug,
              active: item.isActive,
              onEdit: () => {
                setCategory(item);
                setCategoryActive(item.isActive);
              },
              onToggle: () => toggleCategory(item),
            }))}
          />
        </TabsContent>
        <TabsContent value="products" className="pt-3">
          <form
            key={product?.id ?? "new-product"}
            className="grid gap-3"
            onSubmit={handleProductSubmit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" id="product-name">
                <Input
                  id="product-name"
                  name="productName"
                  defaultValue={product?.name}
                  maxLength={160}
                  required
                />
              </Field>
              <Field label="Slug" id="product-slug">
                <Input
                  id="product-slug"
                  name="productSlug"
                  defaultValue={product?.slug}
                  maxLength={160}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preço" id="product-price">
                <Input
                  id="product-price"
                  name="price"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  defaultValue={product?.price}
                  required
                />
              </Field>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noCategory}>Sem categoria</SelectItem>
                    {categories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Field label="Descrição" id="product-description">
              <Textarea
                id="product-description"
                name="productDescription"
                defaultValue={product?.description}
                maxLength={20000}
                required
              />
            </Field>
            <StatusField
              id="product-active"
              label="Produto ativo"
              checked={productActive}
              onChange={setProductActive}
            />
            <Button className="w-fit" type="submit" disabled={pending}>
              {product ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
              {product ? "Salvar produto" : "Criar produto"}
            </Button>
          </form>
          <CatalogList
            empty="Nenhum produto cadastrado."
            pending={pending}
            items={products.map((item) => ({
              id: item.id,
              title: item.name,
              detail: `${item.slug} · R$ ${item.price.toFixed(2)}`,
              active: item.isActive,
              onEdit: () => {
                setProduct(item);
                setProductActive(item.isActive);
                setCategoryId(item.categoryId ?? noCategory);
              },
              onToggle: () => toggleProduct(item),
            }))}
          />
        </TabsContent>
      </Tabs>
      {feedback ? <p className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function StatusField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface CatalogListItem {
  id: string;
  title: string;
  detail: string;
  active: boolean;
  onEdit: () => void;
  onToggle: () => void;
}

function CatalogList({
  items,
  empty,
  pending,
}: {
  items: CatalogListItem[];
  empty: string;
  pending: boolean;
}) {
  if (items.length === 0) return <p className="mt-5 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="mt-5 divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Switch
              checked={item.active}
              onCheckedChange={item.onToggle}
              disabled={pending}
              aria-label={`Alterar status de ${item.title}`}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={item.onEdit}
              aria-label={`Editar ${item.title}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
