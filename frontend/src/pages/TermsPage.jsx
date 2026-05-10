import React from 'react';
import Footer from '../components/Common/Footer';

const TermsPage = () => (
  <>
    <div className="min-h-screen aumo-bg-page pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto rounded-2xl p-6 sm:p-8 border aumo-border aumo-bg-surface
                      space-y-4 aumo-text-muted text-sm leading-relaxed">
        <h1 className="text-2xl font-bold aumo-text-primary">Terms of Service</h1>
        <p className="aumo-text-subtle">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">The short version</h2>
        <p>
          AUMO is provided as-is, free of charge, by a small student team for educational and research
          purposes. Use it sensibly, treat carpool partners with respect, and don't try to break it.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Accounts</h2>
        <p>
          You're responsible for the accuracy of the information you provide and for keeping your account
          credentials secure. One account per person. Block-evasion via duplicate signups is grounds for
          termination.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Carpool conduct</h2>
        <p>
          Carpool matches are facilitation, not endorsement. Verify your ride partner's identity before
          getting in a vehicle. AUMO doesn't run background checks. Sharing contact info inside chat is at
          your own discretion.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Routing accuracy</h2>
        <p>
          Routes, traffic estimates, CO₂ figures, and time/cost savings are best-effort estimates based on
          OpenStreetMap data and the algorithms documented in our research paper. Don't rely on them for
          time-critical or safety-critical decisions.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, AUMO and its team are not liable for any damages arising
          from use of the service, including incorrect routes, missed connections, or interactions with
          other users.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Changes</h2>
        <p>
          We may update these terms as the project evolves. Material changes will be flagged on this page.
        </p>
      </div>
    </div>
    <Footer />
  </>
);

export default TermsPage;
