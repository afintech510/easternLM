/**
 * USB Barcode Scanner support (Datalogic QD2430 and similar HID scanners).
 *
 * HID scanners act as keyboards — they type characters fast and press Enter.
 * We detect rapid keystroke sequences (full barcode in <100ms) that aren't
 * from a focused text input, and trigger a callback with the scanned value.
 *
 * Usage:
 *   const cleanup = initBarcodeScanner((barcode) => {
 *     const product = products.find(p => p.barcode === barcode || p.sku === barcode || p.slug === barcode);
 *     if (product) addItem(product, 1);
 *   });
 *   // Later: cleanup();
 */

export function initBarcodeScanner(onScan: (barcode: string) => void): () => void {
  let buffer = "";
  let lastKeyTime = 0;
  const MAX_GAP_MS = 50; // Max ms between keystrokes (scanners type at ~5ms per char)
  const MIN_LENGTH = 3; // Minimum barcode length to consider valid
  let timer: ReturnType<typeof setTimeout> | null = null;

  function handleKeyDown(e: KeyboardEvent) {
    const now = Date.now();
    const target = e.target as HTMLElement;
    const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

    // If an input is focused AND it's the POS search field, let the scanner type there
    // But for other inputs (qty fields, etc.), we intercept
    const isPosSearch = target.id === "pos-search";

    if (e.key === "Enter") {
      if (buffer.length >= MIN_LENGTH) {
        e.preventDefault();
        e.stopPropagation();
        const barcode = buffer.trim();
        buffer = "";
        onScan(barcode);
        return;
      }
      buffer = "";
      return;
    }

    // Only single printable characters (not Shift, Ctrl, etc.)
    if (e.key.length !== 1) {
      return;
    }

    // If the gap between keystrokes is too large, reset buffer
    if (now - lastKeyTime > MAX_GAP_MS && buffer.length > 0) {
      buffer = "";
    }

    // If typing in search field normally (slow), don't intercept
    if (isPosSearch && now - lastKeyTime > MAX_GAP_MS) {
      buffer = "";
      lastKeyTime = now;
      return;
    }

    buffer += e.key;
    lastKeyTime = now;

    // If we're building a barcode and NOT in the search field, prevent the keystroke
    // from going into whatever input might be focused
    if (buffer.length >= 2 && !isPosSearch) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Set a timeout to clear the buffer if no Enter comes
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      buffer = "";
    }, 200);
  }

  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    if (timer) clearTimeout(timer);
  };
}
