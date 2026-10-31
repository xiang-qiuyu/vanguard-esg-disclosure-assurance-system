# ESG Disclosure Assurance System

A Vanguard-inspired academic prototype built with Next.js, React and TypeScript. It demonstrates ESG disclosure review, automated discrepancy checks and decision history using illustrative evidence and simulated roles.

## Run locally

Install the dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

## Review workflow

**Product Management → Disclosure Team → Product Strategy → Risk / Compliance → Approved**

| Status | Current action owner |
| --- | --- |
| Draft | Product Management |
| Pending Disclosure Review | Disclosure Team |
| Pending Product Strategy Verification | Product Strategy |
| Pending Risk/Compliance Review | Risk / Compliance Team |
| Approved | Review complete |

1. **Product Management** creates the Draft and selects **Send to Disclosure Team**. The current disclosure wording is displayed as a read-only quote.
2. **Disclosure Team** prepares the Bloomberg and MSCI supporting evidence. Under **Disclosure Team Check**, it completes **Product Disclosure Statement Check**, **Website check** and **Marketing material check**, saves the evidence, then accepts or rejects the assessment with a comment.
3. **Product Strategy** selects **Run Verification**, reviews the discrepancy result, and considers screening methodology, issuer coverage, exclusions and limitations. A passing result and a decision comment are required to accept and send the assessment to Risk / Compliance.
4. **Risk / Compliance Team** performs the final review. Accept marks the assessment **Approved**; Reject returns it to Product Management as **Draft**.

Rejecting at any review stage returns the assessment to Draft. Resubmission restarts the sequence, requiring Disclosure Team evidence confirmation and a fresh Product Strategy verification run.

**Internal Audit** provides separate independent assurance through the read-only Review History. It does not participate in management approvals.

## Try the prototype

Use the **Simulated role** selector to move between departments. There is no user selector or manual reviewer assignment.

The initial claim states that all securities are screened. The illustrative evidence includes GOV-001, which is in the Fund but has no available MSCI research and is not screened. Running verification identifies that discrepancy and blocks acceptance.

Reject the assessment as Product Strategy with a comment. As Product Management, select **Apply predefined amendment** to qualify the screening scope, then send it back to Disclosure Team. Reconfirm the evidence and wording checks, accept, and run verification again as Product Strategy. The qualified wording passes the prototype rules and can proceed to Risk / Compliance.

## Controls and display

- Only Product Management can edit the assessment Draft. Submitted assessment content is locked.
- Only Disclosure Team can edit supporting evidence during Disclosure Review. The evidence locks when it moves to Product Strategy.
- Only the responsible role can act at the current stage. Self-approval is blocked.
- Comments are required for submission, acceptance and rejection. Required evidence and wording checks must be complete before Disclosure Team can accept.
- Accept/Approve buttons are green; Reject buttons are red.
- Status colours are grey for Draft, amber for Disclosure Review, blue for Product Strategy Verification, purple for Risk/Compliance Review and green for Approved.
- Review History retains decision comments, evidence snapshots and verification results.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Create the production build |
| `npm start` | Serve the production build |

## Prototype scope

All evidence is illustrative, not live Bloomberg or MSCI data. Verification checks one example security under simplified rules and does not establish full regulatory compliance. Website and marketing checks are recorded as simulated review notes.

Data is saved only in this browser. **Reset Demo** clears the local assessments and history. Roles and identities are simulated; the app has no authentication, server-side authorization or tamper-proof audit storage.
