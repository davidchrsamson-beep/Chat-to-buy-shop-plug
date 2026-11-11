import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy · ${BRAND}` };

const WHATSAPP = (process.env.NEXT_PUBLIC_TEAM_WHATSAPP ?? "").replace(/\D/g, "");

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy" updated="5 November 2026">
      <p>
        {BRAND} buys and delivers what you ask for in Calabar. To do that, we need a few details from you. This page explains what we
        keep, why, and who sees it, in plain words.
      </p>

      <section>
        <h2>What we keep</h2>
        <ul>
          <li>Your chat with us: what you ask for, and our replies.</li>
          <li>The details you give us: your name, phone number, delivery address and area.</li>
          <li>Your bills, and the pictures of payment receipts you send us.</li>
          <li>
            On your own phone only: a private code that keeps your chat open, and your white/black screen choice. These stay on your
            device.
          </li>
        </ul>
        <p className="mt-2">We don&apos;t ask for your bank card or bank login, and we never will.</p>
      </section>

      <section>
        <h2>Why we keep it</h2>
        <ul>
          <li>To buy and deliver your order.</li>
          <li>So your plug can call you and find your address.</li>
          <li>To confirm your payment, and to sort out any problem with an order.</li>
        </ul>
      </section>

      <section>
        <h2>Who sees it</h2>
        <ul>
          <li>The {BRAND} team.</li>
          <li>The plug handling your order, who gets your name, phone number, address and what to buy.</li>
          <li>The companies that host our app and database for us, only to keep it running.</li>
        </ul>
        <p className="mt-2">We don&apos;t sell your details or share them for advertising.</p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can ask us what we hold about you, ask us to correct it, or ask us to delete it. These rights are yours under Nigeria&apos;s
          data protection law.
          {WHATSAPP && (
            <>
              {" "}
              Message us on{" "}
              <a href={`https://wa.me/${WHATSAPP}`} className="font-semibold text-accent underline">
                WhatsApp
              </a>
              .
            </>
          )}
        </p>
      </section>
    </LegalShell>
  );
}
