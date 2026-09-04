/**
 * Project schema, modelled on EleutherAI's SOAR project list
 * (https://www.eleuther.ai/soar) at the committee's request.
 *
 * Entries are transcribed from the mentor submission form, so each field maps
 * to a form question: `type` is "Research Area / Tags / Keywords",
 * `skillsDescription` is "Skills Required/Preferred", `preferences` is
 * "Additional Preferences", and so on. Adding a project means filling this same
 * set of fields — nothing in the display needs to change.
 */
export type Project = {
  id: string
  track: Track
  /** Sub-area, shown under the title in the list. SOAR calls this "type". */
  type: string
  title: string
  mentor: string
  affiliation: string
  mentorBio: string
  /** Headshot submitted with the project, cropped 4:5. */
  photo: string
  /** Personal site or profile, where the mentor gave one. The submission form
      does not ask for LinkedIn or Scholar, so most have none. */
  mentorUrl?: string
  /** Which mentor lane the project sits in. The committee tracks this split. */
  institution: "UTAR" | "External"
  participants: string
  timeInvestment: string
  description: string
  skillsDescription: string
  skills: string[]
  prepWork: string[]
  tasks: string[]
  deliverables: string[]
  /** Mentor's own stated preference for who they want, where they gave one. */
  preferences?: string
  /** "pending" while the mentor has not yet confirmed their project. */
  status: "confirmed" | "pending"
}

/**
 * Tracks are the "Project Field" values the mentor submission form actually
 * collects, not a taxonomy invented here — so a new submission always lands in
 * an existing track.
 */
export type Track =
  | "AI & Computer Sciences"
  | "Biology"
  | "Chemistry"
  | "Mathematics"
  | "Interdisciplinary & Social Sciences"
  | "Physics"

/** Display order, and the letter each project code is built from (A-1, B-2…). */
export const trackOrder: Track[] = [
  "AI & Computer Sciences",
  "Biology",
  "Chemistry",
  "Mathematics",
  "Interdisciplinary & Social Sciences",
  "Physics",
]

const trackPrefix: Record<Track, string> = {
  "AI & Computer Sciences": "A",
  Biology: "B",
  Chemistry: "C",
  Mathematics: "M",
  "Interdisciplinary & Social Sciences": "I",
  Physics: "P",
}

/**
 * Project codes are derived, not authored, so they stay contiguous when a
 * project is added, withdrawn, or reordered — the sheet is still moving.
 */
export function projectCodes(list: Project[]): Map<string, string> {
  const codes = new Map<string, string>()
  for (const track of trackOrder) {
    list
      .filter((p) => p.track === track)
      .forEach((p, i) => codes.set(p.id, `${trackPrefix[track]}-${i + 1}`))
  }
  return codes
}

/**
 * The 11 accepted projects, transcribed from the mentor submission sheet.
 * Struck-out rows (rejected or superseded by a re-submission) are excluded.
 *
 * `skills` are short tags derived from each mentor's own "Skills
 * Required/Preferred" answer, which the sheet collects as prose; the full
 * answer is kept verbatim in `skillsDescription`.
 */
