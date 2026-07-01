export const timeline = [
  {
    date: "January 15, 2026",
    title: "Applications Open",
    description: "Online application portal opens for all eligible students. Submit your project preferences and team information.",
    status: "complete" as const,
  },
  {
    date: "March 1, 2026",
    title: "Early Application Deadline",
    description: "Priority review for early applicants. Get feedback on your application before final deadline.",
    status: "complete" as const,
  },
  {
    date: "April 15, 2026",
    title: "Final Application Deadline",
    description: "Last day to submit applications. All materials must be received by 11:59 PM MYT.",
    status: "active" as const,
  },
  {
    date: "May 1-15, 2026",
    title: "Application Review",
    description: "Expert panel reviews all submissions. Applicants may be contacted for additional information.",
    status: "upcoming" as const,
  },
  {
    date: "May 20, 2026",
    title: "Acceptance Notifications",
    description: "Selected participants notified via email. Orientation materials and next steps provided.",
    status: "upcoming" as const,
  },
  {
    date: "June 1 - August 31, 2026",
    title: "Research Period",
    description: "12-week intensive research sprint with weekly mentor check-ins and milestone reviews.",
    status: "upcoming" as const,
  },
  {
    date: "September 15, 2026",
    title: "Final Presentations",
    description: "Teams present findings to panel of researchers and industry experts. Awards ceremony follows.",
    status: "upcoming" as const,
  },
]

export const prizes = [
  {
    title: "Grand Prize",
    amount: "RM 5,000",
    description: "Best overall research project across all tracks",
    benefits: [
      "Cash prize",
      "Publication opportunity in partner journal",
      "Feature on MRG website",
      "Certificate of Excellence",
      "Mentorship continuation for 6 months",
    ],
  },
  {
    title: "Track Winners",
    amount: "RM 2,000 each",
    description: "Top project in each of the 5 research tracks",
    benefits: [
      "Cash prize per track",
      "Certificate of Achievement",
      "Research showcase feature",
      "UTAR recommendation letter",
    ],
  },
  {
    title: "Honorable Mentions",
    amount: "RM 500",
    description: "Up to 10 outstanding projects",
    benefits: [
      "Cash prize",
      "Certificate of Recognition",
      "Portfolio showcase",
    ],
  },
  {
    title: "All Participants",
    amount: "Resources",
    description: "Everyone who completes the program receives",
    benefits: [
      "Certificate of Participation",
      "Letter of Recommendation",
      "Access to MRG Alumni Network",
      "Research Portfolio Documentation",
      "Future Competition Priority",
    ],
  },
]

export const eligibility = {
  requirements: [
    {
      title: "Age Requirement",
      description: "13-22 years old as of January 1, 2026",
      icon: "calendar",
    },
    {
      title: "Education Level",
      description: "Currently enrolled in secondary school, pre-university, or first year undergraduate",
      icon: "graduation",
    },
    {
      title: "Geographic Location",
      description: "Open to students in Malaysia and ASEAN countries",
      icon: "map",
    },
    {
      title: "Team Size",
      description: "Individual or teams of 2-5 students (varies by project)",
      icon: "users",
    },
    {
      title: "Time Commitment",
      description: "4-7 hours per week for 12 weeks (June-August 2026)",
      icon: "clock",
    },
    {
      title: "Prerequisites",
      description: "Basic research skills, curiosity, and commitment (project-specific requirements vary)",
      icon: "check",
    },
  ],
  notes: [
    "No previous research experience required",
    "Projects have varying technical requirements (check individual project pages)",
    "Students must have reliable internet access for virtual meetings",
    "Parent/guardian consent required for participants under 18",
  ],
}

export const applicationSteps = [
  {
    step: 1,
    title: "Review Projects",
    description: "Browse available research projects and select up to 3 preferences based on your interests and skills.",
    duration: "30 minutes",
  },
  {
    step: 2,
    title: "Create Account",
    description: "Register on the application portal with your email and basic information.",
    duration: "5 minutes",
  },
  {
    step: 3,
    title: "Complete Application",
    description: "Submit personal information, academic background, project preferences, and statement of interest (500 words).",
    duration: "1-2 hours",
  },
  {
    step: 4,
    title: "Upload Documents",
    description: "Provide academic transcript, one letter of recommendation, and proof of enrollment.",
    duration: "15 minutes",
  },
  {
    step: 5,
    title: "Submit & Track",
    description: "Review your application, submit, and track status through the portal.",
    duration: "5 minutes",
  },
]

