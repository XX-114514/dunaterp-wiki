import type { WikiPage, WikiSection } from '../site-data';
import type { ContentBlock } from './types';
import tables from './dry-lab-tables.json';

const p = (text: string): ContentBlock => ({ kind: 'paragraph', text });
const h = (text: string): ContentBlock => ({ kind: 'heading', text });
const eq = (label: string, text: string): ContentBlock => ({ kind: 'equation', label, text });
const code = (label: string, text: string): ContentBlock => ({ kind: 'code', label, text });
const fig = (name: string, alt: string, caption: string): ContentBlock => ({ kind: 'figure', src: `/figures/dry-lab/${name}.png`, alt, caption });
const table = (id: keyof typeof tables, caption: string, collapsed = false): ContentBlock => ({ kind: 'table', caption, ...tables[id], collapsed });
const customTable = (caption: string, columns: string[], rows: string[][]): ContentBlock => ({ kind: 'table', caption, columns, rows });
const links = (...entries: [string, string][]): ContentBlock => ({ kind: 'links', links: entries.map(([label, href]) => ({ label, href })) });
const section = (title: string, ...blocks: ContentBlock[]): WikiSection => ({ title, body: '', blocks });

export const dryLabNavigation = [
  ['Transcriptomics', '/transcriptomics'],
  ['Metabolomics', '/metabolomics'],
  ['Protein', '/protein'],
  ['Mathematical Modeling', '/model'],
  ['Hardware', '/hardware'],
] as const;

