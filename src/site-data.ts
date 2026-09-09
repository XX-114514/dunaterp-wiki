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
  { label: "Dry Lab", items: [["Model", "/model"], ["Hardware", "/hardware"], ["Alternative Platform", "/alternative-platform"], ["Contribution", "/contribution"]] },
  { label: "Human Practices", items: [["Human Practices", "/human-practices"], ["Sustainability", "/sustainability"], ["Education", "/education"]] },
  { label: "People", items: [["Team", "/team"], ["Attributions", "/attributions"], ["Responsible AI", "/responsible-ai"]] },
];

export const pages: Record<string, WikiPage> = {
  "project-description": {
    title: "A chassis shaped by salt",
    eyebrow: "Project description",
    intro: "DunaTerp explores how the salt-adapted microalga Dunaliella salina can become a modular platform for high-value terpenoid ingredients. Our design connects native precursor metabolism, light-responsive regulation and separate downstream product branches.",
    status: "team-draft",
    sections: [
      { eyebrow: "The idea", title: "Start from a natural hub", body: "Our design places β-carotene at the centre of the platform. Rather than treating every target as a separate pathway, we aim to enlarge and stabilise a shared precursor pool, then route it through product-specific downstream enzymes." },
      { eyebrow: "Four product lines", title: "One hub, four destinations", body: "The repository explores four candidate product routes. Each is intended for a separately cultivated strain; this does not mean that four engineered production strains have been established.", items: ["Astaxanthin via ketolation and hydroxylation", "β-ionone via CCD1 cleavage", "Crocetin through a zeaxanthin-derived branch; crocin would require additional glycosylation", "β-citraurin through a zeaxanthin-cleavage branch"], note: "Product choices, enzyme sources and construct details must be checked against the team's final design before Wiki Freeze." },
      { eyebrow: "Platform strategy", title: "Connect the cell to the cultivation system", body: "The proposed platform combines the native plastid MEP pathway with transcription-factor-mediated regulation, chloroplast-targeted expression elements and coordinated light and salt conditions. A flat-panel airlift reactor concept connects these cellular design questions to mixing and illumination. Each module requires its own validation; combining them on a diagram does not demonstrate a functioning production platform." },
      { eyebrow: "Application", title: "Ingredients are the goal, validation is the next step", body: "Astaxanthin, β-ionone and crocetin motivate the platform through their pigment or aroma applications. The repository also explores β-citraurin as a fourth branch. Food use, productivity and environmental benefits are intended applications, not established properties of the engineered strains. They require product characterisation and an assessment of the complete production process." },
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
      { title: "Transcriptomics workflow", body: "The project draft describes normalisation, PCA, differential-expression analysis, homology mapping, domain analysis and motif screening across light-intensity and light-quality axes. This website repository does not include the underlying analysis scripts or raw data; link the versioned workflow before claiming reproducibility." },
      { title: "Modelling workflow", body: "The model draft describes a cascade ODE model, downstream branch-allocation simulations, sensitivity analysis and a flux-balance workflow. The underlying computational workspace is not included in this website repository. Final publication must link every figure to the exact script, input data and parameter table that produced it." },
    ],
  },
  results: {
    title: "Evidence, with its limits visible", eyebrow: "Results", intro: "This draft separates observed computational results, model-dependent predictions and measurements that still need to be made.", status: "team-draft",
    figure: { src: "/figures/light-intensity-pca.png", alt: "PCA, normalisation factors and expression distributions for the light-intensity transcriptomics dataset", caption: "Existing team analysis of the light-intensity transcriptomics dataset. Verify final labels, source citation and statistical methods before publication." },
    sections: [
      { title: "A light response to investigate", body: "In the current light-intensity analysis, the 600 µmol photons·m⁻²·s⁻¹ condition occupies a distinct transcriptomic state. A distinct expression profile alone does not establish an optimal cultivation condition or higher product yield. The source dataset, replicate structure and downstream measurements must be checked before drawing those conclusions." },
      { title: "A candidate regulator, not a finished claim", body: "Dusal.0223s00023 is named in the existing project draft as a testable light-intensity candidate because expression evidence can be paired with a homologous DNA-binding matrix. The causal direction remains to be tested by perturbation." },
      { title: "Report uncertainty as part of the result", body: "The light-quality dataset required re-quantification against a reference genome after an identifier mismatch was found in archived files. Mapping-rate differences and their effect on detection power must remain visible in the final narrative." },
    ],
  },
  model: {
    title: "From promoter sequence to product choice", eyebrow: "Best Model · standard URL", intro: "Three linked layers ask where control moves as the platform is pushed: expression, branch kinetics and network capacity.", status: "team-draft",
    figure: { src: "/figures/branch-allocation.png", alt: "Model figure showing carotenoid pool allocation, pathway crosstalk and branch selectivity", caption: "Existing team-generated model output. Parameters and validation status must accompany this figure in the final Wiki." },
    sections: [
      { eyebrow: "Layer 01", title: "Expression cascade", body: "An ODE cascade links promoter input to LCYB mRNA, active enzyme, lycopene, the β-carotene hub, zeaxanthin and four candidate product fluxes. The model is designed to expose the point where increased expression stops producing a meaningful gain." },
      { eyebrow: "Layer 02", title: "Branch allocation", body: "Michaelis–Menten branches describe competition for β-carotene and zeaxanthin. The current topology explores whether endogenous BCH would require opposite tuning for β-carotene-consuming and zeaxanthin-consuming product strains." },
      { eyebrow: "Layer 03", title: "Network capacity", body: "Flux-balance analysis tests growth–product trade-offs and audits conflicting bounds in a published carbon-core model. Model outputs are not experimental evidence and must remain labelled as predictions." },
    ],
  },
  hardware: {
    title: "Bring light into the culture", eyebrow: "Hardware · cultivation concept", intro: "A flat-panel airlift reactor concept supports the DunaTerp cultivation strategy by bringing illumination, circulation and gas exchange into one design.", status: "team-draft",
    sections: [
      { title: "The cultivation problem", body: "As algal biomass accumulates, cells shade one another and experience different light environments. Reactor geometry and circulation therefore matter alongside light-responsive gene regulation. The hardware is intended to help study these interactions, rather than guarantee a higher product yield." },
      { title: "Two communicating chambers", body: "The proposed flat-panel design uses communicating chambers to organise circulation. Gas-driven density differences can move culture through a rising and a returning region. The flat geometry is intended to shorten the light path; actual illumination uniformity and circulation must be measured on the built device." },
      { title: "What would establish performance?", body: "Compare the device with a defined reference system and record geometry, illumination distribution, mixing, gas exchange, temperature, energy demand and culture performance. Report biological growth and product measurements separately from engineering observations.", items: ["Link the final drawings and bill of materials to the built revision.", "Record repeat measurements and the uncertainty of each comparison.", "Document cleaning, material compatibility and physical containment."], note: "Concept summary based on the project brief. No fabrication record or validated reactor performance is supplied in this repository." },
    ],
  },
  contribution: {
    title: "Leave a map for the next team", eyebrow: "Bronze contribution · standard URL", intro: "Candidate contributions described in the project draft are organised here for the team to validate, document and release with their underlying files.", status: "team-draft",
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
      { title: "Why this chassis", body: "The platform concept starts from native carotenoid metabolism. Dunaliella lacks a rigid cellulose wall, but whether this simplifies extraction or genetic delivery in our system requires direct evidence." },
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
      { title: "Explore the salt-lake field station", body: "The homepage includes three fictional research guides and interactive exercises on pathway order, product branches and the difference between evidence and a design claim. These are simplified learning activities, not laboratory simulations. Visitors can retry freely and keep a completion record on their own device. Learning impact has not yet been evaluated." },
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
      { title: "Pixel exploration and learning activities", body: "The active homepage uses the repository’s original Canvas pixel world, extended with fictional NPC guides and educational games. The characters do not represent team members or stakeholder testimony. Stardew Valley is a stylistic reference; no game assets, characters, music or dialogue are redistributed." },
      { title: "Earlier website physics and interaction", body: "The retained, inactive 3D implementation’s Rapier physics world, contact-force event loop, dynamic object synchronisation and damped follow-camera in DunaTerp are adapted from Bruno Simon's Folio 2025 under the MIT License. The scroll-constrained route, Dunaliella geometry, scientific landmarks, text and interface are project-specific; no Folio models, artwork, audio or textures are redistributed. Full notice: THIRD_PARTY_NOTICES.md in the Wiki repository." },
    ],
  },
  "responsible-ai": {
    title: "Responsible AI use", eyebrow: "Authorship & integrity", intro: "A transparent record of where AI assisted the team, what it did not produce and how humans reviewed the output.", status: "team-draft",
    sections: [
      { title: "Model used", body: "OpenAI Codex (GPT-5 family) was used on 15 August 2026 to scaffold website code, organise navigation, create procedural Three.js geometry, improve interface copy and draft clearly marked content structures from team-authored local reports." },
      { title: "September 2026 website revision", body: "On 9 September 2026, OpenAI Codex coordinated a code and content review with GPT-5.6 Luna subtasks for NPC learning activities, input handling and navigation review. AI assisted with code, fictional guide dialogue and educational questions. Completion badges record in-browser activity only. Human review of this revision is pending." },
      { title: "Boundaries", body: "AI was not used to generate experimental data, data figures, microscopy, simulated experimental evidence, quotations or citations. Existing scientific figures shown in this prototype were produced by the project's analysis scripts and remain subject to team verification." },
      { title: "Human review", body: "Review is pending. Before publication, named team members must verify every scientific statement against source data, confirm every citation, rerun the build and analysis code, approve alt text and sign off this disclosure." },
    ],
  },
};

export const pageOrder = Object.keys(pages);