export const mentors = [
  {
    id: 1,
    name: "Dr. Sarah Chen",
    title: "Senior Research Scientist",
    affiliation: "AI Research Lab, Singapore",
    track: "AI & Data",
    expertise: ["Machine Learning", "Natural Language Processing", "Research Methodology"],
    bio: "10+ years experience in AI research with focus on educational applications",
    image: "/mentors/placeholder-1.jpg",
  },
  {
    id: 2,
    name: "Prof. Ahmad Rahman",
    title: "Associate Professor",
    affiliation: "UTAR Faculty of Science",
    track: "BioScience",
    expertise: ["Molecular Biology", "Lab Protocols", "Science Communication"],
    bio: "Published researcher helping students discover biology research pathways",
    image: "/mentors/placeholder-2.jpg",
  },
  {
    id: 3,
    name: "Dr. Emily Wong",
    title: "Robotics Engineer",
    affiliation: "Tech Innovation Hub",
    track: "Engineering",
    expertise: ["Robotics", "Embedded Systems", "Design Thinking"],
    bio: "Industry expert bridging academic research and real-world engineering",
    image: "/mentors/placeholder-3.jpg",
  },
  {
    id: 4,
    name: "Dr. Lim Wei Ming",
    title: "Policy Researcher",
    affiliation: "UTAR Social Sciences",
    track: "Economics",
    expertise: ["Development Economics", "Research Design", "Data Analysis"],
    bio: "Specializes in youth opportunity research and educational policy",
    image: "/mentors/placeholder-4.jpg",
  },
  {
    id: 5,
    name: "Dr. Priya Sharma",
    title: "Research Ethics Advisor",
    affiliation: "External Ethics Panel",
    track: "Policy",
    expertise: ["Research Ethics", "Publication Standards", "Academic Integrity"],
    bio: "Guides students through ethical considerations in early research",
    image: "/mentors/placeholder-5.jpg",
  },
]

export const faqs = [
  {
    question: "Do I need previous research experience?",
    answer: "No! This competition is designed for students new to research. We provide mentorship and guidance throughout the process.",
  },
  {
    question: "Can I apply if I'm not from Malaysia?",
    answer: "Yes, the competition is open to students from all ASEAN countries. International applicants are welcome.",
  },
  {
    question: "How are teams formed?",
    answer: "You can apply as an individual or with a pre-formed team. Some projects allow solo work, others require teams of 2-5. Check individual project requirements.",
  },
  {
    question: "What if I can't commit to the full 12 weeks?",
    answer: "The 12-week commitment is required to complete the program and be eligible for awards. Plan accordingly before applying.",
  },
  {
    question: "Are there any costs to participate?",
    answer: "No! The competition is completely free. All resources, mentorship, and materials are provided at no cost.",
  },
  {
    question: "How is the competition conducted?",
    answer: "The program is primarily virtual with weekly video meetings with mentors. Some projects may have optional in-person components at UTAR.",
  },
  {
    question: "What happens if my application isn't accepted?",
    answer: "We receive more applications than available spots. Unsuccessful applicants receive feedback and are encouraged to apply next year with priority consideration.",
  },
  {
    question: "Can I change my project after being accepted?",
    answer: "Project assignments are made based on your preferences and mentor capacity. Changes are rare but can be discussed with program coordinators in the first week.",
  },
]

export const partners = [
  {
    name: "UTAR",
    logo: "/partners/utar-logo.svg",
    description: "Universiti Tunku Abdul Rahman",
    url: "https://www.utar.edu.my/",
  },
  {
    name: "MYResearchGuide",
    logo: "https://www.myresearchguide.org/MRG1W.png",
    description: "Malaysia's Student Research Platform",
    url: "https://www.myresearchguide.org/",
  },
  {
    name: "Research Sponsor",
    logo: "/partners/placeholder-sponsor.svg",
    description: "Supporting Student Research",
    url: "#",
  },
]
