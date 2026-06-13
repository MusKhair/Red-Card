export function TermsContent() {
  return (
    <div className="flex flex-col gap-5 text-sm leading-relaxed text-chalk-dim">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-chalk">
          Red Card — Terms &amp; Conditions
        </h2>
        <p className="mt-2">By using Red Card, you agree to the following:</p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">1. This app is for fun among friends</h3>
        <p className="mt-1">
          Red Card is a friend-group sweepstakes app for the World Cup. Predictions, forfeits, and group
          leaderboards are entertainment, not legal contracts or betting agreements.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">2. You do forfeits at your own risk</h3>
        <p className="mt-1">
          Forfeits — especially Tier 2 and Tier 3 — may involve physical discomfort, public embarrassment, or other
          consequences. You voluntarily choose to participate. You are responsible for your own safety and for not
          doing anything dangerous, illegal, or harmful.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">3. Tier 3 is 18+ only</h3>
        <p className="mt-1">
          Extreme forfeits (Tier 3) are for adults 18 or older. If you are under 18, you may only participate in
          Tier 1 and Tier 2 forfeits.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">4. No illegal or harmful content</h3>
        <p className="mt-1">Do not propose, vote for, or perform forfeits that:</p>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
          <li>Are illegal in your jurisdiction</li>
          <li>Involve non-consenting third parties</li>
          <li>Cause real injury or permanent harm</li>
          <li>Are sexual in nature or involve minors</li>
          <li>Disclose private information about others (doxxing)</li>
          <li>Cause property damage</li>
        </ul>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">5. Do your own forfeit — don&apos;t force others</h3>
        <p className="mt-1">
          You can veto your own forfeit (one veto per tournament). You cannot force someone else to do theirs.
          Disputes are resolved by the group host.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">6. The group host decides</h3>
        <p className="mt-1">
          Your group host marks forfeits complete and resolves disagreements. By joining a group you accept the
          host&apos;s decisions.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">7. We are not liable</h3>
        <p className="mt-1">
          The Red Card app, its owners, and contributors are not liable for any harm, loss, embarrassment, injury,
          property damage, or other consequence arising from your use of this app. You play at your own risk.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">8. You can leave anytime</h3>
        <p className="mt-1">
          You can leave any group at any time. You can delete your account by contacting the host. Your data is
          stored privately and not shared outside your groups.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">9. No recording or sharing without consent</h3>
        <p className="mt-1">
          If you record video of a forfeit, do not share it publicly without the consent of everyone in the video.
          The &quot;group chat&quot; referenced in proof requirements means YOUR private group chat, not public
          social media.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg uppercase tracking-wide text-chalk">10. This is a hobby project</h3>
        <p className="mt-1">
          Red Card is built and maintained as a personal project. There is no warranty, no service guarantee, and
          no commercial support. The app may go offline or change at any time.
        </p>
      </div>

      <p className="text-chalk">
        By tapping &quot;I agree&quot; you confirm you understand all of the above and you accept the risks.
      </p>
    </div>
  );
}
