export type WikiSection = {
  title: string;
  body: string;
  eyebrow?: string;
  items?: string[];
  note?: string;
};

export type WikiPage = {
  title: string;
  eyebrow: string;
  intro: string;
  status: "team-draft" | "structure-only" | "review-ready";
  sections: WikiSection[];
  figure?: { src: string; alt: string; caption: string };
};

export const navigation: Array<{ label: string; items: ReadonlyArray<readonly [string, string]> }> = [
  { label: "Wet Lab", items: [["Description", "/project-description"], ["Engineering", "/engineering"], ["Experiments", "/experiments"], ["Results", "/results"], ["Safety", "/safety-and-security"]] },
  { label: "Dry Lab", items: [["Model", "/model"], ["Alternative Platform", "/alternative-platform"], ["Contribution", "/contribution"]] },
  { label: "Human Practices", items: [["Human Practices", "/human-practices"], ["Sustainability", "/sustainability"], ["Education", "/education"]] },
  { label: "People", items: [["Team", "/team"], ["Attributions", "/attributions"], ["Responsible AI", "/responsible-ai"]] },
];

export const pages: Record<string, WikiPage> = {
  "project-description": {
    title: "A chassis shaped by salt",
    eyebrow: "Project description",
    intro: "DunaTerp is a proposed modular terpene and carotenoid-derivative platform built around Dunaliella salina and its native β-carotene metabolism.",
    status: "team-draft",
    sections: [
      { eyebrow: "The idea", title: "Start from a natural hub", body: "Our design places β-carotene at the centre of the platform. Rather than treating every target as a separate pathway, we aim to enlarge and stabilise a shared precursor pool, then route it through product-specific downstream enzymes." },
      { eyebrow: "Four product lines", title: "One hub, four destinations", body: "The current design space covers four independently cultivated engineering strains, not a single strain switching between products.", items: ["Astaxanthin via ketolation and hydroxylation", "β-ionone via CCD1 cleavage", "Crocin / crocetin through a zeaxanthin-derived branch", "β-citraurin through a zeaxanthin-cleavage branch"], note: "Product choices, enzyme sources and construct details must be checked against the team's final design before Wiki Freeze." },
      { eyebrow: "Shared control point", title: "LCYB at the branch", body: "Lycopene β-cyclase sits at the point that directs lycopene toward the β-carotene hub. Transcriptomics is being used to identify candidate light-responsive regulators, while modelling asks when increasing LCYB still produces a useful gain and when precursor supply becomes limiting." },
    ],
  },
  engineering: {
    title: "Design is a loop, not a line", eyebrow: "Engineering success · standard URL", intro: "This page is structured around Design → Build → Test → Learn so judges can follow each iteration without hunting through the site.", status: "structure-only",
    sections: [
      { eyebrow: "Iteration 01", title: "Identify the controllable bottleneck", body: "The initial design treated LCYB expression as the shared lever for all downstream products. Transcriptome analysis and a cascade model were used to test whether this lever remains informative across the expected operating range." },
      { eyebrow: "What we learned so far", title: "More enzyme is not always more product", body: "The current model draft predicts a transition from enzyme limitation to precursor limitation. This computational result is a design hypothesis; experimental validation and the team's interpretation must be added here before it can support an engineering-success claim." },
      { eyebrow: "Team evidence required", title: "Complete the biological cycle", body: "Add construct maps, build records, controls, raw measurements, failed attempts, analysis code and the exact design change made after testing.", items: ["Design rationale", "Build evidence", "Test protocol and controls", "Learned change for the next cycle"] },
    ],
  },
  experiments: {
    title: "Make every step reproducible", eyebrow: "Experiments", intro: "A protocol-first home for wet-lab work, computational workflows, controls and raw-data provenance.", status: "structure-only",
    sections: [
      { title: "Wet-lab protocols", body: "Team input required: document strain handling, culture conditions, construct assembly, transformation, validation, product extraction and analytical measurements. Include dates, versions, controls and deviations from published protocols." },
      { title: "Transcriptomics workflow", body: "The project workspace contains workflows for normalisation, PCA, differential-expression analysis, homology mapping, domain analysis and motif screening across light-intensity and light-quality axes." },
      { title: "Modelling workflow", body: "The modelling workspace contains a cascade ODE model, downstream branch-allocation simulations, sensitivity analysis and a repaired flux-balance workflow. Final publication must link every figure to the exact script, input data and parameter table that produced it." },
    ],
  },
  results: {
    title: "Evidence, with its limits visible", eyebrow: "Results", intro: "This draft separates observed computational results, model-dependent predictions and measurements that still need to be made.", status: "team-draft",
    figure: { src: "/figures/light-intensity-pca.png", alt: "PCA, normalisation factors and expression distributions for the light-intensity transcriptomics dataset", caption: "Existing team analysis of the light-intensity transcriptomics dataset. Verify final labels, source citation and statistical methods before publication." },
    sections: [
      { title: "Light response is not simply monotonic", body: "In the current light-intensity analysis, the 600 µmol photons·m⁻²·s⁻¹ condition occupies a distinct transcriptomic state. This suggests that the most informative operating point may be intermediate rather than maximal light intensity." },
      { title: "A candidate regulator, not a finished claim", body: "Dusal.0223s00023 is prioritised in the local report as a testable light-intensity candidate because expression evidence can be paired with a homologous DNA-binding matrix. The causal direction remains to be tested by perturbation." },
      { title: "Report uncertainty as part of the result", body: "The light-quality dataset required re-quantification against a reference genome after an identifier mismatch was found in archived files. Mapping-rate differences and their effect on detection power must remain visible in the final narrative." },
    ],
  },
  model: {
    title: "From promoter sequence to product choice", eyebrow: "Best Model · standard URL", intro: "Three linked layers ask where control moves as the platform is pushed: expression, branch kinetics and network capacity.", status: "team-draft",
    figure: { src: "/figures/branch-allocation.png", alt: "Model figure showing carotenoid pool allocation, pathway crosstalk and branch selectivity", caption: "Existing team-generated model output. Parameters and validation status must accompany this figure in the final Wiki." },
    sections: [
      { eyebrow: "Layer 01", title: "Expression cascade", body: "An ODE cascade links promoter input to LCYB mRNA, active enzyme, lycopene, the β-carotene hub, zeaxanthin and four product fluxes. The model is designed to expose the point where increased expression stops producing a meaningful gain." },
      { eyebrow: "Layer 02", title: "Branch allocation", body: "Michaelis–Menten branches describe competition for β-carotene and zeaxanthin. The current topology predicts that endogenous BCH should be tuned in opposite directions for β-carotene-consuming and zeaxanthin-consuming product strains." },
      { eyebrow: "Layer 03", title: "Network capacity", body: "Flux-balance analysis tests growth–product trade-offs and audits conflicting bounds in a published carbon-core model. Model outputs are not experimental evidence and must remain labelled as predictions." },
    ],
  },
  contribution: {
    title: "Leave a map for the next team", eyebrow: "Bronze contribution · standard URL", intro: "Candidate contributions already present in the workspace are organised here for the team to validate, document and release.", status: "team-draft",
    sections: [
      { title: "A reproducible transcriptomics trail", body: "The project records how an archived expression matrix and sequence file were found to use incompatible identifier spaces, then documents a re-quantification route from raw reads. This troubleshooting trail may help teams working with incomplete public algal datasets." },
      { title: "A bound-audit workflow for FBA", body: "The modelling scripts compare published scenario fluxes with workbook and SBML bounds, identify conflicts, repair assumptions transparently and regenerate growth–product analyses." },
      { title: "Release checklist", body: "Before claiming these as contributions, the team should package inputs, environment details, exact commands, expected outputs, licences and a small verification test in the official iGEM GitLab repository." },
    ],
  },
  "human-practices": {
    title: "Let the world reshape the design", eyebrow: "Silver human practices · standard URL", intro: "This is a decision log, not an outreach gallery: each stakeholder conversation should connect to a concrete project change.", status: "structure-only",
    sections: [
      { title: "Map the people affected", body: "Team input required: identify growers, algal bioprocess engineers, downstream processors, potential customers, regulators, environmental experts and local communities. Record why each voice matters." },
      { title: "Capture feedback accurately", body: "Use consented notes or recordings, attribute quotes to real speakers and never invent representative statements. Summarise disagreements as well as consensus." },
      { title: "Close the loop", body: "For every major input, show the before state, what you heard, the design decision and the evidence that the decision was implemented." },
    ],
  },
  "safety-and-security": {
    title: "Containment begins at the design table", eyebrow: "Safety & Security · standard URL", intro: "A structured place for organism, genetic construct, cultivation, product, waste and deployment risks.", status: "structure-only",
    sections: [
      { title: "Risk inventory", body: "Team input required: list chassis strain, donor genes, vectors, selection markers, procedures, hazardous chemicals and the intended scale. Link claims to the approved iGEM Safety Forms." },
      { title: "Open-pond is not automatically safe", body: "The industrial history of Dunaliella cultivation is not a substitute for a project-specific environmental risk assessment. Address escape, persistence, horizontal transfer, monitoring and waste treatment for the actual engineered strains." },
      { title: "Design controls", body: "Document physical containment, biological safeguards, operating limits, incident response and who verified each measure." },
    ],
  },
  "alternative-platform": {
    title: "Engineering beyond the usual chassis", eyebrow: "Best Alternative Platform · standard URL", intro: "Dunaliella salina offers an unusual combination of halotolerance, carotenoid accumulation and established outdoor cultivation—but the award depends on engineering evidence.", status: "team-draft",
    sections: [
      { title: "Why this chassis", body: "The platform concept uses native carotenoid metabolism as a starting advantage and the absence of a rigid cellulose wall as a practical feature for extraction and genetic delivery." },
      { title: "What is tightly coupled to it", body: "Light-responsive regulation, plastid-localised MEP metabolism, β-carotene storage and hypersaline cultivation all shape the design; they are not interchangeable details." },
      { title: "Evidence gate", body: "To compete for this award, add direct evidence that the team successfully engineered the chassis, plus failures, transformation constraints and guidance that another team could reproduce." },
    ],
  },
  sustainability: {
    title: "Measure the whole system", eyebrow: "Sustainable Development Impact · standard URL", intro: "A promising photosynthetic platform still needs a life-cycle view, stakeholder input and measurable outcomes.", status: "structure-only",
    sections: [
      { title: "Define the comparison", body: "Team input required: identify the incumbent production route and compare land, water, energy, nutrients, solvents, carbon, waste and product recovery on equivalent functional units." },
      { title: "Avoid one-dimensional claims", body: "Photosynthesis and saline cultivation may offer advantages, but mixing, lighting, harvesting and extraction can dominate impact. Record positive and negative interactions across relevant SDGs." },
      { title: "Set measurable targets", body: "Translate stakeholder feedback into testable thresholds and document the data source, uncertainty and decision it changed." },
    ],
  },
  education: {
    title: "Teach by listening", eyebrow: "Best Education · standard URL", intro: "Education activities should create mutual learning and leave reusable materials, evaluation and reflection.", status: "structure-only",
    sections: [
      { title: "Audience and need", body: "Team input required: define who the activity serves and learn what they already know, need and value before designing materials." },
      { title: "Dialogue, not promotion", body: "Document questions participants raised, how the team responded and what the team learned in return." },
      { title: "Reusable package", body: "Release lesson goals, facilitator notes, accessible materials, licences, feedback instruments and evidence of revision." },
    ],
  },
  team: {
    title: "The people behind DunaTerp", eyebrow: "Team", intro: "Replace these placeholders with roster-accurate portraits, roles and short first-person notes.", status: "structure-only",
    sections: [
      { title: "Student team", body: "Add only members listed on the official team roster. Include the work each person owned and avoid generic role labels." },
      { title: "PIs, instructors and advisors", body: "Describe the guidance they provided without attributing student work to supervisors or vice versa." },
      { title: "Collaborators", body: "Link collaborators to the Attributions Form and record consent for names, portraits and quotations." },
    ],
  },
  attributions: {
    title: "Credit is part of the method", eyebrow: "Attributions", intro: "The official iGEM Attributions Form is authoritative; this page helps readers understand the division of work.", status: "structure-only",
    sections: [
      { title: "Team work", body: "Team input required: record who designed, built, tested, analysed, modelled, documented and reviewed each project component." },
      { title: "External support", body: "Credit facilities, mentors, donated materials, prior teams, software, datasets and every third-party visual with source and licence." },
      { title: "Website physics and interaction", body: "The Rapier physics world, contact-force event loop, dynamic object synchronisation and damped follow-camera in DunaTerp are adapted from Bruno Simon's Folio 2025 under the MIT License. The scroll-constrained route, Dunaliella geometry, scientific landmarks, text and interface are project-specific; no Folio models, artwork, audio or textures are redistributed. Full notice: THIRD_PARTY_NOTICES.md in the Wiki repository." },
    ],
  },
  "responsible-ai": {
    title: "Responsible AI use", eyebrow: "Authorship & integrity", intro: "A transparent record of where AI assisted the team, what it did not produce and how humans reviewed the output.", status: "team-draft",
    sections: [
      { title: "Model used", body: "OpenAI Codex (GPT-5 family) was used on 15 August 2026 to scaffold website code, organise navigation, create procedural Three.js geometry, improve interface copy and draft clearly marked content structures from team-authored local reports." },
      { title: "Boundaries", body: "AI was not used to generate experimental data, data figures, microscopy, simulated experimental evidence, quotations or citations. Existing scientific figures shown in this prototype were produced by the project's analysis scripts and remain subject to team verification." },
      { title: "Human review", body: "Review is pending. Before publication, named team members must verify every scientific statement against source data, confirm every citation, rerun the build and analysis code, approve alt text and sign off this disclosure." },
    ],
  },
};

export const pageOrder = Object.keys(pages);
