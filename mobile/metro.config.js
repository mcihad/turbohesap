// Metro configuration for the pnpm monorepo. The app lives in mobile/ but
// depends on @turbohesap/shared at the workspace root, so Metro must watch the
// whole workspace and resolve modules from both node_modules trees.
// See: https://docs.expo.dev/guides/monorepos/
//
// IMPORTANT (pnpm): unlike npm/yarn, pnpm does NOT hoist transitive deps into a
// flat node_modules — packages live in the symlinked `.pnpm` store and each
// package's deps are linked next to it. So we must let Metro do its normal
// hierarchical (walk-up) lookup, which finds those nested links (e.g. `expo` →
// `expo-modules-core`). Setting `disableHierarchicalLookup = true` (the value
// Expo's guide suggests for hoisted package managers) breaks pnpm resolution.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

// 1. Watch the whole workspace (so changes to @turbohesap/shared are picked up).
config.watchFolders = [workspaceRoot]

// 2. Let Metro resolve from the app's and the workspace root's node_modules,
//    in addition to its default hierarchical lookup (kept ON for pnpm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. Follow symlinks into the pnpm store (default in modern Metro, set
//    explicitly to be safe).
config.resolver.unstable_enableSymlinks = true

module.exports = config
