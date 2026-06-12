export function CreditsFooter() {
  return (
    <footer className="mt-8 border-t border-border pt-6 text-center text-sm text-text-muted">
      <p>
        Hecho por{' '}
        <a
          href="https://twitter.com/PixelR_"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent hover:underline"
        >
          @PixelR_
        </a>
      </p>
      <a
        href="https://ko-fi.com/PixelR"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-text-muted transition-colors hover:text-[#ff5e5b]"
      >
        ko-fi.com/PixelR
      </a>
    </footer>
  );
}
