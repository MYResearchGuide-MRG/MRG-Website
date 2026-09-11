/**
 * Selected applicants for the 15 September 2026 announcement.
 *
 * PRIVACY: this table publishes code, name, school, and programme ONLY.
 * Never add email, age, or residence here.
 */
export type SelectedRow = {
  code: string
  name: string
  school: string
  programme: string
}

export const SELECTED: SelectedRow[] = [
  { code: "A-1", name: "Goh Jun Thean", school: "Sunway College KL", programme: "A-levels" },
  { code: "A-1", name: "Ow Sue Lynn", school: "SM Kuen Cheng", programme: "JUEC (Junior 3), SPM (Form 3)" },
  { code: "A-1", name: "Toong Yi Hung", school: "INTI International College Penang", programme: "A-levels" },
  { code: "A-2", name: "CHON FENG QI", school: "INTI International College Penang", programme: "A-levels" },
  { code: "A-2", name: "Hong Li Thon", school: "Sunway College", programme: "A-Levels" },
  { code: "A-2", name: "Tee Chun Shan", school: "Kolej Yayasan UEM", programme: "A-level" },
  { code: "A-3", name: "MUHAMMAD ADIEF AL SYARIF BIN ABDULLAH", school: "Universiti Teknologi Malaysia", programme: "Diploma" },
  { code: "A-3", name: "Tang Yi Zhe", school: "Sunway College KL", programme: "A-levels" },
  { code: "A-3", name: "Uiyun Lee", school: "Garden International School Malaysia", programme: "IGCSE(Y10)" },
  { code: "A-4", name: "Abby Tan Yi Pei", school: "St. Joseph's Institution International School Malaysia", programme: "IGCSE (Y11)" },
  { code: "A-4", name: "ALYCIA YEAK YINYI", school: "Sunway College", programme: "A levels" },
  { code: "A-4", name: "Muhammad Nazhan bin Zailani", school: "Sunway College KL", programme: "CIMP" },
  { code: "A-5", name: "Dennis Chiong Teck Siong", school: "Kolej Yayasan UEM", programme: "A-Levels" },
  { code: "A-5", name: "Goh Kayson", school: "Kolej Tuanku Jaafar", programme: "A-levels" },
  { code: "A-5", name: "Hasif Hammani Bin Mohd Alizam", school: "KOLEJ YAYASAN UEM", programme: "A-Levels" },
  { code: "B-1", name: "AHDI JAIN", school: "SMK SERI GARING", programme: "STPM SEM 3" },
  { code: "B-1", name: "Lee Yee Hui", school: "Epsom College Malaysia", programme: "A-levels" },
  { code: "B-1", name: "Wong Pin Hao", school: "Sunway College KL", programme: "A-levels" },
  { code: "B-2", name: "Bethany Xinyi Chew", school: "Garden International School Kuala Lumpur", programme: "IGCSE (Y10)" },
  { code: "B-2", name: "Ee Jing Xuan", school: "Sunway College", programme: "A-levels" },
  { code: "B-2", name: "Xin Yuan LEOW", school: "Garden International School", programme: "A-Levels" },
  { code: "C-1", name: "FOO YU SHEN", school: "Sunway College KL", programme: "A-Level" },
  { code: "C-1", name: "KOTOWA KATO", school: "Acton Academy KL", programme: "American (Texas) Highschool Diploma (Grade10)" },
  { code: "C-1", name: "Sarah Nabilah binti Muhamad Syahril", school: "Sunway College", programme: "Australian Matriculation (AUSMAT)" },
  { code: "M-1", name: "Rayyan Hanif bin Rizal", school: "Kolej MARA Seremban", programme: "A-Levels" },
  { code: "M-1", name: "Travis Sow", school: "Chung Ling Private High School", programme: "Y11/IGCSE" },
  { code: "I-1", name: "Liong Ee Ning", school: "Kuen Cheng High School", programme: "SPM (Form 4)" },
  { code: "I-1", name: "Yashikaa Prabagaran", school: "Garden international School", programme: "A-levels" },
  { code: "I-1", name: "YOU SUYI", school: "self-study student of IGCSE", programme: "IGCSE Y10" },
  { code: "I-2", name: "Brenden Chen Yang Jie", school: "Sunway College", programme: "Alevels" },
  { code: "I-2", name: "Zahra Adam", school: "Garden International School", programme: "Y10" },
  { code: "P-1", name: "EVAN LIM HONG YAN", school: "KOLEJ MATRIKULASI PULAU PINANG", programme: "Matriks" },
  { code: "P-1", name: "Junyi Chai", school: "Garden international school KL", programme: "IGCSE" },
  { code: "P-1", name: "Samantha Chan Teng Wei", school: "Sunway College Kuala Lumpur", programme: "A-levels" },
]

export const selectedCount = SELECTED.length
