import type { Metadata } from "next";
import LegalShell from "@chat/components/LegalShell";
import { BRAND } from "@chat/lib/brand";

export const metadata: Metadata = { title: `Terms & Conditions · ${BRAND}` };

const WHATSAPP = (process.env.NEXT_PUBLIC_TEAM_WHATSAPP ?? "").replace(/\D/g, "");

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updated="5 November 2026">
      <p>By making a request on {BRAND}, you agree to these terms.</p>

      <section>
        <h2>What we do</h2>
        <p>
          You tell us what you need in Calabar. One of our plugs buys it and brings it to you. You chat only with the {BRAND} team.
        </p>
      </section>

      <section>
        <h2>Your bill</h2>
        <ul>
          <li>The cost of your items.</li>
          <li>The plug&apos;s transport fare, from ₦600, depending on distance.</li>
          <li>A late-night charge for orders between 10pm and 6am, and an extra charge for many or large items, when they apply.</li>
        </ul>
        <p className="mt-2">Your bill is sent in the chat. Nothing is added after you pay without telling you first.</p>
      </section>

      <section>
        <h2>Paying</h2>
        <p>
          Pay by bank transfer to the account on your bill, using your request code as the transfer note, then send us your receipt in
          the chat. Your plug sets out once we confirm the payment.
        </p>
      </section>

      <section>
        <h2>Changes and cancelling</h2>
        <ul>
          <li>If something you asked for isn&apos;t available or costs more, we&apos;ll tell you before buying.</li>
          <li>If you cancel before your plug buys your items, we refund what you paid.</li>
          <li>Once your items have been bought, they can&apos;t be refunded, unless they arrive damaged or wrong.</li>
        </ul>
      </section>

      <section>
        <h2>Things we won&apos;t buy</h2>
        <p>
          We won&apos;t buy anything illegal or unsafe. Alcohol and other age-restricted items are only for people aged 18 and over, and
          your plug may ask for ID.
        </p>
      </section>

      <section>
        <h2>Delivery</h2>
        <p>
          We give our best time estimate, but traffic, weather and shop opening hours can cause delays. Please make sure someone can
          receive the order and answer the phone number you gave us.
        </p>
      </section>

      {WHATSAPP && (
        <section>
          <h2>Questions or problems</h2>
          <p>
            Message us on{" "}
            <a href={`https://wa.me/${WHATSAPP}`} className="font-semibold text-accent underline">
              WhatsApp
            </a>
            .
          </p>
        </section>
      )}
    </LegalShell>
  );
}
