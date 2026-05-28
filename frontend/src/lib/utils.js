// Minimal classNames helper without external deps
// Supports strings, arrays, and object maps { className: boolean }
export function cn(...inputs) {
  const classes = []
  const process = (val) => {
    if (!val) return
    if (typeof val === 'string') {
      if (val) classes.push(val)
      return
    }
    if (Array.isArray(val)) {
      val.forEach(process)
      return
    }
    if (typeof val === 'object') {
      for (const [key, value] of Object.entries(val)) {
        if (value) classes.push(key)
      }
    }
  }
  inputs.forEach(process)
  return classes.join(' ')
}
