// Biography and portrait sources are recorded in docs/judges-sources.md.
export type Judge = {
  name: string
  role: string
  organisation: string
  bio: string
  portrait: string
  linkedin: string
}

export const mainAwardJudges: Judge[] = [
  {
    name: "Prof. Weng Kung Peng",
    role: "Professor of quantum bioengineering",
    organisation: "The University of Osaka",
    bio: "Prof. Peng works at the intersection of physics, engineering and medicine. His research uses magnetic resonance and quantum bioengineering to develop compact diagnostic tools, including methods for detecting malaria. He previously conducted research with MIT’s BioSyM programme in Singapore.",
    portrait: "/judges/peng.webp",
    linkedin: "https://www.linkedin.com/in/weng-kung-peng-304256237",
  },
  {
    name: "Prof. Yuan-Sen Ting",
    role: "Associate Professor of Astronomy",
    organisation: "The Ohio State University",
    bio: "Prof. Ting combines astronomy, statistics and machine learning to study the Milky Way. His work uses large stellar surveys to understand how our Galaxy formed and evolved. He is also an adjunct scientist at the Max Planck Institute for Astronomy.",
    portrait: "/judges/ting.webp",
    linkedin: "https://www.linkedin.com/in/ting-astro",
  },
  {
    name: "Waywen Loh",
    role: "DPhil student in Oncology",
    organisation: "University of Oxford",
    bio: "Waywen is an immunologist studying tumour immunology at Oxford. He completed an MSc in Integrated Immunology, where his research examined how different lipid nanoparticle formulations used in mRNA vaccines stimulate immune responses.",
    portrait: "/judges/waywen.webp",
    linkedin: "https://uk.linkedin.com/in/waywen-loh-5441ab143",
  },
  {
    name: "Owen Loh",
    role: "Founder of Stealth AI Startup",
    organisation: "University of Oxford",
    bio: "Owen builds AI systems for scientific and industrial work. He co-founded Catalon, developing AI tools for the chemical industry, and has worked on battery health modelling at Imperial College London. His background spans physics, machine learning and scientific software.",
    portrait: "/judges/owen.webp",
    linkedin: "https://www.linkedin.com/in/olzm",
  },
]

export const specialAwardJudges: Judge[] = [
  {
    name: "Ir. Ts. Dr. Chua Sing Yee",
    role: "Electrical and electronic engineering",
    organisation: "UTAR",
    bio: "Dr. Chua is an academic in UTAR’s Lee Kong Chian Faculty of Engineering and Science. Her research explores computational imaging and neural networks, including methods for reconstructing images with limited data and computational resources.",
    portrait: "/judges/chua.webp",
    linkedin: "https://my.linkedin.com/in/sing-yee-chua-947342152",
  },
  {
    name: "Emma Davidson",
    role: "UK University Admissions Specialist",
    organisation: "MABECS",
    bio: "Emma supports Malaysian students applying to competitive UK universities. An Oxford graduate in Philosophy, Politics and Economics, she spent 12 years at Kolej Tuanku Ja’afar, latterly as Director of Sixth Form, before joining MABECS.",
    portrait: "/judges/emma.webp",
    linkedin: "https://my.linkedin.com/in/emma-davidson-61b2614a",
  },
  {
    name: "Krishna Keerthana Chiruvolu",
    role: "Customer Success Engineer",
    organisation: "MathWorks",
    bio: "Krishna supports research and teaching with MATLAB and Simulink. She works with university researchers and students on practical computing workflows, including image analysis, and holds an MSc in Electronic Engineering with Management from King’s College London.",
    portrait: "/judges/krishna.webp",
    linkedin:
      "https://uk.linkedin.com/in/krishna-keerthana-chiruvolu-981181223",
  },
]
