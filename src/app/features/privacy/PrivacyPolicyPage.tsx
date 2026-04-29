import { Link } from "react-router-dom";

const lastUpdated = "April 27, 2026";
const privacyContact = "paneliaNo1@gmail.com";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="privacy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-document">
        <Link className="privacy-back-link" to="/dashboard">
          Back to Panelia
        </Link>

        <header className="privacy-header">
          <p>Last updated: {lastUpdated}</p>
          <h1>Privacy Policy for Panelia</h1>
          <p>
            Panelia is a personal dashboard application that lets users manage widgets,
            bookmarks, notes, calendar events, email previews, backgrounds, and optional
            AI-assisted dashboard actions.
          </p>
        </header>

        <Section title="Who We Are">
          <p>
            This privacy policy applies to Panelia, available at https://panelia.web.app.
            For privacy questions or data requests, contact us at {privacyContact}.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>Panelia may collect and process the following information when you use the app:</p>
          <ul>
            <li>Account information from Firebase Authentication, including your user ID, email address, display name, and profile photo when provided by your sign-in provider.</li>
            <li>Dashboard data you create, such as widgets, layouts, bookmarks, notes, calendar events, theme settings, custom buttons, and uploaded background images or videos.</li>
            <li>Connection data for optional integrations, including OAuth access tokens, refresh tokens, scopes, token type, expiry time, provider, connection status, and selected calendar IDs.</li>
            <li>Usage data needed to operate app features, such as AI message quota counts and timestamps.</li>
          </ul>
        </Section>

        <Section title="Google User Data">
          <p>
            Panelia uses Google APIs only after you choose to connect a Google account or
            sign in with Google. Depending on the features you use, Panelia may access:
          </p>
          <ul>
            <li>Basic Google sign-in profile information, such as name, email address, profile photo, and Google account identifier.</li>
            <li>Google Calendar data, including calendar lists, selected calendar IDs, event titles, descriptions, start and end times, time zones, all-day status, event IDs, and event update timestamps.</li>
            <li>Gmail read-only data, including message IDs, thread IDs, sender, subject, snippet, received time, unread status, and a link that opens the message in Gmail.</li>
          </ul>
        </Section>

        <Section title="How We Use Information">
          <p>Panelia uses your information to provide and improve user-facing app features:</p>
          <ul>
            <li>To authenticate your account and keep your dashboard associated with your user ID.</li>
            <li>To save and sync your dashboard settings, bookmarks, notes, calendar events, uploaded backgrounds, and widget preferences across devices.</li>
            <li>To connect Google Calendar, list your calendars, import recent and upcoming events, and create, update, or delete Google Calendar events when you ask Panelia to sync those changes.</li>
            <li>To show Gmail inbox previews in the email widget. Panelia does not send, modify, or delete Gmail messages.</li>
            <li>To run optional AI-assisted features when you send a message to the Panelia assistant.</li>
            <li>To maintain security, debug errors, prevent abuse, and comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="Google API Limited Use">
          <p>
            Panelia's use and transfer to any other app of information received from Google
            APIs will adhere to the Google API Services User Data Policy, including the
            Limited Use requirements.
          </p>
          <p>
            Panelia does not sell Google user data, use Google user data for advertising,
            use Google user data for retargeting or interest-based ads, use Google user
            data to determine credit-worthiness or lending eligibility, or use Google user
            data to train AI models.
          </p>
        </Section>

        <Section title="How We Share Information">
          <p>
            We do not sell your personal information or Google user data. We share
            information only when needed to provide Panelia, protect the app, or comply
            with the law. Service providers may include:
          </p>
          <ul>
            <li>Google Firebase and Google Cloud services for authentication, hosting, database storage, file storage, and backend hosting.</li>
            <li>Google APIs when you connect Google Calendar, Gmail, or Google sign-in features.</li>
            <li>Microsoft APIs when you connect the optional Outlook email integration.</li>
            <li>OpenAI API services when you use Panelia's optional AI assistant. Relevant user messages, recent chat history, and app data needed to complete your request may be processed for that user-facing feature.</li>
          </ul>
        </Section>

        <Section title="Storage and Security">
          <p>
            Panelia stores user data in Firebase Firestore and Firebase Storage under
            user-specific paths. OAuth tokens are stored server-side and are used only to
            operate the integrations you connect. Data is protected in transit with HTTPS,
            and Firebase security rules restrict access to authenticated users and their
            own user data where applicable.
          </p>
        </Section>

        <Section title="Retention and Deletion">
          <p>
            Panelia keeps your account data and dashboard data while your account is active
            or while needed to provide the app. Google Calendar and Gmail OAuth connection
            data is deleted when you disconnect the relevant integration in Panelia.
            Some Google Calendar event copies may remain in your Panelia dashboard until
            you delete them or request deletion.
          </p>
          <p>
            You can request deletion of your Panelia account data, stored dashboard data,
            uploaded background files, and integration data by contacting {privacyContact}.
            We will delete or anonymize requested data unless we must keep it for security,
            fraud prevention, legal compliance, or legitimate operational needs.
          </p>
        </Section>

        <Section title="Your Choices">
          <ul>
            <li>You can use Panelia without connecting Google Calendar or Gmail.</li>
            <li>You can disconnect Google Calendar or Gmail from inside Panelia.</li>
            <li>You can revoke Panelia's Google access from your Google Account permissions page.</li>
            <li>You can delete dashboard items such as notes, bookmarks, widgets, and events in the app.</li>
          </ul>
        </Section>

        <Section title="Children">
          <p>
            Panelia is not directed to children under 13, and we do not knowingly collect
            personal information from children under 13.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update this policy when Panelia changes. If we change how Panelia uses
            Google user data, we will update this policy and ask users to consent where
            required before using Google user data in a new way.
          </p>
        </Section>
      </article>
    </main>
  );
}