export const transcriptomics: WikiPage = {
  title: 'Transcriptomics', eyebrow: 'Dry Lab / Transcriptomics', status: 'team-draft',
  intro: 'Light-dependent expression profiles connect carotenoid-pathway enzymes to a ranked set of transcription-factor homologs. Sequence homology and CXC domains provide the accompanying evidence for CPP-family transcripts.',
  sections: [
    section('Data and comparison design',
      p('GSE120965 contains three light intensities—150, 600 and 1500 µmol photons m⁻² s⁻¹—with three biological replicates per condition. GEO provides Readcount and FPKM matrices together with a unigene FASTA file. FPKM values from all nine samples were used to explore light responses and expression patterns; the FASTA sequences were used for pathway and transcription-factor annotation. Readcounts were used for the published 600/150 comparison and for the nine-sample DESeq fit and variance-stabilizing transformation used in coexpression analysis.'),
      links(['GSE120965 · expression matrices and sequences', 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE120965']),
      customTable('Light-intensity experiment', ['PPFD (µmol photons m⁻² s⁻¹)', 'Samples', 'Biological replicates', 'Condition'], [
        ['150','LL1, LL2, LL3','3','low'], ['600','ML1, ML2, ML3','3','medium'], ['1500','HL1, HL2, HL3','3','high'],
      ]),
      p('The three-condition analysis compares 600/150, 1500/150 and 1500/600. The comparison with the paper uses LL1–LL3 and ML1–ML3 only. In each label, the first condition is compared with the second. Count-based fold changes and differences in mean log expression retain the definitions of their respective statistical models.'),
    ),
    section('Expression filtering and sample structure',
      p('The original matrix contains 76,875 expression features. Keeping features with FPKM ≥ 1 in at least three samples leaves 36,411 features. This retains transcripts expressed mainly in one light-intensity group while reducing the contribution of consistently near-zero features.'),
      p('For sample-scale estimation, 0.5 was added to FPKM to give finite logarithms at zero. The geometric mean of each feature across nine samples defines a reference; the median ratio of a sample to that reference defines its scale factor. The pseudocount 0.5 is used only for estimating the scale factor. Normalized FPKM is the original FPKM divided by that factor.'),
      eq('Sample-scale correction', String.raw`\begin{aligned}
G_g &= \exp\!\left[\frac{1}{9}\sum_{j=1}^{9}\ln\!\left(F_{gj}+0.5\right)\right],\\
s_j &= \operatorname{median}_g\!\left(\frac{F_{gj}+0.5}{G_g}\right),\\
x_{gj} &= \log_2\!\left(\frac{F_{gj}}{s_j}+1\right).
\end{aligned}`),
      p('Here F_gj is FPKM for feature g in sample j, s_j is the sample-scale factor, and x_gj is the value used for exploratory tests and plots. This adds a sample-composition correction to the uploaded FPKM before modeling log-expression variance.'),
      customTable('Sample-scale factors', ['Sample', 'Factor'], [['LL1','1.0712'],['LL2','1.0566'],['LL3','1.0034'],['ML1','1.0658'],['ML2','1.1239'],['ML3','1.0694'],['HL1','0.9310'],['HL2','0.8982'],['HL3','0.9307']]),
      p('The factors range from 0.8982 to 1.1239. Expression distributions were inspected after normalization. PCA used the 5,000 retained features with the highest variance, centered each feature, and preserved the differences in feature variance. PC1 and PC2 explain 35.45% and 14.96% of variance, respectively.'),
      fig('06_expression_qc','Sample-scale factors, normalized expression distributions and PCA for nine biological samples.', 'Figure 1. A: median-of-ratios scale factors; the dashed line marks 1. B: distributions of log₂(FPKMₙ + 1), with quartile boxes, median lines and whiskers extending to observations within 1.5 interquartile ranges. C: PCA, with one point per biological sample. PPFD is in µmol photons m⁻² s⁻¹. The axis percentages give explained variance.'),
      p('The sample structure supports condition-wise comparisons. Variation among replicates enters the downstream variance estimate.'),
      code('Expression filtering and transformation', 'expressed = (fpkm >= 1.0).sum(axis=1) >= 3\nfiltered = fpkm.loc[expressed]\nsize_factors = pd.Series(\n    median_of_ratios_factors(filtered.to_numpy() + 0.5),\n    index=filtered.columns,\n)\nlog_matrix = np.log2(filtered.div(size_factors, axis=1) + 1.0)'),
    ),
    section('Differential expression',
      p('Each exploratory comparison uses two groups of three samples. For every feature, the difference between mean log expression, the within-group residual sum of squares and a residual variance with four degrees of freedom were calculated. Empirical Bayes estimation supplies a prior variance s₀² and prior degrees of freedom d₀, shrinking individual variances toward this prior.'),
      eq('Moderated t statistic', String.raw`\begin{aligned}
\Delta_g &= \bar{x}_{g,a}-\bar{x}_{g,b},\\
s_{g,\mathrm{post}}^2 &= \frac{d_0s_0^2+4s_g^2}{d_0+4},\\
t_g &= \frac{\Delta_g}{\sqrt{s_{g,\mathrm{post}}^2\left(\frac{1}{3}+\frac{1}{3}\right)}}.
\end{aligned}`),
      p('Two-sided P values use a t distribution with d₀ + 4 degrees of freedom. Priors were fitted separately for the three comparisons, giving d₀ ≈ 1.4817, 1.4344 and 1.4592. Benjamini–Hochberg adjustment was applied within each comparison across all tested features. The exploratory code column log2FC stores Δ_g, the difference in mean log₂(normalized FPKM + 1); the +1 transformation affects fold interpretation at low expression.'),
      customTable('Exploratory differential-expression counts: FDR < 0.05 and |Δ_g| ≥ 1', ['Comparison', 'Upregulated', 'Downregulated', 'Total'], [['600/150','1,990','1,022','3,012'],['1500/150','2,088','1,789','3,877'],['1500/600','4,384','5,183','9,567']]),
      p('The union contains 11,583 features. The counting unit is a Trinity expression feature; several transcripts can correspond to one gene. Individual expression patterns and functional annotations provide the basis for subsequent candidate ranking.'),
      fig('07_differential_expression','Three volcano plots with identical axes for the light-intensity comparisons.', 'Figure 2. Each point is a tested feature. The x-axis is the difference in mean log expression; the y-axis is −log₁₀(FDR). Rose and blue mark upregulated and downregulated features meeting both thresholds. Horizontal and vertical lines indicate FDR = 0.05 and Δ = ±1. CRTISO has Δ = +4.0265 and FDR = 0.000997 in 1500/600.'),
      p('The annotated CRTISO transcript increases in the high-light group, connecting the global response to a specific carotenoid-pathway transcript.'),
    ),
    section('Light-response modules',
      p('For the 11,583 differential features, mean log expression was calculated in each of the three conditions and standardized within each feature. The population standard deviation (ddof = 0) was used. Features with nonzero between-condition standard deviation entered shape clustering.'),
      eq('Within-feature standardization', String.raw`\begin{aligned}
\mathbf{a}_g &= \left(\bar{x}_{g,150},\bar{x}_{g,600},\bar{x}_{g,1500}\right),\\
\mathbf{z}_g &= \frac{\mathbf{a}_g-\operatorname{mean}(\mathbf{a}_g)}{\operatorname{sd}(\mathbf{a}_g)}.
\end{aligned}`),
      p('K-means compared k = 4–8 using k-means++ initialization, Euclidean distance, 40 initializations and at most 200 iterations per fit. Silhouette scores were calculated on the same 3,000-feature subsample. The random seed for model selection and bootstrap analyses was 20260826. The scores for k = 4, 5, 6, 7 and 8 were 0.5273, 0.5489, 0.5303, 0.5160 and 0.5162. Module labels were reordered by centroid shape after selecting k = 5.'),
      fig('08_response_modules','Five light-response module profiles and silhouette scores for choosing k.', 'Figure 3. A–E: average member Z-scores, with shaded 10th–90th percentiles of the member distribution. The x-axis contains three measured light intensities; lines connect these discrete conditions. F: silhouette scores across the tested k values.'),
      customTable('Selected response modules', ['Module', 'Features', 'Centroid expression order'], [['M1','991','150 > 600 > 1500'],['M2','1,578','600 > 1500 > 150'],['M3','4,023','600 > 150 > 1500'],['M4','1,708','1500 > 600 > 150'],['M5','3,283','1500 > 150 > 600']]),
      p('Module annotation used Bardawil reference proteins. All uploaded transcripts were aligned with DIAMOND blastx and filtered at E-value ≤ 10⁻⁵, identity ≥ 30% and query coverage ≥ 30%. Query coverage was 100 × (|qend − qstart| + 1) / qlen on either strand. In total, 31,869 transcripts matched 10,752 reference proteins; 14,676 alignments were on the reverse strand. The expressed enrichment background contained 9,906 reference proteins.'),
      p('Reference proteins were the enrichment counting unit. Each protein was assigned to the module of its most highly expressed responsive transcript. Hypergeometric tests were performed for 436 Pfam families having at least five background members, with all 436 P values adjusted together within each module and P = 1 for zero overlap. Of 2,180 module–family tests, 33 reached FDR < 0.05: 2, 1, 27, 2 and 1 in M1–M5. These modules describe response shapes; pathway annotation identifies the enzymes represented among those responses.'),
      links(['DIAMOND alignment fields','https://github.com/bbuchfink/diamond/wiki/3.-Command-line-options'],['Benjamini–Hochberg adjustment','https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.false_discovery_control.html']),
    ),
    section('Carotenoid-pathway annotation',
      p('Trinity identifiers were annotated through protein homology. Primary-hit names identified carotenoid-pathway enzymes, and differential expression retained light-responsive transcripts. Li et al. (2019) report the 600/150 comparison from the same dataset and provide the pathway list used for comparison.'),
      links(['Li et al., 2019 · Phycological Research','https://doi.org/10.1111/pre.12379'],['Swiss-Prot release 2018_08','https://ftp.uniprot.org/pub/databases/uniprot/previous_releases/release-2018_08/knowledgebase/'],['UniSave entry history','https://www.uniprot.org/help/entry_history']),
      p('Reference proteins combined the official Swiss-Prot 2018_08 archive with historical Dunaliella entries restored through UniSave. The paper submission date, 12 October 2018, defined the time boundary. A search by genus taxid 3044 and creation date recovered 480 early entries still retrievable today; each was restored to its last available version on or before 11 October 2018, retaining historical names and sequences. The archive was checked against the publisher’s MD5, and historical records retained version identifiers, original text and SHA-256 checksums. Deleted UniProt records and the paper’s original Nr database remain outside this reconstructed reference set.'),
      p('All 76,875 uploaded Trinity sequences entered DIAMOND 2.2.5 blastx. Each database used sensitive mode, E-value ≤ 10⁻⁵, identity ≥ 20%, reference coverage ≥ 15% and at most ten targets per query. Hits were merged and a primary hit selected by descending bit score, then E-value and reference identifier. Primary-hit names identified PSY, PDS, ZDS, LCYB, CBR, carotene globule protein and D27. Both historical names “phytoene desaturase” and “15-cis-phytoene desaturase” were classified as PDS. Pathway annotations from weaker hits were retained in the annotation audit.'),
      p('These broad thresholds admit partial and more distant homologs for comparison with the published pathway list. TF annotation uses E-value < 10⁻⁵ and identity ≥ 30%, with reference coverage recorded for each match and CXC-domain evidence evaluated separately.'),
      h('Count-based pathway selection'),
      p('The paper and GEO sample-processing record specify DESeq 1.10.1, Benjamini–Hochberg adjustment and padj < 0.05. The uploaded Readcounts were reanalyzed using LL1–LL3 and ML1–ML3, retaining all 76,875 features. The six columns contain 135,644 fractional counts. R round was used to round to the nearest integer, with ties to even and a maximum change of 0.5 per count. This is an explicit recalculation setting because the publication does not describe fractional-count conversion.'),
      links(['GEO sample-processing record','https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSM3423032']),
      p('DESeq estimateSizeFactors supplied count-scale factors; estimateDispersions used the version defaults pooled, maximum and parametric; nbinomTest compared 600/150. The analysis yielded 9,375 differential features at padj < 0.05, compared with 9,374 reported in the paper. DESeq was fixed to archived version 1.10.1. The publication’s original database version, dispersion options and Table 2 inclusion rule require the original analysis records for exact matching.'),
      p('The six-sample count comparison and the nine-sample FPKM exploration use their own inputs, scale factors and variance models.'),
    ),
    section('Pathway results and published genes',
      p('Historical primary-hit annotation identified 45 pathway candidates; DESeq padj < 0.05 retained 20. All 16 transcripts in the paper’s Table 2 occur in this set. The other four are CBR Cluster-5009.29887, Cluster-5009.30798 and Cluster-5009.43203, and CGP Cluster-5009.33066. The table below follows the paper’s 16 identifiers in their original order.'),
      eq('Count-based fold change', String.raw`\operatorname{fold}_{g,600/150}=\frac{\operatorname{mean}_{j\in\mathrm{ML}}\!\left(C_{gj}/s^{\mathrm{count}}_j\right)}{\operatorname{mean}_{j\in\mathrm{LL}}\!\left(C_{gj}/s^{\mathrm{count}}_j\right)}.`),
      p('C denotes rounded counts. Size factors use features positive in all six samples. Fold changes and adjusted P values come from the same DESeq fit. All 16 published identifiers reach padj < 0.05 with matching directions. Pearson r between the two log₂-fold columns is 0.999996; median and maximum absolute differences are 0.001946 and 0.010124. For LCYB Cluster-5009.34218, recalculated fold = 1.46387 and padj = 1.12742 × 10⁻¹⁰, compared with published values of 1.46 and 1.13 × 10⁻¹⁰.'),
      fig('01_gene_recovery','Published versus recalculated fold changes for the 16 shared Trinity identifiers.', 'Figure 4. A: published (open) and recalculated (filled) log₂-fold changes by identifier. Labels abbreviate the Cluster-5009. prefix. B: the same values plotted against each other, with y = x as a dashed reference. CGP denotes carotene globule protein. The displayed identifiers are the 16 shared with the published Table 2.'),
      table('RECOVERY','Published Table 2 and DESeq recalculation'),
      p('PSY, both LCYB transcripts, and the listed CBR, CGP and D27 transcripts increase in 600/150, while two PDS and one ZDS transcript decrease. Different positions in the carotenoid pathway respond in different directions.'),
      table('CANDIDATES','DESeq expression changes for the 16 published pathway transcripts',true),
      p('The 20 significant candidates are distinct Trinity sequences. Some match different regions of one reference protein: Cluster-5009.30798 is 592 nt and matches residues 122–203 of Bardawil DsB_g11280 at 97.6% identity; Cluster-5009.43203 is 478 nt and matches residues 1–127 at 89.1% identity. Trinity transcripts remain the expression-analysis unit, while protein alignment supplies functional and positional evidence.'),
      p('Reference versions affect primary-hit names. The current UniProt primary-hit names for Cluster-5009.18393, Cluster-5009.25866 and Cluster-5009.39420 have changed; historical annotation assigns CGP, CGP and PDS, respectively. The comparison uses the historical references and primary-hit rule described above. Differences in the recovered set remain associated with the unavailable original Nr database and Table 2 selection rule.'),
      p('LCYB catalyzes entry from lycopene into the β-carotene branch. The annotated LCYB transcript Cluster-5009.34218 has the three-condition order 600 > 1500 > 150 and is assigned to M2 by its nearest centroid. LCYB and other light-responsive biosynthetic enzymes provide the pathway references for coexpression analysis.'),
    ),
    section('Transcription-factor annotation and ranking',
      h('Pathway references and expression background'),
      p('Pathway references were assembled from PSY, PDS, ZDS, CRTISO, LCYB, LCYE and BCH annotations. Historical primary-hit annotations and enzyme-reference alignments were merged by Trinity identifier. Transcripts required usable expression data and padj < 0.05 in at least one light comparison. Thirteen references cover six enzyme classes; BCH did not meet this differential-expression criterion.'),
      customTable('Thirteen pathway references; identifiers share the Cluster-5009. prefix', ['Enzyme','Identifier suffixes'], [['CRTISO','33436'],['LCYB','34218, 36796'],['LCYE','32344'],['PDS','31297, 35653, 39420, 39826'],['PSY','23903, 45875'],['ZDS','11812, 34471, 6157']]),
      p('For this analysis, all nine Readcount columns were rounded with R round, normalized with DESeq 1.10.1 and fitted across LL, ML and HL with pooled, maximum, parametric dispersion estimation. All three pairwise tests use this nine-sample model and BH adjustment. The expression matrix uses getVarianceStabilizedData. The earlier FPKM ≥ 1 in at least three samples rule defines the expressed background; removing nonfinite and constant values leaves 36,411 transcripts. The six-sample fit remains specific to the published comparison.'),
      h('TF homologs'),
      p('All assembled transcripts were aligned against PlantTFDB Dunaliella salina proteins with DIAMOND blastx in sensitive mode, retaining targets with E-value < 10⁻⁵. Local matches required identity ≥ 30%. The strongest hit was selected by bit score, E-value and reference identifier; tied strongest hits involving several families retain all family names. This yielded 505 TF-homologous transcripts, of which 333 had usable expression data.'),
      links(['PlantTFDB reference proteins','https://planttfdb.gao-lab.org/']),
      p('Family labels describe reference-protein homology. Alignment length, identity, reference coverage and transcript coverage remain attached to each record, together with the reference CDS and protein identifiers. Multiple expressed fragments matching one protein remain separate ranked transcript features.'),
      h('Joint pathway coexpression'),
      p('The calculation follows the Mutual Rank definition and multi-reference logit aggregation described by ATTED-II. MutRank provides an example of combining coexpression retrieval with differential expression, functional annotation and domain evidence. Here, the rankings are calculated from the nine-sample expression matrix.'),
      links(['ATTED-II Mutual Rank','https://atted.jp/static/help/mr.shtml'],['ATTED-II multi-reference aggregation','https://doi.org/10.1093/pcp/pcx191'],['MutRank','https://doi.org/10.7717/peerj.10264']),
      p('Pearson correlation was calculated for every candidate–reference pair. Both directional ranks were calculated against the entire expressed background, excluding self-comparisons, with correlations ranked from highest to lowest and ties assigned average ranks. Mutual Rank is the geometric mean of the two directional ranks.'),
      eq('Mutual Rank and pathway aggregation', String.raw`\begin{aligned}
MR_{ij} &= \sqrt{R_{i\to j}R_{j\to i}},\\
S_i &= \sum_j w_j\ln\!\left(\frac{MR_{ij}}{N-MR_{ij}}\right),\\
MR_i^* &= \frac{N}{1+\exp(-S_i)}.
\end{aligned}`),
      p('N is the expressed-background size. Each enzyme class receives equal total weight, split equally among its reference transcripts. Smaller integrated MR indicates a stronger same-direction association with the reference set. Candidates are sorted by increasing integrated MR, with exact ties broken by identifier. Family labels do not enter the score. Inverse integrated MR uses the opposite correlation order and is reported separately. Correlation and MR are dimensionless. Coexpression supplies candidate priority; binding and functional evidence determine promoter interaction and regulatory direction.'),
      h('Ranked transcripts'),
      p('C2H2 homolog Cluster-5009.32526 ranks first (integrated MR 9996.9), C2H2 homolog Cluster-5009.43049 second (10299.5), and NF-YC homolog Cluster-5009.41188 third (10828.8). Across nine leave-one-sample-out recalculations, their rank ranges are 1–2, 1–4 and 1–4. The first two match the same reference protein with reference coverage of 11.55% and 7.87%, respectively.'),
      p('The pathway enzymes have different light-response profiles. Correlations of the leading candidates with individual references include both positive and negative values. The integrated MR summarizes association with the whole reference set; sequence coverage accompanies the expression ranking.'),
      fig('02_tf_candidates','Integrated pathway ranks and Pearson correlations with thirteen enzyme references.', 'Figure 5. A: the top ten same-direction candidates and CPP homologs with CXC-domain evidence, retaining ranks from the full table. Purple marks CPP homology. B: Pearson correlations with the 13 pathway references across the same nine samples; red and blue denote positive and negative correlations.'),
      table('TF_RANKING','All 333 TF-homologous transcripts, ordered by integrated MR',true),
      p('Inverse rank is calculated from reverse correlation ranks using the same MR and weighting rules. Lower inverse ranks indicate stronger opposite-direction coexpression. Reference coverage is the percentage of the reference protein spanned by the local alignment.'),
    ),
    section('CPP sequence and expression evidence',
      p('Twelve transcripts in the ranked table have a strongest hit assigned to the CPP family. All 333 candidates were translated in six reading frames on both strands. Open fragments of at least 25 aa were scanned with HMMER hmmsearch and the Pfam PF03638 CXC model, using the model’s gathering thresholds of 23.5 for both sequence and domain bit scores.'),
      links(['Pfam PF03638 · CXC domain','https://www.ebi.ac.uk/interpro/entry/pfam/PF03638/']),
      customTable('CXC-positive CPP-homologous expression fragments', ['Trinity Cluster','Overall rank','Integrated MR','Inverse rank','CXC domains'], [['Cluster-5009.42750','222','21462.8','105','1'],['Cluster-5009.19890','245','22120.0','102','2'],['Cluster-5009.49690','288','23419.8','39','2']]),
      p('The remaining CPP-homologous fragments have zero domain hits under these settings. Domain matches support family identity at the sequence level; expression ranks describe association with the pathway references. This dataset yields three CXC-supported CPP-homologous expression fragments, ranked 222, 245 and 288 among the 333 candidates.'),
    ),
  ],
};

export const modeling: WikiPage = {
  title: 'Mathematical Modeling', eyebrow: 'Dry Lab / Model', status: 'team-draft',
  intro: 'A nine-state kinetic model connects LCYB transcription to active enzyme, precursor allocation and four products. A separate flux-balance model examines steady-state product capacity under explicit network constraints.',
  sections: [
    section('Pathway structure and state variables',
      p('LCYB directs lycopene into the β-carotene pool. CCD1, BKT and BCH compete for this substrate, while the precursor supplied by BCH feeds GjCCD4a and CitCCD4. The kinetic model compares transcriptional input, precursor supply and branch capacity within these competing reactions.'),
      p('Kinetic parameters combine published enzyme data, endpoint fitting and engineering-scenario assumptions. CPP enters through an assumed LCYB transcription-input function. The transcriptomics analysis supplies TF identities and light-response associations; CPP concentration and the input-curve parameters are independently specified model scenarios. FBA is solved separately from the ODE.'),
      fig('09_model_structure','Nine-state model connecting a CPP input to LCYB expression and two levels of product branching.', 'Figure 1. Solid arrows represent transcription, translation or material conversion; dashed arrows represent input or catalytic relationships. CPP is an externally specified algebraic input acting through a Hill function. A and C represent lumped branches. First-order losses are retained in the equations.'),
      customTable('State variables; time is measured in days (d)', ['State','Quantity','Unit','Production and removal'], [['m','LCYB transcript','nmol transcript L⁻¹','Transcription; degradation and growth dilution'],['E','Active LCYB','mg active LCYB L⁻¹','Translation; degradation and dilution'],['L','Lycopene','µmol L⁻¹','Net upstream supply; LCYB and net loss'],['B','β-carotene','µmol L⁻¹','LCYB; CCD1, BKT and BCH competition'],['Z','Zeaxanthin','µmol L⁻¹','BCH; GjCCD4a and CitCCD4 competition'],['I','β-ionone','µmol L⁻¹','CCD1 cleavage; loss and dilution'],['A','Astaxanthin','µmol L⁻¹','Lumped BKT branch; loss and dilution'],['C','Crocetin','µmol L⁻¹','Lumped GjCCD4a branch; loss and dilution'],['R','β-citraurin','µmol L⁻¹','CitCCD4 branch; loss and dilution']]),
      p('The wild-type transcript baseline is assumed to be 1 nmol transcript L⁻¹, connecting published expression folds to the translation equation. Enzyme and metabolite concentrations are expressed in physical units, with their scales jointly determined by literature constraints and scale assumptions.'),
    ),
    section('Nine differential equations',
      p('Each balance subtracts outgoing rates from incoming rates. Transcription supplies m at rate u, and translation supplies E at rate k_tl m. Three consumption terms compete for B, and two compete for Z.'),
      eq('Nine-state ODE system', String.raw`\begin{aligned}
\frac{dm}{dt} &= u-(\delta_m+\mu)m,\\
\frac{dE}{dt} &= k_{\mathrm{tl}}m-(\delta_E+\mu)E,\\
\frac{dL}{dt} &= v_{\mathrm{supply}}-v_{\mathrm{LCYB}}-k_LL,\\
\frac{dB}{dt} &= v_{\mathrm{LCYB}}-v_{\mathrm{CCD1}}-v_{\mathrm{BKT}}-v_{\mathrm{BCH}}-(k_B+\mu)B,\\
\frac{dZ}{dt} &= v_{\mathrm{BCH}}-v_{\mathrm{GjCCD4a}}-v_{\mathrm{CitCCD4}}-(k_Z+\mu)Z,\\
\frac{dI}{dt} &= 2v_{\mathrm{CCD1}}-(k_I+\mu)I,\\
\frac{dA}{dt} &= v_{\mathrm{BKT}}-(k_A+\mu)A,\\
\frac{dC}{dt} &= v_{\mathrm{GjCCD4a}}-(k_C+\mu)C,\\
\frac{dR}{dt} &= v_{\mathrm{CitCCD4}}-(k_R+\mu)R.
\end{aligned}`),
      p('The transcript and enzyme states allow a gradual response after input changes. The factor 2 in the I equation is the assumed stoichiometry of the lumped CCD1 cleavage. The other product equations use unit product flow for their corresponding lumped branches.'),
      p('Losses are first order. Growth dilution μ is explicit for m, E, B, Z and the four products. The L equation uses k_L as a net loss coefficient. This asymmetric treatment is a baseline simplification; k_L includes the loss represented in the L balance.'),
      h('Transcription and saturating reaction rates'),
      eq('Input and reaction functions', String.raw`\begin{aligned}
\theta &= \frac{CPP^n}{K_{\mathrm{CPP}}^n+CPP^n},\\
u &= \alpha_0+(\alpha_1-\alpha_0)\theta,\\
v_{\mathrm{LCYB}} &= q_{\mathrm{LCYB}}E\frac{L}{K_{m,\mathrm{LCYB}}+L},\\
v_j &= V_{\max,j}\frac{S}{K_{m,j}+S}.
\end{aligned}`),
      p('CCD1, BKT and BCH use S = B; GjCCD4a and CitCCD4 use S = Z. Metabolic rates have units µmol L⁻¹ d⁻¹. The Hill term θ lies between 0 and 1; CPP and K_CPP share concentration units. CPP = K_CPP gives θ = 0.5, while n controls steepness. α₀ and α₁ are the low-input and saturated transcription rates in nmol transcript L⁻¹ d⁻¹. Their ordering, α₁ > α₀, defines the positive-input hypothesis used here.'),
      p('LCYB capacity is q_LCYB E and therefore changes with enzyme abundance. Other branches use fixed Vmax values that combine enzyme abundance, activity and lumped-step capacity. Km is the substrate concentration at half capacity. For example, q_LCYB in µmol mg⁻¹ d⁻¹ multiplied by E in mg L⁻¹ gives µmol L⁻¹ d⁻¹. Likewise, k_tl in mg nmol⁻¹ d⁻¹ multiplied by m in nmol L⁻¹ gives mg L⁻¹ d⁻¹.'),
    ),
    section('Promoter and branch correspondence',
      p('The reference P-lcyb promoter is GenBank KX218393.1, 2,621 bp long. It corresponds to transcriptional input u, which affects m, E and the LCYB reaction rate. The positive CPP Hill response is the model’s regulatory hypothesis. Other promoters act through relative changes in net branch capacity; sequence-to-capacity parameters require calibration.'),
      links(['P-lcyb · KX218393.1','https://www.ncbi.nlm.nih.gov/nuccore/KX218393.1']),
      customTable('Model controls and biological correspondence', ['Control','Parameters','Correspondence'], [['LCYB transcription','α₀, α₁, K_CPP, n','P-lcyb input; m and E formation'],['LCYB catalysis','q_LCYB, K_m,LCYB','L → B'],['First-level cleavage','V_max,CCD1, K_m,CCD1','B → I'],['Astaxanthin branch','V_max,BKT, K_m,BKT','B → A, lumped branch'],['Second-level entry','V_max,BCH, K_m,BCH','B → Z'],['Crocetin branch','V_max,GjCCD4a, K_m,GjCCD4a','Z → C, including downstream oxidation'],['β-citraurin branch','V_max,CitCCD4, K_m,CitCCD4','Z → R']]),
      p('The BKT branch includes the other steps needed for astaxanthin formation, and the GjCCD4a branch includes downstream oxidation. Their Vmax values therefore describe net branch capacities. CPP, K_CPP and n determine θ; a quantitative mapping from promoter binding-site number, position or sequence to those parameters is a separate calibration relationship.'),
    ),
    section('Literature parameters and concentration scales',
      p('Cross-species LCYB enzyme data from Mialoundama et al. (2010) give q_LCYB = 3.12 µmol mg⁻¹ d⁻¹ and Km = 4.5 µmol L⁻¹. The specific activity was converted from 130 nmol mg⁻¹ h⁻¹. Lan et al. (2022) provide Dunaliella endpoints: a 5.2-fold LCYB transcript change, 1.8-fold β-carotene change, 1.23-fold β-cryptoxanthin change and total carotenoid content of 8.46 mg gDW⁻¹.'),
      links(['Mialoundama et al., 2010','https://doi.org/10.1104/pp.110.155440'],['Lan et al., 2022','https://doi.org/10.4014/jmb.2208.08044'],['Cultivation biomass scale · Plants, 2022','https://doi.org/10.3390/plants11233229']),
      eq('Unit conversions', String.raw`\begin{aligned}
130\ \frac{\mathrm{nmol}}{\mathrm{mg}\,\mathrm{h}}\times24\ \frac{\mathrm{h}}{\mathrm{d}}\times\frac{1\ \mathrm{\mu mol}}{1000\ \mathrm{nmol}} &= 3.12\ \frac{\mathrm{\mu mol}}{\mathrm{mg}\,\mathrm{d}},\\[0.4em]
8.46\ \frac{\mathrm{mg}}{\mathrm{gDW}}\times0.695\ \frac{\mathrm{gDW}}{\mathrm{L}}\times\frac{1000}{536.87}\ \frac{\mathrm{\mu mol}}{\mathrm{mg}} &= 10.9518\ \mathrm{\mu mol\,L^{-1}}.
\end{aligned}`),
      p('The concentration conversion combines biomass of 0.695 gDW L⁻¹ from a separate cultivation study with a β-carotene-equivalent molecular weight of 536.87 g mol⁻¹. The resulting 10.9518 µmol L⁻¹ is a cross-study concentration-scale constraint. β-cryptoxanthin fold change constrains the BCH layer, while the model state Z is zeaxanthin, making this a layer-level proxy. LCYB q and Km retain the cross-species enzyme values.'),
    ),
    section('Endpoint fitting',
      p('The four engineered product branches were disabled during fitting, retaining the native LCYB–BCH precursor layer. The wild-type transcript baseline was m_WT = 1, with δ_m = ln(2)/0.25, δ_E = ln(2)/1 and μ = 0.2 d⁻¹. Wild-type balance fixes α₀ = (δ_m + μ)m_WT and k_tl = (δ_E + μ)E_WT/m_WT; the published transcript fold fixes α₁ = 5.2α₀. The five fitted quantities are E_WT, v_supply, V_max,BCH, k_B and k_Z.'),
      p('Positive parameters were fitted in log space. The wild-type system was integrated for 180 d and then exposed to the overexpression input for 3 d. Residuals combine endpoint constraints with a log-parameter prior of residual weight 0.001. Priors are 0.35, 7, 2, ln(2)/7 and ln(2)/7; lower bounds are 0.005, 0.2, 0.02, 0.005 and 0.005; upper bounds are 10, 80, 40, 3 and 3, in the respective parameter units.'),
      p('CPP was 0 for the wild-type solve and 10⁶ for the saturated-input approximation. The wild-type terminal maximum absolute right-hand-side value was checked against 2 × 10⁻⁵ before overexpression simulation. The 5.2-fold RNA target also fixes the input ratio, so matching this fold reflects enforcement of that constraint.'),
      eq('Regularized fitting objective', String.raw`\begin{aligned}
\eta_j &= \ln p_j,\\
J(\boldsymbol{\eta}) &= \sum_{i\in\mathcal{F}}\left[\ln\frac{\widehat{y}_i(\boldsymbol{\eta})}{y_i}\right]^2+10^{-6}\sum_{j=1}^{5}\left(\eta_j-\eta_{j,\mathrm{prior}}\right)^2.
\end{aligned}`),
      p('F contains transcript fold, B fold, the BCH-layer proxy fold and the converted concentration endpoint. SciPy least_squares used bounds, xtol = ftol = gtol = 10⁻¹⁰ and at most 1,200 function evaluations. The inner LSODA solver used rtol = 2 × 10⁻⁷ and atol = 10⁻⁹. Log parameterization enforces positivity; priors and bounds select a numerical solution under limited endpoint constraints.'),
      fig('10_calibration','Published endpoint targets, fitted outputs and a held-out total-pigment fold check.', 'Figure 2. A: published and model OE/WT folds. The first three enter the fit; LCYB RNA fold also sets the input ratio. The starred L+B+Z fold is a held-out contextual check. B: the cross-study concentration target and fitted three-pool total. Bars represent point estimates.'),
      table('FIT','Endpoint constraints and model outputs'),
      p('The held-out total-pigment fold is 1.26 in the paper and 0.9059 for model L+B+Z, a relative deviation of −28.1%. The measured total pigment includes more components than the three modeled pools. Endpoints, priors, fixed parameters and proxy constraints jointly determine the parameter estimates, and several kinetic parameter combinations can explain similar endpoints.'),
    ),
    section('Engineering capacities and baseline parameters',
      p('Engineered capacities were added after fitting the native layer. CCD1 and BKT each consume 10% of wild-type LCYB flux at the wild-type B pool, while GjCCD4a and CitCCD4 each consume 15% of wild-type BCH flux at the wild-type Z pool. These scenario fractions and Km values determine Vmax.'),
      eq('Baseline branch capacities', String.raw`\begin{aligned}
V_{\max,\mathrm{CCD1}}=V_{\max,\mathrm{BKT}} &= 0.10\,v_{\mathrm{LCYB,WT}}\frac{4+B_{\mathrm{WT}}}{B_{\mathrm{WT}}},\\
V_{\max,\mathrm{GjCCD4a}}=V_{\max,\mathrm{CitCCD4}} &= 0.15\,v_{\mathrm{BCH,WT}}\frac{1+Z_{\mathrm{WT}}}{Z_{\mathrm{WT}}}.
\end{aligned}`),
      p('The constants 4 and 1 are the first- and second-level Km values in µmol L⁻¹; 0.10 and 0.15 are dimensionless allocation assumptions. First-level Vmax values are 0.653606 and second-level values are 0.289654 µmol L⁻¹ d⁻¹. Baseline half-lives are 0.25 d for m, 1 d for E and 7 d for selected metabolites. Growth dilution is fixed at μ = 0.2 d⁻¹.'),
      table('PARAMETERS','Baseline parameters, units and provenance'),
      p('The table distinguishes enzyme measurements, fitted values, concentration-scale assumptions and engineering settings. A literature link for a fitted or scale-derived parameter identifies the constraint source; the fitting and conversion equations specify how the parameter was obtained.'),
      p('A value of 0.5 takes its meaning from the quantity: an expression multiplier of 0.5 halves the baseline transcriptional input; a metabolite-axis value of 0.5 is 0.5 µmol L⁻¹; time 0.5 d is half a day; θ = 0.5 is halfway between the low-input and saturated transcription endpoints.'),
      code('Promoter output and Michaelis–Menten rate', 'def promoter_output(p):\n    theta = p.cpp**p.hill_n / (\n        p.k_cpp**p.hill_n + p.cpp**p.hill_n\n    )\n    return p.alpha_0 + (p.alpha_1 - p.alpha_0) * theta\n\ndef michaelis(vmax, km, substrate):\n    return vmax * substrate / (km + substrate)'),
    ),
    section('Seven-day dynamics',
      p('The engineering scenario was integrated over 0–7 d with LSODA. There are 169 equally spaced outputs, one per hour; internal solver steps are adaptive. Tolerances are rtol = 10⁻⁸ and atol = 10⁻¹⁰. Checks require solver success, finite states and nonnegativity, with values below −10⁻⁷ treated as errors.'),
      code('Numerical integration', 'solution = solve_ivp(\n    model.rhs, (0.0, 7.0), initial_state,\n    t_eval=np.linspace(0.0, 7.0, 169),\n    method="LSODA", rtol=1e-8, atol=1e-10,\n)'),
      p('The initial-state order is m, E, L, B, Z, I, A, C, R. The scenario begins at m = 1, E = 1.4293, L = 4.7371, B = 2.1529 and Z = 5.1997, with all four products at zero and units as defined above. CPP = K_CPP = 1 and n = 1 give θ = 0.5.'),
      fig('03_ode_dynamics','Time courses of transcripts, active enzyme, precursors and four products over seven days.', 'Figure 3. A and B: transcript and active-LCYB states. C: precursor pools L, B and Z. D–F: the four products. Each y-axis states its own concentration unit; time is in days. C and R coincide under symmetric parameters and are distinguished by solid and dashed lines.'),
      table('ENDPOINTS','Baseline states at day 0 and day 7'),
      p('At constant input, m approaches u/(δ_m + μ) and E approaches k_tl m/(δ_E + μ). At θ = 0.5, u = 9.2150 nmol L⁻¹ d⁻¹ and the transcript equilibrium is 3.1 nmol L⁻¹. Transcript accumulation precedes active-enzyme accumulation. L declines and B rises transiently as stronger LCYB converts the existing L pool and competing downstream fluxes establish a new balance.'),
      p('Day-7 I, A, C and R are 1.4399, 0.7200, 0.6964 and 0.6964 µmol L⁻¹. CCD1 and BKT have equal capacities and Km values, and equal product losses; the factor 2 in I formation makes its trajectory twice that of A. C and R share production and loss parameters and therefore coincide. These ratios follow from the scenario parameters and stoichiometry.'),
    ),
    section('Local sensitivity',
      p('Each parameter was individually multiplied by 0.8 and 1.2, holding the initial state fixed. Day-7 product concentrations were compared by a logarithmic finite-difference elasticity.'),
      eq('Dimensionless elasticity', String.raw`\varepsilon_{Y,p}=\frac{\ln Y(1.2p)-\ln Y(0.8p)}{\ln(1.2)-\ln(0.8)}.`),
      p('Positive elasticity indicates increasing product with increasing parameter; negative elasticity indicates a decrease over this perturbation interval.'),
      fig('11_local_sensitivity','Local elasticities of twelve leading parameters for four modeled products.', 'Figure 4. Parameters were ordered by their largest absolute elasticity across the four products, and the first twelve are shown. V denotes branch Vmax, Km denotes the Michaelis constant, v_supply the supply rate, μ growth dilution, and k_I and k_A product-loss coefficients. Colors follow the dynamics plot. Each point is a finite-difference model result.'),
      p('CCD1 capacity has elasticity 0.9306 for I, and BKT capacity 0.9306 for A. GjCCD4a capacity has elasticity 0.9788 for C, and CitCCD4 capacity 0.9788 for R. BCH capacity has elasticity −0.4894 for I/A and +0.0955 for C/R, reflecting competition for entry into the second level. Supply-rate elasticities are +0.7186 for I/A and +0.0922 for C/R.'),
      p('Growth dilution μ has elasticities −0.6436 for I/A and −0.5764 for C/R, combining direct dilution and its effects on expression states. These values concern day-7 concentrations; volumetric productivity also depends on biomass and cultivation time. At CPP = K_CPP, θ = 0.5 for every positive n, giving zero local elasticity to the Hill exponent at this specific input point.'),
      table('ELASTICITY','Day-7 product elasticities for all 29 kinetic parameters (dimensionless)',true),
    ),
    section('Paired interventions across parameter backgrounds',
      p('Two sets of 128 backgrounds were drawn by independently multiplying parameters and nonzero initial values by log-uniform factors in 0.8–1.2 or 0.5–2, using seed 20260907. A multiplier is exp[U(ln a, ln b)]. Zero product initial values remain zero. Each intervention and its control share the other parameters and initial state.'),
      p('Seven controls—expression input, supply and five branch capacities—were multiplied by 0.5 or 2. Expression intervention scales α₀ and α₁ together; capacity intervention scales only its Vmax. Day-7 percentage change is 100 × (Y_intervention/Y_control − 1). Across 256 backgrounds, seven variables and two multipliers, 3,584 paired interventions yield 14,336 product comparisons.'),
      fig('04_ode_robustness','Paired day-seven product changes for seven doubled controls across two parameter-background ranges.', 'Figure 5. Points are medians and horizontal lines are the 5th–95th percentiles. Dark and light marks represent the 0.5–2 and 0.8–1.2 background ranges, respectively, with 128 backgrounds each. Changes are percentages relative to each paired control; ranges describe the assumed parameter scenarios.'),
      p('In the 0.5–2 background range, doubling CCD1 or BKT increases its corresponding product by a median of about 89%; doubling GjCCD4a or CitCCD4 gives about 95% and 94%. Doubling BCH reduces the two first-level products by about 33% and 34% and increases second-level products by about 5%. Doubling supply increases first-level products by about 47%–49%. Doubling LCYB expression input gives median product increases of about 0.5%–2.1%.'),
      p('Expression doubling gives positive I/A changes in 0.90625 of the broad-range backgrounds, with some near-zero or negative responses. Increasing supply increases all four products in every sampled background. Doubling each target-branch capacity increases its own product in all 128 backgrounds. BCH doubling consistently reduces first-level products and increases second-level products, preserving the allocation trade-off within this model structure and sampled range.'),
      p('The sampling varies literature-derived, fitted and assumed parameters independently. Percentiles describe the chosen scenario distribution. The positive fraction counts changes greater than 0.01%. The adjustable biological quantities are the expression or reaction capacities of LCYB, CCD1, BKT, BCH, GjCCD4a and CitCCD4; CPP represents the assumed upstream transcriptional input.'),
      table('ROBUSTNESS','Doubled interventions in the 0.5–2 parameter-background range',true),
    ),
    section('Flux-balance network and constraints',
      p('ODE supply and growth dilution are specified as parameters. FBA instead uses a published carbon-core network to calculate feasible steady-state product flux and its growth trade-off. FBA boundary scenarios are independent of the ODE kinetic parameters.'),
      links(['Fachet et al., 2020 · network and supplementary files','https://doi.org/10.1186/s12859-019-3325-0']),
      p('The model file, workbook and paper list 223, 222 and 221 reactions, respectively. Imported SBML contains 213 species: 171 internal and 42 boundary species. After reconciling Light01/Light1 and Gly011/Gly11 identifiers, every workbook reaction maps to the model; SBML additionally contains ATPdrain.'),
      p('Eight bound differences involve Car03, Car04, Car09, Ex01, Light1, Ox06, THF03 and THF04, split equally between capacity and reversibility differences. The adopted scenario starts from workbook bounds, changes Car09 to the SBML upper bound of 100, and exports lutein and violaxanthin as boundary pools according to their SBML definition. All eight reference scenarios have feasible solutions, with a maximum absolute difference of 200 from reference fluxes. The growth–product calculations below use this explicit reconciled scenario.'),
      table('BOUNDS','Reaction bounds [lower, upper] in mmol gDW⁻¹ h⁻¹'),
      h('Steady-state optimization'),
      eq('Product capacity and maximum growth', String.raw`\begin{aligned}
S\mathbf{v}&=\mathbf{0},\qquad \mathbf{l}\leq\mathbf{v}\leq\mathbf{u},\\
\text{product capacity}&=\max_{\mathbf{v}}\ v_{\mathrm{Car14}},\\
\mu_{\max}(p)&=\max_{\mathbf{v}}\ v_{\mathrm{biomass}}\\
\text{subject to}\quad S\mathbf{v}&=\mathbf{0},\quad \mathbf{l}\leq\mathbf{v}\leq\mathbf{u},\quad v_{\mathrm{Car14}}\geq p.
\end{aligned}`),
      p('S is the internal-species stoichiometric matrix and v is the reaction-flux vector. SciPy linear programming maximizes Car14 to obtain product capacity. The product lower bound p is then increased over 41 equally spaced values between zero and maximum capacity, maximizing biomass at each value. Reaction fluxes are in mmol gDW⁻¹ h⁻¹ and the biomass flux is interpreted in h⁻¹.'),
    ),
    section('LCYB bounds and the growth–product relationship',
      p('Car09 represents LCYB, Car10 BCH, and Car14 a product sink with stoichiometry 1.86 cBCAR → BCAR_P. At the workbook Car09 upper bound of 0.0018, maximum Car14 flux is 0.000967742. With Car09 relaxed to 100, capacity becomes 1.02407 mmol gDW⁻¹ h⁻¹.'),
      fig('05_fba_tradeoff','Maximum product flux at two LCYB bounds and the growth-product curve in the relaxed scenario.', 'Figure 6. A: maximum Car14 flux for two Car09 bounds, using a logarithmic x-axis. Flux units are mmol gDW⁻¹ h⁻¹. B: maximum growth as the minimum required product flux increases under Car09 ≤ 100; circles mark solved points. The optimizer may exceed the imposed product lower bound.'),
      p('Maximum growth in the reconciled scenario is approximately 0.12667 h⁻¹. It remains flat over a broad product-demand range and declines near maximum product capacity. Under Car09 ≤ 0.0018, the equality 0.0018/1.86 = 0.000967742 accounts for the capacity through the LCYB bound and product-sink stoichiometry. At Car09 ≤ 100, other network constraints determine capacity. The approximately 1,058-fold difference is a ratio between two specified boundary scenarios.'),
    ),
    section('Modeling results',
      p('The nine-state ODE connects LCYB transcriptional input to active enzyme, two levels of precursor allocation and four product concentrations. Literature kinetics, native-pigment endpoints and engineering capacities define the baseline. Across 0.5–2 parameter backgrounds, expression doubling gives median day-7 product gains of about 0.5%–2.1%, while doubling the corresponding product-branch capacity gives about 89%–95%. BCH enhancement shifts allocation toward second-level products in every sampled background.'),
      p('In FBA, increasing the Car09 upper bound from 0.0018 to 100 mmol gDW⁻¹ h⁻¹ raises maximum Car14 flux from 0.000967742 to 1.02407 mmol gDW⁻¹ h⁻¹. In the relaxed scenario, growth remains flat across much of the product-demand range before declining near capacity. ODE branch-capacity effects are conditional on the specified supply background; the FBA LCYB limitation is conditional on its flux bound. Together, the calculations locate product constraints in expression and catalysis, precursor allocation and network boundaries.'),
    ),
  ],
};

export const dryLabIndex: WikiPage = {
  title: 'Dry Lab', eyebrow: 'Project / Dry Lab', intro: '', status: 'team-draft',
  sections: [section('Chapters', links(...dryLabNavigation.map(([label, href]): [string,string] => [label,href])))],
};

export const emptyDryLabPage = (title: string): WikiPage => ({ title, eyebrow: `Dry Lab / ${title}`, intro: '', status: 'structure-only', sections: [] });
