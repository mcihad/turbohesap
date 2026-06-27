// CategoryDetailScreen — a category's info + its custom product-field definitions
// (add/edit/delete), plus actions: edit core fields, add child, delete, audit.
// Gated by inventory.categories.read.

import * as React from 'react'
import { Image, Pressable, View } from 'react-native'

import { FilesPermissions, InventoryPermissions, IamPermissions } from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  HeaderAction,
  Icon,
  ListCard,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { ImageManager } from '../../components/image'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { fieldTypeLabel } from './labels'

export function CategoryDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.categoriesWrite)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const canFiles = hasPermission(FilesPermissions.write)
  const id = String(nav.current.params?.id ?? '')
  const category = useAsync(() => api.inventory.categories.get(id), [id], {
    enabled: hasPermission(InventoryPermissions.categoriesRead) && !!id,
  })
  const { submit, busy } = useSubmit()
  const c = category.data

  function removeField(key: string) {
    if (!c) return
    confirmDestructive('Alanı kaldır', `"${key}" alanı silinsin mi?`, () =>
      submit(
        () =>
          api.inventory.categories
            .update(c.id, { fieldDefs: c.fieldDefs.filter((f) => f.key !== key) })
            .then(() => undefined),
        { onSuccess: category.refetch },
      ),
    )
  }

  if (!hasPermission(InventoryPermissions.categoriesRead)) {
    return (
      <Screen header={{ title: 'Kategori', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: c?.name ?? 'Kategori',
        subtitle: c?.code || undefined,
        onBack: nav.goBack,
        right: c ? (
          <>
            {canAudit ? (
              <HeaderAction icon="clock" onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Category', entityId: c.id, title: c.name }, 'Denetim geçmişi')} />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('inventory.category.form', { id: c.id }, c.name)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={category.refetch}
      refreshing={category.refreshing}
    >
      {category.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} />
        </Card>
      ) : category.error || !c ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={category.error ?? 'Kategori bulunamadı.'} actionLabel="Tekrar dene" onAction={category.refetch} />
      ) : (
        <>
          <Card style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: t.spacing[3], alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: t.colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                {c.imageUrl ? (
                  <Image source={{ uri: c.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Icon name="folder" size={24} color={t.colors.mutedForeground} />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h2">{c.name}</Text>
                <View style={{ flexDirection: 'row', gap: t.spacing[1.5] }}>
                  <Badge label={c.isActive ? 'Aktif' : 'Pasif'} tone={c.isActive ? 'success' : 'muted'} />
                  {c.code ? <Badge label={c.code} tone="muted" /> : null}
                </View>
              </View>
            </View>
            {c.description ? (
              <FieldGrid>
                <Field label="Açıklama" value={c.description} full />
              </FieldGrid>
            ) : null}
          </Card>

          <Section title="Görseller">
            <Card>
              <ImageManager
                entityType="Category"
                entityId={c.id}
                canWrite={canFiles}
                title="Kategori görselleri"
              />
            </Card>
          </Section>

          <Section
            title={`Ürün alanları (${c.fieldDefs.length})`}
          >
            {c.fieldDefs.length === 0 ? (
              <Card>
                <Text variant="label" tone="muted">
                  Bu kategoriye özel ürün alanı tanımlanmamış.
                </Text>
              </Card>
            ) : (
              <ListCard>
                {c.fieldDefs.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={canWrite ? () => nav.navigate('inventory.category.field', { id: c.id, fieldKey: f.key }, f.label) : undefined}
                    android_ripple={{ color: t.colors.muted }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], padding: t.spacing[4] }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                        <Text variant="label" weight="semibold">
                          {f.label}
                        </Text>
                        {f.required ? <Badge label="Zorunlu" tone="warning" /> : null}
                      </View>
                      <Text variant="caption" tone="muted">
                        {fieldTypeLabel(f.type)} · {f.key}
                      </Text>
                    </View>
                    {canWrite ? (
                      <Button title="" icon="trash-2" variant="ghost" size="sm" onPress={() => removeField(f.key)} />
                    ) : null}
                  </Pressable>
                ))}
              </ListCard>
            )}
          </Section>

          {canWrite ? (
            <View style={{ gap: t.spacing[2] }}>
              <Button title="Alan ekle" variant="outline" icon="plus" fullWidth onPress={() => nav.navigate('inventory.category.field', { id: c.id }, 'Yeni alan')} />
              <Button title="Alt kategori ekle" variant="outline" icon="folder-plus" fullWidth onPress={() => nav.navigate('inventory.category.form', { parentId: c.id }, 'Yeni kategori')} />
              <Button
                title="Kategoriyi sil"
                variant="outline"
                icon="trash-2"
                fullWidth
                loading={busy}
                onPress={() =>
                  confirmDestructive('Kategoriyi sil', `"${c.name}" silinsin mi?`, () =>
                    submit(() => api.inventory.categories.remove(c.id), { onSuccess: nav.goBack }),
                  )
                }
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  )
}
