# 5. Database Schema (PostgreSQL)

## 5.1 Tables

### users
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| age | int | |
| language | text | en / hi / kn ... |
| allergies | text[] | Used by the rules engine |
| chronic_conditions | text[] | |
| regular_medicines | text[] | Generic names |
| wake_time, breakfast_time, lunch_time, dinner_time, bed_time | time | Routine |
| created_at | timestamp | |

### contacts
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| type | enum | family / doctor |
| name, phone, relation_or_clinic | text | |
| caregiver_alerts | bool | Opt-in, default false |

### episodes
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| title | text | "Fever – 24 Nov 2026" |
| category | text | Fever, Infection, Injury, Surgery ... |
| issue_description | text | |
| start_date | date | |
| status | enum | active / closed |

### consultations
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| consent_given | bool | |
| transcript | jsonb | Segments with start/end timestamps |
| summary | text | |
| audio_deleted | bool | Default true after transcription |
| recorded_at | timestamp | |

### prescriptions
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| image_path | text | Encrypted storage |
| ocr_text | jsonb | Text + bounding boxes |

### medicines_reference
| Field | Type | Notes |
|---|---|---|
| id | int (PK) | |
| brand_name | text | Dolo 650 |
| generic_name | text | Paracetamol |
| strength | text | 650 mg |
| form | text | Tablet / syrup |
| is_verified | bool | Part of the top-100 reviewed list |
| max_daily_dose | text | Verified drugs only |

### interactions_reference
| Field | Type | Notes |
|---|---|---|
| generic_a, generic_b | text | |
| severity | enum | major / moderate / minor |
| description | text | |

### extracted_items
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| type | enum | medicine / instruction / reminder / diagnosis |
| value | jsonb | Structured data |
| source_type | enum | consultation / prescription |
| source_ref | jsonb | `{start: 134.2, end: 141.0}` or `{bbox: [...]}` |
| confidence | float | |
| confirmed | bool | Nothing goes live until this is true |

### episode_medicines
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| medicine_ref_id | int (FK, nullable) | Null if typed manually |
| name_as_written | text | |
| dose, timing, duration_days | text / int | |
| match_confidence | enum | high / medium / low |
| confirmed | bool | |

### warnings
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| rule | text | allergy / interaction / max_dose / mismatch / duplicate / not_checked |
| severity | enum | high / confirm / info |
| message | text | |
| resolved | bool | |

### reminders
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| type | enum | medicine / water / followup / test / checkin / conditional / winddown |
| title | text | |
| scheduled_at | timestamp | |
| repeat_rule | text | daily / every 2h / once |
| condition_question | text | For conditional reminders |
| status | enum | pending / taken / snoozed / skipped / missed |

### checkins
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| episode_id | uuid (FK) | |
| date | date | |
| symptom_status | enum | better / same / worse |
| sleep_hours | float | |
| sleep_quality | enum | good / okay / poor |
| note | text | |

### audit_logs
| Field | Type | Notes |
|---|---|---|
| id | bigint (PK) | |
| user_id | uuid | Who |
| action | text | view / create / update / delete |
| resource | text | What |
| at | timestamp | When |

## 5.2 Relationships

```
users 1──* contacts
users 1──* episodes
episodes 1──* consultations
episodes 1──* prescriptions
episodes 1──* extracted_items
episodes 1──* episode_medicines ──* medicines_reference
episodes 1──* warnings
episodes 1──* reminders
episodes 1──* checkins
```
