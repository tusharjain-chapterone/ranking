// `@shopify/polaris-types` covers most `s-*` Polaris web components, but App
// Bridge's own navigation element isn't part of that package. Patch it here.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
