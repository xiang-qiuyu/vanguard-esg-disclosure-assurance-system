# vanguard-esg-disclosure-assurance-system

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_4OoH6yi0qpShm1cxY22CvnPIcYWD)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Assessment workflow

Product Management creates and edits the assessment Draft, then sends it to Disclosure Team with a comment. Disclosure Team prepares the supporting Bloomberg and MSCI evidence and checks proposed wording consistency across the PDS, website and marketing material. In this prototype it fills the Supporting evidence form and records a short check for each material. Complete evidence and all three wording checks are required before it can Accept and send the assessment to Product Strategy.

Product Strategy then verifies screening methodology, issuer coverage, exclusions and limitations. It uses Run Verification against the evidence prepared by Disclosure Team, reviews the discrepancy result, then Accepts or Rejects with a comment. A passing result sends the assessment directly to Risk / Compliance for final review. The tool checks one illustrative security under simplified rules; broader technical review is recorded in the decision comment. Assessment content remains locked after submission; only Disclosure Team can edit supporting evidence at its review stage. Reviews route automatically to the responsible role at each stage:

| Status | Current action owner |
| --- | --- |
| Draft | Product Management |
| Pending Disclosure Review | Disclosure Team |
| Pending Product Strategy Verification | Product Strategy |
| Pending Risk/Compliance Review | Risk / Compliance Team |
| Approved | Review complete |

Reject returns the assessment to its Product Management draft owner. Resubmission restarts the entire review sequence. Unresolved evidence discrepancies block acceptance, and submitters cannot review or approve their own submissions. Internal Audit (LOD 3) independently inspects the records through separate assurance activities and has no management approval actions.

The evidence form includes Disclosure Team Check with Product Disclosure Statement Check, Website check and Marketing material check. Status badges use grey for Draft, amber for Disclosure Review, blue for Product Strategy Verification, purple for Risk/Compliance Review and green for Approved, consistently across the app.

Use the simulated role selector to move through the workflow. No user selection or manual reviewer assignment is needed. Create the Draft as Product Management and use Send to Disclosure Team. Switch to Disclosure Team to fill Supporting evidence, record the three wording checks and Accept. Switch to Product Strategy and use Run Verification, review its result, then Accept or Reject. Current disclosure wording is displayed as a read-only quote. To exercise a discrepancy return, run verification on the initial “all securities” wording, reject it as Product Strategy, and use Apply predefined amendment under Your actions as Product Management before resubmitting. Every resubmission returns to Disclosure Team first, then requires a fresh Product Strategy verification run.

Decision history shows the acting role, comment, assessment details and evidence snapshots. Saved assessments at the removed approval stage move directly to Risk / Compliance, with earlier history retained. Version 5 active assessments retain their history and prepared evidence but route back to Disclosure Team to follow the new order. Version 4 browser data retains its history but resets to Draft to require the new approval chain.

This remains a browser-local academic prototype with simulated identities and no authentication or server-side authorization. These controls demonstrate workflow behavior; production enforcement requires authenticated identities, server-side permission checks and durable audit records.

Run `npm test`, `npm run typecheck` and `npm run build` to validate changes.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
