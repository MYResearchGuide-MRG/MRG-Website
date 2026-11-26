// Biography and portrait sources are recorded in docs/judges-sources.md.
export type Judge = {
  name: string
  role: string
  organisation: string
  bio: string
  portrait?: string
  profile: { label: "LinkedIn" | "Website"; href: string }
}

export const mainAwardJudges: Judge[] = [
  {
    name: "Prof. Yuan-Sen Ting",
    role: "Associate Professor of Astronomy",
    organisation: "The Ohio State University",
    bio: "Yuan-Sen Ting is an Associate Professor of Astronomy at The Ohio State University and Director of CASPER, where he develops AI methods for scientific discovery. Previously, he held positions at Princeton University, Carnegie Institution for Science, the Institute for Advanced Study, and the Australian National University. Yuan-Sen has authored over 240 publications, including work in Nature and Nature Astronomy, and the textbook Statistical Machine Learning for Astronomy. His honors include the NASA Hubble Fellowship and Alexander von Humboldt Fellowship. He currently chairs NASA’s AI/ML Science and Technology Interest Group.",
    portrait: "/judges/ting.webp",
    profile: { label: "LinkedIn", href: "https://www.linkedin.com/in/ting-astro" },
  },
  {
    name: "Waywen Loh",
    role: "DPhil student in Oncology",
    organisation: "University of Oxford",
    bio: "Waywen Loh is a DPhil student in Oncology at the University of Oxford, where his research focuses on tumour immunology. He holds an MSc in Integrated Immunology, during which he investigated how different lipid nanoparticle formulations used in mRNA vaccines stimulate immune responses.",
    portrait: "/judges/waywen.webp",
    profile: { label: "LinkedIn", href: "https://uk.linkedin.com/in/waywen-loh-5441ab143" },
  },
  {
    name: "Owen Loh",
    role: "Founder of Stealth AI Startup",
    organisation: "University of Oxford",
    bio: "Owen Loh builds AI systems for science and industry. He co-founded and served as CTO of Catalon, an AI startup for the chemical industry reporting $100K in annual recurring revenue, with backing from Entrepreneurs First and Transpose Platform. He studied physics at the University of Oxford on a Malaysian government scholarship and conducted battery health research at Imperial College London. His work spans industrial automation, computer vision and computational biology, including leading machine learning and algorithms for Oxford’s 2025 iGEM team.",
    portrait: "/judges/owen.webp",
    profile: { label: "LinkedIn", href: "https://www.linkedin.com/in/olzm" },
  },
  {
    name: "Ming Yean Lim",
    role: "PhD candidate in Mathematics",
    organisation: "University of Michigan",
    bio: "Ming Yean Lim is a PhD candidate in mathematics at the University of Michigan. His research focuses on combinatorial and geometric representation theory. He previously completed Part III of the Mathematical Tripos (MASt) at the University of Cambridge.",
    profile: { label: "Website", href: "https://www.mlyean.xyz/" },
  },
  {
    name: "Lee Kah Chun",
    role: "Product Development Engineer",
    organisation: "AMD",
    bio: "Kah Chun is a product development engineer at AMD, where he works on post-validation for next-generation AMD EPYC server processors. He graduated in Electrical and Electronic Engineering from the National Defence University of Malaysia (UPNM) and received the Board of Engineers Malaysia President Award. At UPNM, he led the first Malaysian team to compete in the United States CanSat Competition. His research focuses on an FPGA-based missile guidance processor subsystem, using FPGA-in-the-loop testing to validate MATLAB simulations on hardware in real time.",
    portrait: "/judges/lee-kah-chun.webp",
    profile: { label: "LinkedIn", href: "https://www.linkedin.com/in/lee-kah-chun/" },
  },
]

export const specialAwardJudges: Judge[] = [
  {
    name: "Ir. Ts. Dr. Chua Sing Yee",
    role: "Electrical and electronic engineering",
    organisation: "UTAR",
    bio: "Dr. Chua is an academic at UTAR’s Lee Kong Chian Faculty of Engineering and Science. Her research focuses on computational imaging and neural networks, including methods for reconstructing images from limited data and with constrained computational resources.",
    portrait: "/judges/chua.webp",
    profile: { label: "LinkedIn", href: "https://my.linkedin.com/in/sing-yee-chua-947342152" },
  },
  {
    name: "Ts. Dr. Lee Poh Foong",
    role: "Associate Professor",
    organisation: "UTAR",
    bio: "Dr. Lee is an Associate Professor at UTAR’s Lee Kong Chian Faculty of Engineering and Science. Her research focuses on neurotechnology, brain dynamics and artificial intelligence, including EEG signal analysis, physiological sensing and machine learning applications in cognitive assessment, mental wellbeing and human performance. She is a Chartered Engineer (CEng, UK) and currently serves as an Editorial Board Member of Scientific Reports (Nature Portfolio).",
    portrait: "/judges/lee-poh-foong.webp",
    profile: { label: "LinkedIn", href: "https://www.linkedin.com/in/poh-foong-lee-b8a68880/" },
  },
  {
    name: "Emma Davidson",
    role: "UK University Admissions Specialist",
    organisation: "MABECS",
    bio: "Emma supports Malaysian students applying to competitive UK universities. An Oxford graduate in Philosophy, Politics and Economics, she spent 12 years at Kolej Tuanku Ja’afar, most recently as Director of Sixth Form, before joining MABECS.",
    portrait: "/judges/emma.webp",
    profile: { label: "LinkedIn", href: "https://my.linkedin.com/in/emma-davidson-61b2614a" },
  },
  {
    name: "Krishna Keerthana Chiruvolu",
    role: "Customer Success Engineer",
    organisation: "MathWorks",
    bio: "Krishna supports university researchers and students in using MATLAB and Simulink for research and teaching. Her work includes practical computing applications such as image analysis. She holds an MSc in Electronic Engineering with Management from King’s College London.",
    portrait: "/judges/krishna.webp",
    profile: { label: "LinkedIn", href: "https://uk.linkedin.com/in/krishna-keerthana-chiruvolu-981181223" },
  },
]
