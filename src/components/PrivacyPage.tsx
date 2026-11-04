import { ArrowLeft, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import privacyConfig from "../../privacy.config.json";
import privacyMarkdown from "../../PRIVACY.md?raw";

const privacyValues: Record<string, string> = {
  SUPABASE_REGION: privacyConfig.supabaseRegion,
  DEPLOYMENT_ENVIRONMENT: privacyConfig.deploymentEnvironment,
  RETENTION_PERIOD: privacyConfig.retentionPeriod,
  CONTACT_NAME: privacyConfig.contactName,
  ORGANIZATION_NAME: privacyConfig.organizationName,
  CONTACT_EMAIL: privacyConfig.contactEmail,
  UPDATED_DATE: privacyConfig.updatedDate,
};

const privacyContent = privacyMarkdown.replace(
  /\{\{([A-Z_]+)\}\}/g,
  (placeholder, key: string) => privacyValues[key] ?? placeholder,
);

export function PrivacyPage() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <MessageSquare size={21} />
          </span>
          Q<span className="brand-light">Board</span>
        </Link>
        <Link className="header-link" to="/">
          <ArrowLeft size={15} />
          Question board
        </Link>
      </header>
      <main className="privacy-main">
        <article className="privacy-document">
          <ReactMarkdown>{privacyContent}</ReactMarkdown>
        </article>
      </main>
      <footer className="site-footer">
        <span>
          <MessageSquare size={15} />
          Questions and discussion
        </span>
        <Link className="footer-privacy-link" to="/">
          Return to question board
        </Link>
      </footer>
    </>
  );
}