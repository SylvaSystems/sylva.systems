/*
  Site footer: a single dark band with the wordmark. Deliberately minimal -
  no link list (the masthead already navigates), no copyright line yet
  (nothing approved in content.md).

  bg-ink/text-paper inverts the page palette: near-black band, paper text.
  This is the one sanctioned "dark" element on the otherwise light site.
*/
export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      {/* max-w-page + mx-auto centers the content column; padding matches the pages */}
      <div className="mx-auto max-w-page px-4 py-10 sm:px-8">
        <p className="font-bold">Sylva Systems</p>
      </div>
    </footer>
  );
}
