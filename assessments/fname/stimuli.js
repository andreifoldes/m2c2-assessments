import { RandomDraws } from "@m2c2kit/core";

export const NAME_POOL = [
  "Ruth", "James", "Maria", "Wei", "Aisha", "David", "Priya", "Michael",
  "Fatima", "Carlos", "Sarah", "Kenji", "Elena", "Omar", "Linda", "Raj",
  "Sophie", "Yuki", "Amara", "Daniel", "Lucia", "Hassan", "Grace", "Mateo",
  "Nadia", "Robert", "Zara", "Ivan", "Leila", "Thomas", "Clara", "Ahmed",
  "Rose", "Dmitri", "Maya", "Patrick", "Ingrid", "Kofi", "Helen", "Marco",
];

export const OCCUPATION_POOL = [
  "Librarian", "Journalist", "Teacher", "Engineer", "Chef", "Nurse",
  "Pilot", "Artist", "Lawyer", "Farmer", "Dentist", "Plumber",
  "Carpenter", "Architect", "Baker", "Mechanic", "Musician", "Scientist",
  "Firefighter", "Photographer", "Electrician", "Veterinarian",
  "Accountant", "Barber", "Coach", "Designer", "Florist", "Locksmith",
  "Pharmacist", "Tailor", "Painter", "Gardener", "Cashier", "Sailor",
  "Surgeon", "Translator", "Welder", "Optician", "Therapist", "Ranger",
];

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = RandomDraws.singleFromRange(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateTriplets(facePool, numPairs) {
  const faces = shuffleArray(facePool).slice(0, numPairs);
  const names = shuffleArray(NAME_POOL).slice(0, numPairs);
  const occupations = shuffleArray(OCCUPATION_POOL).slice(0, numPairs);

  return faces.map((face, i) => ({
    faceId: face.id,
    faceDataUrl: face.dataUrl,
    name: names[i],
    occupation: occupations[i],
  }));
}

export function pickDistractors(correctAnswer, allOptions, count) {
  const available = allOptions.filter((o) => o !== correctAnswer);
  const shuffled = shuffleArray(available);
  return shuffled.slice(0, count);
}
