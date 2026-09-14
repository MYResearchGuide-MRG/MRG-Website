/**
 * Selected applicants for the 15 September 2026 announcement, transcribed
 * from the committee sheet — trimmed, original casing, sheet order.
 *
 * PRIVACY: code, name, school, and programme ONLY.
 * Never email, age, or residence here.
 */
export type SelectedRow = {
  code: string
  name: string
  school: string
  programme: string
}

export const SELECTED: SelectedRow[] = [
  {
    code: "A-1",
    name: "Goh Jun Thean",
    school: "Sunway College KL",
    programme: "A-Levels",
  },
  {
    code: "A-1",
    name: "Ow Sue Lynn",
    school: "SM Kuen Cheng",
    programme: "JUEC, SPM",
  },
  {
    code: "A-1",
    name: "Toong Yi Hung",
    school: "INTI International College Penang",
    programme: "A-Levels",
  },
  {
    code: "A-2",
    name: "CHON FENG QI",
    school: "INTI International College Penang",
    programme: "A-Levels",
  },
  {
    code: "A-2",
    name: "Hong Li Thon",
    school: "Sunway College",
    programme: "A-Levels",
  },
  {
    code: "A-2",
    name: "Tee Chun Shan",
    school: "Kolej Yayasan UEM",
    programme: "A-Levels",
  },
  {
    code: "A-3",
    name: "MUHAMMAD ADIEF AL SYARIF BIN ABDULLAH",
    school: "Universiti Teknologi Malaysia",
    programme: "Diploma",
  },
  {
    code: "A-3",
    name: "Tang Yi Zhe",
    school: "Sunway College KL",
    programme: "A-Levels",
  },
  {
    code: "A-3",
    name: "Uiyun Lee",
    school: "Garden International School Malaysia",
    programme: "IGCSE",
  },
  {
    code: "A-4",
    name: "Abby Tan Yi Pei",
    school: "St. Joseph's Institution International School Malaysia",
    programme: "IGCSE",
  },
  {
    code: "A-4",
    name: "ALYCIA YEAK YINYI",
    school: "Sunway College",
    programme: "A-Levels",
  },
  {
    code: "A-4",
    name: "Muhammad Nazhan bin Zailani",
    school: "Sunway College KL",
    programme: "CIMP",
  },
  {
    code: "A-5",
    name: "Dennis Chiong Teck Siong",
    school: "Kolej Yayasan UEM",
    programme: "A-Levels",
  },
  {
    code: "A-5",
    name: "Goh Kayson",
    school: "Kolej Tuanku Ja’afar",
    programme: "A-Levels",
  },
  {
    code: "A-5",
    name: "Hasif Hammani Bin Mohd Alizam",
    school: "KOLEJ YAYASAN UEM",
    programme: "A-Levels",
  },
  {
    code: "B-1",
    name: "AHDI JAIN",
    school: "SMK SERI GARING",
    programme: "STPM",
  },
  {
    code: "B-1",
    name: "Lee Yee Hui",
    school: "Epsom College Malaysia",
    programme: "A-Levels",
  },
  {
    code: "B-1",
    name: "Wong Pin Hao",
    school: "Sunway College KL",
    programme: "A-Levels",
  },
  {
    code: "B-2",
    name: "Jin You Tong",
    school: "Crescendo-HELP International School",
    programme: "IGCSE",
  },
  {
    code: "B-2",
    name: "Ee Jing Xuan",
    school: "Sunway College",
    programme: "A-Levels",
  },
  {
    code: "B-2",
    name: "Xin Yuan LEOW",
    school: "Garden International School",
    programme: "A-Levels",
  },
  {
    code: "C-1",
    name: "Deva Loshhani A/P Kumaran",
    school: "SMK Sentosa",
    programme: "",
  },
  {
    code: "C-1",
    name: "Harshyetha Varsha Murali",
    school: "Sekolah Tenby Ipoh",
    programme: "",
  },
  {
    code: "C-1",
    name: "Stephanie Teh En Yue",
    school: "Kolej Matrikulasi Perak",
    programme: "",
  },
  {
    code: "M-1",
    name: "Rayyan Hanif bin Rizal",
    school: "Kolej MARA Seremban",
    programme: "A-Levels",
  },
  {
    code: "M-1",
    name: "Travis Sow",
    school: "Chung Ling Private High School",
    programme: "IGCSE",
  },
  {
    code: "I-1",
    name: "Liong Ee Ning",
    school: "Kuen Cheng High School",
    programme: "SPM",
  },
  {
    code: "I-1",
    name: "Yashikaa Prabagaran",
    school: "Garden international School",
    programme: "A-Levels",
  },
  {
    code: "I-1",
    name: "YOU SUYI",
    school: "Homeschooled",
    programme: "IGCSE",
  },
  {
    code: "I-2",
    name: "Brenden Chen Yang Jie",
    school: "Sunway College",
    programme: "A-Levels",
  },
  {
    code: "I-2",
    name: "NG WEN JUN",
    school: "Sunway College",
    programme: "A-Levels",
  },
  {
    code: "I-2",
    name: "Zahra Adam",
    school: "Garden International School",
    programme: "IGCSE",
  },
  {
    code: "P-1",
    name: "EVAN LIM HONG YAN",
    school: "KOLEJ MATRIKULASI PULAU PINANG",
    programme: "Matriculation",
  },
  {
    code: "P-1",
    name: "Junyi Chai",
    school: "Garden international school KL",
    programme: "IGCSE",
  },
  {
    code: "P-1",
    name: "Samantha Chan Teng Wei",
    school: "Sunway College Kuala Lumpur",
    programme: "A-Levels",
  },
]

export const selectedCount = SELECTED.length
