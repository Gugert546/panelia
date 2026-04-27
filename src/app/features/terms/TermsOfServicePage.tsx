import { Link } from "react-router-dom";

const lastUpdated = "April 27, 2026";
const supportContact = "paneliaNo1@gmail.com";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="legal-back-link" to="/dashboard">
          Back to Panelia
        </Link>

        <header className="legal-header">
          <p>Last updated: {lastUpdated}</p>
          <h1>Terms of Service for Panelia</h1>
          <p>
            These Terms of Service govern your access to and use of Panelia, a
            personal dashboard application for widgets, bookmarks, notes, calendar
            events, email previews, backgrounds, and optional AI-assisted actions.
          </p>
        </header>

        <Section title="Acceptance of Terms">
          <p>
            By accessing or using Panelia, you agree to these Terms of Service and
            our Privacy Policy. If you do not agree, do not use Panelia.
          </p>
        </Section>

        <Section title="Your Account">
          <p>
            You are responsible for the activity that occurs under your account and
            for keeping your sign-in credentials secure. You must provide accurate
            account information and use Panelia only for lawful purposes.
          </p>
        </Section>

        <Section title="Using Panelia">
          <p>You agree not to use Panelia to:</p>
          <ul>
            <li>Break any applicable law or regulation.</li>
            <li>Access, copy, or interfere with systems or data you are not authorized to use.</li>
            <li>Upload or store unlawful, harmful, abusive, infringing, or malicious content.</li>
            <li>Disrupt, overload, reverse engineer, or abuse Panelia or connected third-party services.</li>
            <li>Use Panelia to send spam, phishing attempts, malware, or deceptive content.</li>
          </ul>
        </Section>

        <Section title="Your Content">
          <p>
            You keep ownership of content you create or upload to Panelia, such as
            notes, bookmarks, calendar entries, dashboard settings, and background
            media. You grant Panelia permission to store, process, display, and
            transmit that content only as needed to provide and improve the app's
            user-facing features.
          </p>
          <p>
            You are responsible for making sure you have the rights needed for any
            content you upload or enter into Panelia.
          </p>
        </Section>

        <Section title="Google and Third-Party Services">
          <p>
            Panelia can connect to optional third-party services, including Google
            sign-in, Google Calendar, Gmail, Microsoft Outlook, Firebase, Google
            Cloud, Spotify, and OpenAI API services. Your use of those services may
            also be governed by their own terms and privacy policies.
          </p>
          <p>
            When you connect Google Calendar or Gmail, Panelia uses Google API data
            only to provide visible Panelia features that you choose to use. Panelia
            does not sell Google user data, use it for advertising, or use it to
            train AI models.
          </p>
        </Section>

        <Section title="AI Features">
          <p>
            Panelia may include optional AI-assisted features. AI responses can be
            inaccurate or incomplete, and you are responsible for reviewing results
            before relying on them. Do not enter sensitive information into the AI
            assistant unless you are comfortable with it being processed to provide
            the requested feature.
          </p>
        </Section>

        <Section title="Service Availability">
          <p>
            Panelia is provided on an as-available basis. We may change, suspend, or
            discontinue features at any time. We may also limit or suspend access if
            we believe an account is misusing Panelia, creating security risk, or
            violating these terms.
          </p>
        </Section>

        <Section title="No Warranties">
          <p>
            Panelia is provided without warranties of any kind, whether express,
            implied, or statutory. We do not guarantee that Panelia will be
            uninterrupted, error-free, secure, or suitable for any particular purpose.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Panelia and its operators will
            not be liable for indirect, incidental, special, consequential, exemplary,
            or punitive damages, or for loss of data, profits, goodwill, or business
            opportunities arising from your use of Panelia.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using Panelia at any time. We may suspend or terminate
            access if you violate these terms or if continued access would create
            legal, security, or operational risk. You may request deletion of your
            data as described in the Privacy Policy.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms of Service when Panelia changes or when legal,
            operational, or security needs require updates. Continued use of Panelia
            after updates means you accept the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For questions about these Terms of Service, contact us at {supportContact}.
          </p>
        </Section>
      </article>
    </main>
  );
}
