// ProfileScreen — the Profil tab. Identity header, roles, a collapsible list of
// effective permissions (resolved server-side, same source the guards use),
// appearance (theme mode + accent + roundness + font size) and sign-out. Always
// accessible to any signed-in user.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  Avatar,
  Badge,
  Button,
  Card,
  ListCard,
  ListRow,
  Screen,
  Section,
  SegmentedControl,
  Text,
} from '../components'
import { Icon } from '../components/Icon'
import { useAuth } from '../lib/auth/auth-context'
import { displayName, initials } from '../lib/tokens'
import { useModuleNav } from '../navigation/module-nav-context'
import { ModuleSwitcherButton } from '../navigation/ModuleSwitcher'
import { ACCENT_PRESETS, type FontScaleId, type RadiusScaleId } from '../theme/tokens'
import { type ThemeMode, useThemeControls } from '../theme/theme-context'

export function ProfileScreen() {
  const { user, roles, permissions, logout } = useAuth()
  const { theme, config, mode, setMode, setAccent, setRadiusScale, setFontScale, reset } =
    useThemeControls()
  const t = theme
  const [showPerms, setShowPerms] = React.useState(false)
  // useModuleNav is available because Profile is rendered inside ModuleNavProvider.
  useModuleNav()

  if (!user) return <Screen header={{ title: 'Profil' }}>{null}</Screen>

  return (
    <Screen header={{ title: 'Profil', large: true, right: <ModuleSwitcherButton /> }}>
      {/* Identity */}
      <Card style={{ alignItems: 'center', gap: t.spacing[3] }}>
        <Avatar initials={initials(user)} size={76} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text variant="h2">{displayName(user)}</Text>
          <Text variant="label" tone="muted">
            {user.email}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5], justifyContent: 'center' }}>
          {roles.length > 0 ? (
            roles.map((r) => <Badge key={r} label={r} tone="primary" />)
          ) : (
            <Badge label="Rol yok" tone="muted" />
          )}
        </View>
      </Card>

      {/* Access summary */}
      <Section title="Erişim">
        <ListCard>
          <ListRow
            icon="key"
            title="Etkin yetkiler"
            subtitle={`${permissions.length} izin`}
            trailing={<Icon name={showPerms ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.mutedForeground} />}
            onPress={() => setShowPerms((v) => !v)}
            chevron={false}
          />
          {showPerms ? (
            <View style={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[2] }}>
              {permissions.length === 0 ? (
                <Text variant="caption" tone="muted">
                  Atanmış izin yok.
                </Text>
              ) : (
                permissions
                  .slice()
                  .sort()
                  .map((p) => (
                    <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                      <Icon name="check" size={14} color={t.colors.success} />
                      <Text variant="mono">{p}</Text>
                    </View>
                  ))
              )}
            </View>
          ) : null}
        </ListCard>
      </Section>

      {/* Appearance */}
      <Section title="Görünüm">
        <Card style={{ gap: t.spacing[5] }}>
          <Setting label="Tema">
            <SegmentedControl<ThemeMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'light', label: 'Açık', icon: 'sun' },
                { value: 'dark', label: 'Koyu', icon: 'moon' },
                { value: 'system', label: 'Sistem', icon: 'smartphone' },
              ]}
            />
          </Setting>

          <Setting label="Vurgu rengi">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
              {ACCENT_PRESETS.map((p) => {
                const selected = config.accent === p.id
                return (
                  <Pressable key={p.id} onPress={() => setAccent(p.id)} style={{ alignItems: 'center', gap: 5 }}>
                    <View
                      style={{
                        padding: 3,
                        borderRadius: 24,
                        borderWidth: 2,
                        borderColor: selected ? p.swatch : 'transparent',
                      }}
                    >
                      <View
                        style={[
                          { width: 38, height: 38, borderRadius: 19, backgroundColor: p.swatch, alignItems: 'center', justifyContent: 'center' },
                          selected ? t.elevation('sm') : null,
                        ]}
                      >
                        {selected ? <Icon name="check" size={18} color="#FFFFFF" /> : null}
                      </View>
                    </View>
                    <Text variant="caption" tone={selected ? 'default' : 'muted'} weight={selected ? 'semibold' : 'normal'}>
                      {p.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Setting>

          <Setting label="Köşe yuvarlaklığı">
            <SegmentedControl<RadiusScaleId>
              value={config.radiusScale}
              onChange={setRadiusScale}
              options={[
                { value: 'compact', label: 'Köşeli' },
                { value: 'default', label: 'Normal' },
                { value: 'round', label: 'Yuvarlak' },
              ]}
            />
          </Setting>

          <Setting label="Yazı boyutu">
            <SegmentedControl<FontScaleId>
              value={config.fontScale}
              onChange={setFontScale}
              options={[
                { value: 'small', label: 'Küçük' },
                { value: 'default', label: 'Normal' },
                { value: 'large', label: 'Büyük' },
              ]}
            />
          </Setting>

          <Button title="Varsayılana dön" variant="ghost" size="sm" icon="rotate-ccw" onPress={reset} />
        </Card>
      </Section>

      <Button title="Çıkış yap" variant="outline" icon="log-out" fullWidth onPress={logout} style={{ marginTop: t.spacing[2] }} />

      <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: t.spacing[2] }}>
        TurboHesap Mobile · v0.1.0
      </Text>
    </Screen>
  )
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useThemeControls().theme
  return (
    <View style={{ gap: t.spacing[2] }}>
      <Text variant="label" tone="muted" weight="medium">
        {label}
      </Text>
      {children}
    </View>
  )
}
