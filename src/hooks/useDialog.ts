import { useEffect, type RefObject } from 'react'

// Native dialogs keep background content inert and contain keyboard focus.
export function useDialog(ref: RefObject<HTMLDialogElement>, open: boolean, onClose: () => void) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const cancel = (event: Event) => { event.preventDefault(); onClose() }
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), iframe, [tabindex="0"]')]
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0)
      const first = items[0]; const last = items[items.length - 1]
      if (!first || !last) { event.preventDefault(); dialog.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    dialog.addEventListener('cancel', cancel)
    dialog.addEventListener('keydown', trap)
    return () => {
      dialog.removeEventListener('cancel', cancel)
      dialog.removeEventListener('keydown', trap)
      dialog.close()
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [ref, open, onClose])
}
