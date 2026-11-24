# 8. Testing and Evaluation

## 8.1 Dataset to collect (start in week 1)

| Dataset | Size | How |
|---|---|---|
| Mock consultations | 20–30 recordings | Role-play with doctor friends or relatives, in Kannada, Hindi, English and mixed. Write a **reference transcript** and the **expected extracted items** for each. |
| Prescription images | 50–100 | Real prescriptions with consent and **patient names hidden**, plus handwritten mock ones. Write down the correct medicine list for each. |
| Planted mismatch cases | 10–15 | Consultation + prescription pairs that disagree on purpose (dose, timing, duration). |
| Safety rule cases | 20+ | Allergy, interaction, maximum-dose and duplicate scenarios, each with the expected warning. |

Use only consented, de-identified data. Don't evaluate only on AI-generated samples.

## 8.2 Metrics

| What | Metric | How |
|---|---|---|
| Speech recognition | Word error rate (WER) | Compare against the reference transcripts (`jiwer` library) |
| Medical extraction | Precision, recall, F1 | Extracted items vs expected items |
| Reminder extraction | Precision, recall + date accuracy | Was "after 5 days" turned into the right date? |
| Prescription OCR | Exact match on medicine names | OCR output vs ground truth |
| Medicine matching | Top-1 and top-3 accuracy | Is the correct medicine first, or in the top 3? |
| Mismatch detection | Sensitivity and specificity | On the planted cases; **false negatives matter most** |
| Safety rules | Pass rate | Unit tests |
| Summary quality | Factual accuracy rated by a clinician (1–5) | Ask a doctor to review 10 summaries |
| Reminders | Delivery success rate | Scheduled vs actually delivered on the iPhone |
| Usability | Task completion rate + feedback | 5–10 users, a short survey |

## 8.3 Comparison experiments (good report material)

| Experiment | Compare |
|---|---|
| Speech | Whisper small vs medium vs IndicWhisper on mixed-language audio |
| OCR | PaddleOCR vs Gemini Vision on handwriting |
| Matching | With vs without the boost from the consultation transcript |
| LLM | Gemini vs Ollama (Llama/Qwen) on extraction F1 |

## 8.4 Results table template

| Component | Metric | Result | Notes |
|---|---|---|---|
| Speech (Whisper medium) | WER | __% | |
| Extraction | F1 | __ | |
| Reminder extraction | F1 / date accuracy | __ / __% | |
| OCR (Gemini Vision) | Exact match | __% | |
| OCR (PaddleOCR) | Exact match | __% | |
| Matching | Top-1 / Top-3 | __% / __% | |
| Mismatch detection | Sensitivity / Specificity | __% / __% | |
| Safety rules | Tests passed | __ / __ | |
| Summaries | Clinician rating | __ / 5 | |
| Usability | Task completion | __% | |

## 8.5 Software testing

- **Unit tests:** every rule in the rules engine, date conversion, the care-plan generator (`pytest`)
- **API tests:** every endpoint, including authentication failures
- **Security tests:** user A can't access user B's episodes; uploaded files aren't publicly reachable
- **End-to-end:** the full demo flow on the Simulator and on a real iPhone
