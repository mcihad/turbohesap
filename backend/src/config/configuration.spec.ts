import { assertProductionConfig, configuration } from './configuration'

describe('assertProductionConfig', () => {
  it('does nothing outside production', () => {
    expect(() =>
      assertProductionConfig({ ...configuration(), env: 'development' }),
    ).not.toThrow()
  })

  it('refuses production with default secrets', () => {
    expect(() =>
      assertProductionConfig({ ...configuration(), env: 'production' }),
    ).toThrow(/default secrets/)
  })

  it('allows production with real secrets', () => {
    const base = configuration()
    expect(() =>
      assertProductionConfig({
        ...base,
        env: 'production',
        jwt: {
          ...base.jwt,
          accessSecret: 'real-access-secret-value',
          refreshSecret: 'real-refresh-secret-value',
        },
        seed: { ...base.seed, adminPassword: 'Str0ng-Prod-Pass!' },
      }),
    ).not.toThrow()
  })
})