export const projects: Project[] = [
  {
    id: "object-detector-occlusion",
    photo: "/mentors/leong-kuan-yew.jpg",
    track: "AI & Computer Sciences",
    type: "Computer Vision / Machine Learning",
    title:
      "Evaluating the Robustness of a Pretrained Object Detector under Controlled Object Occlusion",
    mentor: "Dr. Leong Kuan Yew",
    affiliation: "A.I. System Research Co. Ltd., Kyoto, Japan",
    mentorBio:
      "Leong Kuan Yew specialises in computer vision, wearable technology and AI, with 20 years of combined academic and industrial experience. He earned his PhD from Monash University, where he was nominated for the Mollie Holman Award and the Vice-Chancellor's Commendation. He is lead researcher at an AI research corporation in Kyoto, working on optimising deep learning models for face recognition, auto-annotation, image classification and object detection, alongside generative AI.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "6 hours/week",
    description:
      "This project investigates how well a pretrained object detector can recognise everyday objects when they are partly hidden. Students prepare a controlled test set using common items such as bottles, cups, books and backpacks, photographed from different viewpoints and backgrounds, then covered at several occlusion levels and positions. Using a fixed pretrained model with no retraining, they record detection results and confidence scores, calculate performance at each occlusion level, and identify common failure patterns.",
    skillsDescription: "Python, GitHub, statistics.",
    skills: ["Python", "GitHub", "Statistics"],
    prepWork: ["Students need their own laptop to work on the analysis."],
    tasks: [
      "Photograph everyday objects such as bottles, cups, books and backpacks.",
      "Create a controlled test set in which objects are hidden at different percentages and positions.",
      "Organise and annotate the images using a clear naming system.",
      "Code the evaluation metrics in Python.",
      "Calculate detection rates and compare results across object types and occlusion levels.",
      "Create graphs, tables and visual examples of AI successes and failures.",
    ],
    deliverables: [
      "A structured image test set containing everyday objects with different levels and positions of occlusion.",
      "A complete record of object-detection results, including predicted labels and confidence scores.",
      "Evaluation tables comparing performance across object classes and occlusion conditions.",
      "Graphs showing how detection accuracy and confidence change as more of an object is hidden.",
      "A collection of successful detections, missed objects and incorrect predictions for failure analysis.",
    ],
    status: "confirmed",
  },
  {
    id: "llm-personality-emotion",
    photo: "/mentors/tan-jing-jie.jpg",
    mentorUrl: "https://jingjietan.com/",
    track: "AI & Computer Sciences",
    type: "NLP & Large Language Models",
    title: "Large Language Models for Personality and Emotion Understanding",
    mentor: "Dr. Tan Jing Jie",
    affiliation: "National University of Singapore",
    mentorBio:
      "Dr. Tan Jing Jie (Jay) is a Research Fellow at the National University of Singapore working on natural language processing, machine learning and trustworthy AI. He has published in high-impact journals, secured over USD 160,000 in competitive research funding including five international mobility grants, and won more than 10 national and international AI and innovation competitions. His research is supported by high-performance computing resources, so students can run large-scale AI experiments.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "24 hours/week",
    description:
      "Large Language Models have shown remarkable capabilities in understanding and generating human language, yet accurately modelling personality and emotion remains a significant challenge. This project investigates a focused research question in personality recognition, emotion analysis or human behaviour understanding from text. Depending on the topic, students may work with public datasets, explore prompt engineering or parameter-efficient fine-tuning, evaluate different LLMs, or develop new approaches to improve performance, robustness or interpretability. Outstanding projects may be developed further for submission to an academic conference or journal.",
    skillsDescription:
      "Strong mathematical foundation (Additional Mathematics at grade A or equivalent). Programming experience in Python is preferred. Prior exposure to machine learning is beneficial but not required. Curiosity, self-motivation and a willingness to conduct independent research.",
    skills: ["Python", "PyTorch", "Mathematics", "Machine Learning"],
    prepWork: [
      "No prior preparation is required before the programme begins.",
      "Familiarity with Python and working in Google Colab or VS Code is recommended.",
      "Prior experience with PyTorch is beneficial but not essential.",
      "Reading a few recent AI research papers beforehand is encouraged.",
    ],
    tasks: [
      "Identify a focused research question in personality recognition, emotion analysis or human behaviour understanding using LLMs.",
      "Conduct a literature review to find research gaps and formulate a hypothesis.",
      "Set up the research environment: Python, PyTorch, Hugging Face Transformers, Overleaf and Git.",
      "Prepare and preprocess public datasets, including cleaning, tokenisation and exploratory analysis.",
      "Implement and evaluate baseline models and state-of-the-art LLMs using prompt engineering, in-context learning, parameter-efficient fine-tuning, RAG or multimodal learning.",
      "Run experiments on high-performance computing resources and analyse results with appropriate metrics.",
      "Attend weekly research meetings to present progress and plan milestones.",
      "Prepare technical documentation and, where appropriate, contribute to a manuscript.",
    ],
    deliverables: [
      "A clearly defined research problem, objectives and proposed methodology.",
      "A literature review summarising the state of the art and identifying research gaps.",
      "A preliminary implementation with initial experimental results or proof of concept.",
      "A slide presentation summarising the project and key findings for Demo Day.",
      "A short technical report or paper draft prepared in LaTeX, where appropriate.",
    ],
    preferences:
      "Preference is given to applicants with a strong interest in AI research who are self-motivated and committed to contributing consistently. Applicants who want to continue the project beyond the programme with the goal of a conference or journal publication are especially encouraged.",
    status: "confirmed",
  },
  {
    id: "self-evolving-agents-physics",
    photo: "/mentors/fan-xiaoyan.jpg",
    track: "AI & Computer Sciences",
    type: "AI Agents & Benchmarking",
    title:
      "Benchmarking Self-Evolving AI Agents for Automated Physics Discovery",
    mentor: "Fan Xiaoyan",
    affiliation:
      "AI Thrust, HKUST (Guangzhou) / Physics Department, Universiti Malaya",
    mentorBio:
      "Xiaoyan Fan is an M.Phil. researcher in Artificial Intelligence at the Hong Kong University of Science and Technology (Guangzhou) and a Physics graduate from Universiti Malaya. Specialising in the interdisciplinary frontier of fundamental physics and machine learning, he draws on research internships at Tsinghua University (neutrino detection), Shanghai Jiao Tong University (dark matter detection) and the University of Tokyo (neutrino oscillation).",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "6 hours/week",
    description:
      "The intersection of AI and fundamental physics is moving beyond data analysis toward systems that can autonomously discover scientific laws. This project evaluates how well self-evolving AI agents can deduce physics formulas from simulated experimental testbenches. Students run benchmark tests on various state-of-the-art LLMs and critically analyse their reasoning processes and formula-derivation accuracy, learning to set up evaluation pipelines and gaining hands-on experience with Python and API integration.",
    skillsDescription:
      "High-school level (IGCSE/SPM/A-Level) understanding of general physics and mechanics. Basic Python programming: variables, loops and data handling. Basic statistical analysis and logical reasoning. Familiarity with calling APIs or general exposure to LLMs is preferred. A curiosity-driven mindset and patience for troubleshooting code.",
    skills: ["Python", "APIs", "Physics", "Statistics"],
    prepWork: [
      "Install and familiarise yourself with Visual Studio Code, which suits running and evaluating AI agent frameworks.",
      "Watch a short beginner-friendly video introducing Large Language Models.",
      "Briefly review fundamental classical mechanics concepts.",
    ],
    tasks: [
      "Install and configure VS Code; review foundational classical mechanics and introductory LLM concepts.",
      "Explore the benchmark testbench structure; run initial tests using basic AI agents to practise Python scripting and API integration.",
      "Execute full evaluation pipelines using state-of-the-art LLMs; collect data on the models' ability to derive physical principles.",
      "Critically analyse the agents' reasoning and formula-derivation accuracy; identify common failure cases and refine prompts or code.",
      "Compile benchmark results, create visual performance comparisons, and finalise a short technical report and slides.",
    ],
    deliverables: [
      "A well-documented evaluation codebase containing the Python scripts, API integration setups and prompt logs.",
      "Comparative data visualisations illustrating the performance, accuracy and failure rates of different LLMs on the physics testbenches.",
      "A short technical paper summarising the benchmarking methodology and key findings.",
      "A slide presentation prepared for Demo Day.",
    ],
    preferences:
      "Applicants with a genuine, curiosity-driven interest in the intersection of AI and fundamental physics. Ideal candidates are proactive communicators with a collaborative mindset, and resilient when troubleshooting code. A laptop is required.",
    status: "confirmed",
  },
  {
    id: "financial-document-tampering",
    photo: "/mentors/lim-jia-yu.jpg",
    track: "AI & Computer Sciences",
    type: "Computer Vision",
    title:
      "Detecting Tampering in Financial Documents: From Synthetic Data to Detection Benchmarks",
    mentor: "Lim Jia Yu",
    affiliation: "School of Computing, National University of Singapore",
    mentorBio:
      "Researcher at the School of Computing, National University of Singapore.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "6 hours/week",
    description:
      "Financial fraud increasingly relies on digitally altered documents — edited bank statements, doctored invoices, manipulated financial reports — that are very hard to catch by eye. Working with realistic templates, students build a labelled dataset of synthetically tampered documents covering both text-level edits and image-level manipulations, each paired with ground-truth information on exactly what was changed and where. They then test existing tampering-detection methods against that dataset, measuring how well each catches different kinds of forgery and analysing where and why they fail.",
    skillsDescription:
      "Python, basic SPM-level mathematics and statistics. Image editing experience is a bonus.",
    skills: ["Python", "OpenCV", "Statistics"],
    prepWork: [
      "Install Python via Anaconda or set up a free Google Colab account (guidance provided).",
      "Complete a short beginner-friendly introduction to OpenCV and image basics.",
      "Look at a few genuine versus altered document examples to build intuition for what tampering looks like.",
    ],
    tasks: [
      "Complete introductory Python and OpenCV tutorials; review example tampered and genuine documents to build a shared tampering taxonomy.",
      "Build a labelled dataset of synthetically tampered bank and financial statement samples with ground-truth annotations.",
      "Peer-review and quality-check the dataset samples; consolidate into one combined labelled dataset.",
      "Run baseline tampering-detection methods against the dataset; compute precision, recall and localisation accuracy, and analyse failure cases.",
      "Interpret results with the mentor and begin drafting the write-up.",
      "Finalise visualisations and compile findings into a short report and slides.",
    ],
    deliverables: [
      "A labelled synthetic dataset of tampered financial documents covering multiple tampering types with ground-truth annotations.",
      "Evaluation results showing how well baseline detection methods perform, including annotated examples of successes and failures.",
      "A short written report on the dataset, methodology and findings, with implications for financial document verification.",
      "A slide presentation suitable for Demo Day.",
    ],
    preferences:
      "Be proactive, responsible, willing to learn and communicative.",
    status: "confirmed",
  },
  {
    id: "llm-inference-nondeterminism",
    photo: "/mentors/alizishaan-khatri.jpg",
    track: "AI & Computer Sciences",
    type: "AI Safety & Model Internals",
    title: "Investigating non-determinism in LLM inference",
    mentor: "Alizishaan Khatri",
    affiliation: "Wrynx Inc, California",
    mentorBio:
      "Alizishaan Khatri is founder and CEO of Wrynx Inc, an AI safety research lab focused on runtime analysis of AI model internals. Before founding Wrynx he worked in the safety and AI infrastructure space at Roblox and Meta.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "10+ hours/week for about 2-3 weeks",
    description:
      "Foundational AI models such as LLMs and video generation models behave non-deterministically during inference: the same input can produce different outputs for a variety of reasons. This project runs experiments to better understand that behaviour by analysing the internal states of the model during inference. The end goal is a workshop paper disseminating the findings.",
    skillsDescription:
      "Moderate to strong programming skills, preferably in Python, plus PyTorch and an understanding of AI fundamentals.",
    skills: ["Python", "PyTorch", "AI Fundamentals"],
    prepWork: [
      "Ramp up on AI and ML fundamentals.",
      "Brush up Python and PyTorch.",
      "Get familiar with AI coding tools.",
    ],
    tasks: [
      "Write scripts to log LLM internal states under a variety of test conditions.",
      "Write scripts to analyse the logged states.",
      "Run experiments on the cloud and share findings.",
      "Disseminate findings through a research manuscript written in LaTeX.",
    ],
    deliverables: [
      "Logging and analysis scripts for LLM internal states.",
      "Experimental findings from cloud-run experiments.",
      "A research manuscript prepared in LaTeX.",
    ],
    status: "confirmed",
  },
  {
    id: "cancer-immunotherapy",
    photo: "/mentors/yee-peng-phoon.jpg",
    track: "Biology",
    type: "Cancer Immunology",
    title: "How does immunotherapy help the body fight cancer?",
    mentor: "Dr. Yee Peng Phoon",
    affiliation: "CWRU",
    mentorBio:
      "Dr. Phoon is a translational scientist at CWRU specialising in cancer immunotherapy. Trained in Malaysia, Singapore, Hong Kong and Sweden, she has received international scholarships and research awards, and enjoys mentoring students, sharing STEM career insights and fostering critical thinking.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "6+ hours/week (1:1, group and self-directed)",
    description:
      "This project introduces students to cancer immunology and the emerging field of cancer immunotherapy: how the immune system identifies abnormal cells, how cancer cells evade immune responses, and how immune-based therapies such as checkpoint inhibitors restore anti-cancer activity. Students review scientific literature, analyse clinical evidence, and investigate the benefits and challenges of therapies targeting pathways such as PD-1/PD-L1 and CTLA-4.",
    skillsDescription:
      "Basic biology knowledge and basic Microsoft Office skills for research documentation, data organisation and presentation, along with curiosity about cancer and biomedical science and a willingness to engage with scientific material.",
    skills: ["Biology", "Literature Review", "Scientific Communication"],
    prepWork: [
      "Get familiar with PubMed for searching and accessing biomedical research articles.",
      "Get familiar with BioRender for creating scientific illustrations and biological diagrams.",
      "Get familiar with Jamovi for basic data analysis and visualisation.",
      "Work through the recommended reading on cancer statistics, immunotherapy and immune checkpoint blockade (reading list provided by the mentor).",
      "Watch the introductory videos provided to build a foundational understanding of immunotherapy.",
    ],
    tasks: [
      "Understand cancer biology, immune responses and the principles of immunotherapy.",
      "Explore how immune checkpoint inhibitors (PD-1/PD-L1, CTLA-4) help fight cancer.",
      "Search and review scientific literature using PubMed.",
      "Read and evaluate scientific literature through journal discussions.",
      "Analyse and summarise research findings and clinical evidence.",
      "Create scientific illustrations using BioRender.",
      "Organise and interpret data using basic analysis tools.",
      "Develop and present research on cancer immunotherapy.",
    ],
    deliverables: [
      "A research presentation summarising the background, findings and impact of cancer immunotherapy.",
      "A scientific illustration explaining immunotherapy.",
      "A literature review summarising key research data.",
      "Data analysis and interpretation.",
      "A final presentation or project report.",
    ],
    status: "confirmed",
  },
  {
    id: "tp53-sequences-transcripts",
    photo: "/mentors/jaiyogesh-patel.jpg",
    track: "Biology",
    type: "Bioinformatics & Cancer Genomics",
    title: "Correlating TP53 Sequences to Transcripts in Cancers",
    mentor: "Jaiyogesh Ramesh Patel",
    affiliation: "PhD candidate and researcher",
    mentorBio:
      "Jai is a PhD candidate and researcher, and also a postgraduate and alumni leader as well as a mentor. His interests are mainly in cancer research and virology, following his journey through undergraduate, master's and doctorate studies looking at the role of p53 isoforms in childhood leukaemia. He would like to instil a love for research and non-classroom learning in the younger generation, because research is like a never-ending jigsaw puzzle.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "5 hours/week",
    description:
      "There are a variety of TP53 sequences that correlate to the p53 protein, known as the “Guardian of the Genome”. With multiple sources of these sequences, there is still no concentrated effort to combine and agree on a set number of them. This matters because TP53 sequences and their versions play a multitude of roles in cancer genomics, from promoting cancer growth to restricting it. Identifying specific sequences and the IDs they relate to helps other researchers know which transcript ID to focus on, and so better approach treatment or drug design.",
    skillsDescription: "Basic science education and a keen eye for detail.",
    skills: ["Bioinformatics", "Data Curation", "Attention to Detail"],
    prepWork: ["Explore NCBI and Ensembl. More will be taught later."],
    tasks: [
      "Complete a brief tutorial and overview of the websites used for initial analysis.",
      "Clean and scrutinise 50+ TP53 sequences and identify mismatches and edits.",
      "Correlate sequences with p53 proteins.",
      "Visualise the data and categorise sequences against p53 proteins and their known roles in cancer.",
    ],
    deliverables: [
      "A set of tables and graphs showing the initial analysis performed on matching sequences.",
      "A short report on the edits found across all 50+ TP53 sequences.",
      "A presentation slide deck showcasing the study findings, with training provided.",
    ],
    preferences: "None. All are welcome.",
    status: "confirmed",
  },
  {
    id: "microalgae-harvesting",
    photo: "/mentors/toh-pey-yi.jpg",
    track: "Chemistry",
    type: "Chemical Engineering",
    title: "Harvesting of microalgae via flocculation and sedimentation method",
    mentor: "Assoc. Prof. Ir. Ts. Dr. Toh Pey Yi",
    affiliation: "Universiti Tunku Abdul Rahman (on campus)",
    mentorBio:
      "Assoc. Prof. Ir. Ts. Dr. Toh Pey Yi is a chemical engineering academic at UTAR specialising in sustainable chemical engineering, microalgae technology, wastewater treatment and carbon capture. She has led industry-linked research and supervised student projects that translate engineering knowledge into practical environmental solutions.",
    institution: "UTAR",
    participants: "Up to 3",
    timeInvestment: "6 hours/week",
    description:
      "Microalgae are promising sustainable resources for biofuels, wastewater treatment and carbon capture, but commercial use is limited by the cost and difficulty of harvesting the microscopic cells from water. This project introduces laboratory techniques for harvesting microalgae using flocculation and sedimentation. Students investigate the harvesting efficiency of sedimentation alone, optimise flocculant dosage to improve biomass recovery, and study the mechanisms behind particle aggregation and settling.",
    skillsDescription: "Basic science education.",
    skills: ["Laboratory Work", "Data Analysis", "Scientific Writing"],
    prepWork: [],
    tasks: [
      "Complete the literature review.",
      "Run the experiments.",
      "Analyse the results.",
      "Prepare the final mini thesis.",
      "Deliver an oral presentation.",
    ],
    deliverables: ["A mini thesis.", "Oral presentation slides."],
    preferences:
      "This is hands-on lab work: expect to wash a lot of containers and glassware. Equipment is available at UTAR.",
    status: "confirmed",
  },
  {
    id: "space-of-trees",
    photo: "/mentors/siao-chi-mok.jpg",
    track: "Mathematics",
    type: "Pure Mathematics",
    title: "The shape of the space of trees",
    mentor: "Dr. Siao Chi Mok",
    affiliation:
      "Department of Pure Mathematics and Mathematical Statistics, University of Cambridge",
    mentorBio:
      "Siao Chi recently completed her PhD in pure mathematics at the University of Cambridge, specialising in combinatorial algebraic geometry. She is passionate about empowering individuals from underrepresented groups to pursue careers in STEM.",
    institution: "External",
    participants: "2 (team project)",
    timeInvestment: "10 hours/week",
    description:
      "Trees are network graphs without cycles, which appear in many facets of mathematical research. The space of all trees with fixed numerical parameters forms a polyhedron, and is at the forefront of combinatorics (discrete mathematics), algebraic geometry and even in evolutionary biology, manifesting as the space of phylogenetic trees. In this project, students will familiarise themselves with the space of trees by counting its faces (vertices, edges, 2-dimensional faces etc) and investigating its topological properties. Time permitting, students will apply existing techniques to investigate the properties of a novel variant of tree space, namely the space of trees on a 2-dimensional plane.",
    skillsDescription:
      "Required: Mathematics and Additional Mathematics (IGCSE/SPM), particularly Permutations and Combinations.",
    skills: ["Mathematics", "Graph Theory", "Combinatorics", "Topology"],
    prepWork: [
      "Learn basic notions about graph theory through online resources.",
    ],
    tasks: [
      "Enumerate the faces of the space of trees with n leaves, for small values of n (by hand and/or using computer algebra software).",
      "Compute the Euler characteristic of the tree spaces and understand existing results about their topology (shape).",
      "Understand the significance of the tree spaces and their properties.",
      "Write up the findings in a short report and slides.",
      "If time permits, apply techniques learnt to investigate a novel variant of tree space, i.e. the space of trees on a plane.",
      "Both students will contribute to learning and discussion.",
    ],
    deliverables: [
      "A short written report summarising existing results on the space of trees and any further work.",
      "A slide presentation suitable for demo day.",
    ],
    status: "confirmed",
  },
  {
    id: "youth-wellbeing-digital-resilience",
    photo: "/mentors/elpidia-juli.jpg",
    track: "Interdisciplinary & Social Sciences",
    type: "Quantitative Social Research",
    title:
      "Measuring Youth Well-Being & Digital Resilience: A Quantitative Psychometric & Life Satisfaction Analysis in Malaysia",
    mentor: "Dr. Elpidia Juli",
    affiliation: "Independent researcher (PhD, Universiti Malaysia Sabah)",
    mentorBio:
      "Dr. Elpidia Juli holds a PhD in Sociology and Social Anthropology from Universiti Malaysia Sabah, complemented by a background in mathematics, computer science, and health and social care. She specialises in subjective well-being, life satisfaction and socio-economic dynamics in Sabah, combining data analytics with community-based action research across mental health peer support, rural development and cultural mapping. She currently drives state-aligned research frameworks including the UPEN-endorsed Equal Pathways initiative.",
    institution: "External",
    participants: "1-3",
    timeInvestment: "8 hours/week",
    description:
      "Youth mental health, subjective well-being and life satisfaction have become vital indicators of social progress in post-pandemic Malaysia. This project introduces the fundamentals of quantitative social science by examining how social factors, digital engagement and personal resilience influence life satisfaction among Malaysian youth. Students learn how social scientists turn abstract concepts — resilience, self-esteem, happiness — into measurable psychometric scales, then analyse open-access datasets to extract statistical insights and write a publication-ready report.",
    skillsDescription:
      "Basic secondary-level maths or statistics (SPM/IGCSE level), familiarity with Google Sheets or Excel, an interest in social sciences, public health or human behaviour, and basic scientific reading and written English.",
    skills: ["Statistics", "Spreadsheets", "Survey Data", "Academic Writing"],
    prepWork: [
      "Read two short beginner-friendly open-access articles provided by the mentor on youth life satisfaction and basic psychometric concepts.",
      "Set up a free Google Drive and Sheets environment for shared data organisation and collaborative report writing (guidance provided).",
    ],
    tasks: [
      "Review the assigned literature on youth well-being metrics and understand the structure of the survey dataset.",
      "Clean, code and organise survey responses; calculate composite psychometric scores such as life satisfaction and resilience indices.",
      "Perform descriptive statistics and cross-tabulation analyses; generate clear charts illustrating trends across demographics.",
      "Discuss findings with the mentor, interpret their public health and social relevance, and draft sections of the report.",
      "Finalise visualisations, compile a co-authored short paper and design Demo Day slides.",
    ],
    deliverables: [
      "A set of annotated data visualisations illustrating youth life satisfaction trends.",
      "A co-authored short research report summarising findings and their social and public health implications.",
      "A digital poster and slide deck prepared for the Demo Day presentation.",
    ],
    preferences:
      "Applicants who show strong curiosity about human behaviour, enthusiasm for learning basic data analysis, and a commitment to weekly milestones. Prior experience with statistical software is welcome but not required. Roles split across up to three students: dataset cleaning and variable coding; chart visualisation and cross-tabulation; literature synthesis, write-up structure and slide design.",
    status: "confirmed",
  },
  {
    id: "active-suspension-nonlinearities",
    photo: "/mentors/mathias-foo.jpg",
    track: "Interdisciplinary & Social Sciences",
    type: "Control Engineering",
    title: "Identifying the Nonlinearities in an Active Suspension System",
    mentor: "Dr. Mathias Foo",
    affiliation: "School of Engineering, University of Warwick",
    mentorBio:
      "Dr Mathias Foo is an Associate Professor in Control and Engineering Biology at the University of Warwick. He specialises in leveraging control engineering methodologies across agriculture, automotive systems and synthetic biology, including improving crop resilience and enhancing vehicle ride comfort. He is passionate about guiding early-career researchers in control engineering fundamentals and their application to real-world problems.",
    institution: "External",
    participants: "2",
    timeInvestment: "6 hours/week",
    description:
      "Active suspension systems improve ride comfort by actively regulating the force between the tyres and the vehicle body. The control algorithms for that regulation are typically designed using a simplified linear model of the suspension dynamics — but how well that linear approximation captures real-world behaviour is an open research question. Students analyse data from an actual lab-scale suspension system and learn basic system identification tools to separate the linear and nonlinear components of its dynamics. Python (and MATLAB where available) is taught as part of the project.",
    skillsDescription:
      "Python, MATLAB or any programming language, plus a good grasp of differential equations.",
    skills: ["Python", "System Identification", "Differential Equations"],
    prepWork: [
      "Install a free Python notebook environment (guidance provided).",
      "Complete several short beginner-friendly video introductions to the System Identification Toolbox.",
    ],
    tasks: [
      "Complete introductory Python tutorials and cover the concept of system identification, particularly the Wiener-Hammerstein model; understand the structure of the suspension system and datasets.",
      "Clean and organise datasets for two road profiles of differing roughness; produce initial time-series visualisations of the road profile and the vehicle body and tyre displacements.",
      "Identify the linear and nonlinear components in the suspension system.",
      "Interpret findings and discuss possible explanations with the mentor; begin drafting the write-up.",
      "Finalise data visualisations and compile findings into a short report and presentation slides.",
    ],
    deliverables: [
      "A set of annotated data visualisations showing the contribution of linear and nonlinear components to the suspension system's behaviour.",
      "A short written report summarising findings.",
      "A slide presentation suitable for Demo Day.",
    ],
    preferences:
      "Two students: one focusing on data cleaning and Python scripting to identify the dominant linear component, the other on the nonlinear component using the Wiener-Hammerstein model. Both contribute to the write-up, presentation and interpretation.",
    status: "confirmed",
  },
  {
    id: "cosmic-ray-muon-imaging",
    photo: "/mentors/kim-siang-khaw.jpg",
    track: "Physics",
    type: "Physics, Engineering, Computer Science",
    title:
      "Seeing Through Solid Rock: Finding a Hidden Chamber with Cosmic-Ray Muons",
    mentor: "Dr. Khaw Kim Siang",
    affiliation: "Tsung-Dao Lee Institute, Shanghai Jiao Tong University",
    mentorBio:
      "Dr. Khaw Kim Siang is a Penang-born particle physicist and Associate Professor at the Tsung-Dao Lee Institute, Shanghai Jiao Tong University, where he leads research on muons — from one of the most precise measurements in all of physics to imaging the inside of tunnels and mountains. His own path ran from a Chung Ling classroom in Penang to Kyoto, Tokyo, Zurich, Seattle, and now Shanghai. He has mentored students from high school to PhD level on building detectors and analyzing real experimental data, and believes the best way in is to start small: build your own detector, get your hands on messy data, and let curiosity do the rest.",
    institution: "External",
    participants: "Up to 3",
    timeInvestment: "8 hours/week",
    description:
      "Every second, cosmic rays striking the upper atmosphere shower Earth with muons — heavy cousins of the electron that can pass through hundreds of meters of solid rock. Dense material absorbs slightly more of them than empty space, so counting the muons that survive a journey through a mountain reveals what lies inside. This is muography, and in 2017 it revealed a previously unknown void inside the Great Pyramid of Khufu. Today, it is used to monitor volcanoes, inspect tunnels, and survey underground structures. In this project, students build a working simulation of that measurement from scratch in Python. They construct a virtual target with a hidden chamber, trace muons through it, calculate how many survive, and add the random noise any real detector experiences — then attempt to recover the chamber from the simulated data. The central questions: how does a hidden void reveal itself in muon data, and how long must a detector collect data before that signal can be distinguished from chance?",
    skillsDescription:
      "Basic science and mathematics education, Python or any other programming skills, AI tools.",
    skills: ["Physics", "Mathematics", "Python", "AI Tools"],
    prepWork: [
      "Set up a Python Jupyter notebook and read a few articles on muography and the basics of particle physics.",
    ],
    tasks: [
      "Complete introductory Python tutorials (NumPy and Matplotlib basics); learn what a cosmic-ray muon is and why it penetrates hundreds of meters of rock, and reproduce a plot of muon flux versus zenith angle using a provided formula.",
      "Build a simple 1D model: calculate how many muons survive a straight path through a given thickness of rock using the flux formula and a range–energy relation. Verify the result by hand for one or two test cases.",
      "Construct a virtual target — a 2D density map representing a mountain or pyramid, with a hidden low-density chamber inside — and extend the supplied single-ray tracing function to send muons through the target along many directions, accumulating the material encountered along each path.",
      'Convert the accumulated opacity into a predicted muon count for each viewing direction, then add Poisson counting noise to generate a realistic simulated dataset — the "measurement" a real detector would return.',
      "Produce the reconstructed image and determine whether the hidden chamber is visible; repeat for a range of exposure times (one day, one week, one month) to determine how long a real detector must count before the void rises above statistical fluctuations.",
      "Explore how the answer varies with chamber size, chamber depth, and detector placement; discuss findings with the mentor and compare them with published muography results, including the 2017 discovery of a void inside the Great Pyramid of Khufu.",
      "Finalize figures, write a short scientific report, and prepare presentation slides.",
      "Working individually, the student will complete the full pipeline — physics inputs, simulation code, analysis, and write-up — with weekly mentor meetings and a provided code skeleton for the ray-tracing step. Optional extensions, if time allows: comparing two reconstruction methods or applying the simulation to a real Malaysian limestone target.",
    ],
    deliverables: [
      "A working Python simulation of muon imaging, documented and reproducible, that traces cosmic-ray muons through a user-defined density map and returns a realistic, noisy muon count.",
      'A "before-and-after" image pair — the true target with its hidden chamber, alongside the reconstructed image recovered from simulated detector data — demonstrating that the void can be detected.',
      "A signal-significance curve showing how the detectability of the hidden chamber improves with exposure time, and a quantitative answer to the project's central question: how many days a real detector would need to observe before the void becomes statistically convincing.",
      "A brief set of comparison figures showing how the required exposure time varies with chamber size, chamber depth, and detector placement.",
      "A short written report (LaTeX) in scientific format — introduction, methods, results, discussion — situating the findings against published muography work, such as the 2017 Khufu pyramid measurement.",
      "A slide presentation suitable for demo day, including a live or recorded demonstration of the simulation generating an image from scratch.",
      "Optional stretch outcome: an application of the simulation to a candidate real-world target, such as a Malaysian limestone hill or cave system, with an estimate of the exposure time the survey would require.",
    ],
    preferences:
      "Strong programming skills, highly interested in interdisciplinary projects (not limited to physics or any single field in science).",
    status: "confirmed",
  },
]

