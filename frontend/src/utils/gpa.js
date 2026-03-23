// Utilities for GPA calculation and grade mapping
// Exported helpers: gradeToPoints, calculateGPA, SCALES

export const SCALES = {
  '4.0': {
    A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, 'C-': 1.7, 'D+': 1.3, D: 1.0, F: 0.0
  },
  '4.3': {
    A: 4.3, 'A-': 4.0, 'B+': 3.7, B: 3.3, 'B-': 3.0, 'C+': 2.7, C: 2.3, 'C-': 2.0, 'D+': 1.7, D: 1.0, F: 0.0
  },
  '100': null // numeric percentage scale
}

export function gradeToPoints(rawGrade, scaleKey = '4.0') {
  if (rawGrade === null || rawGrade === undefined) return NaN
  const grade = String(rawGrade).trim()
  if (grade === '') return NaN

  if (scaleKey === '100') {
    // numeric percentage to 4.0 conversion: simple mapping
    const n = Number(grade)
    if (isNaN(n)) return NaN
    if (n >= 93) return 4.0
    if (n >= 90) return 3.7
    if (n >= 87) return 3.3
    if (n >= 83) return 3.0
    if (n >= 80) return 2.7
    if (n >= 77) return 2.3
    if (n >= 73) return 2.0
    if (n >= 70) return 1.7
    if (n >= 67) return 1.3
    if (n >= 60) return 1.0
    return 0.0
  }

  // Try numeric first
  const asNum = Number(grade)
  if (!isNaN(asNum)) {
    // assume already on 4.0 scale if <= 4.3
    if (asNum <= 4.3) return asNum
    // else map percentage
    return gradeToPoints(asNum, '100')
  }

  const key = grade.toUpperCase()
  const mapping = SCALES[scaleKey] || SCALES['4.0']
  if (!mapping) return NaN
  if (mapping.hasOwnProperty(key)) return mapping[key]
  return NaN
}

export function calculateGPA(courses = [], scaleKey = '4.0') {
  let totalQuality = 0
  let totalCredits = 0
  let totalCreditsEarned = 0

  for (const c of courses) {
    const credits = Number(c.credits) || 0
    const p = gradeToPoints(c.grade, scaleKey)
    if (!isNaN(p)) {
      totalQuality += p * credits
      totalCredits += credits
      if (!c.planned) totalCreditsEarned += credits
    } else {
      // If grade not parsable, ignore for earned credits
      if (!c.planned) totalCredits += credits
    }
  }

  const gpa = totalCredits === 0 ? NaN : totalQuality / totalCredits

  // GPA if planned courses counted (include planned in totals)
  let totalQualityPlanned = 0
  let totalCreditsPlanned = 0
  for (const c of courses) {
    const credits = Number(c.credits) || 0
    const p = gradeToPoints(c.grade, scaleKey)
    if (!isNaN(p)) {
      totalQualityPlanned += p * credits
      totalCreditsPlanned += credits
    }
  }
  const gpaWithPlanned = totalCreditsPlanned === 0 ? NaN : totalQualityPlanned / totalCreditsPlanned

  return {
    totalCredits: courses.reduce((s, c) => s + (Number(c.credits) || 0), 0),
    earnedCredits: totalCreditsEarned,
    gpa,
    gpaWithPlanned
  }
}
