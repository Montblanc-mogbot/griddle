# UI library candidates (future polish)

We should eventually adopt a component library to standardize styling, spacing, inputs, dialogs/drawers, etc.

## Candidates

### Mantine
- Pros: modern defaults, good theming, excellent form components, easy polish.
- Cons: additional dependency surface; some opinionated patterns.

### Chakra UI
- Pros: ergonomic components, good accessibility defaults, strong community.
- Cons: styling approach can lead to prop-heavy markup.

### MUI (Material UI)
- Pros: very comprehensive, mature, tons of components.
- Cons: heavier visual opinion; customization can be more effort.

## Recommendation (tentative)
Mantine is likely best for a fast, polished "internal tool" feel with minimal custom CSS.

## Timing
Not required for core data/pivot correctness. Adopt after import/export + basic record workflows are stable.