export const tracks: Array<Track | "All"> = ["All", ...trackOrder]

export type TimelinePhase = {
  /** Human-readable date, exactly as the committee published it. */
  date: string
  title: string
  description: string
  /** ISO bounds, used to derive complete / active / upcoming at render time. */
  start: string
  end: string
}

/**
 * Schedule from the committee update. Dates are open to slight shifts
 * according to programme progress; the finalised version arrives with the
 * participant info pack.
 */
export const timeline: TimelinePhase[] = [
  {
    date: "21 August 2026",
    title: "Applications Open",
    description: "Announced via social media and partnered institutions.",
    start: "2026-08-21",
    end: "2026-08-21",
  },
  {
    date: "11 September 2026",
    title: "Application Deadline",
    description:
      "All student submissions due. Board of Executive Directors shortlist applicants on a rolling basis, so applying early may help to simplify your application procedure.",
    start: "2026-09-11",
    end: "2026-09-11",
  },
  {
    date: "12 September 2026",
    title: "Final Review",
    description:
      "Lead researchers of projects announce final selection to directors (max 3 per project).",
    start: "2026-09-12",
    end: "2026-09-12",
  },
  {
    date: "15 September 2026",
    title: "Selection Announcement",
    description:
      "Students are matched with mentors and research projects, where team leaders are assigned for MYSSP's bi-weekly progress check meetings.",
    start: "2026-09-15",
    end: "2026-09-15",
  },
  {
    date: "19 September 2026",
    title: "Opening Ceremony",
    description:
      "Programme welcome to all participants, key details and relevant information shared with the cohort.",
    start: "2026-09-19",
    end: "2026-09-19",
  },
  {
    date: "20-25 September 2026",
    title: "Onboarding & Burn-in",
    description:
      "Orientation, introductions, and preparatory tasks assigned by mentor.",
    start: "2026-09-20",
    end: "2026-09-25",
  },
  {
    date: "25 September - 20 November 2026",
    title: "Main Research Period",
    description: "Core research and project work.",
    start: "2026-09-25",
    end: "2026-11-20",
  },
  {
    date: "18 October 2026",
    title: "Mid-Programme Check-in",
    description:
      "Progress updates; optional talks by mentors and partnered organisations.",
    start: "2026-10-18",
    end: "2026-10-18",
  },
  {
    date: "18 November 2026",
    title: "Project Submission Deadline",
    description:
      "All project works must be submitted via the given submission templates by this date, as participants prepare for their showcase presentation on Demo Day.",
    start: "2026-11-18",
    end: "2026-11-18",
  },
  {
    date: "20 November 2026",
    title: "Programme Ends",
    description:
      "Official conclusion of MYSSP 2026. All programme activities, mentor engagements, and participant responsibilities conclude.",
    start: "2026-11-20",
    end: "2026-11-20",
  },
  {
    date: "28 November 2026",
    title: "Malaysia Science Scholars' Demo Day",
    description: "Virtual showcase of all research works.",
    start: "2026-11-28",
    end: "2026-11-28",
  },
]

