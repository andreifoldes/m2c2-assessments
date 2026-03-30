import { RandomDraws } from "@m2c2kit/core";

export const MALE_NAMES = [
  "James", "David", "Michael", "Carlos", "Kenji", "Omar", "Raj",
  "Daniel", "Hassan", "Mateo", "Robert", "Ivan", "Thomas", "Ahmed",
  "Dmitri", "Patrick", "Kofi", "Marco", "Samuel", "Victor",
];

export const FEMALE_NAMES = [
  "Ruth", "Maria", "Aisha", "Priya", "Fatima", "Sarah", "Elena",
  "Linda", "Sophie", "Yuki", "Amara", "Lucia", "Grace", "Nadia",
  "Zara", "Leila", "Clara", "Rose", "Maya", "Ingrid",
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
  const occupations = shuffleArray(OCCUPATION_POOL).slice(0, numPairs);

  // Gender-match names to faces
  const maleNames = shuffleArray(MALE_NAMES);
  const femaleNames = shuffleArray(FEMALE_NAMES);
  let maleIdx = 0;
  let femaleIdx = 0;

  return faces.map((face, i) => {
    const gender = face.demographics?.gender;
    let name;
    if (gender === "Male" && maleIdx < maleNames.length) {
      name = maleNames[maleIdx++];
    } else if (gender === "Female" && femaleIdx < femaleNames.length) {
      name = femaleNames[femaleIdx++];
    } else {
      // Fallback: pick from whichever pool has remaining names
      if (maleIdx < maleNames.length) {
        name = maleNames[maleIdx++];
      } else {
        name = femaleNames[femaleIdx++];
      }
    }

    return {
      faceId: face.id,
      faceDataUrl: face.dataUrl,
      name,
      occupation: occupations[i],
    };
  });
}

export function pickDistractors(correctAnswer, allOptions, count) {
  const available = allOptions.filter((o) => o !== correctAnswer);
  const shuffled = shuffleArray(available);
  return shuffled.slice(0, count);
}
