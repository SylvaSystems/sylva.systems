import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reach out | Sylva Systems",
};

/*
  CONTACT PAGE ("/contact/", linked as "Reach out").

  The form is a plain HTML POST - no JavaScript. The browser itself
  submits the data to Formspree (a free service that forwards form
  submissions to email), which is what makes a working form possible on a
  static host like GitHub Pages.

  >>> TODO before launch: create a free form at https://formspree.io and
  >>> replace YOUR_FORM_ID in the action= URL below with the real id.

  Validation is the browser's own: required + type="email". Fields turn
  red only after the user interacts with them (:user-invalid rule in
  globals.css); the browser supplies the error messages on submit.
*/

export default function Contact() {
  return (
    <section className="mx-auto max-w-page px-4 py-20 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contact</h1>
      <p className="mt-6 max-w-measure text-lg leading-relaxed">
        Please don’t hesitate to reach out with advice, connections, or
        even just words of support. We’ll take everything we can get!
      </p>

      <form
        action="https://formspree.io/f/mvzewzpw"
        method="POST"
        className="mt-12 max-w-xl"
      >
        {/* Each field block: label ABOVE input, stacked with a small gap.
            htmlFor= ties label to input id, so clicking the label focuses
            the field and screen readers announce it. autoComplete lets the
            browser offer saved name/email. */}
        <div className="grid gap-6">
          <div className="grid gap-2">
            <label htmlFor="name" className="font-bold">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="border border-ink-soft bg-paper px-3 py-2.5 text-ink"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email" className="font-bold">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border border-ink-soft bg-paper px-3 py-2.5 text-ink"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="message" className="font-bold">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={7}
              className="border border-ink-soft bg-paper px-3 py-2.5 text-ink"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-8 bg-pine px-6 py-3 text-lg text-paper transition-colors hover:bg-pine-deep active:translate-y-px"
        >
          Send
        </button>
      </form>
    </section>
  );
}