export const eligibility = {
  requirements: [
    {
      title: "Age Requirement",
      description:
        "14-20 years old as of January 1, 2026. Participants under 18 need parent/guardian consent",
      icon: "calendar",
    },
    {
      title: "Education Level",
      description: "Currently enrolled in  secondary school and pre-university",
      icon: "graduation",
    },
    {
      title: "Location & Access",
      description:
        "All projects (online & campus-based) are only available to students based in Malaysia. Reliable internet access is required for virtual meetings",
      icon: "map",
    },
    {
      title: "Team Size",
      description:
        "Up to 3 students are placed on each project; some mentors take fewer",
      icon: "users",
    },
    {
      title: "Time Commitment",
      description: "Commitment varies according to listed projects",
      icon: "clock",
    },
    {
      title: "Prerequisites",
      description:
        "No previous research experience required — just curiosity and commitment. Technical requirements vary by project (check individual project pages)",
      icon: "check",
    },
  ],
}

export const applicationSteps = [
  {
    step: 1,
    title: "Review Projects",
    description:
      "Browse the research projects and pick up to 3 preferences based on your interests and skills.",
  },
  {
    step: 2,
    title: "Complete Application",
    description:
      "Submit personal information, academic background, project preferences, and statement of interest (500 words).",
  },
  {
    step: 3,
    title: "Decision Announcements",
    description:
      "Decisions will be sent via email after the application period closes.",
  },
]

