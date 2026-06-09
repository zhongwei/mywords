# YAML Vocabulary to SQLite Conversion Design

## Goal

Convert TOEFL and GRE vocabulary YAML files into a SQLite database with a normalized schema for future querying and application use.

## Source Data

- `TOEFL_Word_List.yaml` (~34K lines): fields ST, P, S, C, R, L, A, RR, E, T, D, REF, CO
- `GRE_Word_List.yaml` (~39K lines): fields ST, P, S, C, CC, R, E, M, REF, CO, D
- Implementation: one-time Python script, not integrated into Rust project

## Schema

### `words` table (main)

| Column | Type | Constraints | Source Fields |
|--------|------|-------------|---------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | - |
| word | TEXT | NOT NULL UNIQUE ON CONFLICT IGNORE | dict key |
| source | TEXT | NOT NULL CHECK(source IN ('toefl','gre')) | fixed value |
| stage | INTEGER | | ST |
| phonetic | TEXT | | P |
| pos | TEXT | | S |
| meaning_cn | TEXT | | C |
| meaning_en | TEXT | | CC (GRE only) |
| root | TEXT | | R |
| association | TEXT | | A or L or RR (first non-empty) |
| collocations | TEXT | | CO |
| derivatives | TEXT | | D |
| references | TEXT | | REF |

Indexes: `word`, `source`

### `examples` table (1:N)

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| word_id | INTEGER | NOT NULL FK -> words(id) ON DELETE CASCADE |
| sentence | TEXT | NOT NULL |
| translation | TEXT | |

### `synonyms` table (1:N)

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| word_id | INTEGER | NOT NULL FK -> words(id) ON DELETE CASCADE |
| synonym | TEXT | NOT NULL |

## Design Decisions

- Single `words` table with `source` column to differentiate TOEFL/GRE; nullable columns handle field differences
- `association` merges A, L, RR (all memory aids) into one field, using first non-empty value
- `pre_suffix` from TOEFL is ignored per user preference
- No antonym table (no antonym field exists in source data)
- M field (synonyms) stored as separate rows in `synonyms` table; comma-separated values split into individual rows
- Python script reads YAML, creates SQLite DB, handles duplicate words (same word in both TOEFL and GRE) via `ON CONFLICT IGNORE`

## Script Output

- Script path: `scripts/import_yaml_to_sqlite.py`
- Output: `words.db` in project root
- Run: `python3 scripts/import_yaml_to_sqlite.py`
