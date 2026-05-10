import React from 'react';
import Footer from '../components/Common/Footer';

const PrivacyPage = () => (
  <>
    <div className="min-h-screen aumo-bg-page pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto rounded-2xl p-6 sm:p-8 border aumo-border aumo-bg-surface
                      space-y-4 aumo-text-muted text-sm leading-relaxed">
        <h1 className="text-2xl font-bold aumo-text-primary">Privacy Policy</h1>
        <p className="aumo-text-subtle">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">What we collect</h2>
        <p>
          AUMO stores the minimum data needed to operate the service: your name, email, optional mobile number,
          chosen vehicle type, and the routes you calculate. When you start a trip, we record GPS waypoints
          while tracking is active so we can detect deviations and surface live progress.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">How we use it</h2>
        <p>
          Your data powers your own dashboard, the leaderboard (which surfaces your name and green score
          publicly), and carpool matching. Email and mobile are never shown to other users — only your name,
          avatar, vehicle type, and green score are visible to potential carpool partners.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Chat &amp; auto-deletion</h2>
        <p>
          In-app chat messages between carpool participants automatically delete 24 hours after the scheduled
          ride departure. We don't store contact info you share manually in chat — that's your decision.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Third parties</h2>
        <p>
          AUMO uses OpenStreetMap data (Nominatim, Overpass), TomTom Traffic for live conditions, and Brevo
          for transactional email (verification codes). No advertising or behavioural-tracking partners are
          embedded.
        </p>

        <h2 className="text-base font-semibold aumo-text-primary pt-2">Your rights</h2>
        <p>
          You can edit your profile, delete your account, or request data export by emailing the team
          (see footer). Account deletion deactivates the user record and severs new ride creation.
        </p>
      </div>
    </div>
    <Footer />
  </>
);

export default PrivacyPage;
