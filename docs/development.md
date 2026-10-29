# Developer guide

How to set up, change, test and release the model.

## Setup

Clone the repository, then:

```sh
npm install          # install dev dependencies
npm test             # run the tests
npx vitest run -u    # re-record the pinned results after a deliberate change
npm run build        # build dist
```

## Where to make a change

| Change | Here |
| --- | --- |
| A rate, fee, cost or other constant | `src/calculations/calc-shared.ts` |
| A step of one pathway's calculations | That pathway's `src/calculations/calc-*.ts` |
| How a real parcel's height or FAR is set | `src/parcels.ts` (`pathwayEnvelope`) |
| A default assumption | `src/parcels.ts` (`DEFAULT_INPUTS`) |
| The feasibility verdict | `src/feasibility.ts` |

Remember the historical ids: `bill6` is the Standard (post Ord. 26-7) pathway and `standard` is the pre-Ord. 26-7 pathway.

UHERO's Housing Policy Simulator runs on this package, so a model change is made here and reaches the simulator when a new version is published.

## Keeping the Project View and Citywide View in agreement

Both views run the same calculations; the Citywide View only supplies each parcel's envelope. In this package `calcSingle` is the Project View and `calcParcel` is the Citywide View. After a change, the same inputs must give the same result in both: check a few cases by putting a parcel's envelope (height, FAR and, for TOD, the tier) into `calcSingle` and comparing the outputs with `calcParcel`. TOD keeps a stricter check: the Project View builds its TOD envelope with the Citywide View's own `todEnvelope`.

## Tests

The tests are in `test/`:

- **`model.test.ts`** pins every output of the model for each pathway: its defaults, scenarios that exercise its branches (grants, the Bill 7 tax exemption, park dedication, retail, impact fees, financing, the envelope), and a sample of Oahu parcels (every zone, with the smallest, median and largest lot and the tallest height). It also checks rules that must hold whatever the numbers. For example, the same inputs give the same outputs, inputs are never modified, unit counts are whole and consistent, and policy rules such as Bill 7's 60 ft cap, its park waiver and the TOD permit tiers.
- **`calculator.test.ts`** runs single hypothetical lots through `calcSingle` (`test/data/calculator-defaults.json`): each pathway's defaults, with retail on and off and under each TOD regime and tier. It checks the Article 6 parking defaults, and that the FAR and height match what `pathwayEnvelope` gives the same lot.
- **`gauge.test.ts`** runs 287 Oahu parcels through `calcParcel` (`test/data/gauge-parcels.json`), including TOD parcels in every regime, station area and industrial district, PD-T parcels with bonus heights, and parcels with and without the parking exemption. It pins the per-parcel results and totals, and checks the rules on every parcel: exempt parcels build no stalls and the rest the legal minimum, bicycle parking outside industrial zones, no loading on lots of 7,500 sqft or less, the PD-T 40 ft front strip, the IMX-1 unit cap, and the TOD status of industrial land.

Any change that moves a result fails the snapshot tests, on purpose. If the change is intended, run `npx vitest run -u`, review the snapshot diff in git, and commit it with the change.

## Commits and releases

Releases are automated with [release-please](https://github.com/googleapis/release-please). It reads the commit messages on `main` and opens a release PR that bumps the version in `package.json` and updates `CHANGELOG.md`. Merging that PR creates the GitHub Release and publishes the package to npm. Don't bump the version by hand.

For this to work, write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) format: `type: short description`.

| Prefix | Use for | Release |
| --- | --- | --- |
| `fix:` | a bug fix | patch (0.2.0 → 0.2.1) |
| `feat:` | a new feature | minor (0.2.0 → 0.3.0) |
| `feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer | a change that breaks existing users | major (0.2.0 → 1.0.0) |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:` | everything else | no release on their own |

Examples: `feat: add pre-construction premiums`, `fix: correct the Bill 7 height cap`.

- The bump is the highest level among the commits since the last release. Messages with no prefix are ignored, so they never trigger a release.
- If a PR is squash-merged, the PR title becomes the commit message on `main`, so give the PR title the prefix.
- Before version 1.0.0, release-please bumps more conservatively: a breaking change gives a minor bump and a `feat:` gives a patch bump.
- To force a specific version, add `Release-As: 1.0.0` as a footer in a commit message.

## Checks before a commit

- `npm test` passes, and any snapshot changes are intended.
- The Project View and Citywide View agree on the cases you changed.
- For model changes, sanity checks still hold: more parking never gives more units, a building never exceeds its height or FAR, and the required stalls always fit.