export type Mentor = {
  name: string
  affiliation: string
  bio: string
  photo: string
  url?: string
  institution: "UTAR" | "External"
  tracks: Track[]
  /** Titles of every project this mentor is running. */
  projects: string[]
}

/**
 * Derived from `projects` rather than maintained separately: a mentor only
 * exists here because they own a project, so the two lists can never drift.
 */
export const mentors: Mentor[] = (() => {
  const byName = new Map<string, Mentor>()
  for (const p of projects) {
    const existing = byName.get(p.mentor)
    if (existing) {
      if (!existing.tracks.includes(p.track)) existing.tracks.push(p.track)
      existing.projects.push(p.title)
      continue
    }
    byName.set(p.mentor, {
      name: p.mentor,
      affiliation: p.affiliation,
      bio: p.mentorBio,
      photo: p.photo,
      url: p.mentorUrl,
      institution: p.institution,
      tracks: [p.track],
      projects: [p.title],
    })
  }
  return [...byName.values()]
})()

export const faqs = [
  {
    question: "Do I need previous research experience?",
    answer:
      "No! MYSSP is designed for students new to research. We provide mentorship and guidance throughout the programme.",
  },
  {
    question: "Can I apply if I'm not from Malaysia?",
    answer:
      "Unfortunately, due to our organisation's scope and limited availability at this time, MYSSP is only open to those based in Malaysia.",
  },
  {
    question: "How are teams formed?",
    answer:
      "You apply as an individual. A maximum of three students are placed on each project, and some mentors have asked for fewer, so check the project brief. Team leaders are assigned at the announcement stage for bi-weekly progress checks.",
  },
  {
    question: "What if I can't commit to the full research period?",
    answer:
      "The research period runs from 20 September to 12 November 2026, and completing it is required to finish the programme. Plan accordingly before applying.",
  },
  {
    question: "Are there any costs to participate?",
    answer:
      "No! MYSSP is completely free. All resources, mentorship, and materials are provided at no cost.",
  },
  {
    question: "How is the programme conducted?",
    answer:
      "MYSSP runs primarily online with regular video meetings with your mentor. A small number of projects are campus-based and involve hands-on lab work; the project brief says which.",
  },
  {
    question: "What happens if my application isn't accepted?",
    answer:
      "We receive more applications than available spots. Unsuccessful applicants receive feedback and are encouraged to apply next year.",
  },
  {
    question: "Can I change my project after being accepted?",
    answer:
      "Project assignments are made based on your preferences and mentor capacity. Changes are rare but can be discussed with the programme coordinators in the first week.",
  },
]

/**
 * `cap` is the rendered height for each mark.
 *
 * They cannot share one height: a wide wordmark set to the same cap height as a
 * tall stacked mark dwarfs it, so each is sized to look equally weighted rather
 * than to measure equally. MABECS is the tallest because its mark is portrait
 * and reads smallest at any given height.
 */
export const partners = [
  {
    name: "MYResearchGuide",
    logo: "/mrg-logo-inverted.png",
    description: "Programme Organiser",
    url: "https://www.myresearchguide.org/",
    cap: "max-h-9",
  },
  {
    name: "UTAR",
    logo: "/utar-logo.jpg",
    description: "Universiti Tunku Abdul Rahman",
    url: "https://www.utar.edu.my/",
    cap: "max-h-14",
  },
  {
    name: "MABECS Global",
    logo: "/mabecs-logo.png",
    description: "Research Sponsor",
    url: "https://www.mabecs.com/en-gb",
    cap: "max-h-20",
  },
  {
    name: "MATLAB",
    logo: "/matlab-logo.png",
    description: "Technology Sponsor",
    url: "https://www.mathworks.com/products/matlab.html",
    cap: "max-h-14",
  },
]
