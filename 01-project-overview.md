# 1. Project Overview

## 1.1 What is ConsultKeeper?

ConsultKeeper is an app that **records a doctor's consultation, understands it, and turns it into a safe, personalised recovery plan.**

Every illness is stored as a **health episode**, for example "Fever – 24 Nov 2026". Each episode holds the consultation, prescription, reminders, check-ins and reports. Over time, the episodes form a personal health history the patient can show any doctor.

## 1.2 The problem

1. **Consultations are very short.** The average doctor visit in India lasts about 2 minutes (Irving et al., *BMJ Open*, 2017).
2. **Patients forget most of it.** People forget 40–80% of medical information almost immediately (Kessels, *J R Soc Med*, 2003).
3. **Prescriptions are hard to read.** Handwriting is often unclear, and instructions are given in mixed languages (Kannada, Hindi and English).
4. **Mistakes happen at home.** Wrong doses, missed medicines, forgotten follow-ups, and interactions between medicines from different doctors.
5. **Families are left out.** Caregivers don't know what the doctor said or whether medicines are being taken.
6. **Recovery isn't tracked.** After the clinic, the patient is on their own until the next visit.

## 1.3 The gap

| Existing tool | What it lacks |
|---|---|
| Medicine reminder apps | Everything must be typed in by hand. No understanding of the consultation. |
| Health record apps | They only store files. No analysis or guidance. |
| Fitness and sleep apps | Not linked to an illness or the doctor's instructions. |
| Telemedicine apps | Help during the consultation, not during recovery. |

Each of these capabilities exists separately. **Our contribution is joining them together:**

> An AI-assisted system that converts unstructured doctor-patient conversations and prescriptions into a verified, patient-confirmed recovery workflow.

(Don't claim "no app does this". That's hard to prove. Show what our system does that the others don't do *together*.)

## 1.4 Objectives

1. Capture and summarise consultations, including code-mixed Indian speech.
2. Read handwritten prescriptions using OCR plus matching against a medicine database, with confidence levels.
3. Detect differences between what the doctor **said** and what they **wrote**.
4. Flag allergies, interactions and over-maximum doses using verified rules only.
5. Turn the doctor's instructions into reminders that fit the patient's routine, after the patient confirms them.
6. Track recovery: medicine adherence, symptoms and sleep.
7. Keep family and the doctor one tap away.

## 1.5 What makes it innovative

- **Cross-checking speech against the prescription:** comparing what the doctor said with what they wrote.
- **Evidence links:** every extracted item links back to its source, such as a transcript timestamp or a crop of the prescription image.
- **Reminders taken from the doctor's words:** "Come back after 5 days" becomes a confirmed reminder for an actual date.
- **Conditional reminders:** "Is the fever down?" If not, the app offers a one-tap doctor call.
- **Everything organised by episode:** health is organised by illness, not by scattered files.
- **Indian language support:** it handles real, mixed-language consultations.

## 1.6 Viva pitch (one line)

> "Sir, a patient gets 2 minutes with the doctor and forgets most of it by the time they reach home. ConsultKeeper remembers the consultation, checks the prescription, and guides them safely to recovery."

## 1.7 Limitations (state them honestly)

- Handwriting recognition isn't perfect, so the user always confirms the medicine list.
- Interaction checks cover only a verified list of common medicines.
- Sleep data is self-reported in the first version.
- It depends on the doctor agreeing to be recorded.

## 1.8 Future scope

- Native HealthKit and Health Connect for steps and sleep
- A doctor portal (with patient permission)
- ABHA / ABDM health record integration
- Offline speech recognition for rural areas
- Android app from the same codebase

## References

1. Irving G. et al. *International variations in primary care physician consultation time: a systematic review of 67 countries.* BMJ Open, 2017.
2. Kessels R.P.C. *Patients' memory for medical information.* Journal of the Royal Society of Medicine, 2003.
3. Digital Personal Data Protection Act, 2023, Government of India.
