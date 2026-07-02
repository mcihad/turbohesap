// useDebouncedValue — returns `value` delayed by `delay` ms. Used to debounce a
// search box before it drives a server-side paginated fetch (so we don't fire a
// request per keystroke).

import * as React from 'react'

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
